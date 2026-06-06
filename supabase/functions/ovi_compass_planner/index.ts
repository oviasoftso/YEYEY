import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiComplete, FORMATTING_PREAMBLE } from "../_shared/ai.ts";
import {
  verifyAuth, rateLimit, corsHeaders, jsonError,
  sanitizeStringArray, sanitizeMessages, RateLimitError
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

    const { subjects, mastery, assessments, upcomingTests, zimsecDates } = await req.json();

    const safeSubjects = sanitizeStringArray(subjects, "subjects", 20);

    // Format mastery data for the prompt
    const masteryLines = (mastery || [])
      .slice(0, 50)
      .map((m: any) => {
        const daysSince = m.lastRevised
          ? Math.floor((Date.now() - new Date(m.lastRevised).getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        return `- ${m.subject} / ${m.topic}: ${m.mastery}% mastery, last revised ${daysSince} days ago`;
      })
      .join("\n");

    const assessmentLines = (assessments || [])
      .slice(-10)
      .map((a: any) => `- ${a.subject} / ${a.topic}: ${a.percentage}%`)
      .join("\n");

    // ZIMSEC exam countdown
    const now = new Date();
    const examInfo = zimsecDates
      ? `ZIMSEC exam dates provided: ${JSON.stringify(zimsecDates)}`
      : `No specific exam dates provided. Assume O-Level exams start October/November 2026.`;

    const upcomingTestInfo = (upcomingTests || []).length > 0
      ? `Upcoming school tests: ${upcomingTests.map((t: any) => `${t.subject} on ${t.date}`).join(", ")}`
      : "No upcoming school tests flagged.";

    const systemPrompt = `You are OVI COMPASS — the adaptive study planning engine of Ovia Prep.

Your task: Generate a personalised weekly study plan for a ZIMSEC O-Level student.

RULES:
1. Prioritise topics with LOWEST mastery scores first.
2. Prioritise topics NOT revised recently (stale topics lose retention).
3. Factor in ZIMSEC exam weighting — high-weight topics get more time.
4. If a school test is within 48 hours, add a prep buffer task for that subject.
5. Balance the week: no more than 3 hours of study per day, mix subjects to avoid fatigue.
6. Include variety: flashcard review, practice questions, note review, active recall.
7. Output 5-8 tasks for the week.
8. Each task should have: subject, topic, activity (specific and actionable), scheduledFor (ISO date).

${examInfo}
${upcomingTestInfo}

Student subjects: ${safeSubjects.join(", ")}

Mastery data (weakest first priority):
${masteryLines || "No mastery data yet — assume all topics need attention."}

Recent assessment performance:
${assessmentLines || "No assessments yet."}

${FORMATTING_PREAMBLE}

You MUST respond with a tool call returning the study plan as structured JSON.`;

    const tools = [{
      type: "function",
      function: {
        name: "return_study_plan",
        description: "Return the structured weekly study plan",
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
                  scheduledFor: { type: "string", description: "ISO date string" },
                },
                required: ["subject", "topic", "activity", "scheduledFor"],
              },
            },
            rationale: { type: "string", description: "Brief explanation of why this plan was structured this way" },
            estimatedHours: { type: "number", description: "Total estimated study hours for the week" },
            paceProfile: { type: "string", enum: ["fast", "steady", "intensive"], description: "Recommended pace based on student's patterns" },
          },
          required: ["plan", "rationale", "estimatedHours", "paceProfile"],
        },
      },
    }];

    const result = await aiComplete({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: "Generate my study plan for this week." }],
      tools,
      toolChoice: { type: "function", function: { name: "return_study_plan" } },
      timeoutMs: 30_000,
      maxTokens: 2000,
    });

    if ("stream" in result) {
      return new Response(JSON.stringify({ error: "Unexpected stream response" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (result.toolCall) {
      return new Response(JSON.stringify(result.toolCall.arguments), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "x-ai-provider": result.provider },
      });
    }

    // Fallback: try to parse content as JSON
    try {
      const parsed = JSON.parse(result.content);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "x-ai-provider": result.provider },
      });
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse plan", raw: result.content }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("ovi_compass_planner error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
