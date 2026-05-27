import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiComplete, FORMATTING_PREAMBLE } from "../_shared/ai.ts";
import { verifyAuth, rateLimit, corsHeaders, jsonError, sanitizeString, sanitizeStringArray, sanitizeMessages, RateLimitError } from "../_shared/auth.ts";

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

    const { messages, studentName, subjects } = await req.json();

    const safeName = sanitizeString(studentName, "studentName", 100);
    const safeSubjects = sanitizeStringArray(subjects, "subjects", 20);
    const safeMessages = sanitizeMessages(messages, 12);

    const systemPrompt = `You are OVI, a friendly and encouraging AI tutor for ZIMSEC O-Level students in Zimbabwe. The student's name is ${safeName || "Student"} and they study: ${safeSubjects.join(", ")}.

Personality:
- Warm, encouraging, patient. Break things down step by step. Provide memory tricks and exam tips.
- Reference ZIMSEC HBC exam format. Use Zimbabwean context where helpful. Celebrate progress.

${FORMATTING_PREAMBLE}

Always provide accurate, curriculum-aligned information. If unsure about something, say so honestly.`;

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

    return new Response(result.stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "x-ai-provider": result.provider },
    });
  } catch (e) {
    console.error("chat error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
