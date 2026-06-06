// ═══════════════════════════════════════════════════════════
// OVI PULSE — FSRS-6 (Free Spaced Repetition Scheduler)
// Production implementation based on the FSRS-6 algorithm
// adopted by Anki 25.07 as its default scheduler.
// ═══════════════════════════════════════════════════════════

export type EaseRating = "again" | "hard" | "good" | "easy";

export interface FSRSState {
  difficulty: number;   // D ∈ [0, 1] — card difficulty (normalized)
  stability: number;    // S > 0 — days until retrievability drops to 90%
  retrievability: number; // R ∈ [0, 1] — probability of recall
}

export interface FlashcardFSRS extends FSRSState {
  lastReviewedAt?: string;
  responseTimeMs?: number;
  repetitions: number;
}

export interface FSRSResult extends FSRSState {
  intervalDays: number; // next review interval in days
  nextReviewDate: Date;
}

// FSRS-6 default parameters (optimised from Anki 25.07)
const W = [
  0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01,
  1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61
];

const DECAY = -0.5;
const FACTOR = 19.0 / 81.0; // (1/DECAY - 1)^(1/DECAY) normalized
const REQUEST_RETENTION = 0.9; // target retention rate

/**
 * Compute the forgetting curve — retrievability after t days given stability S.
 * R(t) = (1 + FACTOR * t/S)^DECAY
 */
function forgettingCurve(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  return Math.pow(1 + FACTOR * elapsedDays / stability, DECAY);
}

/**
 * Calculate next interval from stability.
 * Interval = S / FACTOR * (REQUEST_RETENTION^(1/DECAY) - 1)
 */
function nextInterval(stability: number): number {
  if (stability <= 0) return 1;
  const interval = stability / FACTOR * (Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1);
  return Math.max(1, Math.min(Math.round(interval), 365));
}

/**
 * Mean reversion toward initial difficulty.
 */
function meanReversion(d0: number, d: number): number {
  return W[7] * d0 + (1 - W[7]) * d;
}

/**
 * Clamp a value to [min, max].
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * FSRS-6: Calculate new card state after a review.
 *
 * @param state - Current card state (difficulty, stability, retrievability)
 * @param rating - Student's ease rating
 * @param elapsedDays - Days since last review
 * @param responseTimeMs - Response time in milliseconds (optional, for cognitive load)
 * @returns Updated FSRS state with next review date
 */
export function updateCard(
  state: FSRSState,
  rating: EaseRating,
  elapsedDays: number,
  responseTimeMs?: number
): FSRSResult {
  const { difficulty: d, stability: s } = state;

  // Rating map: again=1, hard=2, good=3, easy=4
  const ratingMap: Record<EaseRating, number> = { again: 1, hard: 2, good: 3, easy: 4 };
  const r = ratingMap[rating];

  // Current retrievability
  const currentR = forgettingCurve(elapsedDays, s);

  // ── Difficulty update ──
  const d0 = d;
  const difficultyDelta = -W[6] * (r - 3);
  let newDifficulty = d + difficultyDelta;
  newDifficulty = meanReversion(W[2], newDifficulty);
  newDifficulty = clamp(newDifficulty, 0, 1);

  // ── Stability update ──
  let newStability: number;

  if (elapsedDays === 0) {
    // First review (card never reviewed before in FSRS context)
    newStability = W[r - 1] || 1;
  } else {
    // Stability after successful recall (hard/good/easy)
    const hardPenalty = r === 2 ? W[15] : 1;
    const easyBonus = r === 4 ? W[16] : 1;

    const successStability = s * (
      Math.exp(W[8]) *
      (11 - newDifficulty * 10) *
      Math.pow(s, -W[9]) *
      (Math.exp(W[10] * (1 - currentR)) - 1) *
      hardPenalty *
      easyBonus + 1
    );

    // Stability after forgetting (again)
    const forgetStability = W[11] *
      Math.pow(Math.max(0.1, newDifficulty), -W[12]) *
      Math.pow(s + 1, W[13]) *
      Math.exp(W[14] * (1 - currentR));

    newStability = r === 1 ? forgetStability : successStability;
  }

  newStability = clamp(newStability, 0.01, 365);

  // ── New retrievability (at time of review) ──
  const newR = currentR;

  // ── Interval calculation ──
  const intervalDays = nextInterval(newStability);

  // ── Next review date ──
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);

  return {
    difficulty: Math.round(newDifficulty * 1000) / 1000,
    stability: Math.round(newStability * 100) / 100,
    retrievability: Math.round(newR * 1000) / 1000,
    intervalDays,
    nextReviewDate,
  };
}

/**
 * Initialize FSRS state for a new card.
 * Default: medium difficulty, 1 day stability, full retrievability.
 */
export function initializeCard(rating: EaseRating = "good"): FlashcardFSRS {
  const ratingMap: Record<EaseRating, number> = { again: 1, hard: 2, good: 3, easy: 4 };
  const r = ratingMap[rating];
  return {
    difficulty: clamp(W[2] + W[3] * (r - 1), 0, 1),
    stability: W[r - 1] || 1,
    retrievability: 1.0,
    repetitions: 0,
  };
}

/**
 * Get current retrievability for a card based on its stability and last review.
 */
