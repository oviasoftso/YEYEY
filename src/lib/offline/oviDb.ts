/**
 * OVI SYNC — Dexie.js v4 IndexedDB Schema
 * Offline-first local database for all student data.
 * Mirrors Supabase tables with sync metadata.
 */
import Dexie, { type EntityTable } from "dexie";

// ─── Entity Types ──────────────────────────────────────

interface OfflineProfile {
  id: string;
  name: string;
  stream: string;
  subjects: string[];
  language_pref: string;
  avatar_url: string | null;
  school_id: string | null;
  updated_at: string;
  _synced: number; // 0 = dirty, 1 = synced
  _version: number;
}

interface OfflineTopicMastery {
  id: string;
  user_id: string;
  subject: string;
  topic: string;
  mastery: number;
  lastRevised: string | null;
  assessmentsTaken: number;
  averageScore: number;
  _synced: number;
  _version: number;
}

interface OfflineFlashcard {
  id: string;
  user_id: string;
  subject: string;
  topic: string;
  question: string;
  answer: string;
  difficulty: number;
  stability: number;
  retrievability: number;
  last_review: string | null;
  next_review: string | null;
  review_count: number;
  _synced: number;
  _version: number;
}

interface OfflineFlashcardReview {
  id: string;
  flashcard_id: string;
  user_id: string;
  rating: number;
  response_time_ms: number;
  difficulty_before: number;
  stability_before: number;
  retrievability_before: number;
  difficulty_after: number;
  stability_after: number;
  retrievability_after: number;
  created_at: string;
  _synced: number;
}

interface OfflineAssessment {
  id: string;
  user_id: string;
  subject: string;
  topic: string;
  score: number;
  total: number;
  percentage: number;
  paper_type: string;
  questions: any[];
  answers: any[];
  created_at: string;
  _synced: number;
}

interface OfflineNote {
  id: string;
  user_id: string;
  subject: string;
  topic: string;
  content: string;
  key_terms: string[];
  exam_tips: string[];
  _synced: number;
  _version: number;
}

interface OfflineStudyPlanItem {
  id: string;
  user_id: string;
  subject: string;
  topic: string;
  activity: string;
  completed: boolean;
  scheduledFor: string;
  _synced: number;
  _version: number;
}

interface OfflineStreakData {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string;
  streak_bonus_active: boolean;
  _synced: number;
}

interface OfflineInteraction {
  id: string;
  user_id: string;
  role: string;
  question: string;
  answer: string;
  subject: string | null;
  topic: string | null;
  created_at: string;
  _synced: number;
}

interface SyncQueueItem {
  id?: number;
  table: string;
  record_id: string;
  action: "insert" | "update" | "delete";
  payload: any;
  created_at: string;
  attempts: number;
  last_error: string | null;
}

// ─── Database Definition ───────────────────────────────

const oviDb = new Dexie("OVIAPrepOffline") as Dexie & {
  profiles: EntityTable<OfflineProfile, "id">;
  mastery: EntityTable<OfflineTopicMastery, "id">;
  flashcards: EntityTable<OfflineFlashcard, "id">;
  flashcard_reviews: EntityTable<OfflineFlashcardReview, "id">;
  assessments: EntityTable<OfflineAssessment, "id">;
  notes: EntityTable<OfflineNote, "id">;
  study_plan: EntityTable<OfflineStudyPlanItem, "id">;
  streaks: EntityTable<OfflineStreakData, "id">;
  interactions: EntityTable<OfflineInteraction, "id">;
  sync_queue: EntityTable<SyncQueueItem, "id">;
};

oviDb.version(1).stores({
  profiles: "id, _synced",
  mastery: "id, user_id, subject, topic, [subject+topic], _synced",
  flashcards: "id, user_id, subject, topic, next_review, [subject+topic], _synced",
  flashcard_reviews: "id, flashcard_id, user_id, created_at, _synced",
  assessments: "id, user_id, subject, topic, created_at, _synced",
  notes: "id, user_id, subject, topic, [subject+topic], _synced",
  study_plan: "id, user_id, scheduledFor, completed, _synced",
  streaks: "id, user_id, _synced",
  interactions: "id, user_id, created_at, _synced",
  sync_queue: "++id, table, record_id, action, created_at, attempts",
});

export { oviDb };
export type {
  OfflineProfile, OfflineTopicMastery, OfflineFlashcard, OfflineFlashcardReview,
  OfflineAssessment, OfflineNote, OfflineStudyPlanItem, OfflineStreakData,
  OfflineInteraction, SyncQueueItem,
};
