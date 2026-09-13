import React from "react";
import { useSettings } from "../components/SettingsContext";
import type { NavPosition, ThemeMode } from "../core/types";
import { SettingsIcon } from "../components/Icons";
import { ToggleSwitch } from "../components/ToggleSwitch";

const THEME_OPTIONS: { value: ThemeMode; label: string; swatch: string }[] = [
  { value: "system", label: "System", swatch: "swatch-system" },
  { value: "light", label: "Light", swatch: "swatch-light" },
  { value: "dark", label: "Dark", swatch: "swatch-dark" },
  { value: "warm", label: "Warm", swatch: "swatch-warm" },
];

const NAV_OPTIONS: { value: NavPosition; label: string; icon: string }[] = [
  { value: "left", label: "Left", icon: "nav-icon-left" },
  { value: "right", label: "Right", icon: "nav-icon-right" },
  { value: "bottom", label: "Bottom", icon: "nav-icon-bottom" },
];

export default function SettingsPage() {
  const { settings, updateSettings, loaded } = useSettings();

  if (!loaded) return null;

  return (
    <div>
      <div className="nav-bar">
        <div className="nav-title-large">Settings</div>
      </div>

      <div className="settings-hero">
        <div className="flex-row gap-8" style={{ marginBottom: 10 }}>
          <SettingsIcon style={{ width: 22, height: 22 }} />
        </div>
        <div className="settings-hero-title">Make Mnemonic yours</div>
        <div className="settings-hero-sub">
          Appearance and review behavior, tuned to how you like to study.
        </div>
      </div>

      <div className="grouped-list-header">Appearance</div>
      <div className="grouped-list">
        <div className="theme-picker">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={"theme-option" + (settings.theme === opt.value ? " selected" : "")}
              onClick={() => updateSettings({ theme: opt.value })}
            >
              <div className={"theme-swatch " + opt.swatch} />
              <div className="theme-option-label">{opt.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grouped-list-header">Layout</div>
      <div className="grouped-list">
        <div className="settings-row" style={{ display: "block" }}>
          <div className="settings-row-label" style={{ marginBottom: 2 }}>Menu position</div>
          <div className="settings-row-desc" style={{ marginBottom: 12 }}>
            Where the main navigation sits on tablet and desktop screens.
          </div>
          <div className="nav-picker">
            {NAV_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={"nav-option" + (settings.navPosition === opt.value ? " selected" : "")}
                onClick={() => updateSettings({ navPosition: opt.value })}
              >
                <div className={"nav-option-preview " + opt.icon}>
                  <span className="nav-option-bar" />
                  <span className="nav-option-page" />
                </div>
                <div className="theme-option-label">{opt.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grouped-list-header">Review</div>
      <div className="grouped-list">
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Show Review tab</div>
            <div className="settings-row-desc">
              Turn off to review only with the colored buttons on each memory
              row in the library.
            </div>
          </div>
          <ToggleSwitch
            on={settings.showReviewTab}
            onToggle={() => updateSettings({ showReviewTab: !settings.showReviewTab })}
          />
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-row-label">Count new memories as reviewed</div>
            <div className="settings-row-desc">
              When on, adding a memory scores it a "Good" first review right
              away instead of leaving it as Never Reviewed. Overridable per
              memory in Quick Add.
            </div>
          </div>
          <ToggleSwitch
            on={settings.reviewOnAddDefault}
            onToggle={() => updateSettings({ reviewOnAddDefault: !settings.reviewOnAddDefault })}
          />
        </div>

        <div className="rating-legend">
          <div className="rating-legend-item">
            <span className="rating-legend-dot" style={{ background: "#b25650" }} />
            Again
          </div>
          <div className="rating-legend-item">
            <span className="rating-legend-dot" style={{ background: "#b8875a" }} />
            Hard
          </div>
          <div className="rating-legend-item">
            <span className="rating-legend-dot" style={{ background: "#5c8a68" }} />
            Good
          </div>
          <div className="rating-legend-item">
            <span className="rating-legend-dot" style={{ background: "#5b7a9e" }} />
            Easy
          </div>
        </div>
      </div>

      <div className="grouped-list-header">About</div>
      <div className="grouped-list">
        <div className="settings-row">
          <div className="settings-row-label">Mnemonic</div>
          <span className="text-secondary" style={{ fontSize: 13 }}>v1.0</span>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Scheduling engine</div>
            <div className="settings-row-desc">FSRS-6 · target retention {Math.round(settings.desiredRetention * 100)}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
