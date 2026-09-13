import React, { useEffect, useMemo, useState } from "react";
import type { Memory, Rating } from "../core/types";
import {
  createMemory,
  getAllMemories,
  toggleCompletion,
  updateMemory,
  softDeleteMemory,
  getAllCollections,
  appendReviewLog,
  newReviewLogId,
  getSettings,
} from "../db/repository";
import { formatRelative, parseRelativeDate, RELATIVE_DATE_PRESETS, isSameDay, startOfDay, addDays } from "../core/dates";
import { CheckIcon, ChevronRight, PlusIcon, XIcon, SortIcon } from "../components/Icons";
import { TagInput, invalidateTagCache } from "../components/TagInput";
import { CardState, Rating as R } from "../core/types";
import { schedule } from "../fsrs/engine";
import { useSettings } from "../components/SettingsContext";
import { ToggleSwitch } from "../components/ToggleSwitch";

/** Record an FSRS rating for a memory directly from a library row (no
 * navigation to the Review page, no row expansion) — the same scheduling
 * math the Review page uses. */
async function rateMemoryInline(memory: Memory, rating: Rating, reviewAhead: boolean) {
  const now = new Date();
  const s = await getSettings();
  const result = schedule(memory.card, rating, now, s);
  await updateMemory(memory.id, { card: result.card });
  await appendReviewLog({
    id: newReviewLogId(),
    memoryId: memory.id,
    rating,
    state: result.card.state,
    due: result.card.due,
    stability: result.card.stability,
    difficulty: result.card.difficulty,
    elapsedDays: result.logPreview.elapsedDays,
    lastElapsedDays: result.logPreview.lastElapsedDays,
    scheduledDays: result.logPreview.scheduledDays,
    reviewedAt: now.toISOString(),
    reviewAhead,
  });
}

function InlineRatingRow({
  memory,
  onRated,
}: {
  memory: Memory;
  onRated: () => void;
}) {
  const [pulsing, setPulsing] = useState<Rating | null>(null);
  const isDue = new Date(memory.card.due).getTime() <= Date.now();

  async function rate(e: React.MouseEvent, rating: Rating) {
    e.stopPropagation();
    setPulsing(rating);
    await rateMemoryInline(memory, rating, !isDue);
    setTimeout(() => onRated(), 220);
  }

  return (
    <div className="inline-rating" onClick={(e: any) => e.stopPropagation()}>
      <button
        className={"rating-dot again" + (pulsing === R.Again ? " pulse" : "")}
        onClick={(e: any) => rate(e, R.Again)}
        aria-label="Again"
        title="Again"
      />
      <button
        className={"rating-dot hard" + (pulsing === R.Hard ? " pulse" : "")}
        onClick={(e: any) => rate(e, R.Hard)}
        aria-label="Hard"
        title="Hard"
      />
      <button
        className={"rating-dot good" + (pulsing === R.Good ? " pulse" : "")}
        onClick={(e: any) => rate(e, R.Good)}
        aria-label="Good"
        title="Good"
      />
      <button
        className={"rating-dot easy" + (pulsing === R.Easy ? " pulse" : "")}
        onClick={(e: any) => rate(e, R.Easy)}
        aria-label="Easy"
        title="Easy"
      />
    </div>
  );
}

