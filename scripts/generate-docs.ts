/**
 * Generate OVIA Prep Documentation as DOCX
 * Run: npx tsx scripts/generate-docs.ts
 */
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  PageBreak, TabStopPosition, TabStopType,
} from "docx";
import { saveAs } from "file-saver";

const COLORS = {
  primary: "1a73e8",
  dark: "1a1a2e",
  muted: "666666",
  success: "16a34a",
  warning: "d97706",
  white: "ffffff",
  lightBg: "f0f4ff",
};

function heading(text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, spacing: { before: 300, after: 100 }, children: [new TextRun({ text, bold: true })] });
}

function para(text: string, opts?: { bold?: boolean; color?: string; size?: number }) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text, bold: opts?.bold, color: opts?.color, size: opts?.size || 22 })],
  });
}

function bullet(text: string, level = 0) {
  return new Paragraph({
    bullet: { level },
    spacing: { after: 40 },
    children: [new TextRun({ text, size: 22 })],
  });
}

function spacer() {
  return new Paragraph({ spacing: { after: 150 }, children: [] });
}

function infoTable(rows: string[][]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((cells, ri) =>
      new TableRow({
        children: cells.map((cell) =>
          new TableCell({
            shading: ri === 0 ? { type: ShadingType.SOLID, color: COLORS.primary } : undefined,
            children: [
              new Paragraph({
                children: [new TextRun({ text: cell, bold: ri === 0, color: ri === 0 ? COLORS.white : undefined, size: 20 })],
              }),
            ],
          })
        ),
      })
    ),
  });
}

