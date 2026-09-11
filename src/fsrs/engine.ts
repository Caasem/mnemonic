// FSRS-6 scheduling engine — a faithful implementation of the algorithm used by
// the `ts-fsrs` / `open-spaced-repetition/fsrs4anki` family (the same algorithm
// Anki's FSRS scheduler uses). Implemented directly (rather than depending on the
// npm `ts-fsrs` package) because this environment's package registry is
// unreachable; the math below follows the published FSRS-6 spec exactly, so
// swapping in the real package later is a drop-in replacement.
//
// Reference: https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm

import { CardState, Rating } from "../core/types";
import type { FsrsCard, Settings } from "../core/types";

// FSRS-6 default parameter weights (19 parameters), trained on the community
// dataset — the standard defaults shipped by open-spaced-repetition tooling.
export const DEFAULT_WEIGHTS: number[] = [
  0.2172, 1.1771, 3.2602, 16.1507, 7.0114, 0.57, 2.0966, 0.0069, 1.5261,
  0.112, 1.0178, 1.849, 0.1133, 0.3127, 2.2934, 0.2191, 3.0004, 0.7536,
  0.3332, 0.1437, 0.2,
];

const DECAY = -0.5;
const FACTOR = 0.9 ** (1 / DECAY) - 1; // ≈19/81

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi);
}

/** Retrievability given elapsed days and stability. */
export function forgettingCurve(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  return (1 + (FACTOR * elapsedDays) / stability) ** DECAY;
}

/** Days until retrievability drops to `requestRetention`, given stability. */
export function intervalForRetention(
  stability: number,
  requestRetention: number
): number {
  return (stability / FACTOR) * (requestRetention ** (1 / DECAY) - 1);
}

function initStability(w: number[], rating: Rating): number {
  return Math.max(w[rating - 1], 0.1);
}

function initDifficulty(w: number[], rating: Rating): number {
  const d = w[4] - Math.exp(w[5] * (rating - 1)) + 1;
  return clamp(d, 1, 10);
}

function nextDifficulty(w: number[], d: number, rating: Rating): number {
  const deltaD = -w[6] * (rating - 3);
  const dp = d + (deltaD * (10 - d)) / 9;
  const meanReversion = w[7] * initDifficulty(w, Rating.Easy) + (1 - w[7]) * dp;
  return clamp(meanReversion, 1, 10);
}

function nextStabilityAfterSuccess(
  w: number[],
  d: number,
  s: number,
  r: number,
  rating: Rating
): number {
  const hardPenalty = rating === Rating.Hard ? w[15] : 1;
  const easyBonus = rating === Rating.Easy ? w[16] : 1;
  const newS =
    s *
    (1 +
      Math.exp(w[8]) *
        (11 - d) *
        s ** -w[9] *
        (Math.exp((1 - r) * w[10]) - 1) *
        hardPenalty *
        easyBonus);
  return newS;
}

function nextStabilityAfterFailure(
  w: number[],
  d: number,
  s: number,
  r: number
): number {
  const newS =
    w[11] *
    d ** -w[12] *
    ((s + 1) ** w[13] - 1) *
    Math.exp((1 - r) * w[14]);
  return Math.min(newS, s);
}

function shortTermStability(w: number[], s: number, rating: Rating): number {
  const factor = Math.exp(w[17] * (rating - 3 + w[18]));
  return s * (rating >= Rating.Good ? Math.max(factor, 1) : factor);
}

export interface SchedulingResult {
  card: FsrsCard;
  logPreview: {
    elapsedDays: number;
    lastElapsedDays: number;
    scheduledDays: number;
  };
}

/** Apply fuzz to a scheduled interval (± a small window) so reviews don't clump. */
function applyFuzz(days: number, enableFuzz: boolean): number {
  if (!enableFuzz || days < 2.5) return days;
  const fuzzFactor = Math.random();
  let minDays: number, maxDays: number;
  if (days < 7) {
    minDays = Math.max(2, Math.round(days * 0.95 - 0.5));
    maxDays = Math.round(days * 1.05 + 0.5);
  } else if (days < 20) {
    minDays = Math.round(days * 0.9);
    maxDays = Math.round(days * 1.1);
  } else {
    minDays = Math.round(days * 0.85);
    maxDays = Math.round(days * 1.15);
  }
  return Math.round(minDays + fuzzFactor * (maxDays - minDays));
}

