import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiComplete, FORMATTING_PREAMBLE } from "../_shared/ai.ts";
import {
  verifyAuth, rateLimit, corsHeaders, jsonError, sanitizeMessages, RateLimitError
} from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await verifyAuth(req);
    if (!auth.ok) return jsonError(auth.error, auth.status);
    try { rateLimit(auth.userId); } catch (e) {
      if (e instanceof RateLimitError) return jsonError(e.message, 429);
      throw e;
    }

    const { subject, topic, questions, answers, paperType } = await req.json();

    // ── Paper 1 (MCQ): Local grading — no AI needed ──
    if (paperType === "paper1") {
      const results = (questions || []).map((q: any, i: number) => {
        const studentAnswer = answers?.[i] || "";
        const correct = q.correctAnswer || "";
        const isCorrect = studentAnswer.toUpperCase() === correct.toUpperCase();
        const correctText = q.options?.[correct] || correct;
        const studentText = q.options?.[studentAnswer] || studentAnswer;
        return {
          question: q.question,
          studentAnswer: `${studentAnswer}. ${studentText}`,
          correctAnswer: `${correct}. ${correctText}`,
          marksAllocated: 1,
          marksAwarded: isCorrect ? 1 : 0,
          explanation: isCorrect
            ? `Correct! The answer is ${correct}. ${correctText}`
            : `Incorrect. You chose ${studentAnswer}. ${studentText}. The correct answer is ${correct}. ${correctText}`,
          improvementAdvice: isCorrect
            ? ""
            : `The correct answer is "${correct}. ${correctText}". Review ${q.topic || topic} — focus on understanding WHY ${correct} is correct, not just memorising the answer.`,
          commandWordFeedback: "",
        };
      });

      const totalScore = results.reduce((sum: number, r: any) => sum + r.marksAwarded, 0);
      const maxScore = results.length;
      const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

      // Identify weak and strong concepts
      const wrongTopics = results.filter((r: any) => r.marksAwarded === 0).map((r: any) => r.question.substring(0, 80));
      const correctTopics = results.filter((r: any) => r.marksAwarded > 0).map((r: any) => r.question.substring(0, 80));

      return new Response(JSON.stringify({
        results, totalScore, maxScore, percentage,
        strongConcepts: correctTopics.slice(0, 3),
        weakConcepts: wrongTopics.slice(0, 3),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "x-ai-provider": "local" },
      });
    }

    // ── Paper 2 (Structured): AI grading with command word enforcement ──
    const gradingPrompt = `You are a ZIMSEC O-Level examiner marking a Paper 2 assessment.

Subject: ${subject}
Topic: ${topic}

MARKING CRITERIA:
1. For each question, check if the student's answer meets the COMMAND WORD requirement:
   - [Define] = Must be 1-2 precise sentences. No waffle. Full marks only for exact definitions.
   - [Explain] = Must include HOW and WHY. Cause → Effect → Result pattern required.
   - [Describe] = Must be in logical sequence. Step-by-step account.
   - [Calculate] = Must show ALL working. Partial marks for correct method even with wrong answer.
   - [Evaluate] = Must present BOTH sides AND a conclusion/judgment.
   - [Justify] = Must give EVIDENCE/REASONS supporting a position.
   - [Discuss] = Must give FOR and AGAINST arguments, then conclude.
   - [Suggest] = Must apply knowledge to new context. Credit creative but logical answers.

2. Award marks up to the allocated amount [X marks].
3. Give PARTIAL marks where appropriate (e.g., 3 out of 4 for a mostly correct answer).
4. For blank or completely irrelevant answers, award 0 marks.

CRITICAL — correctAnswer FIELD:
- You MUST provide a FULL MODEL ANSWER in the correctAnswer field for EVERY question.
- The model answer should be what a top student would write to get FULL marks.
- It must follow the command word requirement (e.g., for [Explain], the model answer shows HOW and WHY).
- The student needs this to learn — never leave correctAnswer vague or generic.

CRITICAL — explanation FIELD:
- Explain WHY the student got the marks they did.
- Point out what was missing or wrong.
- Reference the command word requirement.

CRITICAL — improvementAdvice FIELD:
- Give SPECIFIC, ACTIONABLE advice on how to improve.
- Don't just say "revise more" — say WHAT to revise and HOW.
- If the student misunderstood a concept, explain the concept briefly.

${FORMATTING_PREAMBLE}

You MUST respond with a tool call returning the graded results.`;

    const questionsText = (questions || []).map((q: any, i: number) => {
      return `Q${i + 1}: ${q.question}\nMarks: ${q.marksAllocated || 1}\nStudent Answer: ${answers?.[i] || "(blank)"}`;
    }).join("\n\n");

    const tools = [{
      type: "function",
      function: {
        name: "return_graded_results",
        description: "Return the graded assessment results",
        parameters: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  studentAnswer: { type: "string" },
                  correctAnswer: { type: "string" },
                  marksAllocated: { type: "number" },
                  marksAwarded: { type: "number" },
                  explanation: { type: "string" },
                  improvementAdvice: { type: "string" },
                  commandWordFeedback: { type: "string" },
                },
                required: ["question", "studentAnswer", "correctAnswer", "marksAllocated", "marksAwarded", "explanation", "improvementAdvice", "commandWordFeedback"],
              },
            },
            totalScore: { type: "number" },
            maxScore: { type: "number" },
            percentage: { type: "number" },
            strongConcepts: { type: "array", items: { type: "string" } },
            weakConcepts: { type: "array", items: { type: "string" } },
          },
          required: ["results", "totalScore", "maxScore", "percentage", "strongConcepts", "weakConcepts"],
        },
      },
    }];

    const result = await aiComplete({
      messages: [
        { role: "system", content: gradingPrompt },
        { role: "user", content: `Mark this assessment:\n\n${questionsText}` },
      ],
      tools,
      toolChoice: { type: "function", function: { name: "return_graded_results" } },
      timeoutMs: 45_000,
      maxTokens: 4000,
    });

    if ("stream" in result) {
      return new Response(JSON.stringify({ error: "Unexpected stream" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (result.toolCall) {
      return new Response(JSON.stringify(result.toolCall.arguments), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "x-ai-provider": result.provider },
      });
    }

    // Fallback: try parsing content
    try {
      const parsed = JSON.parse(result.content);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "x-ai-provider": result.provider },
      });
    } catch {
      // Fallback marking: award 40% for non-blank answers
      const results = (questions || []).map((q: any, i: number) => {
        const studentAnswer = answers?.[i] || "";
        const marks = q.marksAllocated || 1;
        const awarded = studentAnswer.trim() ? Math.round(marks * 0.4) : 0;
        const cmdWord = q.commandWord || "Explain";
        return {
          question: q.question,
          studentAnswer,
          correctAnswer: `A complete ${cmdWord.toLowerCase()} response should address all key points for ${topic}. Review the revision notes for ${subject} — ${topic} for the model answer.`,
          marksAllocated: marks,
          marksAwarded: awarded,
          explanation: studentAnswer.trim()
            ? "AI grading temporarily unavailable. Partial marks awarded for attempting the question. Please review the model answer and revision notes."
            : "No answer provided. You must attempt every question — even partial answers can earn marks.",
          improvementAdvice: studentAnswer.trim()
            ? `Review the revision notes for ${subject} — ${topic}. Focus on the "${cmdWord}" command word: ${cmdWord === "Explain" ? "you must include HOW and WHY" : cmdWord === "Define" ? "give a precise 1-2 sentence definition" : cmdWord === "Describe" ? "give a step-by-step account in sequence" : "address all key points clearly"}.`
            : `Never leave a question blank! Even if you're unsure, write something related to the topic. You can earn partial marks for showing understanding.`,
          commandWordFeedback: `This question requires a "${cmdWord}" response.`,
        };
      });

      const totalScore = results.reduce((sum: number, r: any) => sum + r.marksAwarded, 0);
      const maxScore = results.reduce((sum: number, r: any) => sum + r.marksAllocated, 0);

      return new Response(JSON.stringify({
        results, totalScore, maxScore,
        percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
        strongConcepts: [], weakConcepts: [topic],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "x-ai-provider": "fallback" },
      });
    }
  } catch (e) {
    console.error("ovi_arena_grader error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