async function generateDocs() {
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 } },
        heading1: { run: { font: "Calibri", size: 36, bold: true, color: COLORS.primary } },
        heading2: { run: { font: "Calibri", size: 28, bold: true, color: COLORS.dark } },
        heading3: { run: { font: "Calibri", size: 24, bold: true, color: COLORS.muted } },
      },
    },
    sections: [{
      children: [
        // ─── COVER ───
        new Paragraph({ spacing: { before: 3000 }, children: [] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "OVIA PREP", bold: true, size: 72, color: COLORS.primary, font: "Calibri" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "Complete Feature Documentation", size: 32, color: COLORS.muted })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "ZIMSEC O-Level AI Revision Platform", size: 24, color: COLORS.muted })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: `Version 2026.1 — ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, size: 20, color: COLORS.muted })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "By OVIA Software Solutions", size: 20, color: COLORS.muted, italics: true })],
        }),

        // ─── PAGE BREAK ───
        new Paragraph({ children: [new PageBreak()] }),

        // ─── TABLE OF CONTENTS ───
        heading("Table of Contents"),
        para("1. Overview & How to Get Started"),
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

        // ─── 1. OVERVIEW ───
        new Paragraph({ children: [new PageBreak()] }),
        heading("1. Overview & How to Get Started"),
        para("OVIA Prep is Zimbabwe's first AI-powered ZIMSEC O-Level revision platform. It uses spaced repetition (FSRS-6), artificial intelligence, and gamification to help students study smarter and score higher.", { size: 22 }),
        spacer(),
        heading("Getting Started", HeadingLevel.HEADING_2),
        bullet("Open the app at your school's URL or install the PWA on your phone"),
        bullet("Enter your first name, surname, and create a password (min 8 chars with letters + numbers)"),
        bullet("Select your stream: Arts, Commercials, or Sciences"),
        bullet("Choose your ZIMSEC subjects (you can change these later)"),
        bullet("You'll land on the Dashboard — your daily study hub"),
        spacer(),
        heading("What Makes OVIA Different", HeadingLevel.HEADING_2),
        infoTable([
          ["Feature", "OVIA Prep", "Traditional Study"],
          ["Spaced Repetition", "FSRS-6 algorithm optimizes review timing", "Cramming before exams"],
          ["AI Tutoring", "Socratic questioning + step-by-step guidance", "Textbook only"],
          ["Gamification", "XP, levels, badges, streaks, leaderboard", "No motivation system"],
          ["Offline Support", "Works without internet, syncs when online", "Needs constant internet"],
          ["Adaptive Learning", "Focuses on your weak topics automatically", "Same content for everyone"],
          ["Multi-Language", "English, Shona, Ndebele support", "English only"],
        ]),
        spacer(),

        // ─── 2. DASHBOARD ───
        new Paragraph({ children: [new PageBreak()] }),
        heading("2. Dashboard — Your Learning Hub"),
        para("The Dashboard is the first thing you see after logging in. It's organized into 4 tabs:"),
        spacer(),
        heading("Today Tab", HeadingLevel.HEADING_2),
        bullet("Gamification Widget — See your XP, level, and earned badges"),
        bullet("Study Timer — 25-minute Pomodoro focus sessions with break reminders"),
        bullet("Daily Challenge — 3 quick questions from your weakest topics"),
        bullet("Exam Countdown — Days until each ZIMSEC exam"),
        bullet("Revision Scheduler — AI-recommended topics to study today"),
        spacer(),
        heading("Study Tab", HeadingLevel.HEADING_2),
        bullet("Quick action buttons: Start Assessment, Review Flashcards, Chat with OVI, Revision Notes"),
        bullet("Secondary actions: Exam Simulation, Past Papers, OVI Voice, Mistake Journal"),
        spacer(),
        heading("Progress Tab", HeadingLevel.HEADING_2),
        bullet("Study Heatmap — GitHub-style 52-week activity grid"),
        bullet("Leaderboard — Anonymous peer ranking by XP, streak, or score"),
        bullet("Progress Report — Downloadable DOCX for parents"),
        bullet("Study Tips — AI-generated recommendations"),
        spacer(),
        heading("Subjects Tab", HeadingLevel.HEADING_2),
        bullet("Per-subject mastery cards with progress bars"),
        bullet("Topic count and syllabus folder links"),
        bullet("Click any subject to start studying it"),
        spacer(),

        // ─── 3. FLASHCARDS ───
        new Paragraph({ children: [new PageBreak()] }),
        heading("3. OVI PULSE — Smart Flashcards"),
        para("Flashcards use the FSRS-6 spaced repetition algorithm — the same technology used by Anki, but optimized for ZIMSEC content."),
        spacer(),
        heading("How Flashcards Work", HeadingLevel.HEADING_2),
        bullet("Create flashcards from assessments (auto-created from wrong answers)"),
        bullet("Create flashcards manually from the Flashcards page"),
        bullet("Review cards daily — the algorithm shows you cards just before you forget them"),
        bullet("Rate each card: Again, Hard, Good, or Easy"),
        bullet("Cards rated 'Again' appear sooner; 'Easy' cards appear less often"),
        spacer(),
        heading("FSRS-6 Algorithm", HeadingLevel.HEADING_2),
        para("The Free Spaced Repetition Scheduler (FSRS-6) calculates the optimal time to review each card based on:"),
        bullet("Your past performance on that card"),
        bullet("How difficult the card is for you"),
        bullet("How stable the memory is (how long you've remembered it)"),
        bullet("The target retention rate (90% by default)"),
        spacer(),
        heading("Tips for Effective Flashcards", HeadingLevel.HEADING_2),
        bullet("Keep cards simple — one concept per card"),
        bullet("Use the 'Make Flashcard' button in the Mistake Journal to auto-create cards from wrong answers"),
        bullet("Review cards every day — even 5 minutes helps"),
        bullet("The streak counter tracks consecutive days of review"),
        spacer(),

        // ─── 4. ASSESSMENTS ───
        new Paragraph({ children: [new PageBreak()] }),
        heading("4. OVI ARENA — AI Assessments"),
        para("AI-generated assessments that match the ZIMSEC O-Level format. Choose Paper 1 (MCQ) or Paper 2 (Structured)."),
        spacer(),
        heading("Taking an Assessment", HeadingLevel.HEADING_2),
        bullet("Select your subject and topic"),
        bullet("Choose paper type: Paper 1 (20 MCQs) or Paper 2 (structured questions)"),
        bullet("Click 'Generate Assessment' — AI creates questions matching ZIMSEC style"),
        bullet("Answer each question — you can type, use voice input, or fill accounting tables"),
        bullet("Submit for AI grading — you get marks, feedback, and improvement tips"),
        spacer(),
        heading("After Grading", HeadingLevel.HEADING_2),
        bullet("See your score and percentage"),
        bullet("Review each question: your answer vs. the model answer side-by-side"),
        bullet("Read the explanation and improvement advice for each question"),
        bullet("Wrong answers are automatically added to your Mistake Journal"),
        bullet("Flashcards are auto-created from wrong answers"),
        bullet("XP is awarded: +20 for completing, +30 bonus for perfect score"),
        spacer(),
        heading("Special Features", HeadingLevel.HEADING_2),
        bullet("Accounting Tables — Fill in T-accounts, journals, trial balances, and income statements"),
        bullet("Math Graphs — Interactive coordinate grid for plotting, bearings, and constructions"),
        bullet("Voice Input — Speak your answers instead of typing"),
        bullet("Exam Simulation — Timed, full-paper exam experience"),
        spacer(),

        // ─── 5. STUDY PLAN ───
        new Paragraph({ children: [new PageBreak()] }),
        heading("5. OVI COMPASS — Study Planner"),
        para("The Study Planner creates a personalized revision schedule based on your exam dates and weak topics."),
        spacer(),
        heading("How It Works", HeadingLevel.HEADING_2),
        bullet("Set your ZIMSEC exam dates"),
        bullet("The AI analyzes your mastery levels across all subjects"),
        bullet("It generates a daily study plan prioritizing weak topics"),
        bullet("Each day shows what to study and for how long"),
        bullet("Completing study plan items earns XP and maintains your streak"),
        spacer(),

        // ─── 6. NOTES ───
        new Paragraph({ children: [new PageBreak()] }),
        heading("6. OVI VAULT — Revision Notes"),
        para("Generate and save revision notes for any topic. Three ways to get notes:"),
        spacer(),
        heading("Generate Notes", HeadingLevel.HEADING_2),
        bullet("Select subject and topic"),
        bullet("AI generates structured revision notes with key definitions, concepts, and exam tips"),
        bullet("Notes are formatted with LaTeX support for math expressions"),
        spacer(),
        heading("AI Notes Generator", HeadingLevel.HEADING_2),
        bullet("One-click generation of comprehensive revision notes"),
        bullet("Includes key definitions, concepts, common exam questions, and study tips"),
        bullet("Copy to clipboard or download"),
        spacer(),
        heading("Cloud Notes", HeadingLevel.HEADING_2),
        bullet("Notes generated from assessments are saved automatically"),
        bullet("Access them from any device"),
        bullet("Download as DOCX for offline study"),
        spacer(),

        // ─── 7. AI TUTOR ───
        new Paragraph({ children: [new PageBreak()] }),
        heading("7. OVI MIND — AI Tutor Chat"),
        para("Your personal AI tutor that helps you understand concepts through conversation."),
        spacer(),
        heading("How to Use OVI MIND", HeadingLevel.HEADING_2),
        bullet("Select your subject before asking questions"),
        bullet("Ask any question about your ZIMSEC syllabus"),
        bullet("The AI uses Socratic questioning — it guides you to the answer rather than just telling you"),
        bullet("It detects your language (English, Shona, Ndebele) and responds accordingly"),
        bullet("Every question earns +15 XP"),
        spacer(),
        heading("Tips for Better Answers", HeadingLevel.HEADING_2),
        bullet("Be specific: 'Explain photosynthesis in plants' is better than 'Tell me about science'"),
        bullet("Ask follow-up questions if you don't understand"),
        bullet("Ask for examples: 'Give me an example of osmosis in daily life'"),
        bullet("Ask for exam tips: 'What are common exam mistakes in algebra?'"),
        spacer(),

        // ─── 8. VOICE ───
        new Paragraph({ children: [new PageBreak()] }),
        heading("8. OVI VOICE — Text-to-Speech"),
        para("Listen to revision notes, explanations, and answers read aloud. Great for auditory learners."),
        spacer(),
        heading("Features", HeadingLevel.HEADING_2),
        bullet("Paste any text and hear it read aloud"),
        bullet("Choose between English, Shona, and Ndebele voices"),
        bullet("Adjust speed: slow for studying, normal for review, fast for revision"),
        bullet("Works with all content — notes, flashcards, assessment feedback"),
        spacer(),

        // ─── 9. ANALYTICS ───
        new Paragraph({ children: [new PageBreak()] }),
        heading("9. OVI INSIGHT — Analytics"),
        para("Deep analytics showing your learning patterns, predicted ZIMSEC grade, and improvement trends."),
        spacer(),
        heading("What You Can See", HeadingLevel.HEADING_2),
        bullet("Predicted ZIMSEC grade based on your assessment scores"),
        bullet("Per-subject mastery levels and trends"),
        bullet("Forgetting curve — which topics you're about to forget"),
        bullet("Study time distribution across subjects"),
        bullet("Weak topic identification with improvement recommendations"),
        bullet("Assessment score history and trends"),
        spacer(),

        // ─── 10. EXAM SIM ───
        new Paragraph({ children: [new PageBreak()] }),
        heading("10. Exam Simulation"),
        para("Practice under real ZIMSEC exam conditions with timed papers."),
        spacer(),
        heading("How It Works", HeadingLevel.HEADING_2),
        bullet("Select subject, paper type, and time limit"),
        bullet("AI generates a full exam paper matching ZIMSEC format"),
        bullet("Timer counts down — just like the real exam"),
        bullet("Submit when done — AI grades your paper"),
        bullet("See detailed feedback with model answers"),
        spacer(),

        // ─── 11. PAST PAPERS ───
        new Paragraph({ children: [new PageBreak()] }),
        heading("11. Past Paper Vault"),
        para("Access past ZIMSEC papers with AI-powered grading and explanations."),
        spacer(),
        heading("Features", HeadingLevel.HEADING_2),
        bullet("Browse past papers by subject and year"),
        bullet("Attempt papers online with the same interface as assessments"),
        bullet("AI grades your answers and provides detailed feedback"),
        bullet("See model answers and improvement tips for each question"),
        bullet("Track your improvement over time"),
        spacer(),

        // ─── 12. CLASSROOM ───
        new Paragraph({ children: [new PageBreak()] }),
        heading("12. OVI Classroom (Teacher Tools)",
        ),
        para("Teachers can manage their classes, create assignments, and track student progress."),
        spacer(),
        heading("Tabs", HeadingLevel.HEADING_2),
        infoTable([
          ["Tab", "What It Does"],
          ["Roster", "View and manage students in your classroom"],
          ["Assignments", "Create homework with due dates, auto-generated questions"],
          ["Exercises", "Start live in-class quizzes with real-time results"],
          ["Announcements", "Post announcements visible to all students"],
          ["Analytics", "See class average mastery, weak topics, performance tiers"],
          ["Sentinel", "Early warning system for at-risk students"],
          ["Gradebook", "Ranked student list with all assessment scores"],
        ]),
        spacer(),
        heading("Creating Assignments", HeadingLevel.HEADING_2),
        bullet("Click 'Create Assignment' in the Assignments tab"),
        bullet("Select subject, topic, paper type, and question count"),
        bullet("Set a due date"),
        bullet("Students see the assignment in their Assignments page"),
        bullet("View submissions and scores in the Assignments tab"),
        spacer(),

        // ─── 13. ADMIN ───
        new Paragraph({ children: [new PageBreak()] }),
        heading("13. Director's Suite (Admin)"),
        para("School administrators can manage students, view analytics, and configure the platform."),
        spacer(),
        heading("Features", HeadingLevel.HEADING_2),
        infoTable([
          ["Tab", "What It Does"],
          ["Students", "Full student registry with search, block/unblock, DOCX export"],
          ["Import", "Upload DOCX class lists, cross-check against registered students"],
          ["Analytics", "Active rate, platform average mastery, stream distribution"],
          ["Gradebook", "All students sorted by score with status badges"],
          ["Sentinel", "Early warning: low scores, inactive students, blocked users"],
          ["Quota", "Set institutional student quotas"],
          ["Syllabus", "Toggle ZIMSEC modules on/off"],
          ["Forge", "Assessment creation hub"],
        ]),
        spacer(),

        // ─── 14. PARENT ───
        new Paragraph({ children: [new PageBreak()] }),
        heading("14. Parent Dashboard"),
        para("Parents can view their child's progress, study activity, and download reports."),
        spacer(),
        heading("What Parents Can See", HeadingLevel.HEADING_2),
        bullet("Overall mastery percentage and trend"),
        bullet("Per-subject breakdown with weak areas highlighted"),
        bullet("Study activity heatmap — when and how often their child studies"),
        bullet("Exam countdown — days until each ZIMSEC exam"),
        bullet("Alerts: declining scores, low mastery, broken streaks"),
        bullet("Downloadable DOCX progress report"),
        spacer(),

        // ─── 15. GAMIFICATION ───
        new Paragraph({ children: [new PageBreak()] }),
        heading("15. Gamification System"),
        para("OVIA uses game mechanics to keep you motivated and studying consistently."),
        spacer(),
        heading("XP System", HeadingLevel.HEADING_2),
        infoTable([
          ["Action", "XP Earned"],
          ["Review a flashcard", "+10 XP"],
          ["Complete an assessment", "+20 XP"],
          ["Perfect score bonus", "+30 XP"],
          ["Ask OVI MIND a question", "+15 XP"],
          ["Complete a focus session", "+30 XP"],
          ["Complete daily challenge", "+50 XP"],
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
        bullet("First Steps — Complete your first assessment"),
        badge("Card Collector — Create 10 flashcards"),
        badge("Century — Review 100 flashcards"),
        badge("Week Warrior — 7-day study streak"),
        badge("Perfect Score — Get 100% on an assessment"),
        badge("Night Owl — Study after 10 PM"),
        badge("Focus Master — Complete 10 focus sessions"),
        badge("Challenge Champion — 7-day daily challenge streak"),
        spacer(),

        // ─── 16. FOCUS MODE ───
        new Paragraph({ children: [new PageBreak()] }),
        heading("16. Focus Mode & Study Timer"),
        para("The Study Timer uses the Pomodoro technique: 25 minutes of focused study, then a 5-minute break."),
        spacer(),
        heading("Study Timer", HeadingLevel.HEADING_2),
        bullet("Click 'Start' to begin a 25-minute focus session"),
        bullet("Circular countdown ring shows progress"),
        bullet("When the timer ends, take a 5-minute break"),
        bullet("Each completed session earns +30 XP"),
        bullet("Session counter tracks how many you've done today"),
        spacer(),
        heading("Focus Mode", HeadingLevel.HEADING_2),
        bullet("Click 'Focus' on the timer to enter fullscreen distraction-free mode"),
        bullet("Choose ambient sounds: Rain, Waves, Wind, Fireplace, Forest, Cafe"),
        bullet("Adjust volume or mute"),
        bullet("Choose timer duration: 15, 25, 45, or 60 minutes"),
        bullet("Toggle fullscreen for maximum focus"),
        spacer(),

        // ─── 17. DAILY CHALLENGE ───
        new Paragraph({ children: [new PageBreak()] }),
        heading("17. Daily Challenge"),
        para("Every day, OVIA generates 3 quick questions from your weakest topics. Takes about 2 minutes."),
        spacer(),
        heading("How It Works", HeadingLevel.HEADING_2),
        bullet("The AI identifies your 3 weakest topics"),
        bullet("It generates 1 question per topic"),
        bullet("Answer each question — see the correct answer immediately"),
        bullet("Complete all 3 to earn +50 XP"),
        bullet("Build a challenge streak for bonus badges"),
        bullet("Resets at midnight every day"),
        spacer(),

        // ─── 18. MISTAKE JOURNAL ───
        new Paragraph({ children: [new PageBreak()] }),
        heading("18. Mistake Journal"),
        para("Every wrong answer from assessments is automatically collected here for review."),
        spacer(),
        heading("Features", HeadingLevel.HEADING_2),
        bullet("Organized by subject and topic"),
        bullet("Shows: question, your answer, correct answer, explanation, improvement tips"),
        bullet("'Make Flashcard' button — creates a flashcard from the mistake"),
        bullet("'Mark Reviewed' — track which mistakes you've studied"),
        bullet("Most Common Mistakes — shows your top weak areas"),
        bullet("Filter by subject"),
        spacer(),
        heading("How to Use It", HeadingLevel.HEADING_2),
        bullet("Open Mistake Journal from the sidebar"),
        bullet("Click any mistake to expand it"),
        bullet("Read the correct answer and explanation"),
        bullet("Click 'Make Flashcard' to add it to your flashcard deck"),
        bullet("Review your mistakes before assessments to avoid repeating them"),
        spacer(),

        // ─── 19. MATH TOOLS ───
        new Paragraph({ children: [new PageBreak()] }),
        heading("19. Math Tools"),
        para("Interactive tools that appear automatically in math assessments."),
        spacer(),
        heading("Coordinate Graph", HeadingLevel.HEADING_2),
        bullet("Appears when questions mention: plot, graph, coordinate, transformation, reflect, rotate"),
        bullet("Interactive grid — click/tap to plot points"),
        bullet("Zoom in/out with buttons"),
        bullet("Shows coordinates on hover/touch"),
        bullet("Works on mobile and desktop"),
        spacer(),
        heading("Bearing Tool", HeadingLevel.HEADING_2),
        bullet("Appears when questions mention: bearing, compass, navigation"),
        bullet("Compass rose with 0-360 degree markings"),
        bullet("Shows bearing lines with angles"),
        bullet("Cardinal directions (N, S, E, W)"),
        spacer(),
        heading("Construction Tool", HeadingLevel.HEADING_2),
        bullet("Appears when questions mention: construct, bisector, perpendicular"),
        bullet("Coordinate grid for geometric constructions"),
        bullet("Shows points, lines, arcs, and circles"),
        spacer(),

        // ─── 20. ASSIGNMENTS ───
        new Paragraph({ children: [new PageBreak()] }),
        heading("20. Assignments"),
        para("Teachers assign homework through OVI Classroom. Students see and complete assignments here."),
        spacer(),
        heading("Student View", HeadingLevel.HEADING_2),
        bullet("Pending tab — assignments due soon"),
        bullet("Submitted tab — assignments awaiting grading"),
        bullet("Graded tab — assignments with scores and feedback"),
        bullet("Click 'Start' to begin an assignment"),
        bullet("Overdue assignments are highlighted in red"),
        spacer(),
        heading("Completing an Assignment", HeadingLevel.HEADING_2),
        bullet("Click 'Start' on a pending assignment"),
        bullet("You're taken to the assessment page with pre-loaded questions"),
        bullet("Answer all questions and submit"),
        bullet("Your teacher sees your submission and can grade it"),
        bullet("Check back in the Graded tab for your score and feedback"),
        spacer(),

        // ─── CLOSING ───
        new Paragraph({ children: [new PageBreak()] }),
        heading("Support & Contact"),
        para("OVIA Prep is built by OVIA Software Solutions for Waterfalls Academy."),
        spacer(),
        para("For support, contact your teacher or school administrator.", { bold: true }),
        spacer(),
        para("Version: 2026.1", { color: COLORS.muted, size: 18 }),
        para(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, { color: COLORS.muted, size: 18 }),
        para("OVIA Software Solutions — Making ZIMSEC Revision Smarter", { color: COLORS.muted, size: 18, italics: true }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `OVIA_Prep_Documentation_${new Date().toISOString().split("T")[0]}.docx`;
  a.click();
  URL.revokeObjectURL(url);
  console.log("Documentation generated successfully!");
}

generateDocs().catch(console.error);
