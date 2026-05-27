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

    const { subjects, mastery, assessments } = await req.json();

    const safeSubjects = Array.isArray(subjects)
      ? subjects.slice(0, 20).map((s: any) => sanitizeString(s, "subject", 100))
      : [];

    const masteryInfo = mastery && mastery.length > 0
      ? mastery.slice(0, 50).map((m: any) => `${sanitizeString(m?.subject, "subject", 50)} - ${sanitizeString(m?.topic, "topic", 100)}: ${Number(m?.score) || 0}% (last revised: ${sanitizeString(m?.lastRevised, "date", 30) || "never"})`).join("\n")
      : "No mastery data yet.";
    const recentResults = assessments && assessments.length > 0
      ? assessments.slice(-10).map((a: any) => `${sanitizeString(a?.subject, "subject", 50)} - ${sanitizeString(a?.topic, "topic", 100)}: ${Number(a?.percentage) || 0}%`).join("\n")
      : "No assessment history.";

    const systemPrompt = `You are OVI, a ZIMSEC study planner. Create a personalised weekly study plan.

Subjects: ${safeSubjects.join(", ")}

Mastery:
${masteryInfo}

Recent assessments:
${recentResults}

Prioritise: weakest mastery first, topics not revised recently, then exam skills. Generate 5-8 tasks for the week.`;

    const result = await aiComplete({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate my personalised study plan for this week." },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_study_plan",
          description: "Return the study plan items",
          parameters: {
            type: "object",
            properties: {
              plan: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    subject: { type: "string" },
                    topic: { type: "string" },
                    activity: { type: "string" },
                    scheduledFor: { type: "string" },
                  },
                  required: ["subject", "topic", "activity"],
                  additionalProperties: false,
                },
              },
            },
            required: ["plan"],
            additionalProperties: false,
          },
        },
      }],
      toolChoice: { type: "function", function: { name: "return_study_plan" } },
      timeoutMs: 25_000,
    });

    if ("stream" in result) throw new Error("unexpected stream");
    if (!result.toolCall) throw new Error("No study plan returned");

    return new Response(JSON.stringify({ ...result.toolCall.arguments, provider: result.provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-study-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
