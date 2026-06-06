/**
 * Generate OVIA Prep — Full Stack Architecture Overview (.docx)
 * Run: node scripts/generate-docx.mjs
 *
 * Uses the `docx` npm package (v9.x) and `file-saver` for output.
 */
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, BorderStyle,
  ShadingType, PageBreak, TabStopPosition, TabStopType,
} from "docx";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT = path.resolve(__dirname, "..", "OVIA_Prep_Full_Stack_Architecture.docx");

// ─── Helpers ──────────────────────────────────────────────

const GREEN = "2d6a4f";
const DARK_GREEN = "1b4332";
const LIGHT_GREEN = "d8f3dc";
const BG_GRAY = "f8f9fa";
const BG_HEADER = "1b4332";
const WHITE = "ffffff";
const BLACK = "1a1a2e";
const ACCENT_BLUE = "2b6cb0";

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, bold: true, color: DARK_GREEN, size: level === HeadingLevel.HEADING_1 ? 36 : 28 })],
  });
}

function subheading(text) {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, color: GREEN, size: 24 })],
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    ...opts,
    children: [new TextRun({ text, size: 22, color: BLACK, ...opts })],
  });
}

function boldPara(label, value) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    children: [
      new TextRun({ text: label, bold: true, size: 22, color: BLACK }),
      new TextRun({ text: value, size: 22, color: BLACK }),
    ],
  });
}

function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 30, after: 30 },
    children: [new TextRun({ text, size: 22, color: BLACK })],
  });
}

function emptyLine() {
  return new Paragraph({ spacing: { before: 60, after: 60 }, children: [] });
}

// ─── Table Helpers ────────────────────────────────────────

function headerCell(text, width = 3000) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.SOLID, color: BG_HEADER },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 40, after: 40 },
      children: [new TextRun({ text, bold: true, color: WHITE, size: 20 })],
    })],
  });
}

function dataCell(text, width = 3000, opts = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: opts.shading ? { type: ShadingType.SOLID, color: opts.shading } : undefined,
    children: [new Paragraph({
      spacing: { before: 30, after: 30 },
      children: [new TextRun({ text: String(text), size: 20, color: BLACK, bold: opts.bold })],
    })],
  });
}

function makeTable(headers, rows, colWidths = null) {
  const widths = colWidths || headers.map(() => 2500);
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: headers.map((h, i) => headerCell(h, widths[i])) }),
      ...rows.map((row, ri) =>
        new TableRow({
          children: row.map((cell, ci) =>
            dataCell(cell, widths[ci], { shading: ri % 2 === 0 ? BG_GRAY : WHITE })
          ),
        })
      ),
    ],
  });
}

// ─── Document Content ─────────────────────────────────────

