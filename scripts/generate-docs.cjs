/**
 * Generate OVIA Prep Documentation as DOCX
 * Run: node scripts/generate-docs.cjs
 */
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType } = require("docx");
const fs = require("fs");

const COLORS = { primary: "1a73e8", dark: "1a1a2e", muted: "666666", white: "ffffff" };

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, spacing: { before: 300, after: 100 }, children: [new TextRun({ text, bold: true })] });
}
function para(text, opts = {}) {
  return new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text, bold: opts.bold, color: opts.color, size: opts.size || 22, italics: opts.italics })] });
}
function bullet(text) {
  return new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: [new TextRun({ text, size: 22 })] });
}
function spacer() { return new Paragraph({ spacing: { after: 150 }, children: [] }); }
function pageBreak() { return new Paragraph({ children: [new TextRun({ break: 1 })] }); }

function infoTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((cells, ri) =>
      new TableRow({
        children: cells.map((cell) =>
          new TableCell({
            shading: ri === 0 ? { type: ShadingType.SOLID, color: COLORS.primary } : undefined,
            children: [new Paragraph({ children: [new TextRun({ text: cell, bold: ri === 0, color: ri === 0 ? COLORS.white : undefined, size: 20 })] })],
          })
        ),
      })
    ),
  });
}

