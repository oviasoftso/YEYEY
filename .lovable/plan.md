## 1. Subject & Stream Rules (lock the truth)

Rewrite `src/lib/subjects.ts` + onboarding so every Waterfalls student is a **ZIMSEC O-Level** student. No HEXCO selector anywhere. Cambridge removed from public landing.

**Core (everyone):** Mathematics, English, Ndebele, Heritage Studies, Combined Science.

**Stream electives:**

| Stream | Adds | Maths variant |
|---|---|---|
| **Sciences** | Physics, Chemistry, Biology, Geography, Accounts | Maths **B** |
| **Commercials** | FRS, BES, Accounts, Geography, History | Maths **A** |
| **Arts** | FRS, BES, Geography, History, Literature | Maths **A** (no Accounts) |

Onboarding picks stream → subjects auto-derived. No free-form selection. Dashboard "Your Subjects" reads only from the derived list.

## 2. Landing & Branding

- Remove all **HEXCO** and **Cambridge** mentions on `Landing.tsx` and `index.html` meta.
- Swap OVI avatar to the uploaded `oviss-removebg-preview.ico` (copied to `src/assets/ovi-mascot.png`). Used in `OviAvatar.tsx`, landing hero, sidebar.
- Keep "OVIA Prep — Waterfalls Academy" wordmark + "What OVI Does With You" tagline.
- Footer keeps "Made by OVIA Software Solutions".

## 3. Multi-Provider AI (replace Lovable AI Gateway)

Strip `https://ai.gateway.lovable.dev` from every edge function. Replace with a shared module `supabase/functions/_shared/ai.ts` that implements a **5-tier fallback chain**:

```text
Gemini (gemini-2.5-flash)
  → OpenAI (gpt-4o-mini)
  → Anthropic (claude-3-5-haiku)
  → Groq (llama-3.3-70b)
  → OpenRouter (universal fallback)
```

Logic per call:
- Try provider 1 with a 12s timeout.
- On 401/403/429/5xx/timeout → mark provider unhealthy for 60s (in-memory) → try next.
- Surface the final successful provider name in response headers for debugging.
- Streaming variant supports SSE for chat (Gemini, OpenAI, Anthropic, Groq, OpenRouter all expose OpenAI-compatible streaming).

I'll request these secrets via `add_secret`:
`GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`.

Functions migrated: `chat`, `generate-notes`, `generate-assessment`, `generate-mixed-assessment`, `generate-study-plan`, `mark-assessment`, `admin`.

## 4. Latency fixes

- Switch defaults to `gemini-2.5-flash` / `gpt-4o-mini` / `claude-3-5-haiku` / Groq Llama-3.3-70b — all sub-second TTFB.
- Stream every long-form generation (notes, study plan, chat). Stop awaiting full JSON for tutor replies.
- Drop the unused `messages` echo in `chat`. Cap context to last 12 turns.
- Parallelise dashboard queries (mastery + assessments + notes) using `Promise.all`.

## 5. Adaptive Study Guides — fix

`StudyGuides.tsx` currently calls `generate-notes` ignoring weak-concept signal. I'll:

1. On open, fetch `topic_mastery` + last 10 `assessments` for the user.
2. Aggregate weak concepts (mastery < 50 or appears in `weak_concepts`).
3. Pass them as structured input to `generate-notes`, which already supports `weakConcepts` + `assessmentHistory`.
4. Render with `LatexText` (already sanitises).
5. Persist into `revision_notes` so re-opens are instant.
6. Add "Refresh based on latest performance" button.

## 6. Formatting hardening (app-wide)

- `sanitizeMarkdown` already strips `\textit` etc. — extend it to also handle `\underline`, `\mathrm` outside math, and stray `\\`.
- Wrap **every** AI-rendered surface (`Notes`, `Flashcards`, `StudyChat`, `StudyGuides`, `Assessment` review, `ExamSimulation`) with `LatexText`. Audit each page.
- All AI prompts get a hardened formatting preamble (single source of truth in `_shared/ai.ts`).

## 7. Database & security cleanup

You said "make sure data doesn't leak — no vulnerabilities — make the deletion system neater." So:

- **Add `ON DELETE CASCADE`** so deleting a user wipes all their rows. New FKs from `assessments.user_id`, `flashcards.user_id`, `revision_notes.user_id`, `study_plan_items.user_id`, `topic_mastery.user_id`, `profiles.user_id`, `blocked_users.user_id` → `auth.users(id) ON DELETE CASCADE`.
- **Make `user_id` NOT NULL everywhere** (already is) and **non-nullable + indexed**. Add `CREATE INDEX` on each `user_id` for query speed.
- **Tighten RLS:** add explicit `TO authenticated` on `profiles` policies (currently `public`). Add a `SECURITY DEFINER has_admin(uid)` function and use it instead of hardcoded admin emails in client code.
- Create `user_roles` table + `app_role` enum (`admin`, `student`) per security best practice. Seed Anesu's role on first login by email match → role row.
- Add a `delete_my_account()` SECURITY DEFINER function so students/admins can cleanly purge a user.
- Run linter, fix any warnings.

No data wipe — your existing data stays. Cascade only kicks in for future deletions.

## 8. Files touched (summary)

```text
src/assets/ovi-mascot.png            (new — from upload)
src/lib/subjects.ts                  (rewrite: ZIMSEC-only, stream-driven)
src/lib/curriculum.tsx               (deprecate switcher; keep stream context)
src/lib/streams.ts                   (new — single source of stream→subjects)
src/components/CurriculumSwitcher.tsx (delete)
src/components/AppLayout.tsx         (remove switcher; new logo)
src/components/OviAvatar.tsx         (new mascot)
src/pages/Landing.tsx                (remove HEXCO/Cambridge; new logo)
src/pages/Onboarding.tsx             (stream-driven subject derivation)
src/pages/Dashboard.tsx              (subjects from stream)
src/pages/StudyGuides.tsx            (adaptive rewrite)
src/pages/Notes.tsx, Flashcards.tsx, StudyChat.tsx, Assessment.tsx, ExamSimulation.tsx
                                     (LatexText everywhere)
src/lib/sanitize-markdown.ts         (extend rules)
supabase/functions/_shared/ai.ts     (new — 5-provider fallback + streaming)
supabase/functions/{chat,generate-notes,generate-assessment,generate-mixed-assessment,generate-study-plan,mark-assessment,admin}/index.ts
                                     (migrate to _shared/ai.ts)
supabase/migrations/<new>            (cascades, indexes, user_roles, has_role, tightened RLS)
index.html                           (meta cleanup, favicon = new logo)
```

## 9. Order of execution

1. Request the 5 API key secrets (blocking).
2. Run DB migration (cascades, user_roles, RLS tightening, indexes).
3. Build `_shared/ai.ts` and migrate all edge functions.
4. Frontend: streams.ts → subjects.ts → onboarding/dashboard → strip HEXCO/Cambridge → swap logo.
5. Adaptive Study Guides rewrite.
6. App-wide LatexText audit.
7. Lint pass + console/network sanity check in preview.

Ready to start? On "go" I request the 5 secrets first, then run the migration.