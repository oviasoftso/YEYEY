/**
 * OVI Gamification Engine
 * XP, levels, badges, and rewards system.
 */
import type { XPData, Badge } from "./types";

// ─── XP Sources ───
export const XP_REWARDS = {
  FLASHCARD_REVIEW: 10,
  ASSESSMENT_COMPLETE: 20,
  NOTE_READ: 5,
  CHAT_QUESTION: 15,
  FOCUS_SESSION: 30,
  DAILY_CHALLENGE: 50,
  PERFECT_SCORE_BONUS: 30,
  STREAK_DAY: 5,
} as const;

// ─── Level System ───
export interface LevelInfo {
  level: number;
  name: string;
  nameShona: string;
  nameNdebele: string;
  xpRequired: number;
  icon: string;
}

const LEVELS: LevelInfo[] = [
  { level: 1, name: "Beginner", nameShona: "Mutsva", nameNdebele: "Omqalayo", xpRequired: 0, icon: "🌱" },
  { level: 2, name: "Learner", nameShona: "Mudzidzi", nameNdebele: "Umfundi", xpRequired: 100, icon: "📖" },
  { level: 3, name: "Explorer", nameShona: "Mufambi", nameNdebele: "Umphathi", xpRequired: 250, icon: "🧭" },
  { level: 4, name: "Builder", nameShona: "Muvaki", nameNdebele: "Umakhi", xpRequired: 450, icon: "🔨" },
  { level: 5, name: "Apprentice", nameShona: "Mudzidzi", nameNdebele: "Umfundi", xpRequired: 700, icon: "⚗️" },
  { level: 10, name: "Scholar", nameShona: "Muzivi", nameNdebele: "Isazi", xpRequired: 2000, icon: "🎓" },
  { level: 15, name: "Expert", nameShona: "Nyanzvi", nameNdebele: "Ingunzi", xpRequired: 4000, icon: "🏆" },
  { level: 20, name: "Graduate", nameShona: "Mupfupi", nameNdebele: "Ugqatsiwe", xpRequired: 7000, icon: "👑" },
  { level: 30, name: "Master", nameShona: "Tembere", nameNdebele: "Inkosi", xpRequired: 15000, icon: "💎" },
  { level: 40, name: "Sage", nameShona: "Shavi", nameNdebele: "Isanusi", xpRequired: 30000, icon: "🔮" },
  { level: 50, name: "Genius", nameShona: "Chiremba", nameNdebele: "Iqhawe", xpRequired: 50000, icon: "⚡" },
];

export function getLevelInfo(level: number): LevelInfo {
  let result = LEVELS[0];
  for (const l of LEVELS) {
    if (level >= l.level) result = l;
  }
  return result;
}

export function getXPForLevel(level: number): number {
  // Exponential curve: level^2 * 20 + level * 30
  return Math.floor(Math.pow(level, 2) * 20 + level * 30);
}

export function getLevelFromXP(xp: number): number {
  let level = 1;
  while (getXPForLevel(level + 1) <= xp && level < 50) {
    level++;
  }
  return level;
}

export function getXPProgress(xp: number): { current: number; needed: number; percentage: number } {
  const level = getLevelFromXP(xp);
  const currentLevelXP = getXPForLevel(level);
  const nextLevelXP = getXPForLevel(level + 1);
  const needed = nextLevelXP - currentLevelXP;
  const current = xp - currentLevelXP;
  return {
    current,
    needed,
    percentage: needed > 0 ? Math.round((current / needed) * 100) : 100,
  };
}

// ─── Badge Definitions ───
export const BADGE_DEFINITIONS: Omit<Badge, "earnedAt">[] = [
  { id: "first_steps", name: "First Steps", description: "Complete your first assessment", icon: "👣" },
  { id: "flashcard_starter", name: "Card Collector", description: "Create 10 flashcards", icon: "🃏" },
  { id: "century", name: "Century", description: "Review 100 flashcards", icon: "💯" },
  { id: "streak_7", name: "Week Warrior", description: "Study for 7 days in a row", icon: "🔥" },
  { id: "streak_14", name: "Fortnight Fighter", description: "Study for 14 days in a row", icon: "⚔️" },
  { id: "streak_30", name: "Monthly Master", description: "Study for 30 days in a row", icon: "👑" },
  { id: "perfect_score", name: "Perfect Score", description: "Get 100% on an assessment", icon: "⭐" },
  { id: "night_owl", name: "Night Owl", description: "Study after 10 PM", icon: "🦉" },
  { id: "early_bird", name: "Early Bird", description: "Study before 6 AM", icon: "🐦" },
  { id: "all_subjects", name: "Renaissance", description: "Study all your subjects in one week", icon: "🎨" },
  { id: "focus_master", name: "Focus Master", description: "Complete 10 focus sessions", icon: "🎯" },
  { id: "challenge_streak", name: "Challenge Champion", description: "Complete daily challenges 7 days in a row", icon: "🏅" },
  { id: "level_5", name: "Rising Star", description: "Reach Level 5", icon: "🌟" },
  { id: "level_10", name: "Scholar", description: "Reach Level 10", icon: "🎓" },
  { id: "level_25", name: "Elite", description: "Reach Level 25", icon: "💎" },
];

export function checkNewBadges(xpData: XPData, stats: {
  assessmentsTaken: number;
  flashcardsCreated: number;
  flashcardsReviewed: number;
  currentStreak: number;
  focusSessions: number;
  subjectsStudiedThisWeek: number;
  perfectScores: number;
}): Badge[] {
  const existingIds = new Set(xpData.badges.map((b) => b.id));
  const newBadges: Badge[] = [];

  const checks: [string, boolean][] = [
    ["first_steps", stats.assessmentsTaken >= 1],
    ["flashcard_starter", stats.flashcardsCreated >= 10],
    ["century", stats.flashcardsReviewed >= 100],
    ["streak_7", stats.currentStreak >= 7],
    ["streak_14", stats.currentStreak >= 14],
    ["streak_30", stats.currentStreak >= 30],
    ["perfect_score", stats.perfectScores >= 1],
    ["night_owl", new Date().getHours() >= 22],
    ["early_bird", new Date().getHours() < 6],
    ["all_subjects", stats.subjectsStudiedThisWeek >= 3],
    ["focus_master", stats.focusSessions >= 10],
    ["challenge_streak", xpData.dailyChallengeStreak >= 7],
    ["level_5", xpData.level >= 5],
    ["level_10", xpData.level >= 10],
    ["level_25", xpData.level >= 25],
  ];

  for (const [id, earned] of checks) {
    if (earned && !existingIds.has(id)) {
      const def = BADGE_DEFINITIONS.find((b) => b.id === id);
      if (def) {
        newBadges.push({ ...def, earnedAt: new Date().toISOString() });
      }
    }
  }

  return newBadges;
}

// ─── Default XP Data ───
export function getDefaultXPData(): XPData {
  return {
    totalXP: 0,
    level: 1,
    badges: [],
    dailyChallengeStreak: 0,
    lastChallengeDate: null,
    focusSessionsToday: 0,
    lastFocusDate: null,
  };
}
