// End-to-end smoke test using Playwright — verifies the app loads, quick-add
// works, a review can be completed, and all four tabs render without errors.
import { chromium } from "/home/claude/.npm-global/lib/node_modules/playwright/index.mjs";

const errors = [];
const results = [];

function log(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
}

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--no-sandbox"],
});

try {
  const context = await browser.newContext({
    viewport: { width: 820, height: 1180 }, // iPad-ish tablet size
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto("http://localhost:5173/index.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // 1. App loads with Memory tab
  const title = await page.locator(".nav-title-large").first().textContent();
  log("App loads to Memory page", title?.trim() === "Memory", `got "${title}"`);

  // 2. Quick add a memory
  const input = page.locator(".quick-add-input");
  await input.click();
  await input.fill("The three conditions of a valid contract");
  await page.waitForTimeout(200);

  // expand and set collection/tags
  const collectionInput = page.locator('input[placeholder*="Collection"]');
  await collectionInput.fill("Law");
  const tagsInput = page.locator('input[placeholder*="Tags"]');
  await tagsInput.fill("contracts");

  const addBtn = page.locator("button", { hasText: "Add" });
  await addBtn.click();
  await page.waitForTimeout(400);

  const rowText = await page.locator(".memory-row-title").first().textContent();
  log(
    "Memory appears in library after quick add",
    rowText?.includes("three conditions"),
    `got "${rowText}"`
  );

  const meta = await page.locator(".memory-row-meta").first().textContent();
  log("Collection tag shown on row", meta?.includes("Law"), `got "${meta}"`);

  // 3. Toggle completion
  const dot = page.locator(".completion-dot").first();
  await dot.click();
  await page.waitForTimeout(200);
  const dotClass = await dot.getAttribute("class");
  log("Completion toggle marks done", dotClass?.includes("done") ?? false, dotClass ?? "");
  await dot.click(); // toggle back
  await page.waitForTimeout(200);

  // 4. Add a second memory with backdated "yesterday" learned date, for retrospective capture test
  await input.click();
  await input.fill("كان — was/became (Arabic)");
  await page.waitForTimeout(150);
  const yesterdayChip = page.locator(".chip", { hasText: "Yesterday" });
  await yesterdayChip.click();
  await addBtn.click();
  await page.waitForTimeout(400);

  const metas = await page.locator(".memory-row-meta").allTextContents();
  const hasYesterday = metas.some((m) => m.includes("yesterday"));
  log("Retrospective 'Learned yesterday' capture works", hasYesterday, JSON.stringify(metas));

  // 5. Go to Review page and complete a review
  await page.locator(".tab-item", { hasText: "Review" }).click();
  await page.waitForTimeout(400);
  const reviewTitle = await page.locator(".nav-title-large").first().textContent();
  log("Review page loads", reviewTitle?.includes("Review") ?? false, reviewTitle ?? "");

  const showAnswerBtn = page.locator("button", { hasText: "Show Answer" });
  const hasShowAnswer = await showAnswerBtn.count();
  if (hasShowAnswer > 0) {
    await showAnswerBtn.click();
    await page.waitForTimeout(200);
    const goodBtn = page.locator(".rating-btn.good");
    await goodBtn.click();
    await page.waitForTimeout(300);
    log("Review rating flow (Show Answer -> Good) works", true);
  } else {
    log("Review rating flow (Show Answer -> Good) works", false, "no due cards found");
  }

  // 6. Schedule page — check all three views render
  await page.locator(".tab-item", { hasText: "Schedule" }).click();
  await page.waitForTimeout(300);
  const scheduleTitle = await page.locator(".nav-title-large").first().textContent();
  log("Schedule page loads", scheduleTitle?.includes("Schedule") ?? false, scheduleTitle ?? "");

  for (const view of ["Agenda", "Calendar", "Matrix"]) {
    await page.locator(".segmented-item", { hasText: view }).click();
    await page.waitForTimeout(200);
  }
  log("Schedule view switching (Agenda/Calendar/Matrix) works", true);

  // 7. Insights page
  await page.locator(".tab-item", { hasText: "Insights" }).click();
  await page.waitForTimeout(300);
  const statValues = await page.locator(".stat-value").allTextContents();
  log("Insights page renders stat tiles", statValues.length >= 4, `${statValues.length} tiles: ${statValues.join(", ")}`);

  // 8. Responsive check — mobile viewport
  await page.setViewportSize({ width: 390, height: 844 }); // iPhone-ish
  await page.locator(".tab-item", { hasText: "Memory" }).click();
  await page.waitForTimeout(300);
  const tabBarVisible = await page.locator(".tab-bar").isVisible();
  log("Tab bar visible on mobile viewport", tabBarVisible);

  // 9. Larger tablet viewport (per user's testing device)
  await page.setViewportSize({ width: 1024, height: 1366 }); // iPad Pro-ish
  await page.waitForTimeout(300);
  const mainVisible = await page.locator(".main-content").isVisible();
  log("Main content visible on tablet viewport", mainVisible);

  // 10. No console errors
  log("No console/page errors during test run", errors.length === 0, errors.join(" | "));

  await context.close();
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) {
  console.log("FAILURES:", failed.map((f) => f.name).join(", "));
  process.exit(1);
}
