export type Stream = "science" | "arts" | "commercial";

export type LocalLanguage = "Ndebele";

export type PracticalSubject =
  | "Computer Science"
  | "Textiles and Design"
  | "Food Technology and Design"
  | "Woodwork"
  | "Motor Mechanics"
  | "Agriculture"
  | "Physical Education and Mass Displays";

export interface StudentProfile {
  id: string;
  name: string;
  stream: Stream;
  localLanguage: LocalLanguage;
  practicalSubject?: PracticalSubject | null;
  subjects: string[];
  createdAt: string;
}

export interface TopicMastery {
  subject: string;
  topic: string;
  mastery: number;
  lastRevised: string;
  totalAttempts: number;
  correctAttempts: number;
}

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
}

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
}

export interface RevisionNote {
  id: string;
  subject: string;
  topic: string;
  content: string;
  createdAt: string;
}

export interface StudyPlanItem {
  id: string;
  subject: string;
  topic: string;
  activity: string;
  completed: boolean;
  scheduledFor: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
