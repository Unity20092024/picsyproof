const { chromium } = require("playwright");
const AxeBuilder = require("@axe-core/playwright").default;
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = process.env.BASE_URL || "http://localhost:3000";
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    timezoneId: "Europe/London",
    colorScheme: "light",
  });
  await context.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (window.__failWrite && key === "picsyproof-workspace-v2")
        throw new DOMException("Test quota failure", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const errors = [],
    results = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.locator("main[data-ready=true]").waitFor();
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("picsyproof-workspace-v2"));
    delete d.turnovers;
    d.properties[0].timeZone = "America/Los_Angeles";
    d.properties[0].estimatedDurationMinutes = 90;
    d.properties[0].tasks[0].requiresPhoto = true;
    d.properties[0].tasks = d.properties[0].tasks.map((t) => ({
      ...t,
      done: true,
    }));
    d.properties[0].completedAt = "2026-01-01T10:00:00Z";
    d.properties[1].timeZone = "Asia/Tokyo";
    d.properties.push({
      id: "custom-source",
      name: "Patio Cottage",
      address: "Portland, OR",
      tasks: [{ id: "patio", label: "Inspect patio", done: true }],
      cleaningSetup: { mode: "custom", frequency: "Weekly" },
    });
    d.records = [
      {
        id: "legacy-report",
        propertyId: d.properties[0].id,
        name: d.properties[0].name,
        address: d.properties[0].address,
        completedAt: d.properties[0].completedAt,
        tasks: JSON.parse(JSON.stringify(d.properties[0].tasks)),
        sample: true,
      },
    ];
    localStorage.setItem("picsyproof-workspace-v2", JSON.stringify(d));
  });
  await page.reload();
  await page.locator("main[data-ready=true]").waitFor();
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("picsyproof-workspace-v2")),
  );
  assert.deepEqual(before.turnovers, []);
  assert.equal(before.records.length, 1);
  async function nav(v) {
    await page.evaluate((v) => (location.hash = v), v);
    await page.waitForFunction(
      (v) =>
        document.querySelector("main").getAttribute("aria-label") ===
        v + " screen",
      v,
    );
  }
  async function open() {
    await page
      .getByRole("button", { name: "Create Turnover", exact: true })
      .click();
    await page
      .getByRole("form", { name: "Create turnover", exact: true })
      .waitFor();
  }
  async function dateTime() {
    await page.getByLabel("Date", { exact: true }).fill("2030-07-14");
    await page.getByLabel("Time", { exact: true }).fill("14:30");
  }
  async function screenshot(name) {
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    await page.screenshot({
      path: "docs/qa/screen-f/" + name + ".png",
      fullPage: true,
    });
  }
  async function axe(name) {
    const r = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.equal(
      r.violations.length,
      0,
      name +
        JSON.stringify(
          r.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              reason: n.failureSummary,
            })),
          })),
        ),
    );
  }
  await nav("turnovers");
  await open();
  assert.equal(
    await page.getByRole("navigation", { name: "Mobile navigation" }).count(),
    0,
  );
  assert.match(
    await page.locator(".turnover-property-card").innerText(),
    /Lakeside Retreat/,
  );
  assert.equal(
    await page.getByLabel("Estimated time", { exact: false }).inputValue(),
    "90",
  );
  assert(
    await page
      .getByRole("switch", { name: "Notify Cleaner", exact: true })
      .isDisabled(),
  );
  for (const width of [360, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      width,
    );
    await screenshot("light-" + width);
    await page
      .getByRole("button", { name: "Open menu", exact: true })
      .scrollIntoViewIfNeeded();
    const hit = await page
      .getByRole("button", { name: "Open menu", exact: true })
      .evaluate((el) => {
        const r = el.getBoundingClientRect();
        return el.contains(
          document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
        );
      });
    assert(
      hit,
      "Menu must stay above photo at width " +
        width +
        ": " +
        JSON.stringify(
          await page
            .getByRole("button", { name: "Open menu", exact: true })
            .evaluate((el) => {
              const r = el.getBoundingClientRect();
              const hit = document.elementFromPoint(
                r.x + r.width / 2,
                r.y + r.height / 2,
              );
              return {
                scroll: scrollY,
                rect: r.toJSON(),
                hit: hit?.outerHTML.slice(0, 300),
              };
            }),
        ),
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await axe("Empty form");
  await page
    .getByRole("button", { name: "Create Turnover", exact: true })
    .click();
  await page
    .getByText("Choose a local cleaning time.", { exact: true })
    .waitFor();
  await page.getByLabel("Date", { exact: true }).fill("2000-01-01");
  await page.getByLabel("Time", { exact: true }).fill("09:00");
  await page
    .getByRole("button", { name: "Create Turnover", exact: true })
    .click();
  await page.getByText(/Choose today or a later date/).waitFor();
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("picsyproof-workspace-v2")).turnovers
          .length,
    ),
    0,
  );
  await dateTime();
  assert.match(await page.locator("#time-display").innerText(), /2:30 PM/);
  await page.getByRole("button", { name: /Assign Cleaner/ }).click();
  await page
    .getByRole("dialog", { name: "Assign cleaner", exact: true })
    .getByRole("button", { name: /Jamie Taylor/ })
    .click();
  assert(
    await page
      .getByRole("switch", { name: "Notify Cleaner", exact: true })
      .isEnabled(),
  );
  await page
    .getByRole("switch", { name: "Notify Cleaner", exact: true })
    .click();
  await page
    .getByRole("switch", { name: "Require Photo Evidence", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Choose Another Checklist", exact: false })
    .click();
  await page
    .getByRole("dialog", { name: "Choose checklist", exact: true })
    .getByRole("button", { name: /Patio Cottage/ })
    .click();
  await page.getByText(/Assigned checklist: 2 tasks/).waitFor();
  await page
    .getByLabel("Special Instructions", { exact: true })
    .fill("Restock towels.\nClose patio windows.");
  await page.getByLabel("Estimated time", { exact: false }).fill("2.5");
  await page
    .getByRole("button", { name: "Create Turnover", exact: true })
    .click();
  await page
    .getByText("Use a whole number of minutes from 1 to 1,440.", {
      exact: true,
    })
    .waitFor();
  await page.getByLabel("Estimated time", { exact: false }).fill("125");
  await page.getByRole("button", { name: /Customize these tasks/ }).click();
  await page.getByLabel("Task 1", { exact: true }).fill("Check outdoor chairs");
  await page.getByRole("button", { name: "Change", exact: false }).click();
  await page
    .getByRole("dialog", { name: "Choose property", exact: true })
    .getByRole("button", { name: /City Loft/ })
    .click();
  await page
    .getByRole("dialog", { name: "Replace checklist changes?", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Keep current tasks", exact: true })
    .click();
  assert.match(
    await page.locator(".turnover-property-card").innerText(),
    /Lakeside Retreat/,
  );
  assert.equal(
    await page.getByLabel("Task 1", { exact: true }).inputValue(),
    "Check outdoor chairs",
  );
  await page
    .getByRole("button", { name: "Back from Create Turnover", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Keep your turnover setup?", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  assert.equal(
    await page.getByLabel("Special Instructions", { exact: true }).inputValue(),
    "Restock towels.\nClose patio windows.",
  );
  await axe("Configured form");
  await screenshot("configured-390");
  await page.evaluate(() => (window.__failWrite = true));
  await page
    .getByRole("button", { name: "Create Turnover", exact: true })
    .click();
  await page
    .getByText(/Could not save this turnover to local browser storage/)
    .waitFor();
  assert.equal(
    await page.getByLabel("Special Instructions", { exact: true }).inputValue(),
    "Restock towels.\nClose patio windows.",
  );
  await page.evaluate(() => (window.__failWrite = false));
  await page.evaluate(() => {
    const f = document.querySelector(".create-turnover-form");
    f.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    f.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await page.waitForFunction(
    () =>
      document.querySelector("main").getAttribute("aria-label") ===
      "turnovers screen",
  );
  await page.getByText(/Turnover saved locally/).waitFor();
  let data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("picsyproof-workspace-v2")),
  );
  assert.equal(data.turnovers.length, 1);
  assert.deepEqual(data.properties, before.properties);
  assert.deepEqual(data.records, before.records);
  const first = data.turnovers[0];
  assert.equal(first.scheduledAt, "2030-07-14T21:30:00.000Z");
  assert.equal(first.timeZone, "America/Los_Angeles");
  assert.equal(first.timeZoneSource, "property");
  assert.equal(first.status, "scheduled");
  assert.equal(first.cleanerId, "demo-jamie");
  assert.equal(first.cleanerIsDemo, true);
  assert.equal(first.notifyCleanerPreference, true);
  assert.equal(first.requirePhotoEvidence, false);
  assert.equal(
    first.specialInstructions,
    "Restock towels.\nClose patio windows.",
  );
  assert.equal(first.estimatedDurationMinutes, 125);
  assert.equal(first.checklistSnapshot.length, 2);
  assert(first.checklistSnapshot.every((t) => !t.done && !t.photo));
  assert(
    first.checklistSnapshot.some(
      (t) => t.label === before.properties[0].tasks[0].label && t.requiresPhoto,
    ),
  );
  assert.notEqual(first.checklistSnapshot[0].id, "patio");
  // A property default edit after scheduling cannot rewrite a job snapshot or a prior report.
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("picsyproof-workspace-v2"));
    d.properties[0].tasks[0].label = "Changed default after scheduling";
    localStorage.setItem("picsyproof-workspace-v2", JSON.stringify(d));
  });
  await page.reload();
  await page.locator("main[data-ready=true]").waitFor();
  await page.locator(".scheduled-job-row").first().click();
  await page
    .getByText("Restock towels.\nClose patio windows.", { exact: false })
    .waitFor();
  assert.equal(await page.locator(".checklist input:checked").count(), 0);
  assert.match(
    await page.locator(".checklist").innerText(),
    /Entryway is clean and ready/,
  );
  assert(
    !(await page.locator(".checklist").innerText()).includes("Changed default"),
  );
  for (const box of await page.locator(".checklist input[type=checkbox]").all())
    await box.check();
  assert(
    await page
      .getByRole("button", { name: "Finish Turnover", exact: true })
      .isDisabled(),
  );
  await page
    .locator(".task")
    .filter({ hasText: "Entryway is clean and ready" })
    .locator("input[type=file]")
    .setInputFiles(path.resolve("public/images/living.jpg"));
  await page.locator(".photo-preview img").waitFor();
  assert(
    await page
      .getByRole("button", { name: "Finish Turnover", exact: true })
      .isEnabled(),
  );
  await page.reload();
  await page.locator("main[data-ready=true]").waitFor();
  assert(
    await page
      .getByRole("button", { name: "Finish Turnover", exact: true })
      .isDisabled(),
  );
  await page
    .locator(".task")
    .filter({ hasText: "Entryway is clean and ready" })
    .locator("input[type=file]")
    .setInputFiles(path.resolve("public/images/living.jpg"));
  await page.locator(".photo-preview img").waitFor();
  await page
    .getByRole("button", { name: "Finish Turnover", exact: true })
    .click();
  await page.locator(".evidence-report").waitFor();
  data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("picsyproof-workspace-v2")),
  );
  assert.equal(data.records.length, 2);
  assert.deepEqual(
    data.records.find((r) => r.id === "legacy-report"),
    before.records[0],
  );
  assert.equal(data.turnovers[0].status, "completed");
  assert.equal(data.records[0].turnoverId, first.id);
  assert.deepEqual(
    data.records[0].tasks.map((t) => t.label),
    first.checklistSnapshot.map((t) => t.label),
  );
  results.push(
    "Older workspace migrated without changing property progress or completed reports; valid scheduling, property time zone conversion, demo cleaner and notification preference, alternative/custom checklist, instructions, estimate, missing-photo gate, local save retry and duplicate-submit protection passed.",
  );
  await nav("properties");
  await page
    .getByRole("button")
    .filter({
      has: page.getByRole("heading", { name: "Lakeside Retreat", exact: true }),
    })
    .click();
  assert.match(await page.locator("main").innerText(), /Turnover history/);
  await open();
  assert.match(
    await page.locator(".turnover-property-card").innerText(),
    /Lakeside Retreat/,
  );
  await page
    .getByRole("button", { name: "Back from Create Turnover", exact: true })
    .click();
  assert.match(await page.locator("main").getAttribute("aria-label"), /detail/);
  await open();
  // Change property after editing tasks requires confirmation; loaded checklist/zone/estimate follows new property.
  await page.getByRole("button", { name: /Customize these tasks/ }).click();
  await page.getByLabel("Task 1", { exact: true }).fill("Custom draft task");
  await page.getByRole("button", { name: "Change", exact: false }).click();
  await page.getByLabel("Search properties", { exact: true }).fill("City");
  assert.equal(
    await page
      .getByRole("dialog", { name: "Choose property", exact: true })
      .locator(".selection-list>button")
      .count(),
    1,
  );
  await page
    .getByRole("dialog", { name: "Choose property", exact: true })
    .getByRole("button", { name: /City Loft/ })
    .click();
  await page
    .getByRole("button", { name: "Replace tasks", exact: true })
    .click();
  assert.match(
    await page.locator(".turnover-property-card").innerText(),
    /City Loft/,
  );
  assert.match(await page.locator(".zone-notice").innerText(), /Asia\/Tokyo/);
  assert.equal(
    await page.getByLabel("Estimated time", { exact: false }).inputValue(),
    "",
  );
  assert(
    await page
      .getByRole("switch", { name: "Notify Cleaner", exact: true })
      .isDisabled(),
  );
  await dateTime();
  await page.getByRole("button", { name: /Assign Cleaner/ }).click();
  await page
    .getByRole("dialog", { name: "Assign cleaner", exact: true })
    .getByRole("button", { name: /Alex Morgan/ })
    .click();
  await page.getByRole("button", { name: /Assign Cleaner/ }).click();
  await page
    .getByRole("dialog", { name: "Assign cleaner", exact: true })
    .getByRole("button", { name: /Unassigned/ })
    .click();
  assert(
    await page
      .getByRole("switch", { name: "Notify Cleaner", exact: true })
      .isDisabled(),
  );
  // Return to Lakeside; create another independent scheduled job for the same property.
  await page.getByRole("button", { name: "Change", exact: false }).click();
  await page.getByLabel("Search properties", { exact: true }).fill("Lakeside");
  await page
    .getByRole("dialog", { name: "Choose property", exact: true })
    .getByRole("button", { name: /Lakeside Retreat/ })
    .click();
  await dateTime();
  await page
    .getByRole("button", { name: "Create Turnover", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector("main").getAttribute("aria-label") ===
      "turnovers screen",
  );
  data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("picsyproof-workspace-v2")),
  );
  assert.equal(data.turnovers.length, 2);
  assert.equal(new Set(data.turnovers.map((t) => t.id)).size, 2);
  const second = data.turnovers[0];
  assert.equal(second.propertyId, first.propertyId);
  assert.equal(second.status, "scheduled");
  assert(second.checklistSnapshot.every((t) => !t.done && t.requiresPhoto));
  assert.equal(second.cleanerId, undefined);
  assert.equal(second.notifyCleanerPreference, false);
  assert.equal(second.estimatedDurationMinutes, 90);
  assert.equal(
    data.turnovers.find((t) => t.id === first.id).status,
    "completed",
  );
  await nav("detail");
  assert.equal(await page.locator(".scheduled-job-row").count(), 1);
  await page.locator(".scheduled-job-row").click();
  assert.match(
    await page.locator("main").innerText(),
    /photo preview is required for every task/,
  );
  assert.equal(await page.locator(".checklist input:checked").count(), 0);
  results.push(
    "Property launch preselects and returns to originating property; searchable property change and confirmation, fresh defaults, Unassigned, independent multiple jobs, immutable completed snapshots, property history and reload/photo-expiry behavior passed.",
  );
  await nav("settings");
  await page.getByLabel("Dark", { exact: true }).check();
  await nav("turnovers");
  await open();
  for (const width of [360, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      width,
    );
    if (width === 390) await screenshot("dark-390");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await axe("Dark form");
  await page.getByRole("button", { name: "Change", exact: false }).click();
  await axe("Property selector dialog");
  await page
    .getByRole("button", { name: "Close Choose property", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Back from Create Turnover", exact: true })
    .click();
  await nav("settings");
  await page.getByLabel("System", { exact: true }).check();
  await nav("turnovers");
  await open();
  await page.emulateMedia({ colorScheme: "light" });
  await page.waitForFunction(
    () => getComputedStyle(document.documentElement).colorScheme === "light",
  );
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForFunction(
    () => getComputedStyle(document.documentElement).colorScheme === "dark",
  );
  results.push(
    "360/390/430/768/1440px light and dark layouts, native date/time controls, functioning header, focused layout without bottom navigation, System theme and WCAG A/AA scans passed.",
  );
  const emptyContext = await browser.newContext({
    viewport: { width: 360, height: 800 },
  });
  await emptyContext.addInitScript(() =>
    localStorage.setItem(
      "picsyproof-workspace-v2",
      JSON.stringify({ properties: [], records: [] }),
    ),
  );
  const empty = await emptyContext.newPage();
  await empty.goto(base + "/#create-turnover");
  await empty.locator("main[data-ready=true]").waitFor();
  await empty.getByText("A property comes first.", { exact: true }).waitFor();
  await empty
    .getByRole("button", { name: "Add Property", exact: true })
    .click();
  await empty
    .getByRole("heading", { name: "Add New Property", exact: true })
    .waitFor();
  await emptyContext.close();
  const fallback = await browser.newContext({
    viewport: { width: 390, height: 844 },
    timezoneId: "Europe/London",
  });
  const fallbackPage = await fallback.newPage();
  await fallbackPage.goto(base + "/#create-turnover");
  await fallbackPage.locator("main[data-ready=true]").waitFor();
  assert.match(
    await fallbackPage.locator(".zone-notice").innerText(),
    /not configured.*Europe\/London/,
  );
  await fallback.close();
  assert.deepEqual(errors, []);
  results.push(
    "Empty workspace Add Property action and explicit device-zone fallback passed; no browser runtime errors.",
  );
  fs.writeFileSync(
    "docs/qa/screen-f/results.json",
    JSON.stringify(
      { checkedAt: new Date().toISOString(), results, errors },
      null,
      2,
    ),
  );
  console.log(results.join("\n"));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
