import { StudentProfile, TopicMastery, Assessment, Flashcard, RevisionNote, StudyPlanItem } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { getSubjectsForStream } from "./constants";

const KEYS = {
  profile: "ovis_profile",
  mastery: "ovis_mastery",
  assessments: "ovis_assessments",
  flashcards: "ovis_flashcards",
  notes: "ovis_notes",
  studyPlan: "ovis_study_plan",
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
  // ─── Profile ───
  getProfile: (): StudentProfile | null => {
    const profile = getLocal<StudentProfile | null>(KEYS.profile, null);
    if (!profile?.stream) return profile;
    const normalized = normalizeProfileSubjects(profile);
    if (JSON.stringify(profile.subjects) !== JSON.stringify(normalized.subjects)) setLocal(KEYS.profile, normalized);
    return normalized;
  },
  setProfile: (p: StudentProfile) => {
    setLocal(KEYS.profile, normalizeProfileSubjects(p));
    // Cloud sync happens in Onboarding via supabase update
  },

  // Load profile from cloud into localStorage
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
      practicalSubject: data.practical_subject as StudentProfile["practicalSubject"],
      subjects: data.subjects || [],
      createdAt: data.created_at,
    });
    setLocal(KEYS.profile, profile);
    return profile;
  },

  // ─── Topic Mastery ───
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

    // Sync to cloud
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

  /** Batch update mastery for a topic after an assessment (one localStorage write + one Supabase upsert). */
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

  // ─── Assessments ───
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
    }));
    setLocal(KEYS.assessments, assessments);
    return assessments;
  },

  // ─── Flashcards ───
  getFlashcards: (): Flashcard[] => getLocal(KEYS.flashcards, []),
  setFlashcards: async (f: Flashcard[]) => {
    setLocal(KEYS.flashcards, f);
    // Bulk update is handled per-card in the pages
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
        next_review: f.nextReview,
        interval_days: f.interval,
        ease_factor: f.easeFactor,
        repetitions: f.repetitions,
      });
    }
  },

  async updateFlashcard(f: Flashcard) {
    const all = store.getFlashcards();
    const idx = all.findIndex(c => c.id === f.id);
    if (idx >= 0) all[idx] = f;
    setLocal(KEYS.flashcards, all);

    await supabase.from("flashcards").update({
      next_review: f.nextReview,
      interval_days: f.interval,
      ease_factor: f.easeFactor,
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
      nextReview: d.next_review,
      interval: d.interval_days,
      easeFactor: Number(d.ease_factor),
      repetitions: d.repetitions,
    }));
    setLocal(KEYS.flashcards, cards);
    return cards;
  },

  // ─── Notes ───
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

  // ─── Study Plan ───
  getStudyPlan: (): StudyPlanItem[] => getLocal(KEYS.studyPlan, []),
  setStudyPlan: async (items: StudyPlanItem[]) => {
    setLocal(KEYS.studyPlan, items);
    const userId = await getUserId();
    if (!userId) return;
    // Delete old plan and insert new
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

  // ─── Load all data from cloud (call on login) ───
  async syncFromCloud(): Promise<void> {
    await Promise.all([
      store.loadProfileFromCloud(),
      store.loadMasteryFromCloud(),
      store.loadAssessmentsFromCloud(),
      store.loadFlashcardsFromCloud(),
      store.loadNotesFromCloud(),
      store.loadStudyPlanFromCloud(),
    ]);
  },

  // ─── Clear local cache (call on logout) ───
  clearLocal() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  },
};
