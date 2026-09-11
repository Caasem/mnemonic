import React, { useEffect, useMemo, useState } from "react";
import type { Memory, Rating } from "../core/types";
import { Rating as R } from "../core/types";
import {
  appendReviewLog,
  getAllMemories,
  getSettings,
  newReviewLogId,
  updateMemory,
} from "../db/repository";
import { previewIntervals, schedule } from "../fsrs/engine";
import { humanizeInterval } from "../core/dates";
import { useRoute } from "../components/Router";
import { DEFAULT_SETTINGS } from "../core/types";
import type { Settings } from "../core/types";

export default function ReviewPage() {
  const route = useRoute();
  const reviewAhead = route.params.get("ahead") === "1";
  const collectionFilter = route.params.get("collection") ?? undefined;

  const [queue, setQueue] = useState<Memory[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  async function loadQueue() {
    const [all, s] = await Promise.all([getAllMemories(), getSettings()]);
    let due = all.filter((m) => !m.archived);
    if (!reviewAhead) {
      due = due.filter((m) => new Date(m.card.due).getTime() <= Date.now());
    }
    if (collectionFilter) {
      due = due.filter((m) => m.collection === collectionFilter);
    }
    due.sort((a, b) => new Date(a.card.due).getTime() - new Date(b.card.due).getTime());
    setQueue(due);
    setSessionTotal(due.length);
    setIndex(0);
    setRevealed(false);
    setLoaded(true);
  }

  useEffect(() => {
    loadQueue();
    getSettings().then((s) => setSettings(s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewAhead, collectionFilter]);

  const current = queue[index];

  const intervalPreview = useMemo(() => {
    if (!current) return null;
    return previewIntervals(current.card, new Date(), settings);
  }, [current, settings]);

  async function rate(rating: Rating) {
    if (!current) return;
    const now = new Date();
    const s = await getSettings();
    const result = schedule(current.card, rating, now, s);
    await updateMemory(current.id, { card: result.card });
    await appendReviewLog({
      id: newReviewLogId(),
      memoryId: current.id,
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
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  if (!loaded) return null;

  if (queue.length === 0) {
    return (
      <div>
        <div className="nav-bar">
          <div className="nav-title-large">Review</div>
        </div>
        <div className="review-empty">
          <div className="empty-state-title">Nothing due right now</div>
          <div>You're all caught up. Come back later, or review ahead from the Schedule page.</div>
        </div>
      </div>
    );
  }

  if (index >= queue.length) {
    return (
      <div>
        <div className="nav-bar">
          <div className="nav-title-large">Review</div>
        </div>
        <div className="review-empty">
          <div className="empty-state-title">Session complete</div>
          <div>
            You reviewed {sessionTotal} {sessionTotal === 1 ? "memory" : "memories"}
            {reviewAhead ? " ahead of schedule" : ""}.
          </div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={loadQueue}>
            Check again
          </button>
        </div>
      </div>
    );
  }

  const progressPct = Math.round((index / sessionTotal) * 100);

  return (
    <div>
      <div className="nav-bar">
        <div className="nav-bar-row">
          <div className="nav-title-large" style={{ fontSize: 22, padding: "4px 0" }}>
            {reviewAhead ? "Review Ahead" : "Review"}
          </div>
          <span className="text-secondary" style={{ fontSize: 14 }}>
            {index + 1} / {sessionTotal}
          </span>
        </div>
      </div>

      <div className="review-stage">
        <div className="review-progress">
          <div className="review-progress-bar" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="review-card">
          <div className="review-prompt">{current.prompt || current.content}</div>
          {revealed && (
            <div className="review-answer">
              {current.answer || (current.prompt ? current.content : "—")}
            </div>
          )}
          {current.collection && (
            <div className="review-meta">{current.collection}</div>
          )}
        </div>

        <div className="review-actions">
          {!revealed ? (
            <button className="btn btn-primary btn-block" onClick={() => setRevealed(true)}>
              Show Answer
            </button>
          ) : (
            <div className="rating-grid">
              <button className="rating-btn again" onClick={() => rate(R.Again)}>
                Again
                {intervalPreview && (
                  <span className="interval">{humanizeInterval(intervalPreview[1])}</span>
                )}
              </button>
              <button className="rating-btn hard" onClick={() => rate(R.Hard)}>
                Hard
                {intervalPreview && (
                  <span className="interval">{humanizeInterval(intervalPreview[2])}</span>
                )}
              </button>
              <button className="rating-btn good" onClick={() => rate(R.Good)}>
                Good
                {intervalPreview && (
                  <span className="interval">{humanizeInterval(intervalPreview[3])}</span>
                )}
              </button>
              <button className="rating-btn easy" onClick={() => rate(R.Easy)}>
                Easy
                {intervalPreview && (
                  <span className="interval">{humanizeInterval(intervalPreview[4])}</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
