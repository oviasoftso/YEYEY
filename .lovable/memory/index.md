# Project Memory
Updated: now

## Core
Project: Waterfalls Academy Scholastic Hub (rebranded from OVIA PREP). Tagline "Above and Beyond".
Logo at src/assets/waterfalls-logo.png. Always pair logo with OVI in hero/landing.
Multi-curriculum: ZIMSEC, Cambridge, HEXCO. Persisted via CurriculumProvider in src/lib/curriculum.tsx (localStorage key: waterfalls.curriculum).
Subject grid filters by active curriculum via src/lib/subjects.ts (CORE_SUBJECTS, getSubjectsForCurriculum).
Design: Deep Charcoal #1A1A1A bg, Metallic Silver #E5E7E9 ink, Solid White containers. Segoe UI everywhere. Glassmorphism on sidebar/cards (.glass, .glass-sidebar utilities).
Iconography: Lucide line icons only, strokeWidth 1.5. NO emojis in UI.
Admin page = "Director's Suite". Admin emails ADMIN_EMAILS in AppLayout.tsx + Admin.tsx (kept as-is per user).
Use 'Revising' terminology. Tech: Supabase, Gemini.
Strict ZIMSEC HBC formatting: Math/Science in LaTeX, tables in GFM.
Auth: FirstName+Surname only. Registration strictly verified against institutional lists.
Arts stream excludes Geography. MCQ strictly for Sciences, Geography, Ag.

## Memories
- [OVI Persona](mem://project/ovi-persona) — AI persona states and animations for the learning guide
- [Local Languages](mem://curriculum/local-languages) — ZIMSEC structure for Shona, Nambya, and Ndebele
- [Streams & Electives](mem://curriculum/streams-and-electives) — Subject constraints for Arts, Science, and Commercial streams
- [Literature Content](mem://curriculum/literature-content) — Arts-only literature rules and set books
- [Auth Credentials](mem://auth/credentials) — Simplified login using First Name, Surname, and password
- [Admin Management](mem://auth/admin-management) — Admin panel capabilities and specific access emails
- [Security & Access](mem://auth/security-and-access) — Security-First Workflow, institutional logic separation
- [Visual Identity](mem://style/visual-identity) — Charcoal/silver/white palette, Segoe UI, glassmorphism, line icons
- [Terminology & Formatting](mem://style/terminology-and-formatting) — LaTeX rules, Markdown tables, and preferred phrasing
- [Assessment Engine](mem://features/assessment-engine) — ZIMSEC HBC alignment, cognitive weighting, and timers
- [Accounting Layouts](mem://features/accounting-layouts) — UI formats for ledgers, cash books, and statements
- [Adaptive Learning](mem://features/adaptive-learning-and-retention) — Flashcards, SM-2 algorithm, and dynamic revision notes
- [Data Persistence](mem://tech/data-persistence) — Supabase sync, RLS, and offline mode capabilities
- [AI Integration](mem://tech/ai-integration) — Gemini integration preferences