function QuickAdd({ onAdded }: { onAdded: () => void }) {
  const { settings } = useSettings();
  const [content, setContent] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [learnedPreset, setLearnedPreset] = useState("today");
  const [customDate, setCustomDate] = useState("");
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [tags, setTags] = useState("");
  const [collection, setCollection] = useState("");
  const [saving, setSaving] = useState(false);
  const [reviewOnAdd, setReviewOnAdd] = useState(settings.reviewOnAddDefault);

  async function submit() {
    const trimmed = content.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    const learnedAt =
      parseRelativeDate(customDate || learnedPreset) ?? new Date().toISOString();
    await createMemory({
      content: trimmed,
      learnedAt,
      prompt: prompt.trim() || undefined,
      answer: answer.trim() || undefined,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      collection: collection.trim() || undefined,
      reviewOnAdd,
    });
    invalidateTagCache();
    setContent("");
    setPrompt("");
    setAnswer("");
    setTags("");
    setCollection("");
    setCustomDate("");
    setLearnedPreset("today");
    setReviewOnAdd(settings.reviewOnAddDefault);
    setExpanded(false);
    setSaving(false);
    onAdded();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey && !expanded) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="quick-add">
      <textarea
        className="quick-add-input"
        placeholder="+ What did you learn?"
        value={content}
        onChange={(e: any) => setContent(e.target.value)}
        onFocus={() => setExpanded(true)}
        onKeyDown={onKeyDown}
        rows={expanded ? 2 : 1}
      />
      {expanded && (
        <div className="quick-add-expand">
          <div>
            <div className="field-label" style={{ marginBottom: 6 }}>Learned</div>
            <div className="quick-add-field-row">
              {RELATIVE_DATE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  className={"chip" + (learnedPreset === p.value && !customDate ? " active" : "")}
                  onClick={() => {
                    setLearnedPreset(p.value);
                    setCustomDate("");
                  }}
                >
                  {p.label}
                </button>
              ))}
              <input
                type="date"
                className="field-input"
                style={{ width: 140 }}
                value={customDate}
                onChange={(e: any) => setCustomDate(e.target.value)}
              />
            </div>
          </div>

          <input
            className="field-input"
            placeholder="Prompt (optional — question form for review)"
            value={prompt}
            onChange={(e: any) => setPrompt(e.target.value)}
          />
          <input
            className="field-input"
            placeholder="Answer (optional)"
            value={answer}
            onChange={(e: any) => setAnswer(e.target.value)}
          />
          <div className="quick-add-field-row">
            <input
              className="field-input"
              placeholder="Collection (e.g. Law, Qur'an, Arabic)"
              value={collection}
              onChange={(e: any) => setCollection(e.target.value)}
              style={{ flex: 1, minWidth: 140 }}
            />
            <div style={{ flex: 1, minWidth: 140 }}>
              <TagInput value={tags} onChange={setTags} placeholder="Tags (comma separated)" />
            </div>
          </div>

          <div className="flex-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="field-label">Mark as reviewed</div>
              <div className="settings-row-desc" style={{ fontSize: 12 }}>
                Counts as an initial "Good" review instead of starting untouched.
              </div>
            </div>
            <ToggleSwitch on={reviewOnAdd} onToggle={() => setReviewOnAdd((v) => !v)} />
          </div>

          <div className="flex-row gap-8" style={{ justifyContent: "flex-end" }}>
            <button
              className="btn btn-text"
              onClick={() => {
                setExpanded(false);
                setContent("");
              }}
            >
              Cancel
            </button>
            <button className="btn btn-primary" onClick={submit} disabled={!content.trim() || saving}>
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MemoryRow({
  memory,
  onChanged,
}: {
  memory: Memory;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(memory.content);
  const [prompt, setPrompt] = useState(memory.prompt ?? "");
  const [answer, setAnswer] = useState(memory.answer ?? "");
  const [collection, setCollection] = useState(memory.collection ?? "");
  const [tags, setTags] = useState(memory.tags.join(", "));

  // "Due" means due today or earlier (calendar day), matching the Schedule
  // page's day-granularity — not a strict `due <= this exact instant` check,
  // which would otherwise mislabel something due later today as not-yet-due.
  const endOfToday = addDays(startOfDay(new Date()), 1);
  const isDue = new Date(memory.card.due).getTime() < endOfToday.getTime();
  const isNew = memory.card.state === CardState.New;
  const reviewedToday =
    !isDue && !!memory.card.lastReview && isSameDay(new Date(memory.card.lastReview), new Date());

  async function saveEdits() {
    await updateMemory(memory.id, {
      content: content.trim() || memory.content,
      prompt: prompt.trim() || undefined,
      answer: answer.trim() || undefined,
      collection: collection.trim() || undefined,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    invalidateTagCache();
    onChanged();
  }

  return (
    <>
      <div className="list-row" onClick={() => setOpen((o) => !o)}>
        <button
          className={"completion-dot" + (memory.completed ? " done" : "")}
          onClick={(e: any) => {
            e.stopPropagation();
            toggleCompletion(memory.id).then(onChanged);
          }}
          aria-label={memory.completed ? "Mark not done" : "Mark done"}
        >
          {memory.completed && <CheckIcon />}
        </button>
        <div className="memory-row-content">
          <div className={"memory-row-title" + (memory.completed ? " completed" : "")}>
            {memory.content}
          </div>
          <div className="memory-row-meta">
            {memory.collection && <span>{memory.collection}</span>}
            {memory.tags.length > 0 && <span>{memory.tags.join(", ")}</span>}
            <span>Learned {formatRelative(memory.learnedAt)}</span>
            {!isNew && reviewedToday && (
              <span className="badge badge-reviewed">Reviewed today</span>
            )}
            {!isNew && !reviewedToday && (
              <span className={"badge" + (isDue ? " due" : "")}>
                {isDue ? "Review due" : `Review ${formatRelative(memory.card.due)}`}
              </span>
            )}
            {isNew && <span className="badge">New</span>}
          </div>
        </div>
        <InlineRatingRow memory={memory} onRated={onChanged} />
        <ChevronRight className="chevron" style={{ transform: open ? "rotate(90deg)" : undefined, transition: "transform 0.15s" }} />
      </div>

      {open && (
        <div className="row-expanded">
          <div>
            <div className="field-label" style={{ marginBottom: 6 }}>Content</div>
            <textarea
              className="field-input"
              value={content}
              onChange={(e: any) => setContent(e.target.value)}
              onBlur={saveEdits}
              rows={2}
            />
          </div>
          <div>
            <div className="field-label" style={{ marginBottom: 6 }}>Prompt</div>
            <input className="field-input" value={prompt} onChange={(e: any) => setPrompt(e.target.value)} onBlur={saveEdits} placeholder="Question form for review" />
          </div>
          <div>
            <div className="field-label" style={{ marginBottom: 6 }}>Answer</div>
            <input className="field-input" value={answer} onChange={(e: any) => setAnswer(e.target.value)} onBlur={saveEdits} />
          </div>
          <div className="quick-add-field-row">
            <input className="field-input" style={{ flex: 1 }} value={collection} onChange={(e: any) => setCollection(e.target.value)} onBlur={saveEdits} placeholder="Collection" />
            <div style={{ flex: 1 }}>
              <TagInput value={tags} onChange={setTags} onBlur={saveEdits} placeholder="Tags" />
            </div>
          </div>
          <div className="flex-row gap-8" style={{ justifyContent: "space-between" }}>
            <span className="text-secondary" style={{ fontSize: 12 }}>
              Created {formatRelative(memory.createdAt)} · Stability {memory.card.stability.toFixed(1)}d
            </span>
            <button
              className="btn btn-text"
              style={{ color: "var(--danger)" }}
              onClick={() => softDeleteMemory(memory.id).then(onChanged)}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const { settings, updateSettings } = useSettings();
  const sortOrder = settings.memorySortOrder;

  async function refresh() {
    const all = await getAllMemories();
    setMemories(all.filter((m) => !m.archived));
    setLoaded(true);
  }

  useEffect(() => {
    refresh();
  }, []);

  const collections = useMemo(() => {
    const set = new Set<string>();
    memories.forEach((m) => m.collection && set.add(m.collection));
    return Array.from(set).sort();
  }, [memories]);

  const filtered = useMemo(() => {
    let list = memories;
    if (filter) list = list.filter((m) => m.collection === filter);
    list = [...list];
    if (sortOrder === "dueDate") {
      list.sort((a, b) => new Date(a.card.due).getTime() - new Date(b.card.due).getTime());
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return list;
  }, [memories, filter, sortOrder]);

  // A memory belongs in "Today" if it's due today or earlier (calendar day —
  // matching the Schedule page's day-granularity, not a strict `due <= this
  // exact instant` check, which would otherwise leave something due later
  // today stuck in the Library with a confusing "Review today" label), OR if
  // it was already reviewed today, OR if it was marked complete today — none
  // of those actions should make it vanish from Today the instant you tap
  // something; it stays visible (as "reviewed" / done) until the day rolls
  // over. A memory completed on an *earlier* day still drops out of Today as
  // before, so Today doesn't accumulate stale completed items forever.
  const now = new Date();
  const endOfToday = addDays(startOfDay(now), 1);
  const isDueNow = (m: Memory) => new Date(m.card.due).getTime() < endOfToday.getTime();
  const reviewedToday = (m: Memory) =>
    !!m.card.lastReview && isSameDay(new Date(m.card.lastReview), now);
  const completedToday = (m: Memory) =>
    m.completed && !!m.completedAt && isSameDay(new Date(m.completedAt), now);
  const staleCompleted = (m: Memory) => m.completed && !completedToday(m);

  const today = useMemo(
    () =>
      filtered.filter(
        (m) => !staleCompleted(m) && (isDueNow(m) || reviewedToday(m) || completedToday(m))
      ),
    [filtered]
  );
  const todayIds = useMemo(() => new Set(today.map((m) => m.id)), [today]);
  const rest = useMemo(() => filtered.filter((m) => !todayIds.has(m.id)), [filtered, todayIds]);

  // Within "Today", keep still-actionable items (due now, not yet handled)
  // visually ahead of ones already reviewed or completed today, with a thin
  // divider between the two groups — so it's still one unified "Today" list,
  // but you can tell at a glance what's left to do.
  const todayStillDue = useMemo(
    () => today.filter((m) => isDueNow(m) && !m.completed),
    [today]
  );
  const todayReviewed = useMemo(
    () => today.filter((m) => !(isDueNow(m) && !m.completed)),
    [today]
  );

  return (
    <div>
      <div className="nav-bar">
        <div className="nav-title-large">Memory</div>
      </div>

      <QuickAdd onAdded={refresh} />

      {(collections.length > 0 || memories.length > 0) && (
        <div className="flex-row container-pad section-gap" style={{ justifyContent: "space-between", gap: 8 }}>
          <div className="quick-add-field-row" style={{ overflowX: "auto", flexWrap: "nowrap", flex: 1 }}>
            <button className={"chip" + (filter === "" ? " active" : "")} onClick={() => setFilter("")}>
              All
            </button>
            {collections.map((c) => (
              <button
                key={c}
                className={"chip" + (filter === c ? " active" : "")}
                onClick={() => setFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <button
            className={"sort-btn" + (sortOrder === "dueDate" ? " active-sort" : "")}
            onClick={() =>
              updateSettings({
                memorySortOrder: sortOrder === "dueDate" ? "entryOrder" : "dueDate",
              })
            }
            aria-label={sortOrder === "dueDate" ? "Sorted by next due — tap to sort by order added" : "Sorted by order added — tap to sort by next due"}
            title={sortOrder === "dueDate" ? "Sorted by next due" : "Sorted by order added"}
          >
            <SortIcon />
          </button>
        </div>
      )}

      {loaded && filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-title">No memories yet</div>
          <div>Capture the first thing worth remembering above.</div>
        </div>
      )}

      {today.length > 0 && (
        <>
          <div className="grouped-list-header">Today</div>
          <div className="grouped-list">
            {todayStillDue.map((m) => (
              <MemoryRow key={m.id} memory={m} onChanged={refresh} />
            ))}
            {todayStillDue.length > 0 && todayReviewed.length > 0 && (
              <div className="today-divider" />
            )}
            {todayReviewed.map((m) => (
              <MemoryRow key={m.id} memory={m} onChanged={refresh} />
            ))}
          </div>
        </>
      )}

      {rest.length > 0 && (
        <>
          <div className="grouped-list-header">Library</div>
          <div className="grouped-list">
            {rest.map((m) => (
              <MemoryRow key={m.id} memory={m} onChanged={refresh} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
