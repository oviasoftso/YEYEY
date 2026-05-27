/**
 * Multi-provider AI gateway with 5-tier fallback.
 *
 * Order: Gemini → OpenAI → Anthropic → Groq → OpenRouter.
 * All providers are accessed via OpenAI-compatible chat-completions endpoints.
 *
 * Public surface:
 *   - aiComplete({ messages, tools?, stream?, ... }) → returns either:
 *       • { content, toolCall, provider }   (non-streaming)
 *       • { stream: ReadableStream, provider } (streaming SSE in OpenAI format)
 *   - FORMATTING_PREAMBLE — single source of truth for output rules.
 */

export const FORMATTING_PREAMBLE = `OUTPUT FORMAT (CRITICAL — rendered with react-markdown + KaTeX):
- Use markdown only for prose: **bold**, *italic*, ## headings, - bullets, > blockquotes.
- For tables ALWAYS use GitHub-Flavored Markdown (pipes + separator row). NEVER use HTML <table> tags.
- For ALL math/physics/chemistry, wrap in $...$ (inline) or $$...$$ (block).
- LaTeX commands like \\frac, \\text, \\sqrt, \\Delta, \\rightarrow MUST live inside $...$ or $$...$$.
- NEVER emit text-mode LaTeX outside math: no \\textit, \\textbf, \\emph, \\underline, \\section, \\begin, \\end, \\item, \\\\.
- Use markdown equivalents instead.`;

