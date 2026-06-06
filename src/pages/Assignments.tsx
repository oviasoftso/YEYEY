/**
 * OVI Assignments — Student view for classroom assignments.
 * Shows pending, submitted, and graded assignments with AI help.
 */
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Clock, CheckCircle2, AlertCircle, ArrowRight, Calendar, FileText,
  Trophy, Loader2, Sparkles, BookOpen,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import OviAvatar from "@/components/OviAvatar";
import LatexText from "@/components/LatexText";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { store } from "@/lib/store";
import { SUBJECT_ICONS } from "@/lib/constants";
import { StudentProfile, Assignment } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Demo assignments when no teacher assignments exist
const DEMO_ASSIGNMENTS: Omit<Assignment, "id" | "createdAt">[] = [
  {
    classroomId: "demo-class",
    classroomName: "Form 4 Science A",
    title: "Physics — Forces & Motion",
    subject: "Physics",
    topic: "Forces",
    paperType: "paper2",
    questionCount: 8,
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    instructions: "Answer all questions. Show your working for calculations.",
    status: "pending",
  },
  {
    classroomId: "demo-class",
    classroomName: "Form 4 Science A",
    title: "Chemistry — Acids & Bases",
    subject: "Chemistry",
    topic: "Acids, Bases and Salts",
    paperType: "paper1",
    questionCount: 20,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    instructions: "MCQ test covering acids, bases, salts, and neutralisation reactions.",
    status: "pending",
  },
  {
    classroomId: "demo-class",
    classroomName: "Form 4 Science A",
    title: "Mathematics — Algebra",
    subject: "Mathematics",
    topic: "Algebra",
    paperType: "paper2",
    questionCount: 6,
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    instructions: "Solve all algebraic expressions. Show full working.",
    status: "graded",
    score: 18,
    maxScore: 24,
    feedback: "Good work on factorisation. Improve on simultaneous equations — practice substitution method.",
    submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function AssignmentsPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [helperSubject, setHelperSubject] = useState("");
  const [helperTopic, setHelperTopic] = useState("");
  const [helperLoading, setHelperLoading] = useState(false);
  const [helperResult, setHelperResult] = useState("");

  useEffect(() => {
    const p = store.getProfile();
    if (!p) { navigate("/"); return; }
    setProfile(p);
    loadAssignments();
  }, [navigate]);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      // Try edge function first
      const { data } = await supabase.functions.invoke("ovi_classroom", {
        body: { action: "list_assignments" },
      });
      if (data?.assignments?.length) {
        // Save to local store
        for (const a of data.assignments) {
          const existing = store.getAssignments().find((ea) => ea.id === a.id);
          if (!existing) {
            store.addAssignment(a);
          }
        }
        setAssignments(store.getAssignments());
      } else {
        throw new Error("No remote assignments");
      }
    } catch {
      // Use local store, seed demo if empty
      const local = store.getAssignments();
      if (local.length === 0) {
        for (const demo of DEMO_ASSIGNMENTS) {
          store.addAssignment(demo);
        }
      }
      setAssignments(store.getAssignments());
    } finally {
      setLoading(false);
    }
  };

  const startAssignment = (assignment: Assignment) => {
    store.updateAssignment(assignment.id, { status: "in_progress" });
    toast({ title: assignment.title, description: `Starting ${assignment.questionCount} questions.` });
    navigate("/assessment", {
      state: {
        subject: assignment.subject,
        topic: assignment.topic,
        paperType: assignment.paperType,
        assignmentId: assignment.id,
      },
    });
  };

  const requestHelp = async () => {
    if (!helperSubject || !helperTopic) return;
    setHelperLoading(true);
    setHelperResult("");
    try {
      const { data } = await supabase.functions.invoke("chat", {
        body: {
          message: `I need help with my ZIMSEC O-Level ${helperSubject} assignment on the topic "${helperTopic}". Give me:
1. A brief summary of the key concepts I need to know
2. 3 study tips specific to this topic
3. Common mistakes students make in this topic
4. A quick revision checklist

Keep it concise and focused on ZIMSEC exam preparation.`,
          subject: helperSubject,
        },
      });
      if (data?.response) {
        setHelperResult(data.response);
      } else {
        setHelperResult(generateLocalHelp(helperSubject, helperTopic));
      }
    } catch {
      setHelperResult(generateLocalHelp(helperSubject, helperTopic));
    } finally {
      setHelperLoading(false);
    }
  };

  if (!profile) return null;

  const pending = assignments.filter((a) => a.status === "pending" || a.status === "in_progress");
  const submitted = assignments.filter((a) => a.status === "submitted");
  const graded = assignments.filter((a) => a.status === "graded");
  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();
  const subjects = [...new Set(assignments.map((a) => a.subject))];

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <OviAvatar size="md" />
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Assignments</h1>
              <p className="text-muted-foreground text-sm">
                {pending.length} pending · {graded.length} graded
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending">
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="pending" className="gap-1 text-xs">
              <Clock size={14} /> Pending ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="submitted" className="gap-1 text-xs">
              <AlertCircle size={14} /> Submitted ({submitted.length})
            </TabsTrigger>
            <TabsTrigger value="graded" className="gap-1 text-xs">
              <Trophy size={14} /> Graded ({graded.length})
            </TabsTrigger>
            <TabsTrigger value="helper" className="gap-1 text-xs">
              <Sparkles size={14} /> Helper
            </TabsTrigger>
          </TabsList>

          {/* Pending */}
          <TabsContent value="pending" className="space-y-3 mt-4">
            {pending.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 size={48} className="text-success" />}
                title="All Caught Up"
                description="No pending assignments."
              />
            ) : (
              pending.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className={isOverdue(a.dueDate) ? "border-destructive/30" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">{SUBJECT_ICONS[a.subject]}</span>
                            <span className="font-medium text-foreground">{a.title}</span>
                            {isOverdue(a.dueDate) && (
                              <Badge variant="destructive" className="text-xs">Overdue</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{a.instructions}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              Due: {new Date(a.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText size={12} />
                              {a.questionCount} questions
                            </span>
                            <Badge variant="outline" className="text-xs">{a.classroomName}</Badge>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => startAssignment(a)} className="gap-1.5 shrink-0">
                          Start <ArrowRight size={14} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>

          {/* Submitted */}
          <TabsContent value="submitted" className="space-y-3 mt-4">
            {submitted.length === 0 ? (
              <EmptyState
                icon={<FileText size={48} className="text-muted-foreground" />}
                title="No Submissions"
                description="Assignments you submit will appear here."
              />
            ) : (
              submitted.map((a) => (
                <Card key={a.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{SUBJECT_ICONS[a.subject]}</span>
                      <span className="font-medium text-foreground">{a.title}</span>
                      <Badge variant="secondary" className="text-xs">Awaiting Grade</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Submitted {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString("en-GB") : "recently"}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Graded */}
          <TabsContent value="graded" className="space-y-3 mt-4">
            {graded.length === 0 ? (
              <EmptyState
                icon={<Trophy size={48} className="text-muted-foreground" />}
                title="No Graded Work"
                description="Graded assignments will appear here."
              />
            ) : (
              graded.map((a) => {
                const pct = a.maxScore ? Math.round((a.score! / a.maxScore) * 100) : 0;
                return (
                  <Card key={a.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">{SUBJECT_ICONS[a.subject]}</span>
                            <span className="font-medium text-foreground">{a.title}</span>
                            <Badge
                              variant={pct >= 70 ? "default" : pct >= 50 ? "secondary" : "destructive"}
                              className="text-xs"
                            >
                              {a.score}/{a.maxScore} ({pct}%)
                            </Badge>
                          </div>
                          {a.feedback && (
                            <p className="text-xs text-muted-foreground mt-1">{a.feedback}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {new Date(a.submittedAt || a.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-2xl font-bold text-foreground">{pct}%</div>
                          <Progress value={pct} className="w-16 h-1.5 mt-1" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* AI Helper */}
          <TabsContent value="helper" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles size={16} className="text-primary" />
                  Assignment Helper
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Get AI-powered study guidance for any assignment topic. Select your subject and topic to receive key concepts, study tips, and a revision checklist.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={helperSubject}
                    onChange={(e) => { setHelperSubject(e.target.value); setHelperTopic(""); setHelperResult(""); }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    {!subjects.length && ["Mathematics", "Physics", "Chemistry", "Biology", "English Language"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <select
                    value={helperTopic}
                    onChange={(e) => { setHelperTopic(e.target.value); setHelperResult(""); }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={!helperSubject}
                  >
                    <option value="">Select Topic</option>
                    {getTopicsForSubject(helperSubject).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <Button onClick={requestHelp} disabled={helperLoading || !helperSubject || !helperTopic} className="w-full gap-2">
                  {helperLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                  {helperLoading ? "Generating guidance..." : "Get Study Help"}
                </Button>

                {helperResult && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="border border-border rounded-lg p-4 bg-muted/30">
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline" className="text-xs">
                          {SUBJECT_ICONS[helperSubject]} {helperSubject} — {helperTopic}
                        </Badge>
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <LatexText>{helperResult}</LatexText>
                      </div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Quick links to related assessments */}
            {helperSubject && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpen size={16} className="text-primary" />
                    Practice for {helperSubject}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link to="/assessment">
                    <Button variant="outline" className="w-full gap-2">
                      <BookOpen size={14} />
                      Start a {helperSubject} Assessment
                      <ArrowRight size={14} />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="py-12">
      <CardContent className="text-center">
        <div className="mx-auto mb-4">{icon}</div>
        <h3 className="font-display text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </CardContent>
    </Card>
  );
}

function getTopicsForSubject(subject: string): string[] {
  const map: Record<string, string[]> = {
    Mathematics: ["Algebra", "Geometry", "Trigonometry", "Statistics", "Number", "Mensuration", "Vectors", "Matrices", "Probability", "Sets"],
    Physics: ["Forces", "Energy", "Waves", "Electricity", "Thermal Physics", "Motion", "Pressure", "Magnetism", "Radioactivity"],
    Chemistry: ["Acids, Bases and Salts", "Chemical Reactions", "Metals", "Organic Chemistry", "Atomic Structure", "Bonding", "Electrolysis", "Energy Changes"],
    Biology: ["Cells & Organisation", "Reproduction", "Ecology", "Nutrition", "Transport", "Respiration", "Excretion", "Coordination", "Genetics"],
    "English Language": ["Comprehension", "Summary", "Continuous Writing", "Directed Writing", "Grammar", "Vocabulary"],
    "Combined Science": ["Chemical Reactions", "Forces", "Electricity", "Cells & Organisation", "Ecology", "Acids & Bases", "Energy"],
    "Principles of Accounting": ["Final Accounts", "Control Accounts", "Cash Book", "Bank Reconciliation", "Trial Balance", "Journal", "Depreciation"],
    Geography: ["Climate", "Rivers", "Population", "Agriculture", "Industry", "Settlement", "Map Work", "Tectonics"],
    History: ["Colonial Period", "Independence", "Pre-Colonial", "World Wars", "Cold War", "Nationalism"],
  };
  return map[subject] || [];
}

function generateLocalHelp(subject: string, topic: string): string {
  return `## ${subject} — ${topic}: Study Guide

### Key Concepts
This topic covers fundamental principles in ${subject} that are regularly examined in ZIMSEC O-Level exams. Focus on understanding the core definitions, processes, and applications.

### Study Tips
1. **Read your textbook section** on ${topic} — highlight key definitions and formulas
2. **Practice past paper questions** on this topic (2018-2025 papers are most relevant)
3. **Teach someone else** — explaining concepts out loud reveals gaps in your understanding

### Common Mistakes
- Confusing similar terms or concepts
- Not showing full working in calculations
- Forgetting units in final answers
- Rushing through "easy" questions and making careless errors

### Revision Checklist
- [ ] Can you define all key terms for this topic?
- [ ] Can you solve calculation questions without notes?
- [ ] Can you explain the concepts in your own words?
- [ ] Have you practiced at least 5 past paper questions on this topic?
- [ ] Do you know the ZIMSEC command words (Define, Explain, Calculate, etc.)?

*Generated by OVI — use this as a starting point and expand with your textbook notes.*`;
}
