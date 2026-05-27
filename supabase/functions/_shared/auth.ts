/**
 * Shared auth verification + per-user rate limiting for Supabase Edge Functions.
 *
 * Usage:
 *   import { verifyAuth, rateLimit, jsonError, corsHeaders, sanitizeInput } from "../_shared/auth.ts";
 *
 *   const auth = await verifyAuth(req);
 *   if (!auth.ok) return jsonError(auth.error, auth.status);
 *   rateLimit(auth.userId);
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS ────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "https://nuqtvzoawqgspyxyhvim.supabase.co",
  "https://oviaprep.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

// Keep the static version for backward compat (used in OPTIONS responses)
export const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Auth Verification ──────────────────────────────────────────────────────
export interface AuthResult {
  ok: true;
  userId: string;
  email: string;
}

export interface AuthFailure {
  ok: false;
  error: string;
  status: number;
}

export async function verifyAuth(req: Request): Promise<AuthResult | AuthFailure> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return { ok: false, error: "Missing authorization token", status: 401 };
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();

    if (userErr || !userData?.user) {
      return { ok: false, error: "Unauthorized", status: 401 };
    }

    return {
      ok: true,
      userId: userData.user.id,
      email: userData.user.email || "",
    };
  } catch {
    return { ok: false, error: "Auth verification failed", status: 401 };
  }
}

// ─── Rate Limiting (in-memory, per-isolate) ─────────────────────────────────
// Sliding window: max REQUESTS_PER_WINDOW requests per WINDOW_MS per user.
const WINDOW_MS = 60_000; // 1 minute
const REQUESTS_PER_WINDOW = 30;

const requestLog = new Map<string, number[]>();

export function rateLimit(userId: string): void {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  let timestamps = requestLog.get(userId) || [];
  // Prune expired entries
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= REQUESTS_PER_WINDOW) {
    throw new RateLimitError(
      `Rate limit exceeded. Max ${REQUESTS_PER_WINDOW} requests per minute.`
    );
  }

  timestamps.push(now);
  requestLog.set(userId, timestamps);
}

export class RateLimitError extends Error {
  status = 429;
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

// ─── Input Sanitization ─────────────────────────────────────────────────────
const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_LENGTH = 50;

/**
 * Sanitize user-supplied strings to prevent prompt injection.
 * Trims, limits length, and strips control characters / prompt-override patterns.
 */
export function sanitizeString(value: unknown, label = "input", maxLen = MAX_STRING_LENGTH): string {
  if (typeof value !== "string") return "";
  let s = value.trim();

  // Strip null bytes and control characters (except newline/tab)
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Enforce max length
  if (s.length > maxLen) s = s.slice(0, maxLen);

  return s;
}

/**
 * Sanitize an array of strings, capping length and sanitizing each element.
 */
export function sanitizeStringArray(value: unknown, label = "items", maxItems = MAX_ARRAY_LENGTH): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map((item) => sanitizeString(item, label));
}

/**
 * Sanitize an array of message objects { role, content }.
 */
export function sanitizeMessages(value: unknown, maxMessages = 20): Array<{ role: string; content: string }> {
  if (!Array.isArray(value)) return [];
  return value.slice(-maxMessages).map((m: any) => ({
    role: typeof m?.role === "string" && ["system", "user", "assistant", "tool"].includes(m.role)
      ? m.role
      : "user",
    content: sanitizeString(m?.content, "message content", 2000),
  }));
}

// ─── Helpers ────────────────────────────────────────────────────────────────
export function jsonError(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