type Role = "system" | "user" | "assistant" | "tool";
export interface ChatMessage {
  role: Role;
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface AIToolCall {
  name: string;
  arguments: any;
}

export interface AICompleteOptions {
  messages: ChatMessage[];
  tools?: any[];
  toolChoice?: any;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

interface ProviderConfig {
  name: string;
  envKey: string;
  url: string;
  model: string;
  kind?: "openai" | "anthropic";
  authHeader: (k: string) => Record<string, string>;
}

const PROVIDERS: ProviderConfig[] = [
  {
    name: "gemini",
    envKey: "GEMINI_API_KEY",
    // Google's OpenAI-compatible endpoint
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    model: "gemini-2.5-flash",
    authHeader: (k) => ({ Authorization: `Bearer ${k}` }),
  },
  {
    name: "openai",
    envKey: "OPENAI_API_KEY",
    url: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
    authHeader: (k) => ({ Authorization: `Bearer ${k}` }),
  },
  {
    name: "groq",
    envKey: "GROQ_API_KEY",
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
    authHeader: (k) => ({ Authorization: `Bearer ${k}` }),
  },
  {
    name: "anthropic",
    envKey: "ANTHROPIC_API_KEY",
    url: "https://api.anthropic.com/v1/messages",
    model: "claude-3-5-haiku-latest",
    kind: "anthropic",
    authHeader: (k) => ({
      "x-api-key": k,
      "anthropic-version": "2023-06-01",
    }),
  },
  {
    name: "openrouter",
    envKey: "OPENROUTER_API_KEY",
    url: "https://openrouter.ai/api/v1/chat/completions",
    model: "google/gemini-2.5-flash",
    authHeader: (k) => ({
      Authorization: `Bearer ${k}`,
      "HTTP-Referer": "https://oviaprep.app",
      "X-Title": "OVIA Prep",
    }),
  },
];

// In-memory unhealthy marker (per isolate) — providers are skipped for 60s after failure.
const unhealthy = new Map<string, number>();
const COOLDOWN_MS = 60_000;

function isHealthy(name: string) {
  const until = unhealthy.get(name);
  if (!until) return true;
  if (Date.now() > until) {
    unhealthy.delete(name);
    return true;
  }
  return false;
}

function markUnhealthy(name: string) {
  unhealthy.set(name, Date.now() + COOLDOWN_MS);
}

async function callProvider(
  p: ProviderConfig,
  apiKey: string,
  body: any,
  timeoutMs: number,
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const requestBody = p.kind === "anthropic" ? toAnthropicBody(body, p.model) : { ...body, model: p.model };
    return await fetch(p.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...p.authHeader(apiKey) },
      body: JSON.stringify(requestBody),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

function toAnthropicBody(body: any, model: string) {
  const system = (body.messages || [])
    .filter((m: ChatMessage) => m.role === "system")
    .map((m: ChatMessage) => m.content)
    .join("\n\n");
  const messages = (body.messages || [])
    .filter((m: ChatMessage) => m.role === "user" || m.role === "assistant")
    .map((m: ChatMessage) => ({ role: m.role, content: m.content || " " }));
  const out: any = {
    model,
    max_tokens: body.max_tokens ?? 2048,
    temperature: body.temperature ?? 0.7,
    stream: body.stream ?? false,
    messages: messages.length ? messages : [{ role: "user", content: "Generate the requested response." }],
  };
  if (system) out.system = system;
  if (body.tools?.length) {
    out.tools = body.tools.map((t: any) => ({
      name: t.function?.name,
      description: t.function?.description ?? "Return structured data",
      input_schema: t.function?.parameters ?? { type: "object" },
    })).filter((t: any) => t.name);
  }
  if (body.tool_choice?.function?.name) out.tool_choice = { type: "tool", name: body.tool_choice.function.name };
  return out;
}

export interface AIResult {
  content: string;
  toolCall?: AIToolCall;
  provider: string;
}

export interface AIStreamResult {
  stream: ReadableStream<Uint8Array>;
  provider: string;
}

/**
 * Run a chat completion against the provider chain.
 * If `stream: true`, returns the raw SSE body of the first successful provider.
 * Otherwise returns parsed content + toolCall.
 */
export async function aiComplete(
  opts: AICompleteOptions,
): Promise<AIResult | AIStreamResult> {
  const {
    messages,
    tools,
    toolChoice,
    stream = false,
    temperature = 0.7,
    maxTokens,
    timeoutMs = 25_000,
  } = opts;

  const baseBody: any = {
    messages,
    temperature,
    stream,
  };
  if (typeof maxTokens === "number") baseBody.max_tokens = maxTokens;
  if (tools && tools.length) baseBody.tools = tools;
  if (toolChoice) baseBody.tool_choice = toolChoice;

  const errors: string[] = [];

  for (const p of PROVIDERS) {
    if (stream && p.kind === "anthropic") {
      errors.push(`${p.name}: skipped (stream format differs)`);
      continue;
    }
    if (!isHealthy(p.name)) {
      errors.push(`${p.name}: skipped (cooldown)`);
      continue;
    }
    const key = Deno.env.get(p.envKey);
    if (!key) {
      errors.push(`${p.name}: no key`);
      continue;
    }

    try {
      const res = await callProvider(p, key, baseBody, timeoutMs);

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        errors.push(`${p.name}: ${res.status} ${text.slice(0, 160)}`);
        // 4xx other than 429 may be a request-shape issue; still try next provider
        if (res.status === 401 || res.status === 403 || res.status === 429 || res.status >= 500) {
          markUnhealthy(p.name);
        }
        continue;
      }

      if (stream) {
        if (!res.body) {
          errors.push(`${p.name}: empty stream`);
          continue;
        }
        return { stream: res.body, provider: p.name };
      }

      const data = await res.json();
      if (p.kind === "anthropic") {
        const blocks = data.content ?? [];
        const toolBlock = blocks.find((b: any) => b.type === "tool_use");
        const textContent = blocks.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
        return {
          content: textContent,
          toolCall: toolBlock ? { name: toolBlock.name, arguments: toolBlock.input } : undefined,
          provider: p.name,
        };
      }
      const choice = data.choices?.[0]?.message ?? {};
      const content: string = choice.content ?? "";
      let toolCall: AIToolCall | undefined;
      const tc = choice.tool_calls?.[0];
      if (tc?.function?.arguments) {
        try {
          toolCall = {
            name: tc.function.name,
            arguments: typeof tc.function.arguments === "string"
              ? JSON.parse(tc.function.arguments)
              : tc.function.arguments,
          };
        } catch {
          // try a JSON match in content as a fallback
        }
      }
      if (!toolCall && tools && content) {
        // Strip markdown code fences then attempt to extract a JSON object
        const cleaned = content.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "");
        const m = cleaned.match(/\{[\s\S]*\}/);
        if (m) {
          try { toolCall = { name: tools[0]?.function?.name ?? "result", arguments: JSON.parse(m[0]) }; } catch { /* */ }
        }
      }
      return { content, toolCall, provider: p.name };
    } catch (e) {
      errors.push(`${p.name}: ${e instanceof Error ? e.message : String(e)}`);
      markUnhealthy(p.name);
      continue;
    }
  }

  throw new Error(`All AI providers failed: ${errors.join(" | ")}`);
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "https://nuqtvzoawqgspyxyhvim.supabase.co",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
