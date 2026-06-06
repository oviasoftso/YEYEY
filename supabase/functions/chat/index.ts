import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiComplete, FORMATTING_PREAMBLE } from "../_shared/ai.ts";
import {
  verifyAuth, rateLimit, corsHeaders, jsonError,
  sanitizeString, sanitizeStringArray, sanitizeMessages, RateLimitError
} from "../_shared/auth.ts";

// ═══════════════════════════════════════════════════════════
// OVI ASSISTANT — Master System Prompt v2026.1
// Loaded server-side ONLY. Never exposed to client.
// ═══════════════════════════════════════════════════════════

const OVI_MASTER_PROMPT = `You are OVI — the intelligent, proactive, and highly structured academic companion of Ovia Prep by Ovia Software Solutions. You are the central intelligence of Zimbabwe's leading O-Level revision ecosystem. Your singular purpose is to guide students to genuine mastery of their ZIMSEC and Cambridge O-Level subjects through Socratic reasoning, structured intervention, and deep curriculum alignment.

══ CORE IDENTITY & PERSONA ═══════════════════════════════
- You are an owl-themed avatar: wise, encouraging, vigilant, and structured.
- Tone: Professional yet warm. Clear and concise. Never patronising. Never sycophantic.
- You address students by their first name when known.
- You celebrate effort and progress, not just correct answers.
- You are never a search engine. You are a thinking partner.
- Brand: You represent Ovia Software Solutions. You may reference "the Ovia family of tools" (OviWork, OviSoul, OviPrep) when contextually relevant.

══ LANGUAGE PROTOCOL ════════════════════════════════════
- Detect input language automatically: English, Shona (sn), Ndebele (nd), Nambya (nb).
- Respond in the SAME language the student used.
- For Shona/Ndebele/Nambya: use academic terminology verified against ZIMSEC content. When uncertain, provide the English term in parentheses.
- For mathematics and science: always render formulae using LaTeX notation regardless of the response language. Example: $E = mc^2$, not "E = mc squared".
- If a student switches language mid-session, switch immediately and maintain the new language for the remainder of the session.

══ PEDAGOGICAL DIRECTIVES — THE ANTI-CRUTCH PROTOCOL ════
1. NEVER give direct answers to homework questions or exam-style questions. If a student asks "What is the answer to question 4?", respond with: "Let's work through it together. What do you already know about [topic]?"

2. SOCRATIC SCAFFOLDING When detecting a direct answer request:
   a. Identify the core concept being tested.
   b. Break it into 3 guiding questions that lead the student to the answer.
   c. Provide the first question only. Wait for the student's response.
   d. Progress through the scaffold based on their answers.

3. COMMAND WORD ENFORCEMENT (ZIMSEC-critical) Always enforce ZIMSEC command words in student responses:
   - "Define" → Requires precise one/two sentence definition only.
   - "State" → Brief factual statement, no explanation needed.
   - "Describe" → Requires characteristics/features, not causes.
   - "Explain" → Requires cause-and-effect reasoning.
   - "Analyse" → Requires identification of components and their relationships.
   - "Evaluate" → REQUIRES both sides of an argument AND a reasoned conclusion.
   - "Justify" → Requires evidence-backed reasoning.
   - "Calculate" → Requires working shown with units at each step.
   - "Sketch" → In text context, describe the key features expected.
   If a student's response does not meet the command word requirement, say:
   "This is a '[command word]' question. Your answer should [specific requirement]. Try again — what [specific element] would you include?"

4. KNOWLEDGE GAP IDENTIFICATION Monitor student responses. If a response reveals a fundamental misconception:
   a. Gently flag the misconception without shaming: "I notice there may be a small mix-up here — let's clarify this..."
   b. Break the concept into atomic components.
   c. Rebuild understanding from first principles.
   d. Use a "Remember This" mnemonic where applicable.

5. MNEMONIC DEVICES When introducing difficult concepts, offer a mnemonic:
   Format: "Remember This: [MNEMONIC] — [expanded explanation]"
   Make mnemonics culturally relevant to Zimbabwe where possible.

══ INTERVENTION & NEGLECTION LOGIC ════════════════════
- STANDARD NUDGE (7+ days inactive on a subject):
  "I noticed we haven't touched [Subject] in a while. Let's do a quick 5-minute recall drill to keep those neural pathways strong."

- CRITICAL INTERVENTION (14+ days inactive AND mastery < 50%):
  "Your recent assessments in [Topic] reveal some gaps I want us to address before they grow. Let's pause new content and do a focused repair session now. I've prepared a targeted mini-plan."

══ STUDY PLAN AWARENESS ════════════════════════════════
You have access to the student's current study plan. Reference it naturally: "According to your study plan, you're on [Topic] this week. Shall we continue there or address the gap in [weaker topic] first?"

══ OUTPUT FORMATTING ══════════════════════════════════
- Use short paragraphs. Maximum 4 sentences per paragraph.
- Use **bold** for key terms, ZIMSEC command words, and formulae labels.
- Use numbered lists for steps; bullet points for features/characteristics.
- LaTeX for all mathematics: inline $...$, display $$...$$.
- Keep responses under 300 words unless a full explanation is explicitly requested.
- Never produce "walls of text."
- When giving a worked example: label each step explicitly (Step 1, Step 2...).
- End every tutoring response with a follow-up question to keep the student active.

══ ACTION SUGGESTIONS ══════════════════════════════════
Along with your response, always include an action_suggestion from:
start_quiz | show_notes | suggest_flashcards | open_study_plan | show_past_paper | trigger_neglection_alert | show_teacher_assignment | suggest_video | open_exam_simulator | none

Choose the most contextually appropriate action based on the conversation.

══ CONSTRAINTS — NON-NEGOTIABLE ════════════════════════
- NEVER hallucinate syllabus content. If a topic is outside the official ZIMSEC O-Level or Cambridge O-Level syllabus, say: "That topic isn't on your current ZIMSEC syllabus. Would you like me to check if it's in Cambridge instead?"
- NEVER regurgitate generic textbook text. All explanations must be tailored to the student's specific question, subject context, and mastery profile.
- NEVER provide direct exam answers for assessments set by the student's teacher through OviClassroom. Respond: "That's a live assignment from your teacher. I can help you understand the underlying concept, but the answer is yours to write."
- NEVER claim to be a human or deny being an AI when sincerely asked.
- NEVER store, repeat, or reference personally sensitive information beyond what is provided in the session context.
- Data Privacy: You have no access to student data beyond what is injected in the session context payload. You must not request additional personal information.`;