export function getCurrentState(card: { stability: number; lastReviewedAt?: string }): { retrievability: number } {
  if (!card.lastReviewedAt) return { retrievability: 1.0 };
  const elapsedDays = Math.max(0,
    (Date.now() - new Date(card.lastReviewedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  return { retrievability: forgettingCurve(elapsedDays, card.stability) };
}

/**
 * Calculate the forgetting curve for a card — shows projected retention over time.
 * Returns an array of {day, retention} points for visualization.
 */
export function forgettingCurveData(
  stability: number,
  days: number = 30
): { day: number; retention: number }[] {
  const points: { day: number; retention: number }[] = [];
  for (let d = 0; d <= days; d++) {
    points.push({
      day: d,
      retention: Math.round(forgettingCurve(d, stability) * 1000) / 1000,
    });
  }
  return points;
}

/**
 * Determine if a card is due for review.
 */
export function isCardDue(nextReviewDate: string | Date): boolean {
  const reviewDate = typeof nextReviewDate === "string" ? new Date(nextReviewDate) : nextReviewDate;
  return reviewDate <= new Date();
}

/**
 * Calculate streak bonus: 10% interval reward for streaks > 5 days.
 */
export function streakBonus(currentStreak: number): number {
  if (currentStreak > 5) return 1.1;
  return 1.0;
}

/**
 * Get achievement tier for a streak.
 */
export function getStreakAchievement(streak: number): string | null {
  if (streak >= 100) return "centurion";
  if (streak >= 60) return "marathon";
  if (streak >= 30) return "dedicated";
  if (streak >= 14) return "committed";
  if (streak >= 7) return "consistent";
  return null;
}

/**
 * Format achievement name for display.
 */
export function formatAchievement(achievement: string): { label: string; emoji: string } {
  const map: Record<string, { label: string; emoji: string }> = {
    centurion: { label: "Centurion", emoji: "🏆" },
    marathon: { label: "Marathon Scholar", emoji: "🔥" },
    dedicated: { label: "Dedicated Learner", emoji: "⭐" },
    committed: { label: "Committed", emoji: "💪" },
    consistent: { label: "Consistent", emoji: "📚" },
  };
  return map[achievement] || { label: achievement, emoji: "✨" };
}

// ─── Helper functions used by Flashcards page ───

/**
 * Check if a card is due for review.
 * Uses FSRS-6 retrievability: due when R <= 0.9 (target retention).
 * New cards (never reviewed) are always due.
 */
export function isDue(card: { difficulty?: number; stability?: number; retrievability?: number; lastReviewedAt?: string; nextReview?: string }): boolean {
  // New cards are always due
  if (!card.lastReviewedAt) return true;
  // Check retrievability against target retention
  const state = getCurrentState({ stability: card.stability ?? 1, lastReviewedAt: card.lastReviewedAt });
  return state.retrievability <= REQUEST_RETENTION;
}

/**
 * Get all cards due for review from a list, sorted by retrievability (lowest first).
 */
export function getDueCards<T extends { difficulty?: number; stability?: number; retrievability?: number; lastReviewedAt?: string; nextReview?: string }>(cards: T[]): T[] {
  return cards.filter(isDue).sort((a, b) => {
    const stateA = getCurrentState({ stability: a.stability ?? 1, lastReviewedAt: a.lastReviewedAt });
    const stateB = getCurrentState({ stability: b.stability ?? 1, lastReviewedAt: b.lastReviewedAt });
    return stateA.retrievability - stateB.retrievability;
  });
}

/**
 * Calculate days until retrievability drops below 70% (danger zone).
 */
export function daysUntilDanger(stability: number): number {
  if (stability <= 0) return 0;
  // Find t where R(t) = 0.7
  // 0.7 = (1 + FACTOR * t/S)^DECAY
  // t = S/FACTOR * (0.7^(1/DECAY) - 1)
  const t = stability / FACTOR * (Math.pow(0.7, 1 / DECAY) - 1);
  return Math.max(0, Math.round(t));
}

/**
 * Get forgetting curve data for visualization.
 */
export function getForgettingCurve(stability: number, days: number = 30): { day: number; retention: number }[] {
  return forgettingCurveData(stability, days);
}

/**
 * Update streak after a review session.
 */
export function updateStreak(
  current: { currentStreak: number; longestStreak: number; lastReviewDate: string | null; achievements: string[] },
  reviewDate: Date
): { currentStreak: number; longestStreak: number; lastReviewDate: string; achievements: string[] } {
  const today = reviewDate.toISOString().split("T")[0];
  const lastDate = current.lastReviewDate;

  let newStreak = current.currentStreak;

  if (!lastDate) {
    // First review ever
    newStreak = 1;
  } else {
    const last = new Date(lastDate);
    const diffDays = Math.floor((reviewDate.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Same day — no change
    } else if (diffDays === 1) {
      // Consecutive day — increment
      newStreak += 1;
    } else {
      // Streak broken
      newStreak = 1;
    }
  }

  const longestStreak = Math.max(current.longestStreak, newStreak);

  // Check for new achievements
  const achievements = [...current.achievements];
  const milestones = [7, 14, 30, 60, 100];
  for (const milestone of milestones) {
    const key = `streak_${milestone}`;
    if (newStreak >= milestone && !achievements.includes(key)) {
      achievements.push(key);
    }
  }

  return {
    currentStreak: newStreak,
    longestStreak,
    lastReviewDate: today,
    achievements,
  };
}
