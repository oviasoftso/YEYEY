import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiComplete, FORMATTING_PREAMBLE } from "../_shared/ai.ts";
import {
  verifyAuth, rateLimit, corsHeaders, jsonError, RateLimitError
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

    const { subject, topic, weakConcepts = [], assessmentHistory = [], noteStyle = "summary" } = await req.json();

    const weakSection = weakConcepts.length > 0
      ? `\nCRITICAL: The student struggles with these concepts. START with these and give extra detail:\n${weakConcepts.map((c: string) => `- ${c}`).join("\n")}`
      : "";

    const performanceSection = assessmentHistory.length > 0
      ? `\nRecent assessment scores: ${assessmentHistory.map((a: any) => `${a.topic}: ${a.percentage}%`).join(", ")}`
      : "";

    const styleInstructions: Record<string, string> = {
      summary: "Write concise revision notes with key points highlighted. Use bullet points and short paragraphs.",
      deep: "Write comprehensive revision notes with detailed explanations, worked examples, and connections between concepts.",
      visual_aids: "Write revision notes with ASCII diagrams, tables, and visual representations where possible. Use mnemonics extensively.",
    };

    const systemPrompt = `You are OVI VAULT — the smart revision notes engine of Ovia Prep.

Generate personalised, gap-targeted revision notes for a ZIMSEC O-Level student.

Subject: ${subject}
Topic: ${topic}
Note Style: ${noteStyle}
${styleInstructions[noteStyle] || styleInstructions.summary}
${weakSection}
${performanceSection}

STRUCTURE (MANDATORY ORDER):
1. **Priority: Weak Areas** — Start with the student's weak concepts (if any). Explain from first principles.
2. **Key Definitions** — All important terms with precise ZIMSEC-standard definitions.
3. **Core Concepts** — Main ideas, laws, principles, formulas.
4. **Worked Examples** — Step-by-step solutions showing proper ZIMSEC technique.
5. **Remember This** — Mnemonic devices for difficult-to-remember content.
6. **Common Examiner Traps** — Mistakes students frequently make.
7. **Exam Tips** — ZIMSEC command words, mark allocation hints, what examiners look for.

${FORMATTING_PREAMBLE}

You MUST respond with a tool call returning the structured notes.`;

    const tools = [{
      type: "function",
      function: {
        name: "return_notes",
        description: "Return the structured revision notes",
        parameters: {
          type: "object",
          properties: {
            content: { type: "string", description: "Full revision notes in markdown" },
            keyTerms: {
              type: "array",
              items: { type: "string" },
              description: "Key terms extracted from the notes",
            },
            flashcards: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  front: { type: "string" },
                  back: { type: "string" },
                },
                required: ["front", "back"],
              },
              description: "Flashcard pairs generated from the content",
            },
            examTips: {
              type: "array",
              items: { type: "string" },
              description: "ZIMSEC exam tips for this topic",
            },
          },
          required: ["content", "keyTerms", "flashcards", "examTips"],
        },
      },
    }];

    const result = await aiComplete({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate revision notes for ${subject} — ${topic}.` },
      ],
      tools,
      toolChoice: { type: "function", function: { name: "return_notes" } },
      timeoutMs: 30_000,
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

    // Fallback
    try {
      const parsed = JSON.parse(result.content);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "x-ai-provider": result.provider },
      });
    } catch {
      return new Response(JSON.stringify({
        content: `# ${subject} — ${topic}\n\n## Key Definitions\n\n*Revision notes for this topic will appear here after generation.*\n\n## Core Concepts\n\n[Content generated by OVI VAULT]\n\n## Exam Tips\n\n- Read the command word carefully before answering\n- Show all working for calculation questions\n- Use ZIMSEC-standard terminology`,
        keyTerms: [topic, subject],
        flashcards: [
          { front: `What is the main concept of ${topic}?`, back: `Key concept in ${subject}` },
          { front: `Define ${topic}`, back: `See revision notes for ${subject}` },
        ],
        examTips: [
          "Read command words carefully — they tell you what the examiner expects",
          "Show all working for calculations — you get marks for method",
          "Use ZIMSEC-standard terminology in your answers",
        ],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "x-ai-provider": "fallback" },
      });
    }
  } catch (e) {
    console.error("ovi_vault_note_generator error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
