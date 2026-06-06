import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/auth.ts";
import { aiComplete, FORMATTING_PREAMBLE } from "../_shared/ai.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

// In-memory stores (will migrate to Supabase tables later)
interface Assignment {
  id: string;
  classroomId: string;
  title: string;
  subject: string;
  topic: string;
  paperType: string;
  questionCount: number;
  dueDate: string;
  instructions: string;
  createdBy: string;
  createdAt: string;
}

interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  answers: unknown[];
  score: number;
  totalMarks: number;
  timeTakenSecs: number;
  submittedAt: string;
}

interface Announcement {
  id: string;
  classroomId: string;
  title: string;
  content: string;
  postedBy: string;
  createdAt: string;
}

interface Exercise {
  id: string;
  classroomId: string;
  subject: string;
  topic: string;
  questionCount: number;
  timeLimitMinutes: number;
  questions: unknown[];
  status: "pending" | "active" | "completed";
  createdBy: string;
  createdAt: string;
}

const assignments: Assignment[] = [];
const submissions: Submission[] = [];
const announcements: Announcement[] = [];
const exercises: Exercise[] = [];
let idCounter = 1;
const nextId = () => `clroom_${Date.now()}_${idCounter++}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify teacher or admin role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isTeacher = roles?.some((r) => r.role === "teacher" || r.role === "admin");
    if (!isTeacher) {
      return new Response(JSON.stringify({ error: "Teacher or admin role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "list_classrooms": {
        const { data, error } = await supabase
          .from("teacher_classrooms")
          .select("*")
          .eq("teacher_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const classrooms = (data || []).map((c) => ({
          id: c.id,
          name: c.name,
          subjectIds: c.subject_ids || [],
          studentCount: (c.student_ids || []).length,
          avgMastery: 0, // Will be computed by client
          createdAt: c.created_at,
        }));

        return new Response(JSON.stringify({ classrooms }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create_classroom": {
        const { name, subjectIds } = body;
        if (!name) {
          return new Response(JSON.stringify({ error: "Name required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data, error } = await supabase
          .from("teacher_classrooms")
          .insert({
            teacher_id: user.id,
            name,
            subject_ids: subjectIds || [],
            student_ids: [],
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ classroom: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "class_students": {
        const { classroomId } = body;
        if (!classroomId) {
          return new Response(JSON.stringify({ error: "classroomId required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get classroom
        const { data: classroom, error: classError } = await supabase
          .from("teacher_classrooms")
          .select("*")
          .eq("id", classroomId)
          .single();

        if (classError || !classroom) {
          return new Response(JSON.stringify({ error: "Classroom not found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const studentIds = classroom.student_ids || [];

        if (studentIds.length === 0) {
          return new Response(JSON.stringify({ students: [], atRisk: [] }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get student profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, stream, created_at")
          .in("id", studentIds);

        // Get emails from auth
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const emailMap = new Map(
          authUsers.users.map((u) => [u.id, u.email || ""])
        );

        // Get mastery data
        const { data: masteryData } = await supabase
          .from("topic_mastery")
          .select("user_id, subject, topic, mastery")
          .in("user_id", studentIds);

        // Get assessment counts
        const { data: assessmentCounts } = await supabase
          .from("assessments")
          .select("user_id")
          .in("user_id", studentIds);

        const assessmentCountMap = new Map<string, number>();
        (assessmentCounts || []).forEach((a) => {
          assessmentCountMap.set(a.user_id, (assessmentCountMap.get(a.user_id) || 0) + 1);
        });

        // Build student data
        const students = (profiles || []).map((p) => {
          const userMastery = (masteryData || []).filter((m) => m.user_id === p.id);
          const avgMastery = userMastery.length > 0
            ? Math.round(userMastery.reduce((sum, m) => sum + m.mastery, 0) / userMastery.length)
            : 0;
          const weakTopics = userMastery
            .filter((m) => m.mastery < 40)
            .map((m) => `${m.subject}: ${m.topic}`);

          return {
            id: p.id,
            name: p.display_name || "Student",
            email: emailMap.get(p.id) || "",
            stream: p.stream || "science",
            avgMastery,
            assessmentsTaken: assessmentCountMap.get(p.id) || 0,
            lastActive: p.created_at,
            weakTopics,
          };
        });

        // Identify at-risk students
        const atRisk = students
          .filter((s) => s.avgMastery < 40 || s.assessmentsTaken < 2)
          .map((s) => ({
            id: s.id,
            name: s.name,
            riskScore: Math.max(
              100 - s.avgMastery,
              s.assessmentsTaken < 2 ? 60 : 0
            ),
            reasons: [
              ...(s.avgMastery < 30 ? ["Critical mastery level — below 30%"] : []),
              ...(s.avgMastery >= 30 && s.avgMastery < 50 ? ["Low mastery — below 50%"] : []),
              ...(s.assessmentsTaken < 2 ? ["Fewer than 2 assessments taken"] : []),
              ...(s.weakTopics.length > 3 ? [`${s.weakTopics.length} topics below 40%`] : []),
            ],
            weakSubjects: [...new Set(s.weakTopics.map((t) => t.split(":")[0]))],
          }))
          .sort((a, b) => b.riskScore - a.riskScore);

        return new Response(JSON.stringify({ students, atRisk }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "add_students": {
        const { classroomId, studentIds: newStudentIds } = body;
        if (!classroomId || !newStudentIds?.length) {
          return new Response(JSON.stringify({ error: "classroomId and studentIds required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: classroom } = await supabase
          .from("teacher_classrooms")
          .select("student_ids")
          .eq("id", classroomId)
          .single();

        const existing = classroom?.student_ids || [];
        const merged = [...new Set([...existing, ...newStudentIds])];

        const { error } = await supabase
          .from("teacher_classrooms")
          .update({ student_ids: merged })
          .eq("id", classroomId);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, totalStudents: merged.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "remove_student": {
        const { classroomId, studentId } = body;
        if (!classroomId || !studentId) {
          return new Response(JSON.stringify({ error: "classroomId and studentId required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: classroom } = await supabase
          .from("teacher_classrooms")
          .select("student_ids")
          .eq("id", classroomId)
          .single();

        const filtered = (classroom?.student_ids || []).filter((id: string) => id !== studentId);

        const { error } = await supabase
          .from("teacher_classrooms")
          .update({ student_ids: filtered })
          .eq("id", classroomId);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Assignment actions ──────────────────────────────────────────────

      case "create_assignment": {
        const { classroomId, title, subject, topic, paperType, questionCount, dueDate, instructions } = body;
        if (!classroomId || !title || !subject || !topic) {
          return new Response(JSON.stringify({ error: "classroomId, title, subject, and topic required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const assignment: Assignment = {
          id: nextId(),
          classroomId,
          title,
          subject,
          topic,
          paperType: paperType || "paper1",
          questionCount: questionCount || 10,
          dueDate: dueDate || "",
          instructions: instructions || "",
          createdBy: user.id,
          createdAt: new Date().toISOString(),
        };

        assignments.push(assignment);

        return new Response(JSON.stringify({ assignment }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "list_assignments": {
        const { classroomId } = body;
        if (!classroomId) {
          return new Response(JSON.stringify({ error: "classroomId required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const list = assignments.filter((a) => a.classroomId === classroomId);

        return new Response(JSON.stringify({ assignments: list }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "submit_assignment": {
        const { assignmentId, answers, studentId, timeTakenSecs } = body;
        if (!assignmentId || !answers || !studentId) {
          return new Response(JSON.stringify({ error: "assignmentId, answers, and studentId required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Resolve student name from profiles
        let studentName = "Student";
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", studentId)
          .single();
        if (profile?.display_name) studentName = profile.display_name;

        // Basic auto-scoring: count answers that have a score field
        let totalScore = 0;
        let totalMarks = 0;
        for (const ans of answers as Record<string, unknown>[]) {
          if (ans && typeof ans === "object") {
            if (typeof (ans as any).marks === "number") totalMarks += (ans as any).marks;
            if (typeof (ans as any).score === "number") totalScore += (ans as any).score;
          }
        }

        const submission: Submission = {
          id: nextId(),
          assignmentId,
          studentId,
          studentName,
          answers,
          score: totalScore,
          totalMarks: totalMarks || answers.length,
          timeTakenSecs: timeTakenSecs || 0,
          submittedAt: new Date().toISOString(),
        };

        submissions.push(submission);

        return new Response(JSON.stringify({ submission }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "list_submissions": {
        const { assignmentId } = body;
        if (!assignmentId) {
          return new Response(JSON.stringify({ error: "assignmentId required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const subs = submissions.filter((s) => s.assignmentId === assignmentId);

        return new Response(JSON.stringify({ submissions: subs }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Announcement actions ────────────────────────────────────────────

      case "post_announcement": {
        const { classroomId, title, content } = body;
        if (!classroomId || !title || !content) {
          return new Response(JSON.stringify({ error: "classroomId, title, and content required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const announcement: Announcement = {
          id: nextId(),
          classroomId,
          title,
          content,
          postedBy: user.id,
          createdAt: new Date().toISOString(),
        };

        announcements.push(announcement);

        return new Response(JSON.stringify({ announcement }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "list_announcements": {
        const { classroomId } = body;
        if (!classroomId) {
          return new Response(JSON.stringify({ error: "classroomId required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const list = announcements
          .filter((a) => a.classroomId === classroomId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return new Response(JSON.stringify({ announcements: list }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Exercise actions ────────────────────────────────────────────────

      case "create_exercise": {
        const { classroomId, subject, topic, questionCount, timeLimitMinutes } = body;
        if (!classroomId || !subject || !topic) {
          return new Response(JSON.stringify({ error: "classroomId, subject, and topic required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const count = Math.min(Math.max(questionCount || 10, 1), 40);

        // Generate questions using AI (same pattern as ovi_arena_generator)
        const systemPrompt = `You are OVI ARENA — the ZIMSEC exam simulation engine.
