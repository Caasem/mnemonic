import React, { useEffect, useMemo, useState } from "react";
import type { Memory, ReviewLogEntry } from "../core/types";
import { CardState, Rating } from "../core/types";
import { getAllMemories, getReviewLog } from "../db/repository";
import { addDays, isSameDay, startOfDay } from "../core/dates";

function StatTile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="stat-tile">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function BarList({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="bar-list">
      {data.map((d) => (
        <div className="bar-row" key={d.label}>
          <div className="bar-row-label">{d.label}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <div className="bar-row-value">{d.value}</div>
        </div>
      ))}
    </div>
  );
}

export default function InsightsPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [log, setLog] = useState<ReviewLogEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([getAllMemories(), getReviewLog()]).then(([m, l]) => {
      setMemories(m.filter((x) => !x.archived));
      setLog(l);
      setLoaded(true);
    });
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const total = memories.length;
    const dueToday = memories.filter(
      (m) => new Date(m.card.due).getTime() <= now.getTime()
    ).length;
    const stable = memories.filter((m) => m.card.stability >= 30).length;
    const lapses = memories.reduce((sum, m) => sum + m.card.lapses, 0);
    const newLast7 = memories.filter(
      (m) => (now.getTime() - new Date(m.createdAt).getTime()) / 86400000 <= 7
    ).length;
    const reviewsCompleted = log.length;

    const recentLog = log.filter(
      (r) => (now.getTime() - new Date(r.reviewedAt).getTime()) / 86400000 <= 30
    );
    const retentionSamples = recentLog.filter((r) => r.state !== CardState.Learning);
    const successCount = retentionSamples.filter((r) => r.rating !== Rating.Again).length;
    const retention =
      retentionSamples.length > 0
        ? Math.round((successCount / retentionSamples.length) * 100)
        : null;

    const reviewLoad7 = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(startOfDay(now), i);
      return memories.filter((m) => isSameDay(new Date(m.card.due), day)).length;
    }).reduce((a, b) => a + b, 0);

    return { total, dueToday, stable, lapses, newLast7, reviewsCompleted, retention, reviewLoad7 };
  }, [memories, log]);

  const byCollection = useMemo(() => {
    const map = new Map<string, number>();
    memories.forEach((m) => {
      const key = m.collection || "Uncategorized";
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [memories]);

  const byType = useMemo(() => {
    const map = new Map<string, number>();
    memories.forEach((m) => {
      const key = m.type || "Untyped";
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [memories]);

  const activity = useMemo(() => {
    const now = new Date();
    const days = Array.from({ length: 84 }, (_, i) => {
      const day = addDays(startOfDay(now), -83 + i);
      const count = log.filter((r) => isSameDay(new Date(r.reviewedAt), day)).length;
      return { day, count };
    });
    return days;
  }, [log]);

  const maxActivity = Math.max(1, ...activity.map((a) => a.count));

  if (!loaded) return null;

  return (
    <div>
      <div className="nav-bar">
        <div className="nav-title-large">Insights</div>
      </div>

      <div className="stat-grid">
        <StatTile value={stats.total.toLocaleString()} label="Memories" />
        <StatTile value={stats.dueToday} label="Due today" />
        <StatTile value={stats.retention !== null ? `${stats.retention}%` : "—"} label="Retention (30d)" />
        <StatTile value={stats.reviewsCompleted.toLocaleString()} label="Reviews" />
        <StatTile value={stats.stable} label="Stable memories" />
        <StatTile value={stats.lapses} label="Lapses" />
        <StatTile value={stats.newLast7} label="New (7d)" />
        <StatTile value={stats.reviewLoad7} label="Due (next 7d)" />
      </div>

      {byCollection.length > 0 && (
        <>
          <div className="grouped-list-header">By Collection</div>
          <BarList data={byCollection} />
        </>
      )}

      {byType.length > 0 && (
        <>
          <div className="grouped-list-header">By Type</div>
          <BarList data={byType} />
        </>
      )}

      <div className="grouped-list-header">Learning Activity (12 weeks)</div>
      <div className="activity-heatmap">
        {activity.map((a, i) => (
          <div
            key={i}
            className="activity-cell"
            title={`${a.day.toDateString()}: ${a.count} reviews`}
            style={{
              background:
                a.count === 0
                  ? "var(--bg-tertiary)"
                  : `color-mix(in srgb, var(--label) ${Math.min(100, 20 + (a.count / maxActivity) * 80)}%, var(--bg-tertiary))`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
