import React, { useEffect, useMemo, useState } from "react";
import type { Memory } from "../core/types";
import { getAllMemories } from "../db/repository";
import { addDays, isSameDay, formatShortDate, startOfDay } from "../core/dates";
import { navigate } from "../components/Router";

type View = "agenda" | "calendar" | "matrix";

function groupByDay(memories: Memory[], days: number) {
  const today = startOfDay(new Date());
  const buckets: { date: Date; items: Memory[] }[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    const items = memories.filter((m) => isSameDay(new Date(m.card.due), date));
    buckets.push({ date, items });
  }
  return buckets;
}

function AgendaView({ memories }: { memories: Memory[] }) {
  const buckets = useMemo(() => groupByDay(memories, 14).filter((b) => b.items.length > 0), [memories]);

  if (buckets.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Nothing scheduled</div>
        <div>Reviews will appear here as memories come due.</div>
      </div>
    );
  }

  return (
    <>
      {buckets.map((bucket) => {
        const byCollection = new Map<string, number>();
        bucket.items.forEach((m) => {
          const key = m.collection || "Uncategorized";
          byCollection.set(key, (byCollection.get(key) ?? 0) + 1);
        });
        const label = isSameDay(bucket.date, new Date())
          ? "Today"
          : isSameDay(bucket.date, addDays(new Date(), 1))
          ? "Tomorrow"
          : bucket.date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

        return (
          <div className="agenda-day" key={bucket.date.toISOString()}>
            <div className="agenda-day-label">{label}</div>
            <div>
              {Array.from(byCollection.entries()).map(([name, count]) => (
                <div
                  className="agenda-row"
                  key={name}
                  onClick={() => navigate("/review", { collection: name === "Uncategorized" ? "" : name })}
                >
                  <span className="agenda-collection">{name}</span>
                  <span className="agenda-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

function CalendarView({ memories }: { memories: Memory[] }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selected, setSelected] = useState<Date | null>(null);

  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + monthOffset);
  const year = base.getFullYear();
  const month = base.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = (firstDay.getDay() + 6) % 7; // Monday-first

  const density = useMemo(() => {
    const map = new Map<string, number>();
    memories.forEach((m) => {
      const d = new Date(m.card.due);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = d.getDate();
        map.set(String(key), (map.get(String(key)) ?? 0) + 1);
      }
    });
    return map;
  }, [memories, year, month]);

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedItems = selected
    ? memories.filter((m) => isSameDay(new Date(m.card.due), selected))
    : [];

  return (
    <>
      <div className="flex-row container-pad section-gap" style={{ justifyContent: "space-between" }}>
        <button className="icon-btn" onClick={() => setMonthOffset((o) => o - 1)}>‹</button>
        <div style={{ fontWeight: 700, fontSize: 17 }}>
          {base.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </div>
        <button className="icon-btn" onClick={() => setMonthOffset((o) => o + 1)}>›</button>
      </div>

      <div className="calendar-grid">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div className="calendar-weekday" key={i}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div className="calendar-cell empty" key={i} />;
          const date = new Date(year, month, day);
          const count = density.get(String(day)) ?? 0;
          const isToday = isSameDay(date, new Date());
          const isSelected = selected && isSameDay(date, selected);
          return (
            <div
              key={i}
              className={
                "calendar-cell" +
                (isToday ? " today" : "") +
                (isSelected ? " selected" : "")
              }
              onClick={() => setSelected(date)}
            >
              <span>{day}</span>
              {count > 0 && <span className="calendar-density">{count}</span>}
            </div>
          );
        })}
      </div>

      {selected && (
        <>
          <div className="grouped-list-header">{formatShortDate(selected.toISOString())}</div>
          <div className="grouped-list">
            {selectedItems.length === 0 ? (
              <div className="list-row text-secondary">Nothing scheduled</div>
            ) : (
              selectedItems.map((m) => (
                <div className="list-row" key={m.id}>
                  <div className="memory-row-content">
                    <div className="memory-row-title">{m.content}</div>
                    <div className="memory-row-meta">
                      {m.collection && <span>{m.collection}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </>
  );
}

function MatrixView({ memories }: { memories: Memory[] }) {
  const days = useMemo(() => groupByDay(memories, 14), [memories]);
  const collections = useMemo(() => {
    const set = new Set<string>();
    memories.forEach((m) => set.add(m.collection || "Uncategorized"));
    return Array.from(set).sort();
  }, [memories]);

  const activeDays = days.filter((d) => d.items.length > 0);

  return (
    <div className="matrix-scroll">
      <table className="matrix-table">
        <thead>
          <tr>
            <th>Date</th>
            {collections.map((c) => (
              <th key={c}>{c}</th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {activeDays.length === 0 && (
            <tr>
              <td colSpan={collections.length + 2} style={{ textAlign: "center", color: "var(--label-tertiary)" }}>
                Nothing scheduled in the next 14 days
              </td>
            </tr>
          )}
          {activeDays.map((bucket) => {
            const byCollection = new Map<string, number>();
            bucket.items.forEach((m) => {
              const key = m.collection || "Uncategorized";
              byCollection.set(key, (byCollection.get(key) ?? 0) + 1);
            });
            return (
              <tr key={bucket.date.toISOString()}>
                <td>{bucket.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</td>
                {collections.map((c) => (
                  <td key={c}>{byCollection.get(c) ?? "—"}</td>
                ))}
                <td style={{ fontWeight: 700 }}>{bucket.items.length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function SchedulePage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [view, setView] = useState<View>("agenda");

  useEffect(() => {
    getAllMemories().then((all) => setMemories(all.filter((m) => !m.archived)));
  }, []);

  return (
    <div>
      <div className="nav-bar">
        <div className="nav-bar-row">
          <div className="nav-title-large" style={{ fontSize: 28 }}>Schedule</div>
          {view === "matrix" && (
            <button className="btn btn-text" onClick={() => window.print()}>Print</button>
          )}
        </div>
      </div>

      <div className="segmented-control">
        {(["agenda", "calendar", "matrix"] as View[]).map((v) => (
          <button
            key={v}
            className={"segmented-item" + (view === v ? " active" : "")}
            onClick={() => setView(v)}
          >
            {v[0].toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {view === "agenda" && <AgendaView memories={memories} />}
      {view === "calendar" && <CalendarView memories={memories} />}
      {view === "matrix" && <MatrixView memories={memories} />}
    </div>
  );
}
