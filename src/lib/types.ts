export type Stream = "science" | "arts" | "commercial";

export type LocalLanguage = "Ndebele" | "Shona" | "Nambya" | "English";

export type LanguagePref = "en" | "sn" | "nd" | "nb";

export type SubscriptionTier = "free" | "basic" | "premium" | "enterprise";

export type InterventionLevel = "nudge" | "critical";

export type AppRole = "admin" | "student" | "teacher";

export type PracticalSubject =
  | "Computer Science"
  | "Textiles and Design"
  | "Food Technology and Design"
  | "Woodwork"
  | "Motor Mechanics"
  | "Agriculture"
  | "Physical Education and Mass Displays";

// ─── Core Profiles ───

export interface StudentProfile {
  id: string;
  name: string;
  stream: Stream;
  localLanguage: LocalLanguage;
  practicalSubject?: PracticalSubject | null;
  subjects: string[];
  createdAt: string;
  schoolId?: string;
  languagePref?: LanguagePref;
  avatarUrl?: string;
  lastActive?: string;
}

export interface TopicMastery {
  subject: string;
  topic: string;
  mastery: number;
  lastRevised: string;
  totalAttempts: number;
  correctAttempts: number;
}

// ─── Assessments ───

export interface Assessment {
  id: string;
  subject: string;
  topic: string;
  questions: AssessmentQuestion[];
  totalScore: number;
  maxScore: number;
  percentage: number;
  completedAt: string;
  strongConcepts: string[];
  weakConcepts: string[];
  schoolId?: string;
  createdBy?: string;
  timeLimitMins?: number;
  totalMarks?: number;
  isPublished?: boolean;
  dueDate?: string;
  allowOfflineDownload?: boolean;
  topicIds?: string[];
}

export interface AssessmentQuestion {
  id: string;
  question: string;
  studentAnswer: string;
  correctAnswer: string;
  marksAllocated: number;
  marksAwarded: number;
  explanation: string;
  improvementAdvice: string;
  commandWord?: string;
}

export interface AssessmentSubmission {
  id: string;
  assessmentId: string;
  studentId: string;
  answers: Record<string, unknown>;
  score: number | null;
  feedbackJson: Record<string, unknown>;
  submittedAt: string;
  timeTakenSecs: number | null;
  offlineCreated: boolean;
}

// ─── Flashcards (FSRS-6) ───

export interface Flashcard {
  id: string;
  subject: string;
  topic: string;
  front: string;
  back: string;
  nextReview: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
  difficulty: number;      // FSRS-6 D ∈ [1, 10]
  stability: number;       // FSRS-6 S > 0
  retrievability: number;  // FSRS-6 R ∈ [0, 1]
  lastReviewedAt?: string;
}

export type EaseRating = "again" | "hard" | "good" | "easy";

export interface FlashcardReview {
  id: string;
  studentId: string;
  flashcardId: string;
  easeRating: EaseRating;
  responseTimeMs: number | null;
  difficultyBefore: number | null;
  stabilityBefore: number | null;
  retrievabilityBefore: number | null;
  intervalDays: number | null;
  reviewedAt: string;
}

// ─── Streak & Achievements ───

export interface StreakData {
  studentId: string;
  currentStreak: number;
  longestStreak: number;
  lastReviewDate: string | null;
  achievements: string[];
}

// ─── Notes ───

export interface RevisionNote {
  id: string;
  subject: string;
  topic: string;
  content: string;
  createdAt: string;
}

// ─── Study Plans ───

export interface StudyPlanItem {
  id: string;
  subject: string;
  topic: string;
  activity: string;
  completed: boolean;
  scheduledFor: string;
}

export interface StudyPlan {
  id: string;
  studentId: string;
  weekStart: string;
  planData: {
    items: StudyPlanItem[];
    rationale?: string;
    estimatedHours?: number;
    paceProfile?: "fast" | "steady" | "intensive";
  };
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Chat ───

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actionSuggestion?: ActionSuggestion;
  language?: LanguagePref;
}

export type ActionSuggestion =
  | "start_quiz"
  | "show_notes"
  | "suggest_flashcards"
  | "open_study_plan"
  | "show_past_paper"
  | "trigger_neglection_alert"
  | "show_teacher_assignment"
  | "suggest_video"
  | "open_exam_simulator"
  | "none";

// ─── OVI Interactions ───

export interface OviInteraction {
  id: string;
  studentId: string;
  sessionId: string;
  messageText: string;
  role: "user" | "ovi";
  language: string;
  actionTaken: string | null;
  createdAt: string;
}

// ─── Neglection ───

export interface NeglectionFlag {
  subject: string;
  daysInactive: number;
  mastery: number;
}

export interface NeglectionLog {
  id: string;
  studentId: string;
  subjectId: string;
  daysInactive: number;
  masteryScore: number;
  interventionLevel: InterventionLevel;
  notifiedAt: string | null;
  createdAt: string;
}

// ─── Notifications ───

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  data: Record<string, unknown>;
  createdAt: string;
}

// ─── Schools & Classrooms ───

export interface School {
  id: string;
  name: string;
  subscriptionTier: SubscriptionTier;
  maxStudents: number;
  syllabusStream: Stream | "all";
  adminUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherClassroom {
  id: string;
  teacherId: string;
  schoolId: string;
  name: string;
  subjectIds: string[];
  studentIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Sync Queue (Offline) ───

export interface SyncQueueItem {
  id: string;
  studentId: string;
  tableName: string;
  operation: "insert" | "update" | "delete";
  payload: Record<string, unknown>;
  createdAtOfflineAt: string;
  syncedAt: string | null;
  status: "pending" | "synced" | "failed";
}

// ─── Risk Reports ───

export interface RiskReport {
  atRiskStudents: { studentId: string; name: string; riskScore: number; reasons: string[] }[];
  mediumRisk: { studentId: string; name: string; riskScore: number; reasons: string[] }[];
  safe: { studentId: string; name: string }[];
}

// ─── Gamification ───

export interface XPData {
  totalXP: number;
  level: number;
  badges: Badge[];
  dailyChallengeStreak: number;
  lastChallengeDate: string | null;
  focusSessionsToday: number;
  lastFocusDate: string | null;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string | null;
}

export interface MistakeEntry {
  id: string;
  subject: string;
  topic: string;
  question: string;
  studentAnswer: string;
  correctAnswer: string;
  explanation: string;
  improvementAdvice: string;
  assessmentId: string;
  createdAt: string;
  reviewed: boolean;
}

export interface Assignment {
  id: string;
  classroomId: string;
  classroomName: string;
  title: string;
  subject: string;
  topic: string;
  paperType: string;
  questionCount: number;
  dueDate: string;
  instructions: string;
  status: "pending" | "in_progress" | "submitted" | "graded";
  score?: number;
  maxScore?: number;
  feedback?: string;
  submittedAt?: string;
  createdAt: string;
}

export interface FocusSession {
  id: string;
  subject: string | null;
  durationMinutes: number;
  completedAt: string;
  xpEarned: number;
}
