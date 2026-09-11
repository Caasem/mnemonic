// Minimal hand-drawn icon set (no icon package dependency) — SF Symbols-ish line icons.
import React from "react";

type IconProps = { filled?: boolean } & React.SVGProps<SVGSVGElement>;

const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function MemoryIcon({ filled, ...p }: IconProps) {
  return (
    <svg {...base} {...p} fill={filled ? "currentColor" : "none"}>
      <path d="M4 19.5V6a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v13" />
      <path d="M6 22a2 2 0 0 1-2-2v-.5A1.5 1.5 0 0 1 5.5 18H18" />
      <line x1="8" y1="7" x2="14" y2="7" />
    </svg>
  );
}

export function ScheduleIcon({ filled, ...p }: IconProps) {
  return (
    <svg {...base} {...p}>
      <rect x="3.5" y="4.5" width="17" height="16" rx="3" fill={filled ? "currentColor" : "none"} />
      <line x1="3.5" y1="9" x2="20.5" y2="9" />
      <line x1="8" y1="2.5" x2="8" y2="6.5" />
      <line x1="16" y1="2.5" x2="16" y2="6.5" />
    </svg>
  );
}

export function ReviewIcon({ filled, ...p }: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M12 21a9 9 0 1 0-9-9" fill={filled ? "currentColor" : "none"} />
      <polyline points="3 6 3 12 9 12" />
    </svg>
  );
}

export function InsightsIcon({ filled, ...p }: IconProps) {
  return (
    <svg {...base} {...p}>
      <line x1="5" y1="21" x2="5" y2="12" strokeWidth={filled ? 4 : 1.8} />
      <line x1="12" y1="21" x2="12" y2="7" strokeWidth={filled ? 4 : 1.8} />
      <line x1="19" y1="21" x2="19" y2="15" strokeWidth={filled ? 4 : 1.8} />
    </svg>
  );
}

export function CheckIcon(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function ChevronRight(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

export function PlusIcon(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function XIcon(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function ClockIcon(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </svg>
  );
}

export function SettingsIcon({ filled, ...p }: IconProps) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="3" fill={filled ? "currentColor" : "none"} />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function SortIcon(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 4v16" />
      <path d="M3 7l3-3 3 3" />
      <path d="M18 20V4" />
      <path d="M21 17l-3 3-3-3" />
    </svg>
  );
}

export function ClockDueIcon(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
      <path d="M9 3l3-1 3 1" strokeWidth="0" opacity="0" />
    </svg>
  );
}

export function GraphIcon({ filled, ...p }: IconProps) {
  return (
    <svg {...base} {...p}>
      <circle cx="6" cy="6" r="2.4" fill={filled ? "currentColor" : "none"} />
      <circle cx="18" cy="7" r="2.4" fill={filled ? "currentColor" : "none"} />
      <circle cx="7" cy="18" r="2.4" fill={filled ? "currentColor" : "none"} />
      <circle cx="17" cy="17" r="2.4" fill={filled ? "currentColor" : "none"} />
      <circle cx="12" cy="12" r="1.8" fill={filled ? "currentColor" : "none"} />
      <line x1="7.8" y1="7.2" x2="10.6" y2="10.6" />
      <line x1="16.2" y1="8.2" x2="13.2" y2="11" />
      <line x1="8.5" y1="16.5" x2="10.8" y2="13.2" />
      <line x1="15.3" y1="15.3" x2="13.2" y2="13.2" />
    </svg>
  );
}

export function ListOrderIcon(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}
