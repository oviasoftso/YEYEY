import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiComplete, FORMATTING_PREAMBLE } from "../_shared/ai.ts";
import { verifyAuth, rateLimit, corsHeaders, jsonError, sanitizeString, sanitizeStringArray, RateLimitError } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await verifyAuth(req);
    if (!auth.ok) return jsonError(auth.error, auth.status);
    try { rateLimit(auth.userId); } catch (e) {
      if (e instanceof RateLimitError) return jsonError(e.message, 429);
      throw e;
    }

    const { subject, topic, weakConcepts, assessmentHistory } = await req.json();

    const safeSubject = sanitizeString(subject, "subject", 100);
    const safeTopic = sanitizeString(topic, "topic", 200);
    const safeWeak = sanitizeStringArray(weakConcepts, "weakConcepts", 20);

    let dataContext = "";
    if (safeWeak.length > 0) {
      dataContext += `\n\nCRITICAL — The student has demonstrated weakness in these specific concepts: ${safeWeak.join(", ")}.
Give extra attention and worked examples specifically targeting these gaps.`;
    }
    if (assessmentHistory && assessmentHistory.length > 0) {
      const recentScores = assessmentHistory.slice(-5).map((a: any) => `${sanitizeString(a?.subject, "subject", 50)} ${sanitizeString(a?.topic, "topic", 100)}: ${Number(a?.percentage) || 0}%`).join(", ");
      dataContext += `\n\nRecent assessment performance: ${recentScores}. Tailor depth to this level.`;
    }

    const systemPrompt = `You are OVI, an expert ZIMSEC O-Level revision guide for ${safeSubject}. Generate comprehensive, DATA-DRIVEN revision notes for the topic "${safeTopic}".

These notes must NOT be generic — tailor them to the student's gaps.${dataContext}

Use these sections:

# ${safeTopic} — Targeted Revision Notes

## Your Weak Areas (Priority Focus)
- If weak concepts are listed above, address each thoroughly with worked examples.
- Otherwise, cover the most commonly misunderstood concepts in this topic.

## Key Definitions
## Core Concepts
## Important Formulas/Rules (if applicable)
## Worked Examples (3-4, step-by-step)
## Memory Tricks
## Exam Tips (ZIMSEC command words, mark allocation hints, common mistakes)

${FORMATTING_PREAMBLE}`;

    const result = await aiComplete({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate ZIMSEC O-Level revision notes for ${safeSubject}: ${safeTopic}. Focus on weak areas.` },
      ],
      timeoutMs: 30_000,
    });

    if ("stream" in result) throw new Error("unexpected stream");
    return new Response(JSON.stringify({ content: result.content || "Failed to generate notes.", provider: result.provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-notes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