async function main() {
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 } },
        heading1: { run: { font: "Calibri", size: 36, bold: true, color: COLORS.primary } },
        heading2: { run: { font: "Calibri", size: 28, bold: true, color: COLORS.dark } },
      },
    },
    sections: [{
      children: [
        // COVER
        new Paragraph({ spacing: { before: 3000 }, children: [] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "OVIA PREP", bold: true, size: 72, color: COLORS.primary })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "Complete Feature Documentation", size: 32, color: COLORS.muted })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "ZIMSEC O-Level AI Revision Platform", size: 24, color: COLORS.muted })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: `Version 2026.1 — June 2026`, size: 20, color: COLORS.muted })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "By OVIA Software Solutions", size: 20, color: COLORS.muted, italics: true })] }),

        // TABLE OF CONTENTS
        pageBreak(),
        heading("Table of Contents"),
        para("1. Overview & Getting Started"),
        para("2. Dashboard — Your Learning Hub"),
        para("3. OVI PULSE — Smart Flashcards"),
        para("4. OVI ARENA — AI Assessments"),
        para("5. OVI COMPASS — Study Planner"),
        para("6. OVI VAULT — Revision Notes"),
        para("7. OVI MIND — AI Tutor Chat"),
        para("8. OVI VOICE — Text-to-Speech"),
        para("9. OVI INSIGHT — Analytics"),
        para("10. Exam Simulation"),
        para("11. Past Paper Vault"),
        para("12. OVI Classroom (Teacher)"),
        para("13. Director's Suite (Admin)"),
        para("14. Parent Dashboard"),
        para("15. Gamification System"),
        para("16. Focus Mode & Study Timer"),
        para("17. Daily Challenge"),
        para("18. Mistake Journal"),
        para("19. Math Tools"),
        para("20. Assignments"),
        spacer(),

        // 1. OVERVIEW
        pageBreak(),
        heading("1. Overview & Getting Started"),
        para("OVIA Prep is Zimbabwe's first AI-powered ZIMSEC O-Level revision platform. It uses spaced repetition (FSRS-6), artificial intelligence, and gamification to help students study smarter and score higher."),
        spacer(),
        heading("Getting Started", HeadingLevel.HEADING_2),
        bullet("Open the app or install the PWA on your phone"),
        bullet("Enter your first name, surname, and create a password"),
        bullet("Select your stream: Arts, Commercials, or Sciences"),
        bullet("Choose your ZIMSEC subjects"),
        bullet("You'll land on the Dashboard — your daily study hub"),
        spacer(),
        heading("What Makes OVIA Different", HeadingLevel.HEADING_2),
        infoTable([
          ["Feature", "OVIA Prep", "Traditional Study"],
          ["Spaced Repetition", "FSRS-6 algorithm", "Cramming before exams"],
          ["AI Tutoring", "Socratic questioning", "Textbook only"],
          ["Gamification", "XP, levels, badges, streaks", "No motivation system"],
          ["Offline Support", "Works without internet", "Needs constant internet"],
          ["Adaptive Learning", "Focuses on weak topics", "Same content for everyone"],
          ["Multi-Language", "English, Shona, Ndebele", "English only"],
        ]),
        spacer(),

        // 2. DASHBOARD
        pageBreak(),
        heading("2. Dashboard — Your Learning Hub"),
        para("The Dashboard is organized into 4 tabs:"),
        spacer(),
        heading("Today Tab", HeadingLevel.HEADING_2),
        bullet("Gamification Widget — See your XP, level, and badges"),
        bullet("Study Timer — 25-min Pomodoro focus sessions"),
        bullet("Daily Challenge — 3 quick questions from weak topics"),
        bullet("Exam Countdown — Days until each ZIMSEC exam"),
        bullet("Revision Scheduler — AI-recommended topics for today"),
        spacer(),
        heading("Study Tab", HeadingLevel.HEADING_2),
        bullet("Quick actions: Start Assessment, Review Flashcards, Chat with OVI, Revision Notes"),
        bullet("More: Exam Simulation, Past Papers, OVI Voice, Mistake Journal"),
        spacer(),
        heading("Progress Tab", HeadingLevel.HEADING_2),
        bullet("Study Heatmap — 52-week activity grid"),
        bullet("Leaderboard — Peer ranking by XP, streak, or score"),
        bullet("Progress Report — Downloadable DOCX for parents"),
        spacer(),
        heading("Subjects Tab", HeadingLevel.HEADING_2),
        bullet("Per-subject mastery cards with progress bars and topic counts"),
        spacer(),

        // 3. FLASHCARDS
        pageBreak(),
        heading("3. OVI PULSE — Smart Flashcards"),
        para("Flashcards use FSRS-6 spaced repetition — the same technology as Anki, optimized for ZIMSEC."),
        spacer(),
        bullet("Create cards manually or auto-generate from wrong assessment answers"),
        bullet("Review daily — the algorithm shows cards just before you forget"),
        bullet("Rate each card: Again, Hard, Good, or Easy"),
        bullet("Cards rated 'Again' appear sooner; 'Easy' cards appear less often"),
        bullet("Each review earns +10 XP"),
        spacer(),

        // 4. ASSESSMENTS
        pageBreak(),
        heading("4. OVI ARENA — AI Assessments"),
        para("AI-generated assessments matching ZIMSEC format. Paper 1 (MCQ) or Paper 2 (Structured)."),
        spacer(),
        bullet("Select subject, topic, and paper type"),
        bullet("AI generates questions matching ZIMSEC style"),
        bullet("Answer questions — type, use voice input, or fill accounting tables"),
        bullet("Submit for AI grading — get marks, feedback, and improvement tips"),
        bullet("Wrong answers auto-added to Mistake Journal and flashcard deck"),
        bullet("XP: +20 for completing, +30 bonus for perfect score"),
        spacer(),
        heading("Special Features", HeadingLevel.HEADING_2),
        bullet("Accounting Tables — T-accounts, journals, trial balances, income statements"),
        bullet("Math Graphs — Coordinate grid, bearing tool, construction tool"),
        bullet("Voice Input — Speak answers instead of typing"),
        spacer(),

        // 5. STUDY PLAN
        pageBreak(),
        heading("5. OVI COMPASS — Study Planner"),
        bullet("Set your ZIMSEC exam dates"),
        bullet("AI analyzes mastery levels and generates a daily schedule"),
        bullet("Prioritizes weak topics and near-exam subjects"),
        bullet("Completing items earns XP and maintains your streak"),
        spacer(),

        // 6. NOTES
        pageBreak(),
        heading("6. OVI VAULT — Revision Notes"),
        bullet("Generate Notes — AI creates structured notes for any topic"),
        bullet("AI Notes Generator — One-click comprehensive notes with definitions, concepts, exam tips"),
        bullet("Cloud Notes — Auto-saved from assessments, accessible on any device"),
        bullet("Download as DOCX for offline study"),
        spacer(),

        // 7. AI TUTOR
        pageBreak(),
        heading("7. OVI MIND — AI Tutor Chat"),
        para("Your personal AI tutor using Socratic questioning — it guides you to answers."),
        spacer(),
        bullet("Select your subject and ask any ZIMSEC question"),
        bullet("AI responds in your language (English, Shona, Ndebele)"),
        bullet("Follow-up questions encouraged for deeper understanding"),
        bullet("Each question earns +15 XP"),
        spacer(),

        // 8. VOICE
        pageBreak(),
        heading("8. OVI VOICE — Text-to-Speech"),
        bullet("Paste any text and hear it read aloud"),
        bullet("Choose English, Shona, or Ndebele voices"),
        bullet("Adjust speed: slow for studying, fast for revision"),
        spacer(),

        // 9. ANALYTICS
        pageBreak(),
        heading("9. OVI INSIGHT — Analytics"),
        bullet("Predicted ZIMSEC grade based on assessment scores"),
        bullet("Per-subject mastery levels and trends"),
        bullet("Forgetting curve — topics you're about to forget"),
        bullet("Weak topic identification with improvement recommendations"),
        bullet("Assessment score history"),
        spacer(),

        // 10. EXAM SIM
        pageBreak(),
        heading("10. Exam Simulation"),
        bullet("Full exam paper under timed conditions"),
        bullet("AI generates paper matching ZIMSEC format"),
        bullet("Timer counts down like the real exam"),
        bullet("AI grades and provides detailed feedback"),
        spacer(),

        // 11. PAST PAPERS
        pageBreak(),
        heading("11. Past Paper Vault"),
        bullet("Browse past ZIMSEC papers by subject and year"),
        bullet("Attempt online with AI grading"),
        bullet("Model answers and improvement tips for each question"),
        spacer(),

        // 12. CLASSROOM
        pageBreak(),
        heading("12. OVI Classroom (Teacher Tools)"),
        infoTable([
          ["Tab", "What It Does"],
          ["Roster", "View and manage students"],
          ["Assignments", "Create homework with due dates"],
          ["Exercises", "Live in-class quizzes"],
          ["Announcements", "Post announcements to students"],
          ["Analytics", "Class average mastery, weak topics"],
          ["Sentinel", "Early warning for at-risk students"],
          ["Gradebook", "Ranked student list with scores"],
        ]),
        spacer(),

        // 13. ADMIN
        pageBreak(),
        heading("13. Director's Suite (Admin)"),
        infoTable([
          ["Tab", "What It Does"],
          ["Students", "Registry, search, block/unblock, DOCX export"],
          ["Import", "Upload DOCX class lists"],
          ["Analytics", "Active rate, avg mastery, stream distribution"],
          ["Gradebook", "All students sorted by score"],
          ["Sentinel", "Low scores, inactive students"],
          ["Quota", "Institutional student quotas"],
          ["Syllabus", "Toggle ZIMSEC modules"],
          ["Forge", "Assessment creation hub"],
        ]),
        spacer(),

        // 14. PARENT
        pageBreak(),
        heading("14. Parent Dashboard"),
        bullet("Overall mastery percentage and trend"),
        bullet("Per-subject breakdown with weak areas"),
        bullet("Study activity heatmap"),
        bullet("Exam countdown"),
        bullet("Alerts: declining scores, low mastery"),
        bullet("Downloadable DOCX progress report"),
        spacer(),

        // 15. GAMIFICATION
        pageBreak(),
        heading("15. Gamification System"),
        heading("XP Rewards", HeadingLevel.HEADING_2),
        infoTable([
          ["Action", "XP"],
          ["Flashcard review", "+10"],
          ["Assessment complete", "+20"],
          ["Perfect score bonus", "+30"],
          ["AI tutor question", "+15"],
          ["Focus session", "+30"],
          ["Daily challenge", "+50"],
        ]),
        spacer(),
        heading("Levels (1-50)", HeadingLevel.HEADING_2),
        infoTable([
          ["Level", "Title", "XP Required"],
          ["1", "Beginner", "0"],
          ["5", "Apprentice", "700"],
          ["10", "Scholar", "2,000"],
          ["20", "Graduate", "7,000"],
          ["35", "Master", "15,000"],
          ["50", "Genius", "50,000"],
        ]),
        spacer(),
        heading("Badges", HeadingLevel.HEADING_2),
        bullet("First Steps — Complete first assessment"),
        bullet("Card Collector — Create 10 flashcards"),
        bullet("Week Warrior — 7-day study streak"),
        bullet("Perfect Score — Get 100% on assessment"),
        bullet("Night Owl — Study after 10 PM"),
        bullet("Focus Master — Complete 10 focus sessions"),
        bullet("Challenge Champion — 7-day challenge streak"),
        spacer(),

        // 16. FOCUS MODE
        pageBreak(),
        heading("16. Focus Mode & Study Timer"),
        heading("Study Timer", HeadingLevel.HEADING_2),
        bullet("25-min focus / 5-min break Pomodoro cycles"),
        bullet("Circular countdown ring"),
        bullet("Each session earns +30 XP"),
        spacer(),
        heading("Focus Mode", HeadingLevel.HEADING_2),
        bullet("Fullscreen distraction-free study"),
        bullet("Ambient sounds: Rain, Waves, Wind, Fireplace, Forest, Cafe"),
        bullet("Timer durations: 15, 25, 45, or 60 minutes"),
        spacer(),

        // 17. DAILY CHALLENGE
        pageBreak(),
        heading("17. Daily Challenge"),
        bullet("3 questions from your weakest topics, refreshed daily"),
        bullet("Takes ~2 minutes to complete"),
        bullet("See correct answer after each question"),
        bullet("Earns +50 XP and builds challenge streak"),
        spacer(),

        // 18. MISTAKE JOURNAL
        pageBreak(),
        heading("18. Mistake Journal"),
        bullet("All wrong answers auto-collected from assessments"),
        bullet("Shows: question, your answer, correct answer, explanation, improvement tips"),
        bullet("'Make Flashcard' button per mistake"),
        bullet("'Mark Reviewed' tracking"),
        bullet("Most Common Mistakes statistics"),
        bullet("Filter by subject"),
        spacer(),

        // 19. MATH TOOLS
        pageBreak(),
        heading("19. Math Tools"),
        heading("Coordinate Graph", HeadingLevel.HEADING_2),
        bullet("Auto-appears for: plot, graph, coordinate, transformation questions"),
        bullet("Interactive grid — click/tap to plot points"),
        bullet("Zoom in/out, responsive on mobile and desktop"),
        spacer(),
        heading("Bearing Tool", HeadingLevel.HEADING_2),
        bullet("Auto-appears for: bearing, compass, navigation questions"),
        bullet("Compass rose with 0-360 markings"),
        spacer(),
        heading("Construction Tool", HeadingLevel.HEADING_2),
        bullet("Auto-appears for: construct, bisector, perpendicular questions"),
        bullet("Geometric construction grid"),
        spacer(),

        // 20. ASSIGNMENTS
        pageBreak(),
        heading("20. Assignments"),
        bullet("Pending tab — assignments due soon"),
        bullet("Submitted tab — awaiting grading"),
        bullet("Graded tab — scores and feedback"),
        bullet("Click 'Start' to begin, answer questions, submit"),
        bullet("Teachers grade and provide feedback"),
        spacer(),

        // CLOSING
        pageBreak(),
        heading("Support & Contact"),
        para("OVIA Prep is built by OVIA Software Solutions for Waterfalls Academy.", { bold: true }),
        spacer(),
        para("For support, contact your teacher or school administrator."),
        spacer(),
        para("Version: 2026.1", { color: COLORS.muted, size: 18 }),
        para("OVIA Software Solutions — Making ZIMSEC Revision Smarter", { color: COLORS.muted, size: 18, italics: true }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = "OVIA_Prep_Documentation_2026.docx";
  fs.writeFileSync(outPath, buffer);
  console.log(`Documentation generated: ${outPath}`);
}

main().catch(console.error);
