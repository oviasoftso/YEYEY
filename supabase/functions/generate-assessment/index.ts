import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiComplete, FORMATTING_PREAMBLE } from "../_shared/ai.ts";
import { verifyAuth, rateLimit, corsHeaders, jsonError, sanitizeString, RateLimitError } from "../_shared/auth.ts";

function normaliseQuestions(raw: unknown, paperType: string, count: number) {
  const items = Array.isArray(raw) ? raw : [];
  if (paperType === "paper1") {
    return items
      .filter((q: any) => q?.question && q?.options?.A && q?.options?.B && q?.options?.C && q?.options?.D && q?.correctAnswer)
      .slice(0, count);
  }
  return items
    .map((q: any) => typeof q === "string" ? q : q?.question)
    .filter((q: unknown): q is string => typeof q === "string" && q.trim().length > 10)
    .slice(0, count);
}

function fallbackQuestions(subject: string, topic: string, paperType: string, count: number) {
  if (paperType === "paper1") {
    return Array.from({ length: count }, (_, i) => ({
      question: `${i + 1}. Which statement best applies to ${topic} in ${subject}?`,
      options: {
        A: `A correct ZIMSEC concept linked to ${topic}`,
        B: "An unrelated statement",
        C: "A common misconception",
        D: "A partly correct but incomplete statement",
      },
      correctAnswer: "A",
    }));
  }
  const mathsNote = subject === "Mathematics A"
    ? "Use Maths A syllabus scope."
    : subject === "Mathematics B"
      ? "Use Maths B syllabus scope, including extended problem solving where appropriate."
      : "";
  return [
    `1. Define two key terms used in ${topic}. ${mathsNote} [4 marks | 2 min]`,
    `2. State and explain two important principles of ${topic} in ${subject}. [4 marks | 2 min]`,
    `3. Apply your knowledge of ${topic} to solve a short ZIMSEC-style problem. Show all working where calculations are needed. [6 marks | 5 min]`,
    `4. A learner is revising ${topic}. Describe and explain the steps they should follow to answer a structured examination question on this area. [8 marks | 5 min]`,
    `5. Evaluate the importance of ${topic} in ${subject}, using clear examples from the ZIMSEC O-Level syllabus. [10 marks | 8 min]`,
  ].slice(0, count);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await verifyAuth(req);
    if (!auth.ok) return jsonError(auth.error, auth.status);
    try { rateLimit(auth.userId); } catch (e) {
      if (e instanceof RateLimitError) return jsonError(e.message, 429);
      throw e;
    }

    const { subject, topic, questionCount = 5, examMode = false, paperType = "paper2" } = await req.json();

    const safeSubject = sanitizeString(subject, "subject", 100);
    const safeTopic = sanitizeString(topic, "topic", 200);
    const requestedCount = paperType === "paper1" ? Math.max(Number(questionCount) || 10, 10) : Math.min(Math.max(Number(questionCount) || 5, 1), 5);
    const subjectVariant = safeSubject === "Mathematics A"
      ? "This is Mathematics A. Keep the questions within Maths A scope."
      : safeSubject === "Mathematics B"
        ? "This is Mathematics B. Use Maths B scope and extended ZIMSEC problem solving."
        : "";

    const timeNote = `
TIME ALLOCATION per question:
- Questions 1-2: 2 minutes each (easy recall/definitions)
- Question 3: 5 minutes (medium application)
- Questions 4-5: 8 minutes each (hard analysis/evaluation)
Include [X marks | Y min] at the end of each question to show marks AND suggested time.`;

    const tableNote = `
TABLE FORMATTING (for Accounting and any tabular data):
- Use proper markdown table syntax with pipes and dashes
- Always include a header row with column names
- Align columns neatly`;

    const systemPrompt = paperType === "paper1"
      ? `You are OVI, an expert ZIMSEC O-Level examiner for ${safeSubject}, following the Heritage-Based Curriculum (HBC) syllabus.

Generate exactly ${requestedCount} multiple-choice questions on the topic "${safeTopic}" following ZIMSEC Paper 1 format.
${subjectVariant}

${FORMATTING_PREAMBLE}

QUESTION ORDER AND DIFFICULTY PROGRESSION (CRITICAL):
- Questions 1-3: EASY — Knowledge/Recall level. Test definitions, naming, identifying, stating facts.
- Questions 4-6: MODERATE — Comprehension level. Test understanding and explanation.
- Questions 7-8: MODERATE-HARD — Application level. Test problem-solving and applying concepts.
- Questions 9-10: HARD — Analysis/Evaluation level. Test higher-order thinking.

Each question MUST have exactly 4 options (A, B, C, D) and one correct answer.
Distractors should be plausible and based on common student misconceptions.
Use ZIMSEC-standard language and reflect Zimbabwean context where appropriate.
Time: ~1 minute per question.

Return a JSON object with this exact structure:
{
  "questions": [
    {
      "question": "Question text here",
      "options": {"A": "option A text", "B": "option B text", "C": "option C text", "D": "option D text"},
      "correctAnswer": "A"
    }
  ]
}`
      : safeSubject === "Principles of Accounting"
        ? `You are OVI, an expert ZIMSEC O-Level Principles of Accounting examiner following the Heritage-Based Curriculum (HBC) syllabus. Generate exactly ${requestedCount} exam-style Paper 2 structured questions on the topic "${safeTopic}" following ZIMSEC format.

${FORMATTING_PREAMBLE}
${timeNote}
${tableNote}

QUESTION ORDER AND DIFFICULTY PROGRESSION (CRITICAL):
- Question 1: EASY (2 min) — Definitions and basic knowledge. [2-4 marks | 2 min]
- Question 2: EASY-MODERATE (2 min) — Short answer comprehension. [4-6 marks | 2 min]
- Question 3: MODERATE (5 min) — Application. A practical question requiring preparation of a simple account, journal entry, or calculation. [6-8 marks | 5 min]
- Question 4: MODERATE-HARD (5 min) — Extended application. A more complex account preparation or multi-step calculation. [8-10 marks | 5 min]
- Question 5: HARD (8 min) — Analysis/Evaluation. Analyse financial data, explain errors, reconcile accounts. [8-12 marks | 8 min]

For questions requiring accounting tables/statements, include a PROPERLY FORMATTED markdown table.
Mark the question with [TABLE] at the start if it requires an accounting table response.
Use realistic Zimbabwean business scenarios with USD amounts.

Return a JSON object: { "questions": ["question 1 text", "question 2 text", ...] }
Each question must include mark allocations AND time allocation like [4 marks | 2 min].`
        : safeSubject === "Literature in English"
          ? `You are OVI, an expert ZIMSEC O-Level Literature in English examiner following the Heritage-Based Curriculum (HBC) syllabus. Generate exactly ${requestedCount} exam-style Paper 2 structured questions on "${safeTopic}" following ZIMSEC format.

ZIMSEC SET BOOKS:
1. "Valley of Tantalika" by Shimmer Chinodya
2. "Jabu" by Tonderai Matasva
3. "Animal Farm" by George Orwell

${timeNote}

QUESTION ORDER AND DIFFICULTY PROGRESSION (CRITICAL):
- Question 1: EASY (2 min) — Recall/Identification. [2-4 marks | 2 min]
- Question 2: EASY-MODERATE (2 min) — Comprehension. Context-based. [4-6 marks | 2 min]
- Question 3: MODERATE (5 min) — Character analysis. [6-8 marks | 5 min]
- Question 4: MODERATE-HARD (5 min) — Thematic analysis. [8-10 marks | 5 min]
- Question 5: HARD (8 min) — Comparative/Evaluative essay. [10-12 marks | 8 min]

${examMode ? "Include passage-based questions with representative quotes from the set books." : ""}

Return a JSON object: { "questions": ["question 1 text", "question 2 text", ...] }
Each question must include mark allocations AND time like [4 marks | 2 min].`
          : `You are OVI, an expert ZIMSEC O-Level examiner for ${safeSubject}, following the Heritage-Based Curriculum (HBC) syllabus. Generate exactly ${requestedCount} exam-style Paper 2 structured questions on the topic "${safeTopic}" following ZIMSEC format.
${subjectVariant}

${FORMATTING_PREAMBLE}
${timeNote}

QUESTION ORDER AND DIFFICULTY PROGRESSION (CRITICAL):
- Question 1: EASY (2 min) — Definitions and basic recall. [2-4 marks | 2 min]
- Question 2: EASY-MODERATE (2 min) — Short comprehension. [4-6 marks | 2 min]
- Question 3: MODERATE (5 min) — Application. [6-8 marks | 5 min]
- Question 4: MODERATE-HARD (5 min) — Extended response. [8-10 marks | 5 min]
- Question 5: HARD (8 min) — Analysis/Evaluation. [8-12 marks | 8 min]

${examMode ? "This is a full mock exam. Include realistic difficulty progression matching actual ZIMSEC papers." : ""}

Include questions that relate to Zimbabwean context where appropriate.

Return a JSON object: { "questions": ["question 1 text", "question 2 text", ...] }
Each question must include mark allocations AND time like [4 marks | 2 min]. Use ZIMSEC command words.`;

    const toolSchema = paperType === "paper1"
      ? {
          type: "function",
          function: {
            name: "return_questions",
            description: "Return the generated MCQ questions",
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
                          A: { type: "string" },
                          B: { type: "string" },
                          C: { type: "string" },
                          D: { type: "string" },
                        },
                        required: ["A", "B", "C", "D"],
                        additionalProperties: false,
                      },
                      correctAnswer: { type: "string" },
                    },
                    required: ["question", "options", "correctAnswer"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        }
      : {
          type: "function",
          function: {
            name: "return_questions",
            description: "Return the generated exam questions",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: { type: "string" },
                  description: "Array of exam question strings",
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        };

    let questions: any[] = [];
    let provider = "fallback";
    try {
      const result = await aiComplete({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate exactly ${requestedCount} ${paperType === "paper1" ? "multiple-choice" : "Paper 2 structured"} ZIMSEC O-Level HBC ${safeSubject} questions on: ${safeTopic}. Question 1 = easiest (definitions/recall, 2 min); end with the hardest (analysis/evaluation, 8 min). Include per-question time allocation.` },
        ],
        tools: [toolSchema],
        toolChoice: { type: "function", function: { name: "return_questions" } },
        timeoutMs: 20_000,
        maxTokens: paperType === "paper1" ? 3000 : 2600,
      });

      if ("stream" in result) throw new Error("unexpected stream");
      if (!result.toolCall) throw new Error("No questions returned");
      questions = normaliseQuestions(result.toolCall.arguments.questions, paperType, requestedCount);
      provider = result.provider;
    } catch (e) {
      console.error("AI generation failed, using stable fallback questions:", e);
    }

    if (questions.length < requestedCount) {
      questions = fallbackQuestions(safeSubject, safeTopic, paperType, requestedCount);
      provider = provider === "fallback" ? "fallback" : `${provider}+fallback`;
    }

    return new Response(JSON.stringify({ questions, paperType, provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-assessment error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
