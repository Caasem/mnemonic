// Core domain types for Mnemonic.

export type Rating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy
export const Rating = {
  Again: 1 as Rating,
  Hard: 2 as Rating,
  Good: 3 as Rating,
  Easy: 4 as Rating,
};

export type CardState = 0 | 1 | 2 | 3; // New, Learning, Review, Relearning
export const CardState = {
  New: 0 as CardState,
  Learning: 1 as CardState,
  Review: 2 as CardState,
  Relearning: 3 as CardState,
};

/** The FSRS scheduling state attached to a memory. */
export interface FsrsCard {
  due: string; // ISO date-time of next scheduled review
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: CardState;
  lastReview?: string; // ISO date-time
}

export interface ReviewLogEntry {
  id: string;
  memoryId: string;
  rating: Rating;
  state: CardState;
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  lastElapsedDays: number;
  scheduledDays: number;
  reviewedAt: string; // ISO date-time
  reviewAhead: boolean;
}

/** The thing the user wants to remember. */
export interface Memory {
  id: string;
  content: string; // the primary text — required, everything else optional

  prompt?: string;
  answer?: string;

  tags: string[];
  collection?: string; // top-level collection name, e.g. "Law", "Qur'an", "Arabic"
  parentId?: string; // for hierarchy, e.g. Ayah under Surah under Qur'an
  type?: string; // free-form type label, e.g. "vocab", "fact", "ayah"

  createdAt: string; // ISO date-time — when added to Mnemonic
  learnedAt: string; // ISO date — when actually learned (may be backdated)
  updatedAt: string;

  completed: boolean; // simple completion toggle, independent of FSRS
  completedAt?: string;

  archived: boolean;
  deleted: boolean;

  card: FsrsCard;
}

export interface Collection {
  id: string;
  name: string;
  parentId?: string;
  createdAt: string;
}

export type ThemeMode = "system" | "light" | "dark";
export type MemorySortOrder = "dueDate" | "entryOrder";
export type NavPosition = "left" | "right" | "bottom";

export interface Settings {
  id: "settings";
  desiredRetention: number; // default 0.9
  maximumInterval: number; // days
  learningSteps: number[]; // minutes
  relearningSteps: number[]; // minutes
  enableFuzz: boolean;
  timezone: string;
  dayStartHour: number; // hour of day considered start of "day" for scheduling views

  theme: ThemeMode;
  showReviewTab: boolean; // hide/show the dedicated Review tab from main nav
  memorySortOrder: MemorySortOrder;
  navPosition: NavPosition; // where the main nav bar sits on wide screens
  seeded: boolean; // whether demo data has already been seeded once
}

export const DEFAULT_SETTINGS: Settings = {
  id: "settings",
  desiredRetention: 0.9,
  maximumInterval: 36500,
  learningSteps: [1, 10],
  relearningSteps: [10],
  enableFuzz: true,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dayStartHour: 4,

  theme: "system",
  showReviewTab: true,
  memorySortOrder: "entryOrder",
  navPosition: "left",
  seeded: false,
};