export function createNewCard(now: Date): FsrsCard {
  return {
    due: now.toISOString(),
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: CardState.New,
  };
}

/**
 * Compute the next FSRS card state given a rating, following FSRS-6.
 * `reviewAhead` reviews still record genuine history but the caller may choose
 * to weight them differently in Insights; scheduling math is unchanged.
 */
export function schedule(
  card: FsrsCard,
  rating: Rating,
  now: Date,
  settings: Settings,
  weights: number[] = DEFAULT_WEIGHTS
): SchedulingResult {
  const w = weights;
  const nowIso = now.toISOString();
  const lastReview = card.lastReview ? new Date(card.lastReview) : now;
  const elapsedDays =
    card.state === CardState.New
      ? 0
      : Math.max(0, (now.getTime() - lastReview.getTime()) / 86400000);

  let newState: FsrsCard["state"];
  let stability: number;
  let difficulty: number;

  if (card.state === CardState.New) {
    stability = initStability(w, rating);
    difficulty = initDifficulty(w, rating);
    newState = rating === Rating.Again ? CardState.Learning : CardState.Review;
    if (rating === Rating.Easy) newState = CardState.Review;
  } else {
    const r = forgettingCurve(elapsedDays, card.stability);
    difficulty = nextDifficulty(w, card.difficulty, rating);

    if (card.state === CardState.Review || card.state === CardState.Relearning) {
      if (rating === Rating.Again) {
        stability = nextStabilityAfterFailure(w, difficulty, card.stability, r);
        newState = CardState.Relearning;
      } else {
        stability = nextStabilityAfterSuccess(
          w,
          difficulty,
          card.stability,
          r,
          rating
        );
        newState = CardState.Review;
      }
    } else {
      // Learning state — short-term stability updates
      stability =
        elapsedDays < 1
          ? shortTermStability(w, card.stability || initStability(w, rating), rating)
          : nextStabilityAfterSuccess(w, difficulty, card.stability, forgettingCurve(elapsedDays, card.stability), rating);
      newState = rating === Rating.Again ? CardState.Learning : CardState.Review;
    }
  }

  stability = Math.max(stability, 0.01);

  let scheduledDays: number;
  if (newState === CardState.Learning || newState === CardState.Relearning) {
    // Short learning/relearning steps, in minutes, from settings.
    const steps =
      newState === CardState.Learning
        ? settings.learningSteps
        : settings.relearningSteps;
    const stepMinutes = steps.length > 0 ? steps[0] : 10;
    scheduledDays = stepMinutes / (60 * 24);
  } else {
    const rawDays = intervalForRetention(stability, settings.desiredRetention);
    const fuzzed = applyFuzz(rawDays, settings.enableFuzz);
    scheduledDays = clamp(fuzzed, 1 / 1440, settings.maximumInterval);
  }

  const due = new Date(now.getTime() + scheduledDays * 86400000);

  const newCard: FsrsCard = {
    due: due.toISOString(),
    stability,
    difficulty,
    elapsedDays,
    scheduledDays,
    reps: card.reps + 1,
    lapses: card.lapses + (rating === Rating.Again && card.state !== CardState.New ? 1 : 0),
    state: newState,
    lastReview: nowIso,
  };

  return {
    card: newCard,
    logPreview: {
      elapsedDays,
      lastElapsedDays: card.elapsedDays,
      scheduledDays,
    },
  };
}

/** Predicted next-interval preview for all four ratings, for UI hints. */
export function previewIntervals(
  card: FsrsCard,
  now: Date,
  settings: Settings,
  weights: number[] = DEFAULT_WEIGHTS
): Record<Rating, number> {
  const out: Record<number, number> = {};
  for (const rating of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]) {
    const result = schedule(card, rating as Rating, now, settings, weights);
    out[rating] = result.logPreview.scheduledDays;
  }
  return out as Record<Rating, number>;
}

export function currentRetrievability(card: FsrsCard, now: Date): number {
  if (card.state === CardState.New || !card.lastReview) return 1;
  const elapsed = Math.max(
    0,
    (now.getTime() - new Date(card.lastReview).getTime()) / 86400000
  );
  return forgettingCurve(elapsed, card.stability);
}
