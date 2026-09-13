import { dbDelete, dbGet, dbGetAll, dbPut, STORES } from "./database";
import { createNewCard, schedule } from "../fsrs/engine";
import { DEFAULT_SETTINGS, Rating } from "../core/types";
import type { Memory, ReviewLogEntry, Collection, Settings } from "../core/types";

function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  );
}

export function newMemoryId(): string {
  return "mem_" + uid();
}

export interface QuickAddInput {
  content: string;
  learnedAt?: string; // ISO date; defaults to now
  prompt?: string;
  answer?: string;
  tags?: string[];
  collection?: string;
  parentId?: string;
  type?: string;
  // If set, overrides settings.reviewOnAddDefault for this memory only.
  // When true, the memory is immediately scored a "Good" first review
  // (timestamped to its learned date, not the moment of adding) instead of
  // starting untouched in the "New" state.
  reviewOnAdd?: boolean;
}

export async function createMemory(input: QuickAddInput): Promise<Memory> {
  const now = new Date();
  const nowIso = now.toISOString();
  const learnedAt = input.learnedAt ?? nowIso;

  const memory: Memory = {
    id: newMemoryId(),
    content: input.content.trim(),
    prompt: input.prompt?.trim() || undefined,
    answer: input.answer?.trim() || undefined,
    tags: input.tags ?? [],
    collection: input.collection?.trim() || undefined,
    parentId: input.parentId || undefined,
    type: input.type?.trim() || undefined,
    createdAt: nowIso,
    learnedAt,
    updatedAt: nowIso,
    completed: false,
    archived: false,
    deleted: false,
    card: createNewCard(now),
  };

  const settings = await getSettings();
  const reviewOnAdd = input.reviewOnAdd ?? settings.reviewOnAddDefault;

  if (reviewOnAdd) {
    // Score the initial review as of the learned date (which may be
    // backdated), not "right now" — consistent with the app's retrospective
    // dating everywhere else, and it keeps the resulting due date accurate
    // relative to when the memory was actually learned.
    const reviewTime = new Date(learnedAt);
    const result = schedule(memory.card, Rating.Good, reviewTime, settings);
    memory.card = result.card;
    await appendReviewLog({
      id: newReviewLogId(),
      memoryId: memory.id,
      rating: Rating.Good,
      state: result.card.state,
      due: result.card.due,
      stability: result.card.stability,
      difficulty: result.card.difficulty,
      elapsedDays: result.logPreview.elapsedDays,
      lastElapsedDays: result.logPreview.lastElapsedDays,
      scheduledDays: result.logPreview.scheduledDays,
      reviewedAt: reviewTime.toISOString(),
      reviewAhead: false,
    });
  }

  await dbPut(STORES.memories, memory);
  if (memory.collection) await ensureCollection(memory.collection);
  return memory;
}

export async function updateMemory(
  id: string,
  patch: Partial<Memory>
): Promise<Memory | undefined> {
  const existing = await dbGet<Memory>(STORES.memories, id);
  if (!existing) return undefined;
  const updated: Memory = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await dbPut(STORES.memories, updated);
  if (updated.collection) await ensureCollection(updated.collection);
  return updated;
}

export async function toggleCompletion(id: string): Promise<Memory | undefined> {
  const existing = await dbGet<Memory>(STORES.memories, id);
  if (!existing) return undefined;
  const completed = !existing.completed;
  return updateMemory(id, {
    completed,
    completedAt: completed ? new Date().toISOString() : undefined,
  });
}

export async function softDeleteMemory(id: string): Promise<void> {
  await updateMemory(id, { deleted: true });
}

export async function permanentlyDeleteMemory(id: string): Promise<void> {
  await dbDelete(STORES.memories, id);
}

export async function getAllMemories(): Promise<Memory[]> {
  const all = await dbGetAll<Memory>(STORES.memories);
  return all.filter((m) => !m.deleted);
}

export async function getMemory(id: string): Promise<Memory | undefined> {
  return dbGet<Memory>(STORES.memories, id);
}

export async function getDueMemories(now: Date = new Date()): Promise<Memory[]> {
  const all = await getAllMemories();
  return all
    .filter((m) => !m.archived && new Date(m.card.due).getTime() <= now.getTime())
    .sort((a, b) => new Date(a.card.due).getTime() - new Date(b.card.due).getTime());
}

export async function appendReviewLog(entry: ReviewLogEntry): Promise<void> {
  await dbPut(STORES.reviewLog, entry);
}

export async function getReviewLog(): Promise<ReviewLogEntry[]> {
  return dbGetAll<ReviewLogEntry>(STORES.reviewLog);
}

export async function getReviewLogForMemory(memoryId: string): Promise<ReviewLogEntry[]> {
  const all = await getReviewLog();
  return all
    .filter((r) => r.memoryId === memoryId)
    .sort((a, b) => new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime());
}

export async function ensureCollection(name: string): Promise<Collection> {
  const all = await dbGetAll<Collection>(STORES.collections);
  const existing = all.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;
  const collection: Collection = {
    id: "col_" + uid(),
    name,
    createdAt: new Date().toISOString(),
  };
  await dbPut(STORES.collections, collection);
  return collection;
}

export async function getAllCollections(): Promise<Collection[]> {
  return dbGetAll<Collection>(STORES.collections);
}

/** Every distinct tag currently in use across the library, most-used first —
 * the source list for tag auto-suggestion while typing. */
export async function getAllTags(): Promise<string[]> {
  const all = await getAllMemories();
  const counts = new Map<string, number>();
  for (const m of all) {
    for (const tag of m.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
}

export async function getSettings(): Promise<Settings> {
  const s = await dbGet<Settings>(STORES.settings, "settings");
  // Merge over defaults so settings saved by an older schema version still
  // pick up newly-added fields (theme, showReviewTab, etc.) instead of being
  // undefined.
  return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await dbPut(STORES.settings, settings);
}

export function newReviewLogId(): string {
  return "rev_" + uid();
}
