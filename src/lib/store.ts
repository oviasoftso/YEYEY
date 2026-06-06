import {
  StudentProfile, TopicMastery, Assessment, Flashcard, RevisionNote,
  StudyPlanItem, StreakData, Notification, SyncQueueItem, XPData, MistakeEntry, FocusSession, Assignment
} from "./types";
import { supabase } from "@/integrations/supabase/client";
import { getSubjectsForStream } from "./constants";
import {
  initializeCard, updateCard, getCurrentState, type EaseRating, type FlashcardFSRS
} from "./fsrs";
import { getDefaultXPData, getLevelFromXP, checkNewBadges, XP_REWARDS } from "./gamification";

const KEYS = {
  profile: "ovis_profile",
  mastery: "ovis_mastery",
  assessments: "ovis_assessments",
  flashcards: "ovis_flashcards",
  notes: "ovis_notes",
  studyPlan: "ovis_study_plan",
  streak: "ovis_streak",
  notifications: "ovis_notifications",
  syncQueue: "ovis_sync_queue",
  xpData: "ovis_xp_data",
  mistakes: "ovis_mistakes",
  focusSessions: "ovis_focus_sessions",
  assignments: "ovis_assignments",
} as const;

function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeProfileSubjects(profile: StudentProfile): StudentProfile {
  const streamSubjects = getSubjectsForStream(profile.stream);
  return { ...profile, practicalSubject: null, subjects: streamSubjects };
}

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export const store = {
  // ─── Profile ─────────────────────────────────────────────────
  getProfile: (): StudentProfile | null => {
    const profile = getLocal<StudentProfile | null>(KEYS.profile, null);
    if (!profile?.stream) return profile;
    const normalized = normalizeProfileSubjects(profile);
    if (JSON.stringify(profile.subjects) !== JSON.stringify(normalized.subjects)) setLocal(KEYS.profile, normalized);
    return normalized;
  },
  setProfile: (p: StudentProfile) => {
    setLocal(KEYS.profile, normalizeProfileSubjects(p));
  },

  async loadProfileFromCloud(): Promise<StudentProfile | null> {
    const userId = await getUserId();
    if (!userId) return null;
    const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
    if (!data) return null;
    const profile: StudentProfile = normalizeProfileSubjects({
      id: data.id,
      name: data.display_name,
      stream: data.stream as StudentProfile["stream"],
      localLanguage: data.local_language as StudentProfile["localLanguage"],
      languagePref: (data.language_pref || "en") as StudentProfile["languagePref"],
      practicalSubject: data.practical_subject as StudentProfile["practicalSubject"],
      subjects: data.subjects || [],
      schoolId: data.school_id,
      avatarUrl: data.avatar_url,
      createdAt: data.created_at,
      lastActive: data.last_active,
    });
    setLocal(KEYS.profile, profile);
    return profile;
  },

  // ─── Topic Mastery ───────────────────────────────────────────
  getMastery: (): TopicMastery[] => getLocal(KEYS.mastery, []),
  setMastery: (m: TopicMastery[]) => setLocal(KEYS.mastery, m),

  updateTopicMastery: async (subject: string, topic: string, correct: boolean) => {
    const all = store.getMastery();
    const idx = all.findIndex((m) => m.subject === subject && m.topic === topic);
    let entry: TopicMastery;
    if (idx >= 0) {
      entry = { ...all[idx] };
      entry.totalAttempts++;
      if (correct) entry.correctAttempts++;
      entry.mastery = Math.round((entry.correctAttempts / entry.totalAttempts) * 100);
      entry.lastRevised = new Date().toISOString();
      all[idx] = entry;
    } else {
      entry = {
        subject, topic, mastery: correct ? 100 : 0, lastRevised: new Date().toISOString(),
        totalAttempts: 1, correctAttempts: correct ? 1 : 0,
      };
      all.push(entry);
    }
    setLocal(KEYS.mastery, all);

    const userId = await getUserId();
    if (userId) {
      await supabase.from("topic_mastery").upsert({
        user_id: userId,
        subject: entry.subject,
        topic: entry.topic,
        mastery: entry.mastery,
        last_revised: entry.lastRevised,
        total_attempts: entry.totalAttempts,
        correct_attempts: entry.correctAttempts,
      }, { onConflict: "user_id,subject,topic" });
    }
  },

  batchUpdateMastery: async (subject: string, topic: string, totalCount: number, correctCount: number) => {
    const all = store.getMastery();
    const idx = all.findIndex((m) => m.subject === subject && m.topic === topic);
    let entry: TopicMastery;
    if (idx >= 0) {
      entry = { ...all[idx] };
      entry.totalAttempts += totalCount;
      entry.correctAttempts += correctCount;
      entry.mastery = Math.round((entry.correctAttempts / entry.totalAttempts) * 100);
      entry.lastRevised = new Date().toISOString();
      all[idx] = entry;
    } else {
      entry = {
        subject, topic,
        mastery: totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0,
        lastRevised: new Date().toISOString(),
        totalAttempts: totalCount,
        correctAttempts: correctCount,
      };
      all.push(entry);
    }
    setLocal(KEYS.mastery, all);

    const userId = await getUserId();
    if (userId) {
      await supabase.from("topic_mastery").upsert({
        user_id: userId,
        subject: entry.subject,
        topic: entry.topic,
        mastery: entry.mastery,
        last_revised: entry.lastRevised,
        total_attempts: entry.totalAttempts,
        correct_attempts: entry.correctAttempts,
      }, { onConflict: "user_id,subject,topic" });
    }
  },

  async loadMasteryFromCloud(): Promise<TopicMastery[]> {
    const userId = await getUserId();
    if (!userId) return [];
    const { data } = await supabase.from("topic_mastery").select("*").eq("user_id", userId);
    if (!data) return [];
    const mastery: TopicMastery[] = data.map((d: any) => ({
      subject: d.subject,
      topic: d.topic,
      mastery: d.mastery,
      lastRevised: d.last_revised,
      totalAttempts: d.total_attempts,
      correctAttempts: d.correct_attempts,
    }));
    setLocal(KEYS.mastery, mastery);
    return mastery;
  },

  // ─── Assessments ─────────────────────────────────────────────
  getAssessments: (): Assessment[] => getLocal(KEYS.assessments, []),
  addAssessment: async (a: Assessment) => {
    const all = store.getAssessments();
    all.push(a);
    setLocal(KEYS.assessments, all);

    const userId = await getUserId();
    if (userId) {
      await supabase.from("assessments").insert({
        id: a.id,
        user_id: userId,
        subject: a.subject,
        topic: a.topic,
        total_score: a.totalScore,
        max_score: a.maxScore,
        percentage: a.percentage,
        completed_at: a.completedAt,
        strong_concepts: a.strongConcepts,
        weak_concepts: a.weakConcepts,
        questions: a.questions as any,
        paper_type: a.paperType || "paper2",
      });
    }
  },

  async loadAssessmentsFromCloud(): Promise<Assessment[]> {
    const userId = await getUserId();
    if (!userId) return [];
    const { data } = await supabase.from("assessments").select("*").eq("user_id", userId).order("completed_at", { ascending: false });
    if (!data) return [];
    const assessments: Assessment[] = data.map((d: any) => ({
      id: d.id,
      subject: d.subject,
      topic: d.topic,
      questions: d.questions,
      totalScore: d.total_score,
      maxScore: d.max_score,
      percentage: d.percentage,
      completedAt: d.completed_at,
      strongConcepts: d.strong_concepts || [],
      weakConcepts: d.weak_concepts || [],
      paperType: d.paper_type || "paper2",
    }));
    setLocal(KEYS.assessments, assessments);
    return assessments;
  },

  // ─── Flashcards (FSRS-6) ────────────────────────────────────
  getFlashcards: (): Flashcard[] => getLocal(KEYS.flashcards, []),

  setFlashcards: (f: Flashcard[]) => {
    setLocal(KEYS.flashcards, f);
  },

  addFlashcard: async (f: Flashcard) => {
    const all = store.getFlashcards();
    all.push(f);
    setLocal(KEYS.flashcards, all);

    const userId = await getUserId();
    if (userId) {
      await supabase.from("flashcards").insert({
        id: f.id,
        user_id: userId,
        subject: f.subject,
        topic: f.topic,
        front: f.front,
        back: f.back,
        difficulty: f.difficulty,
        stability: f.stability,
        retrievability: f.retrievability,
        last_reviewed_at: f.lastReviewedAt || null,
        response_time_ms: f.responseTimeMs || null,
        repetitions: f.repetitions,
      });
    }
  },

  /**
   * Create a new FSRS-6 flashcard with proper initialization.
   */
  createFSRSCard(subject: string, topic: string, front: string, back: string): Flashcard {
    const initialState = initializeCard('good');
    return {
      id: crypto.randomUUID(),
      subject,
      topic,
      front,
      back,
      ...initialState,
      repetitions: 0,
    };
  },

  /**
   * Review a flashcard using FSRS-6 algorithm.
   * Updates the card's D/S/R state and logs the review.
   */
  reviewFlashcard: async (cardId: string, rating: EaseRating, responseTimeMs?: number): Promise<Flashcard | null> => {
    const all = store.getFlashcards();
    const idx = all.findIndex(c => c.id === cardId);
    if (idx < 0) return null;

    const card = all[idx];
    const currentR = getCurrentState(card);
    const daysSinceReview = card.lastReviewedAt
      ? Math.max(0, Math.floor((Date.now() - new Date(card.lastReviewedAt).getTime()) / (24 * 60 * 60 * 1000)))
      : 0;

    const result = updateCard(
      { difficulty: card.difficulty, stability: card.stability, retrievability: currentR.retrievability },
      rating,
      daysSinceReview,
      responseTimeMs
    );

    const updatedCard: Flashcard = {
      ...card,
      difficulty: result.difficulty,
      stability: result.stability,
      retrievability: result.retrievability,
      lastReviewedAt: new Date().toISOString(),
      responseTimeMs,
      repetitions: card.repetitions + 1,
    };

    all[idx] = updatedCard;
    setLocal(KEYS.flashcards, all);

    // Sync to Supabase
    const userId = await getUserId();
    if (userId) {
      await supabase.from("flashcards").update({
        difficulty: updatedCard.difficulty,
        stability: updatedCard.stability,
        retrievability: updatedCard.retrievability,
        last_reviewed_at: updatedCard.lastReviewedAt,
        response_time_ms: updatedCard.responseTimeMs,
        repetitions: updatedCard.repetitions,
      }).eq("id", cardId);

      // Log review to flashcard_reviews table
      await supabase.from("flashcard_reviews").insert({
        student_id: userId,
        flashcard_id: cardId,
        ease_rating: rating,
        response_time_ms: responseTimeMs,
        difficulty_before: card.difficulty,
        stability_before: card.stability,
        retrievability_before: currentR.retrievability,
        difficulty_after: result.difficulty,
        stability_after: result.stability,
        interval_days: result.intervalDays,
      });
    }

    return updatedCard;
  },

  async updateFlashcard(f: Flashcard) {
    const all = store.getFlashcards();
    const idx = all.findIndex(c => c.id === f.id);
    if (idx >= 0) all[idx] = f;
    setLocal(KEYS.flashcards, all);

    await supabase.from("flashcards").update({
      difficulty: f.difficulty,
      stability: f.stability,
      retrievability: f.retrievability,
      last_reviewed_at: f.lastReviewedAt,
      response_time_ms: f.responseTimeMs,
      repetitions: f.repetitions,
    }).eq("id", f.id);
  },

  async deleteFlashcard(id: string) {
    const all = store.getFlashcards().filter(c => c.id !== id);
    setLocal(KEYS.flashcards, all);
    await supabase.from("flashcards").delete().eq("id", id);
  },

  async loadFlashcardsFromCloud(): Promise<Flashcard[]> {
    const userId = await getUserId();
    if (!userId) return [];
    const { data } = await supabase.from("flashcards").select("*").eq("user_id", userId);
    if (!data) return [];
    const cards: Flashcard[] = data.map((d: any) => ({
      id: d.id,
      subject: d.subject,
      topic: d.topic,
      front: d.front,
      back: d.back,
      difficulty: d.difficulty ?? 0.3,
      stability: d.stability ?? 1.0,
      retrievability: d.retrievability ?? 1.0,
      lastReviewedAt: d.last_reviewed_at,
      responseTimeMs: d.response_time_ms,
      repetitions: d.repetitions ?? 0,
    }));
    setLocal(KEYS.flashcards, cards);
    return cards;
  },

  // ─── Notes ───────────────────────────────────────────────────
  getNotes: (): RevisionNote[] => getLocal(KEYS.notes, []),
  addNote: async (n: RevisionNote) => {
    const all = store.getNotes();
    all.push(n);
    setLocal(KEYS.notes, all);

    const userId = await getUserId();
    if (userId) {
      await supabase.from("revision_notes").insert({
        id: n.id,
        user_id: userId,
        subject: n.subject,
        topic: n.topic,
        content: n.content,
        created_at: n.createdAt,
      });
    }
  },

  async loadNotesFromCloud(): Promise<RevisionNote[]> {
    const userId = await getUserId();
    if (!userId) return [];
    const { data } = await supabase.from("revision_notes").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (!data) return [];
    const notes: RevisionNote[] = data.map((d: any) => ({
      id: d.id,
      subject: d.subject,
      topic: d.topic,
      content: d.content,
      createdAt: d.created_at,
    }));
    setLocal(KEYS.notes, notes);
    return notes;
  },

  // ─── Study Plan ──────────────────────────────────────────────
  getStudyPlan: (): StudyPlanItem[] => getLocal(KEYS.studyPlan, []),
  setStudyPlan: async (items: StudyPlanItem[]) => {
    setLocal(KEYS.studyPlan, items);
    const userId = await getUserId();
    if (!userId) return;
    await supabase.from("study_plan_items").delete().eq("user_id", userId);
    if (items.length > 0) {
      await supabase.from("study_plan_items").insert(
        items.map(item => ({
          id: item.id,
          user_id: userId,
          subject: item.subject,
          topic: item.topic,
          activity: item.activity,
          completed: item.completed,
          scheduled_for: item.scheduledFor,
        }))
      );
    }
  },

  async loadStudyPlanFromCloud(): Promise<StudyPlanItem[]> {
    const userId = await getUserId();
    if (!userId) return [];
    const { data } = await supabase.from("study_plan_items").select("*").eq("user_id", userId).order("scheduled_for", { ascending: true });
    if (!data) return [];
    const plan: StudyPlanItem[] = data.map((d: any) => ({
      id: d.id,
      subject: d.subject,
      topic: d.topic,
      activity: d.activity,
      completed: d.completed,
      scheduledFor: d.scheduled_for,
    }));
    setLocal(KEYS.studyPlan, plan);
    return plan;
  },

  // ─── Streak ──────────────────────────────────────────────────
  getStreak: (): StreakData => getLocal(KEYS.streak, {
    currentStreak: 0,
    longestStreak: 0,
    lastReviewDate: null,
    achievements: [],
  }),

  setStreak: async (s: StreakData) => {
    setLocal(KEYS.streak, s);
    const userId = await getUserId();
    if (userId) {
      await supabase.from("streak_data").upsert({
        student_id: userId,
        current_streak: s.currentStreak,
        longest_streak: s.longestStreak,
        last_review_date: s.lastReviewDate,
        achievements: s.achievements,
      }, { onConflict: "student_id" });
    }
  },

  async loadStreakFromCloud(): Promise<StreakData> {
    const userId = await getUserId();
    if (!userId) return { currentStreak: 0, longestStreak: 0, lastReviewDate: null, achievements: [] };
    const { data } = await supabase.from("streak_data").select("*").eq("student_id", userId).single();
    if (!data) return { currentStreak: 0, longestStreak: 0, lastReviewDate: null, achievements: [] };
    const streak: StreakData = {
      currentStreak: data.current_streak,
      longestStreak: data.longest_streak,
      lastReviewDate: data.last_review_date,
      achievements: data.achievements || [],
    };
    setLocal(KEYS.streak, streak);
    return streak;
  },

  // ─── Notifications ───────────────────────────────────────────
  getNotifications: (): Notification[] => getLocal(KEYS.notifications, []),

  addNotification: async (n: Notification) => {
    const all = store.getNotifications();
    all.unshift(n);
    setLocal(KEYS.notifications, all);

    const userId = await getUserId();
    if (userId) {
      await supabase.from("notifications").insert({
        id: n.id,
        user_id: userId,
        type: n.type,
        title: n.title,
        body: n.body,
        read: n.read,
        data: n.data,
      });
    }
  },

  markNotificationRead: async (id: string) => {
    const all = store.getNotifications();
    const idx = all.findIndex(n => n.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], read: true };
      setLocal(KEYS.notifications, all);
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    }
  },

  async loadNotificationsFromCloud(): Promise<Notification[]> {
    const userId = await getUserId();
    if (!userId) return [];
    const { data } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
    if (!data) return [];
    const notifications: Notification[] = data.map((d: any) => ({
      id: d.id,
      userId: d.user_id,
      type: d.type,
      title: d.title,
      body: d.body,
      read: d.read,
      data: d.data || {},
      createdAt: d.created_at,
    }));
    setLocal(KEYS.notifications, notifications);
    return notifications;
  },

  // ─── Sync Queue (for offline) ────────────────────────────────
  getSyncQueue: (): SyncQueueItem[] => getLocal(KEYS.syncQueue, []),

  addToSyncQueue: (item: Omit<SyncQueueItem, "id" | "status">) => {
    const queue = store.getSyncQueue();
    queue.push({ ...item, id: crypto.randomUUID(), status: "pending" });
    setLocal(KEYS.syncQueue, queue);
  },

  async processSyncQueue(): Promise<number> {
    const queue = store.getSyncQueue().filter(i => i.status === "pending");
    if (queue.length === 0) return 0;

    let processed = 0;
    for (const item of queue) {
      try {
        const userId = await getUserId();
        if (!userId) break;

        const { error } = await supabase.from("sync_queue").insert({
          student_id: userId,
          table_name: item.tableName,
          operation: item.operation,
          payload: item.payload,
          created_offline_at: item.createdAt,
        });

        if (!error) {
          const all = store.getSyncQueue();
          const idx = all.findIndex(i => i.id === item.id);
          if (idx >= 0) {
            all[idx] = { ...all[idx], status: "synced", syncedAt: new Date().toISOString() };
            setLocal(KEYS.syncQueue, all);
          }
          processed++;
        }
      } catch {
        // Will retry on next sync
      }
    }
    return processed;
  },

  // ─── Gamification ──────────────────────────────────────────────
  getXPData(): XPData {
    return getLocal(KEYS.xpData, getDefaultXPData());
  },

  setXPData(data: XPData) {
    setLocal(KEYS.xpData, data);
  },

  addXP(amount: number, source: string): { xpData: XPData; levelUp: boolean; newBadges: import("./types").Badge[] } {
    const data = this.getXPData();
    const oldLevel = data.level;
    data.totalXP += amount;
    data.level = getLevelFromXP(data.totalXP);

    // Check for new badges
    const assessments = this.getAssessments();
    const flashcards = this.getFlashcards();
    const streak = this.getStreak();
    const newBadges = checkNewBadges(data, {
      assessmentsTaken: assessments.length,
      flashcardsCreated: flashcards.length,
      flashcardsReviewed: flashcards.reduce((sum, f) => sum + f.review_count, 0),
      currentStreak: streak.current_streak,
      focusSessions: data.focusSessionsToday,
      subjectsStudiedThisWeek: [...new Set(assessments.filter(a => {
        const d = new Date(a.completedAt);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return d > weekAgo;
      }).map(a => a.subject))].length,
      perfectScores: assessments.filter(a => a.percentage === 100).length,
    });

    data.badges = [...data.badges, ...newBadges];
    this.setXPData(data);

    return {
      xpData: data,
      levelUp: data.level > oldLevel,
      newBadges,
    };
  },

  getMistakes(): MistakeEntry[] {
    return getLocal(KEYS.mistakes, []);
  },

  addMistake(mistake: Omit<MistakeEntry, "id" | "createdAt" | "reviewed">) {
    const mistakes = this.getMistakes();
    mistakes.push({
      ...mistake,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      reviewed: false,
    });
    setLocal(KEYS.mistakes, mistakes);
  },

  markMistakeReviewed(id: string) {
    const mistakes = this.getMistakes();
    const idx = mistakes.findIndex((m) => m.id === id);
    if (idx >= 0) {
      mistakes[idx].reviewed = true;
      setLocal(KEYS.mistakes, mistakes);
    }
  },

  getFocusSessions(): FocusSession[] {
    return getLocal(KEYS.focusSessions, []);
  },

  addFocusSession(session: Omit<FocusSession, "id">) {
    const sessions = this.getFocusSessions();
    sessions.push({ ...session, id: crypto.randomUUID() });
    setLocal(KEYS.focusSessions, sessions);

    // Update XP data focus count
    const xpData = this.getXPData();
    const today = new Date().toISOString().split("T")[0];
    if (xpData.lastFocusDate === today) {
      xpData.focusSessionsToday++;
    } else {
      xpData.focusSessionsToday = 1;
      xpData.lastFocusDate = today;
    }
    this.setXPData(xpData);
  },

  getDailyChallengeStreak(): number {
    const data = this.getXPData();
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    if (data.lastChallengeDate === today || data.lastChallengeDate === yesterday) {
      return data.dailyChallengeStreak;
    }
    return 0; // Streak broken
  },

  completeDailyChallenge() {
    const data = this.getXPData();
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    if (data.lastChallengeDate === today) return; // Already done today

    if (data.lastChallengeDate === yesterday) {
      data.dailyChallengeStreak++;
    } else {
      data.dailyChallengeStreak = 1;
    }
    data.lastChallengeDate = today;
    this.setXPData(data);
    this.addXP(XP_REWARDS.DAILY_CHALLENGE, "daily_challenge");
  },

  // ─── Cloud Sync ──────────────────────────────────────────────
  async syncFromCloud(): Promise<void> {
    await Promise.all([
      store.loadProfileFromCloud(),
      store.loadMasteryFromCloud(),
      store.loadAssessmentsFromCloud(),
      store.loadFlashcardsFromCloud(),
      store.loadNotesFromCloud(),
      store.loadStudyPlanFromCloud(),
      store.loadStreakFromCloud(),
      store.loadNotificationsFromCloud(),
    ]);
  },

  // ── Assignments ──
  getAssignments(): Assignment[] {
    return getLocal(KEYS.assignments, []);
  },

  addAssignment(assignment: Omit<Assignment, "id" | "createdAt">) {
    const all = this.getAssignments();
    const entry: Assignment = {
      ...assignment,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    all.push(entry);
    setLocal(KEYS.assignments, all);
    return entry;
  },

  updateAssignment(id: string, updates: Partial<Assignment>) {
    const all = this.getAssignments();
    const idx = all.findIndex((a) => a.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updates };
      setLocal(KEYS.assignments, all);
    }
  },

  submitAssignment(id: string, score: number, maxScore: number, feedback: string) {
    this.updateAssignment(id, {
      status: "graded",
      score,
      maxScore,
      feedback,
      submittedAt: new Date().toISOString(),
    });
    // Add XP for completing assignment
    this.addXP(XP_REWARDS.ASSESSMENT_COMPLETE, "assignment");
    if (score === maxScore) this.addXP(XP_REWARDS.PERFECT_SCORE_BONUS, "assignment_perfect");
  },

  clearLocal() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  },
};
