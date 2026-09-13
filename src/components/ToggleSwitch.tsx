import React from "react";

/** Small iOS-style toggle switch, shared between Settings and inline forms
 * (e.g. the Quick Add "review on add" override). */
export function ToggleSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      className={"toggle-switch" + (on ? " on" : "")}
      onClick={onToggle}
      role="switch"
      aria-checked={on}
    >
      <span className="toggle-switch-knob" />
    </button>
  );
}