Generate ${count} multiple-choice questions for ${subject} — ${topic}.

ZIMSEC Command Words:
- Define: Give a precise meaning (1-2 sentences, no examples)
- State: Name or declare a fact briefly (no explanation needed)
- Describe: Give a detailed account in sequence (what happens, step by step)
- Explain: Say HOW and WHY something happens (cause → effect → result)
- Calculate: Show ALL working, include units, box final answer

For MCQ (Paper 1):
- 4 options per question (A, B, C, D)
- Only ONE correct answer
- Distractors must be plausible (common misconceptions)
- Questions should test recall, understanding, and application

${FORMATTING_PREAMBLE}

Respond with a tool call returning the questions as structured JSON.`;

        const tools = [{
          type: "function" as const,
          function: {
            name: "return_mcq_questions",
            description: "Return structured MCQ questions",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      options: {
                        type: "object",
                        properties: {
                          A: { type: "string" }, B: { type: "string" },
                          C: { type: "string" }, D: { type: "string" },
                        },
                        required: ["A", "B", "C", "D"],
                      },
                      correctAnswer: { type: "string", enum: ["A", "B", "C", "D"] },
                      topic: { type: "string" },
                    },
                    required: ["question", "options", "correctAnswer", "topic"],
                  },
                },
              },
              required: ["questions"],
            },
          },
        }];

        let questions: unknown[] = [];

        try {
          const result = await aiComplete({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Generate ${count} MCQ questions for ${subject} — ${topic}.` },
            ],
            tools,
            toolChoice: { type: "function", function: { name: "return_mcq_questions" } },
            timeoutMs: 30_000,
            maxTokens: 4000,
          });

          if (!("stream" in result) && result.toolCall) {
            questions = result.toolCall.arguments.questions || [];
          } else if (!("stream" in result)) {
            try {
              const parsed = JSON.parse(result.content);
              questions = parsed.questions || [];
            } catch {
              // Fallback placeholder questions
              questions = Array.from({ length: count }, (_, i) => ({
                question: `Sample ${subject} question ${i + 1} on ${topic}`,
                options: { A: "Option A", B: "Option B", C: "Option C", D: "Option D" },
                correctAnswer: "A",
                topic,
              }));
            }
          }
        } catch (aiErr) {
          console.error("create_exercise AI error:", aiErr);
          // Fallback placeholder questions on AI failure
          questions = Array.from({ length: count }, (_, i) => ({
            question: `Sample ${subject} question ${i + 1} on ${topic}`,
            options: { A: "Option A", B: "Option B", C: "Option C", D: "Option D" },
            correctAnswer: "A",
            topic,
          }));
        }

        const exercise: Exercise = {
          id: nextId(),
          classroomId,
          subject,
          topic,
          questionCount: count,
          timeLimitMinutes: timeLimitMinutes || 30,
          questions,
          status: "pending",
          createdBy: user.id,
          createdAt: new Date().toISOString(),
        };

        exercises.push(exercise);

        return new Response(JSON.stringify({ exercise }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "list_exercises": {
        const { classroomId } = body;
        if (!classroomId) {
          return new Response(JSON.stringify({ error: "classroomId required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const list = exercises.filter((e) => e.classroomId === classroomId);

        return new Response(JSON.stringify({ exercises: list }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (e) {
    console.error("ovi_classroom error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
