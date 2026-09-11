import React from "react";
import { RouterProvider, useRoute, navigate } from "./components/Router";
import { SettingsProvider, useSettings } from "./components/SettingsContext";
import { MemoryIcon, ScheduleIcon, ReviewIcon, InsightsIcon, SettingsIcon, GraphIcon } from "./components/Icons";
import MemoryPage from "./pages/MemoryPage";
import SchedulePage from "./pages/SchedulePage";
import ReviewPage from "./pages/ReviewPage";
import InsightsPage from "./pages/InsightsPage";
import SettingsPage from "./pages/SettingsPage";
import GraphPage from "./pages/GraphPage";

const ALL_TABS = [
  { path: "/memory", label: "Memory", Icon: MemoryIcon, key: "memory" as const },
  { path: "/schedule", label: "Schedule", Icon: ScheduleIcon, key: "schedule" as const },
  { path: "/review", label: "Review", Icon: ReviewIcon, key: "review" as const },
  { path: "/graph", label: "Graph", Icon: GraphIcon, key: "graph" as const },
  { path: "/insights", label: "Insights", Icon: InsightsIcon, key: "insights" as const },
  { path: "/settings", label: "Settings", Icon: SettingsIcon, key: "settings" as const },
];

function TabBar() {
  const route = useRoute();
  const { settings } = useSettings();
  const tabs = ALL_TABS.filter((t) => t.key !== "review" || settings.showReviewTab);

  return (
    <nav className="tab-bar" aria-label="Main navigation">
      {tabs.map((tab) => {
        const active = route.path.startsWith(tab.path);
        return (
          <button
            key={tab.path}
            className={"tab-item" + (active ? " active" : "")}
            onClick={() => navigate(tab.path)}
            aria-current={active ? "page" : undefined}
          >
            <tab.Icon filled={active} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function Pages() {
  const route = useRoute();
  const { settings } = useSettings();
  if (route.path.startsWith("/schedule")) return <SchedulePage />;
  if (route.path.startsWith("/review")) {
    if (!settings.showReviewTab) return <MemoryPage />;
    return <ReviewPage />;
  }
  if (route.path.startsWith("/graph")) return <GraphPage />;
  if (route.path.startsWith("/insights")) return <InsightsPage />;
  if (route.path.startsWith("/settings")) return <SettingsPage />;
  return <MemoryPage />;
}

function Shell() {
  const { loaded, settings } = useSettings();
  // Wait for settings (and, on first run, demo-data seeding) to finish before
  // mounting any page — otherwise a page's own data fetch can race ahead of
  // seeding and load an empty database.
  if (!loaded) return null;

  return (
    <div className="app-shell" data-nav={settings.navPosition}>
      <TabBar />
      <div className="main-content">
        <Pages />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <RouterProvider>
        <Shell />
      </RouterProvider>
    </SettingsProvider>
  );
}
