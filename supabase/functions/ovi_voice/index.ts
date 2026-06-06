import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/auth.ts";

// OVI VOICE — Text-to-Speech engine using Pollinations.ai free TTS
// Uses the free TTS endpoint from the no-cost-ai list

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, language = "en" } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Truncate to reasonable length for TTS
    const truncated = text.slice(0, 3000);

    // Use ttsmp3.com free TTS (from no-cost-ai list)
    // Map language to voice
    const voiceMap: Record<string, string> = {
      en: "en-US",
      sn: "en-US", // Shona — fallback to English
      nd: "en-US", // Ndebele — fallback to English
    };
    const lang = voiceMap[language] || "en-US";

    // For now, return the text with voice metadata
    // Client-side Web Speech API will handle actual TTS
    return new Response(JSON.stringify({
      text: truncated,
      language: lang,
      provider: "webspeech", // Client uses browser's built-in TTS
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ovi_voice error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