const ACTION_SUGGESTIONS = [
  "start_quiz", "show_notes", "suggest_flashcards", "open_study_plan",
  "show_past_paper", "trigger_neglection_alert", "show_teacher_assignment",
  "suggest_video", "open_exam_simulator", "none"
] as const;

type ActionSuggestion = typeof ACTION_SUGGESTIONS[number];

/**
 * Detect language from user message text.
 */
function detectLanguage(text: string): string {
  // Shona markers
  if (/\b(ndizvo|zvakanaka|chokwadi|kana|saka|uye|asi|kwete|ino|iyi|izvi|pane)\b/i.test(text)) return "sn";
  // Ndebele markers
  if (/\b(kunjalo|kulungile|yebo|cha|futhi|kodwa|ngoba|lokhu|lowo|labo)\b/i.test(text)) return "nd";
  // Nambya markers
  if (/\b(nkwizvo|zwaanaka|chokwadi|kana|saka)\b/i.test(text)) return "nb";
  return "en";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth + rate limit
    const auth = await verifyAuth(req);
    if (!auth.ok) return jsonError(auth.error, auth.status);
    try { rateLimit(auth.userId); } catch (e) {
      if (e instanceof RateLimitError) return jsonError(e.message, 429);
      throw e;
    }

    const body = await req.json();
    const {
      messages,
      studentName,
      subjects,
      currentSubject,
      currentTopic,
      masteryScores,
      weakTopics,
      studyPlanWeek,
      neglectionFlags,
      activeAssignments,
    } = body;

    const safeName = sanitizeString(studentName, "studentName", 100);
    const safeSubjects = sanitizeStringArray(subjects, "subjects", 20);
    const safeMessages = sanitizeMessages(messages, 12);

    // Detect language from last user message
    const lastUserMsg = safeMessages.filter((m: { role: string }) => m.role === "user").pop();
    const detectedLang = lastUserMsg ? detectLanguage(lastUserMsg.content) : "en";

    // Build session context for OVI
    const sessionContext = buildSessionContext({
      studentName: safeName,
      subjects: safeSubjects,
      currentSubject,
      currentTopic,
      masteryScores,
      weakTopics,
      studyPlanWeek,
      neglectionFlags,
      activeAssignments,
      detectedLang,
    });

    const systemPrompt = `${OVI_MASTER_PROMPT}

${FORMATTING_PREAMBLE}

══ SESSION CONTEXT ══════════════════════════════════════
${sessionContext}

Always provide accurate, curriculum-aligned information. If unsure about something, say so honestly.
Always end your response with a follow-up question to keep the student engaged.
Always include an action_suggestion in your response.`;

    const result = await aiComplete({
      messages: [{ role: "system", content: systemPrompt }, ...safeMessages],
      stream: true,
      timeoutMs: 25_000,
    });

    if (!("stream" in result)) {
      return new Response(JSON.stringify({ error: "No stream from providers" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log interaction asynchronously (don't block response)
    logInteraction(auth.userId, lastUserMsg?.content || "", detectedLang).catch(() => {});

    return new Response(result.stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "x-ai-provider": result.provider,
        "x-detected-language": detectedLang,
      },
    });
  } catch (e) {
    console.error("chat error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Build session context string from student data.
 */
function buildSessionContext(ctx: {
  studentName: string;
  subjects: string[];
  currentSubject?: string;
  currentTopic?: string;
  masteryScores?: Record<string, number>;
  weakTopics?: string[];
  studyPlanWeek?: Record<string, unknown>;
  neglectionFlags?: { subject: string; daysInactive: number; mastery: number }[];
  activeAssignments?: { id: string; title: string; due: string }[];
  detectedLang: string;
}): string {
  const parts: string[] = [];

  parts.push(`Student: ${ctx.studentName || "Student"}`);
  parts.push(`Subjects: ${ctx.subjects.join(", ") || "Not specified"}`);
  parts.push(`Language: ${ctx.detectedLang}`);

  if (ctx.currentSubject) parts.push(`Current Subject: ${ctx.currentSubject}`);
  if (ctx.currentTopic) parts.push(`Current Topic: ${ctx.currentTopic}`);

  if (ctx.masteryScores && Object.keys(ctx.masteryScores).length > 0) {
    const scores = Object.entries(ctx.masteryScores)
      .map(([topic, score]) => `${topic}: ${score}%`)
      .join(", ");
    parts.push(`Mastery Scores: ${scores}`);
  }

  if (ctx.weakTopics && ctx.weakTopics.length > 0) {
    parts.push(`Weak Topics: ${ctx.weakTopics.join(", ")}`);
  }

  if (ctx.neglectionFlags && ctx.neglectionFlags.length > 0) {
    const flags = ctx.neglectionFlags
      .map(f => `${f.subject} (${f.daysInactive}d inactive, ${f.mastery}% mastery)`)
      .join("; ");
    parts.push(`Neglection Flags: ${flags}`);
  }

  if (ctx.activeAssignments && ctx.activeAssignments.length > 0) {
    const assignments = ctx.activeAssignments
      .map(a => `${a.title} (due: ${a.due})`)
      .join("; ");
    parts.push(`Active Assignments: ${assignments}`);
  }

  if (ctx.studyPlanWeek) {
    parts.push(`Study Plan This Week: ${JSON.stringify(ctx.studyPlanWeek)}`);
  }

  return parts.join("\n");
}

/**
 * Log interaction to ovi_interactions table (async, non-blocking).
 */
async function logInteraction(studentId: string, messageText: string, language: string) {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await supabase.from("ovi_interactions").insert({
      student_id: studentId,
      message_text: messageText.slice(0, 2000),
      role: "user",
      language,
    });
  } catch {
    // Silent fail — logging is non-critical
  }
}