const doc = new Document({
  title: "OVIA Prep — Full Stack Architecture",
  description: "Complete architectural overview of the OVIA Prep ZIMSEC O-Level revision platform",
  creator: "OVIA Software Solutions",
  styles: {
    default: {
      document: { run: { size: 22, font: "Segoe UI" } },
    },
  },
  sections: [{
    properties: {},
    children: [

      // ═══ TITLE PAGE ═══════════════════════════════════
      new Paragraph({ spacing: { before: 3000 }, children: [] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: "OVIA Prep", size: 56, bold: true, color: GREEN })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: "Full Stack Architecture Overview", size: 36, color: DARK_GREEN })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: "An adaptive ZIMSEC O-Level revision platform for Waterfalls Academy", size: 24, color: "666666", italics: true })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
        children: [new TextRun({ text: "Made by OVIA Software Solutions", size: 22, color: "888888" })],
      }),
      new Paragraph({ children: [] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Generated: " + new Date().toISOString().split("T")[0], size: 20, color: "999999" })],
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══ TABLE OF CONTENTS ═══════════════════════════
      heading("Table of Contents"),
      bullet("1. Project Identity"),
      bullet("2. Frontend Stack"),
      bullet("3. Backend & Database Stack"),
      bullet("4. Supabase Edge Functions"),
      bullet("5. AI Provider Chain"),
      bullet("6. Frontend Pages & Features"),
      bullet("7. Key Algorithms"),
      bullet("8. Offline Sync Architecture"),
      bullet("9. Academic Streams & Subjects"),
      bullet("10. Dev Tools & Build"),
      new Paragraph({ children: [new PageBreak()] }),

      // ═══ 1. PROJECT IDENTITY ═══════════════════════
      heading("1. Project Identity"),
      boldPara("App Name: ", "OVIA Prep"),
      boldPara("Client: ", "Waterfalls Academy, Zimbabwe"),
      boldPara("Purpose: ", "Adaptive ZIMSEC O-Level exam revision platform for secondary students"),
      boldPara("Curriculum: ", "ZIMSEC Heritage-Based Curriculum (HBC)"),
      boldPara("Domain: ", "https://oviaprep.app"),
      boldPara("Developed By: ", "OVIA Software Solutions"),
      new Paragraph({ children: [new PageBreak()] }),

      // ═══ 2. FRONTEND STACK ═════════════════════════
      heading("2. Frontend Stack"),

      subheading("Core Framework"),
      makeTable(
        ["Technology", "Version", "Purpose"],
        [
          ["React 18", "^18.3.1", "UI component framework"],
          ["TypeScript", "^5.8.3", "Type-safe JavaScript"],
          ["Vite", "^5.4.19", "Build tool & dev server"],
          ["React Router v6", "^6.30.1", "Client-side routing"],
          ["TanStack React Query", "^5.83.0", "Server state & API caching"],
          ["localStorage store", "—", "Client-side persistence layer"],
        ],
        [2200, 1400, 3400]
      ),

      subheading("UI & Styling"),
      makeTable(
        ["Technology", "Purpose"],
        [
          ["Tailwind CSS v3.4", "Utility-first CSS framework"],
          ["shadcn/ui (~55 components)", "Pre-built Radix UI primitives (buttons, modals, cards, etc.)"],
          ["Radix UI (~25 packages)", "Accessible, headless UI primitives (dropdowns, dialogs, tooltips, tabs, etc.)"],
          ["Framer Motion", "Animations and micro-interactions"],
          ["Lucide React", "Icon library"],
          ["next-themes", "Dark/light/system theme toggling"],
          ["class-variance-authority", "Component variant management"],
          ["Recharts", "Charts and analytics visualizations"],
        ],
        [3000, 4000]
      ),

      subheading("Maths & Content Rendering"),
      makeTable(
        ["Technology", "Purpose"],
        [
          ["react-markdown", "Render AI-generated markdown content"],
          ["remark-gfm", "GitHub-Flavored Markdown support (tables, checkboxes)"],
          ["KaTeX + rehype-katex", "LaTeX math rendering via $...$ / $$...$$"],
          ["react-latex-next", "Additional LaTeX rendering support"],
        ],
        [3000, 4000]
      ),

      subheading("Forms & Utilities"),
      makeTable(
        ["Technology", "Purpose"],
        [
          ["react-hook-form + zod", "Form management & schema validation"],
          ["date-fns", "Date formatting and manipulation"],
          ["sonner", "Toast notification system"],
          ["cmdk", "Command menu / search palette"],
          ["vaul", "Drawer component (mobile-friendly)"],
          ["embla-carousel-react", "Carousel/slider component"],
        ],
        [3000, 4000]
      ),
      new Paragraph({ children: [new PageBreak()] }),

      // ═══ 3. BACKEND & DATABASE ════════════════════
      heading("3. Backend & Database Stack"),

      subheading("Platform"),
      makeTable(
        ["Technology", "Purpose"],
        [
          ["Supabase", "Backend-as-a-Service (PostgreSQL + Auth + Storage + Edge Functions)"],
          ["Supabase Auth", "Authentication (email/password, session management)"],
          ["PostgreSQL + RLS", "Relational database with Row-Level Security policies"],
        ],
        [2500, 4500]
      ),

      subheading("Database Tables"),
      makeTable(
        ["Table", "Purpose"],
        [
          ["profiles", "Student profiles: name, stream, subjects, language, school"],
          ["schools", "School management & subscription tier (free/basic/premium/enterprise)"],
          ["teacher_classrooms", "Teacher-managed classrooms with student rosters"],
          ["assessments", "AI-generated & teacher-set assessments"],
          ["assessment_submissions", "Student submissions for teacher-set exams"],
          ["flashcards", "FSRS-6 spaced repetition flashcards"],
          ["flashcard_reviews", "Review history for FSRS-6 tracking"],
          ["revision_notes", "AI-generated revision notes"],
          ["topic_mastery", "Per-topic mastery percentage tracking"],
          ["study_plans", "Weekly study plans (JSONB)"],
          ["study_plan_items", "Individual study plan activities"],
          ["streak_data", "Study streak & achievement tracking"],
          ["notifications", "In-app notification center"],
          ["ovi_interactions", "Chat history with OVI AI assistant"],
          ["neglection_log", "Subject neglection tracking for interventions"],
          ["sync_queue", "Offline sync queue for pending changes"],
          ["school_risk_reports", "At-risk student identification reports"],
          ["curriculum_effectiveness_reports", "Subject-level curriculum analytics"],
          ["user_roles", "Role-based access control (admin, teacher, student)"],
        ],
        [3000, 4000]
      ),
      new Paragraph({ children: [new PageBreak()] }),

      // ═══ 4. SUPABASE EDGE FUNCTIONS ════════════════
      heading("4. Supabase Edge Functions (Deno)"),
      para("All backend logic runs as Supabase Edge Functions written in TypeScript (Deno runtime). Each function is an isolated HTTP endpoint."),

      makeTable(
        ["Function", "Purpose"],
        [
          ["chat", "AI study chat (OVI MIND) — routes through multi-provider AI gateway"],
          ["generate-assessment", "AI-generated topic assessments (OVI ARENA)"],
          ["generate-mixed-assessment", "Multi-topic mixed assessments"],
          ["generate-notes", "AI-generated revision notes (OVI VAULT)"],
          ["generate-study-plan", "AI study plan generation (OVI COMPASS)"],
          ["mark-assessment", "Auto-marking with detailed feedback"],
          ["ovi_arena_generator", "Advanced exam simulation generation"],
          ["ovi_arena_grader", "Advanced exam auto-grading with analytics"],
          ["ovi_classroom", "Teacher classroom management API"],
          ["ovi_compass_planner", "Adaptive AI-powered study planning"],
          ["ovi_vault_note_generator", "Topic-specific note generation"],
          ["ovi_voice", "Voice interaction endpoint for OVI VOICE"],
          ["admin", "Administrative operations"],
          ["_shared/ai.ts", "Core shared module — multi-provider AI gateway"],
        ],
        [3500, 3500]
      ),
      new Paragraph({ children: [new PageBreak()] }),

      // ═══ 5. AI PROVIDER CHAIN ═════════════════════
      heading("5. AI Provider Chain"),
      para("All AI operations in OVIA Prep use a multi-provider fallback chain defined in supabase/functions/_shared/ai.ts. All providers expose an OpenAI-compatible chat-completions endpoint, allowing a single request format to work across all of them. The providers are tried in order; if one fails, the next is automatically used."),
      para("Failed providers (401/403/429/5xx errors) receive a 60-second cooldown before being retried, preventing repeated failures from slowing down requests."),

      makeTable(
        ["#", "Provider", "Type", "Base URL", "Model", "Key Needed"],
        [
          ["1", "Pollinations", "Free / No key", "text.pollinations.ai/openai", "openai-fast", "No"],
          ["2", "UncloseAI", "Free / No key", "hermes.ai.unturf.com/v1", "Hermes-3-Llama-3.1-8B", "No"],
          ["3", "Gemini", "Free tier", "generativelanguage.googleapis.com/v1beta/openai", "gemini-2.0-flash", "GEMINI_API_KEY"],
          ["4", "Groq", "Free tier", "api.groq.com/openai/v1", "llama-3.3-70b-versatile", "GROQ_API_KEY"],
          ["5", "OpenRouter", "Paid", "openrouter.ai/api/v1", "google/gemini-2.0-flash", "OPENROUTER_API_KEY"],
        ],
        [500, 1400, 1400, 2400, 1400, 1000]
      ),

      para("Fallback order: Pollinations → UncloseAI → Gemini → Groq → OpenRouter"),
      bullet("Pollinations and UncloseAI require zero configuration — no API keys needed"),
      bullet("OpenRouter adds custom headers (HTTP-Referer and X-Title) for analytics"),
      bullet("Streaming is supported across all providers (skipped for Anthropic-style format)"),
      new Paragraph({ children: [new PageBreak()] }),

      // ═══ 6. FRONTEND PAGES ════════════════════════
      heading("6. Frontend Pages & Features"),
      para("The app has 18 user-facing pages, all protected behind authentication (except Landing, Auth, and About)."),

      makeTable(
        ["Page", "Route", "Feature"],
        [
          ["Landing", "/", "Marketing / splash page"],
          ["Auth", "/auth", "Login & signup"],
          ["Onboarding", "/onboarding", "Stream & subject selection wizard"],
          ["Dashboard", "/dashboard", "Home with widgets, stats, and quick actions"],
          ["OVI ARENA", "/assessment", "AI-generated adaptive assessments"],
          ["OVI PULSE", "/flashcards", "FSRS-6 spaced repetition flashcards"],
          ["OVI VAULT", "/notes", "AI-generated revision notes with search"],
          ["OVI MIND", "/chat", "AI study chat tutor with context awareness"],
          ["OVI COMPASS", "/study-plan", "AI-generated weekly study plans"],
          ["OVI INSIGHT", "/analytics", "Progress analytics, charts, and reports"],
          ["OVI VOICE", "/voice", "Voice-powered AI tutor interactions"],
          ["Exam Simulation", "/exam-simulation", "Timed full-length mock exams"],
          ["Study Guides", "/study-guides", "Curriculum-aligned study resources"],
          ["Past Paper Vault", "/past-papers", "Archived ZIMSEC past exam papers"],
          ["Assignments", "/assignments", "Teacher-assigned classwork & homework"],
          ["Mistake Journal", "/mistake-journal", "Error tracking with spaced review"],
          ["Study Groups", "/study-groups", "Peer study collaboration groups"],
          ["Parent Dashboard", "/parent", "Parent progress monitoring view"],
          ["Director's Suite", "/admin", "School admin management panel"],
          ["OVI Classroom", "/teacher", "Teacher classroom & assignment management"],
        ],
        [2200, 1600, 3200]
      ),
      new Paragraph({ children: [new PageBreak()] }),

      // ═══ 7. KEY ALGORITHMS ═══════════════════════
      heading("7. Key Algorithms"),

      makeTable(
        ["Algorithm", "Location", "Purpose"],
        [
          ["FSRS-6 Spaced Repetition", "src/lib/fsrs.ts", "Anki 25.07-compatible spaced repetition scheduler. Calculates optimal flashcard review intervals using a mathematical forgetting curve model with 17 optimized parameters."],
          ["Gamification Engine", "src/lib/gamification.ts", "XP rewards, 50-level system, 15 badge definitions, streak tracking, and daily challenges. Uses an exponential XP curve (level^2 * 20 + level * 30)."],
          ["Multi-Provider AI Fallback", "supabase/functions/_shared/ai.ts", "5-tier AI provider chain with automatic failover. Failed providers get a 60-second cooldown. All use OpenAI-compatible chat-completions format."],
          ["Forgetting Curve", "src/lib/fsrs.ts", "Mathematical model R(t) = (1 + FACTOR * t/S)^DECAY that predicts memory retention probability over time based on card stability."],
          ["Offline Sync Engine", "src/lib/offline/syncEngine.ts", "Bidirectional sync between IndexedDB and Supabase with conflict resolution (server wins for reads, client wins for writes)."],
        ],
        [2500, 2300, 3200]
      ),
      new Paragraph({ children: [new PageBreak()] }),

      // ═══ 8. OFFLINE SYNC ARCHITECTURE ════════════
      heading("8. Offline Sync Architecture"),
      heading("8.1 Overview", HeadingLevel.HEADING_2),
      para("OVIA Prep is an offline-first Progressive Web App (PWA). Students in Zimbabwe may have unreliable internet access, so the entire app must function without connectivity and sync automatically when the connection returns."),

      subheading("The Architecture Has Three Layers:"),

      boldPara("Layer 1 — Service Worker (Workbox): ", "Handles network caching for static assets (JS, CSS, images, fonts) and Supabase API responses. Uses NetworkFirst strategy for API calls and CacheFirst for static assets."),
      boldPara("Layer 2 — IndexedDB (Dexie.js): ", "A local database that mirrors all Supabase tables locally. Each record has _synced and _version metadata fields for tracking sync state."),
      boldPara("Layer 3 — Sync Queue: ", "A dedicated queue table in IndexedDB that records all offline mutations. When the device comes online, the queue is processed in order."),

      heading("8.2 Data Flow", HeadingLevel.HEADING_2),
      boldPara("Online Mode:", " Reads go to Supabase directly (with local caching). Writes go to both Supabase and are reflected in IndexedDB immediately."),
      boldPara("Offline Mode:", " Reads come from IndexedDB. Writes are stored in IndexedDB with _synced = 0 and an entry is added to the sync_queue table. No data is lost."),
      boldPara("Reconnection:", " As soon as the browser fires the 'online' event, the sync engine automatically processes the queue. It also pulls fresh data from the server."),

      heading("8.3 Sync Queue Processing", HeadingLevel.HEADING_2),
      para("The sync engine (src/lib/offline/syncEngine.ts) has three main operations:"),

      subheading("A. Process Sync Queue (push)"),
      bullet("Reads pending items from the sync_queue table (up to 50 at a time)"),
      bullet("Calls Supabase via the sync_upsert RPC (remote procedure call)"),
      bullet("On success: marks the local record as _synced = 1 and removes it from the queue"),
      bullet("On failure: increments the attempt counter (max 3 retries) and logs the error"),
      bullet("Retries with exponential backoff on subsequent sync cycles"),

      subheading("B. Pull from Server"),
      bullet("After pushing local changes, the engine pulls fresh data from 6 Supabase tables"),
      bullet("Compares server records with local IndexedDB records by ID"),
      bullet("Conflict resolution: Server wins if local is synced (no pending changes)"),
      bullet("If local is dirty (_synced = 0), the local version is kept and will be pushed next cycle"),

      subheading("C. Full Sync"),
      bullet("Runs push (processSyncQueue) then pull (pullFromServer) in sequence"),
      bullet("Returns a summary: { pulled, pushed, failed }"),

      heading("8.4 IndexedDB Schema (Dexie.js v4)", HeadingLevel.HEADING_2),
      para("The offline database (src/lib/offline/oviDb.ts) stores these entity types, each with _synced and _version fields:"),

      makeTable(
        ["Entity Table", "Key Fields", "Sync Fields"],
        [
          ["profiles", "id, name, stream, subjects", "_synced, _version"],
          ["mastery", "user_id, subject, topic, mastery%", "_synced, _version"],
          ["flashcards", "user_id, subject, topic, difficulty, stability", "_synced, _version"],
          ["flashcard_reviews", "flashcard_id, rating, response_time_ms", "_synced"],
          ["assessments", "user_id, subject, topic, score, total", "_synced"],
          ["notes", "user_id, subject, topic, content", "_synced, _version"],
          ["study_plan", "user_id, scheduledFor, completed", "_synced, _version"],
          ["streaks", "user_id, current_streak, longest_streak", "_synced"],
          ["interactions", "user_id, role, question, answer", "_synced"],
          ["sync_queue", "table, record_id, action, payload, attempts", "—"],
        ],
        [2500, 3500, 1500]
      ),

      heading("8.5 React Hooks", HeadingLevel.HEADING_2),
      para("The offline module exposes three React hooks in src/lib/offline/useOffline.ts:"),

      boldPara("useOnlineStatus(): ", "Returns a boolean indicating whether the browser is online. Listens for online/offline events."),
      boldPara("useSyncStatus(): ", "Returns pendingCount, syncing state, online status, and a syncNow() function. Automatically triggers sync when coming online with pending changes."),
      boldPara("useOfflineReady(): ", "Returns true when the IndexedDB database has been successfully opened."),

      heading("8.6 Service Worker Caching Strategy", HeadingLevel.HEADING_2),
      para("Configured in vite.config.ts via vite-plugin-pwa and Workbox:"),

      makeTable(
        ["Cache Name", "Strategy", "Content", "Max Entries", "Max Age"],
        [
          ["api-functions-v1", "NetworkFirst", "Supabase Edge Function calls", "100", "24 hours"],
          ["api-rest-v1", "NetworkFirst", "Supabase REST API calls", "100", "24 hours"],
          ["images-v1", "CacheFirst", "PNG, JPG, SVG, GIF, WebP", "200", "30 days"],
          ["fonts-v1", "CacheFirst", "WOFF2, TTF, OTF fonts", "50", "365 days"],
          ["precache", "Precache", "App shell (JS, CSS, HTML, icons)", "—", "Versioned"],
        ],
        [2000, 1600, 2500, 1200, 1200]
      ),

      para("The service worker is automatically updated via the registerType: 'autoUpdate' setting. The app shell is precached for instant loading even on first visit."),

      heading("8.7 Offline Capabilities Summary", HeadingLevel.HEADING_2),
      bullet("Full offline read/write of flashcards, notes, assessments, and study plans"),
      bullet("All data queued locally when offline, synced when connectivity returns"),
      bullet("Conflict resolution: server wins on reads, client wins on writes (last-write-wins)"),
      bullet("Automatic sync on reconnect — no manual intervention needed"),
      bullet("Visual sync status indicator via OfflineBanner component"),
      bullet("Service worker caches API responses for faster repeat visits"),
      new Paragraph({ children: [new PageBreak()] }),

      // ═══ 9. STREAMS & SUBJECTS ═══════════════════
      heading("9. Academic Streams & Subjects"),
      para("The app supports 3 academic streams aligned with the ZIMSEC Heritage-Based Curriculum:"),

      subheading("Science Stream"),
      bullet("Mathematics B, English Language, Ndebele, Heritage Studies, Combined Science"),
      bullet("Plus: Physics, Chemistry, Biology, Principles of Accounting"),

      subheading("Commercial Stream"),
      bullet("Mathematics B, English Language, Ndebele, Heritage Studies, Combined Science"),
      bullet("Plus: FRS, Business Entrepreneurial Skills, Principles of Accounting"),

      subheading("Arts Stream"),
      bullet("Mathematics A, English Language, Ndebele, Heritage Studies, Combined Science"),
      bullet("Plus: FRS"),

      subheading("Practical Subjects (Optional)"),
      para("Computer Science, Textiles and Design, Food Technology and Design, Woodwork, Motor Mechanics, Agriculture, Physical Education and Mass Displays"),
      new Paragraph({ children: [new PageBreak()] }),

      // ═══ 10. DEV TOOLS ════════════════════════════
      heading("10. Dev Tools & Build Configuration"),

      makeTable(
        ["Tool", "Purpose"],
        [
          ["Bun (package manager)", "Fast package installation & lock file"],
          ["ESLint v9", "Code linting & quality"],
          ["Vitest v3", "Unit testing framework (with jsdom)"],
          ["PostCSS + Autoprefixer", "CSS processing & vendor prefixes"],
          ["@vitejs/plugin-react-swc", "Fast React compilation via SWC (Rust-based)"],
          ["TypeScript strict mode", "Type safety with path aliases (@/ → src/)"],
          ["lovable-tagger", "Dev tooling (Lovable integration)"],
          ["@tailwindcss/typography", "Prose styling for markdown content"],
          ["@testing-library/react", "React component testing utilities"],
        ],
        [3000, 4000]
      ),

      emptyLine(),

      subheading("Build Scripts"),
      makeTable(
        ["Script", "Command"],
        [
          ["dev", "npm run dev — Start Vite dev server on port 8080"],
          ["build", "npm run build — Production build with PWA"],
          ["lint", "npm run lint — ESLint check"],
          ["test", "npm run test — Run Vitest unit tests"],
          ["preview", "npm run preview — Preview production build"],
        ],
        [2000, 5000]
      ),

      emptyLine(),
      emptyLine(),
      emptyLine(),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [new TextRun({ text: "— End of Document —", color: "888888", size: 20, italics: true })],
      }),
    ],
  }],
});

// ─── Generate ─────────────────────────────────────────────

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(OUTPUT, buffer);
console.log(`✅ Generated: ${OUTPUT}`);
console.log(`   Size: ${(buffer.length / 1024).toFixed(1)} KB`);
