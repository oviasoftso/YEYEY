import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiComplete } from "../_shared/ai.ts";
import { verifyAuth, rateLimit, corsHeaders, jsonError, sanitizeString, RateLimitError } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await verifyAuth(req);
    if (!auth.ok) return jsonError(auth.error, auth.status);
    try { rateLimit(auth.userId); } catch (e) {
      if (e instanceof RateLimitError) return jsonError(e.message, 429);
      throw e;
    }

    const { subjects, questionCount = 10 } = await req.json();

    const safeSubjects = Array.isArray(subjects)
      ? subjects.slice(0, 10).map((s: any) => ({
          subject: sanitizeString(s?.subject, "subject", 100),
          topic: sanitizeString(s?.topic, "topic", 200),
        }))
      : [];
    const safeCount = Math.min(Math.max(Number(questionCount) || 10, 1), 20);

    const subjectList = safeSubjects.map((s: { subject: string; topic: string }) => `- ${s.subject}: ${s.topic}`).join("\n");

    const systemPrompt = `You are OVI, an expert ZIMSEC O-Level examiner. Generate exactly ${safeCount} structured questions as a MIXED assessment across these subjects/topics:
${subjectList}

Rules:
- Distribute questions roughly evenly.
- Prefix each question with its subject in brackets, e.g. "[Physics]".
- Mix definitions, short answers, calculations, and essay-style.
- Include mark allocations like [5 marks] at the end.
- Use GFM markdown tables for tabular data; LaTeX for formulas.`;

    const result = await aiComplete({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a ${safeCount}-question mixed ZIMSEC assessment covering: ${safeSubjects.map((s: { subject: string }) => s.subject).join(", ")}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_questions",
          description: "Return mixed assessment questions",
          parameters: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    subject: { type: "string" },
                    topic: { type: "string" },
                    question: { type: "string" },
                  },
                  required: ["subject", "topic", "question"],
                  additionalProperties: false,
                },
              },
            },
            required: ["questions"],
            additionalProperties: false,
          },
        },
      }],
      toolChoice: { type: "function", function: { name: "return_questions" } },
      timeoutMs: 30_000,
    });

    if ("stream" in result) throw new Error("unexpected stream");
    if (!result.toolCall) throw new Error("No questions returned");

    return new Response(JSON.stringify({ questions: result.toolCall.arguments.questions, provider: result.provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-mixed-assessment error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
