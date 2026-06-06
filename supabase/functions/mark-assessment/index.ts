import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiComplete, FORMATTING_PREAMBLE } from "../_shared/ai.ts";
import { verifyAuth, rateLimit, corsHeaders, jsonError, sanitizeString, sanitizeStringArray, RateLimitError } from "../_shared/auth.ts";

function marksFromQuestion(question: string, fallback = 5) {
  const match = question.match(/\[(\d+(?:\.\d+)?)\s*marks?/i);
  return match ? Number(match[1]) : fallback;
}

function fallbackMarking(subject: string, topic: string, questions: string[], answers: string[]) {
  // Extract command words from questions
  const commandWords = ["Define", "State", "Explain", "Describe", "Calculate", "Evaluate", "Justify", "Discuss", "Suggest", "Compare", "Determine", "Deduce"];

  const results = questions.map((q, i) => {
    const answer = answers[i]?.trim();
    const marksAllocated = marksFromQuestion(q);
    const marksAwarded = answer ? Math.max(1, Math.round(marksAllocated * 0.4)) : 0;

    // Detect command word
    const cmdWord = commandWords.find(c => q.includes(`[${c}]`)) || "Explain";

    const cmdGuidance: Record<string, string> = {
      "Define": "Give a precise 1-2 sentence definition. Use ZIMSEC-standard terminology.",
      "State": "Name the fact or concept briefly — no explanation needed.",
      "Explain": "Include HOW and WHY. Use cause → effect → result structure.",
      "Describe": "Give a step-by-step account in logical sequence.",
      "Calculate": "Show ALL working steps. Include units. Box your final answer.",
      "Evaluate": "Present BOTH sides (strengths and weaknesses) AND give a conclusion/judgment.",
      "Justify": "Give EVIDENCE and REASONS supporting your position.",
      "Discuss": "Give arguments FOR and AGAINST, then conclude with your view.",
      "Suggest": "Apply your knowledge to a new situation. Be creative but logical.",
      "Compare": "State similarities AND differences between the two things.",
      "Determine": "Use the given information to reach a conclusion. Show your method.",
      "Deduce": "Reach a conclusion FROM the information given in the question.",
    };

    return {
      question: q,
      studentAnswer: answer || "Not answered",
      correctAnswer: `**Model Answer (${cmdWord} — ${marksAllocated} marks):**\n\nThis is a "${cmdWord}" question on **${topic}** in ${subject}.\n\n**${cmdGuidance[cmdWord] || "Address all key points clearly."}**\n\n**Key points a top student would include:**\n• Define/state the key concept using correct ZIMSEC terminology\n• Explain the underlying principles with cause → effect → result structure\n• Give a specific example relevant to ${topic}\n• Use correct scientific/mathematical notation where applicable\n\n**How to structure your ${marksAllocated}-mark response:**\n1. Opening statement or definition (${Math.max(1, Math.round(marksAllocated * 0.2))} marks)\n2. Detailed explanation with reasoning (${Math.max(1, Math.round(marksAllocated * 0.4))} marks)\n3. Example, calculation, or application (${Math.max(1, Math.round(marksAllocated * 0.3))} marks)\n4. Conclusion or final answer (${Math.max(1, Math.round(marksAllocated * 0.1))} marks)\n\n⚠️ **Note:** AI grading was unavailable for this session. Review the revision notes for **${subject} — ${topic}** to see the full model answer with all marking points.`,
      marksAllocated,
      marksAwarded,
      explanation: answer
        ? `You attempted this ${cmdWord.toLowerCase()} question and earned ${marksAwarded} out of ${marksAllocated} marks.\n\n${marksAwarded < marksAllocated ? `**What to improve:** ${cmdGuidance[cmdWord] || "Address all key points more thoroughly."}\n\nCompare your answer with the model answer above — look for key points you missed.` : "Excellent work! Your answer covers the key points."}\n\n**Your answer:**\n${answer}`
        : `**No answer provided** — 0 marks.\n\nNever leave a question blank! Even a partial answer can earn marks.\n\nThis is a "${cmdWord}" question: ${cmdGuidance[cmdWord] || "Address all key points."}\n\nThe model answer above shows exactly what you should write.`,
      improvementAdvice: answer
        ? `**Action plan for "${cmdWord}" questions on ${topic}:**\n\n${cmdGuidance[cmdWord] || "Address all key points."}\n\n**Specific steps:**\n1. Open your revision notes to ${subject} — ${topic}\n2. Read the key definitions and principles\n3. Practise writing a ${marksAllocated}-mark response using the structure in the model answer\n4. Time yourself — aim for ${Math.max(2, marksAllocated)} minutes per ${marksAllocated} marks\n\n**Remember:** ZIMSEC examiners award marks for specific key points. Make sure you hit all of them.`
        : `**NEVER leave a question blank!**\n\nThis "${cmdWord}" question is worth ${marksAllocated} marks.\n\n${cmdGuidance[cmdWord]} Even writing 2-3 relevant points could earn you partial marks.\n\n**Quick strategy:** Read the question, identify the command word, then write whatever you know about ${topic}. Partial marks add up!`,
    };
  });
  const totalScore = results.reduce((sum, r) => sum + r.marksAwarded, 0);
  const maxScore = results.reduce((sum, r) => sum + r.marksAllocated, 0) || 1;
  return {
    results,
    totalScore,
    maxScore,
    percentage: Math.round((totalScore / maxScore) * 100),
    strongConcepts: results.filter((r) => r.marksAwarded > 0).map((r) => r.question.slice(0, 60)).slice(0, 5),
    weakConcepts: results.filter((r) => r.marksAwarded < r.marksAllocated * 0.5).map((r) => r.question.slice(0, 60)).slice(0, 5),
  };
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

    const { subject, topic, questions, answers, paperType = "paper2" } = await req.json();

    const safeSubject = sanitizeString(subject, "subject", 100);
    const safeTopic = sanitizeString(topic, "topic", 200);

    // Paper 1: auto-mark MCQs locally, no AI needed
    if (paperType === "paper1") {
      const results = questions.map((q: any, i: number) => {
        const studentAnswer = answers[i] || "(no answer)";
        const isCorrect = studentAnswer === q.correctAnswer;
        return {
          question: q.question,
          studentAnswer: studentAnswer === "(no answer)" ? "Not answered" : `${studentAnswer}: ${q.options[studentAnswer] || ""}`,
          correctAnswer: `${q.correctAnswer}: ${q.options[q.correctAnswer]}`,
          marksAllocated: 1,
          marksAwarded: isCorrect ? 1 : 0,
          explanation: isCorrect
            ? "Correct! Well done."
            : `The correct answer is ${q.correctAnswer}: ${q.options[q.correctAnswer]}.${studentAnswer === "(no answer)" ? " You did not select an answer for this question." : ` You selected ${studentAnswer}: ${q.options[studentAnswer] || studentAnswer}.`}`,
          improvementAdvice: isCorrect
            ? "Keep it up!"
            : `Review this concept. The key point is: ${q.options[q.correctAnswer]}.`,
        };
      });

      const totalScore = results.reduce((sum: number, r: any) => sum + r.marksAwarded, 0);
      const maxScore = results.length;
      const percentage = Math.round((totalScore / maxScore) * 100);
      const strongConcepts = results.filter((r: any) => r.marksAwarded > 0).map((r: any) => r.question.substring(0, 60));
      const weakConcepts = results.filter((r: any) => r.marksAwarded === 0).map((r: any) => r.question.substring(0, 60));

      return new Response(JSON.stringify({ results, totalScore, maxScore, percentage, strongConcepts: strongConcepts.slice(0, 5), weakConcepts: weakConcepts.slice(0, 5) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Paper 2: AI marking
    const questionsWithAnswers = questions.map((q: string, i: number) => {
      const answer = answers[i]?.trim();
      return `Question ${i + 1}: ${q}\nStudent Answer: ${answer || "(left blank)"}`;
    }).join("\n\n");

    // Optimised prompt: use FORMATTING_PREAMBLE for formatting, keep only marking rules here
    const systemPrompt = `You are OVI, an expert ZIMSEC O-Level examiner for ${safeSubject}, topic: ${safeTopic}.
Mark each student answer step-by-step like a real ZIMSEC examiner using partial marking.

${FORMATTING_PREAMBLE}

CRITICAL RULES:
1. If a student left a question blank or did not answer:
   - Award 0 marks for that question
   - Still provide the FULL correct/model answer with all working shown
   - Still provide a detailed explanation
   - Give specific advice on how to approach this type of question

2. The correctAnswer field MUST contain a FULL MODEL ANSWER — not just a summary or hint.
   - This is what a top student would write to get FULL marks
   - Include all steps, working, key terms, and structure
   - The student uses this to learn — it must be complete and educational

3. The explanation field MUST explain WHY marks were given or deducted
   - Reference specific points the student made or missed
   - Compare their answer to the model answer

4. The improvementAdvice field MUST be specific and actionable
   - Don't just say "revise more" — say WHAT to revise and HOW
   - Reference the command word requirement if applicable
   - Suggest specific study strategies

For each question provide:
- question: the original question text (preserve any LaTeX formatting)
- studentAnswer: what the student wrote (or "Not answered" if blank)
- correctAnswer: the FULL model/ideal answer with all steps and working shown (use LaTeX for formulas, markdown tables for tabular data)
- marksAllocated: total marks for that question (parse from [X marks] in question, default 5)
- marksAwarded: marks the student earned (0 for blank answers)
- explanation: thorough explanation of the answer and why marks were given/deducted (use LaTeX for formulas)
- improvementAdvice: specific advice to improve (use LaTeX for any formulas referenced)

Also provide a summary with:
- totalScore: sum of all marksAwarded
- maxScore: sum of all marksAllocated
- percentage: (totalScore/maxScore)*100 rounded
- strongConcepts: array of concepts the student demonstrated well
- weakConcepts: array of concepts needing improvement`;

    const markingTool = {
      type: "function",
      function: {
        name: "return_marking",
        description: "Return the marking results for all questions",
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
                },
                required: ["question", "studentAnswer", "correctAnswer", "marksAllocated", "marksAwarded", "explanation", "improvementAdvice"],
                additionalProperties: false,
              },
            },
            totalScore: { type: "number" },
            maxScore: { type: "number" },
            percentage: { type: "number" },
            strongConcepts: { type: "array", items: { type: "string" } },
            weakConcepts: { type: "array", items: { type: "string" } },
          },
          required: ["results", "totalScore", "maxScore", "percentage", "strongConcepts", "weakConcepts"],
          additionalProperties: false,
        },
      },
    };

    let payload: any;
    let provider = "fallback";
    try {
      const result = await aiComplete({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: questionsWithAnswers },
        ],
        tools: [markingTool],
        toolChoice: { type: "function", function: { name: "return_marking" } },
        timeoutMs: 15_000,
        maxTokens: 2400,
      });

      if ("stream" in result) throw new Error("unexpected stream");
      if (!result.toolCall) throw new Error("No marking returned");
      payload = result.toolCall.arguments;
      provider = result.provider;
    } catch (e) {
      console.error("AI marking failed, using stable fallback marking:", e);
      payload = fallbackMarking(safeSubject, safeTopic, questions, answers);
    }

    return new Response(JSON.stringify({ ...payload, provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("mark-assessment error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
