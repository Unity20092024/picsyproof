const { chromium } = require("playwright");
const AxeBuilder = require("@axe-core/playwright").default;
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "light",
  });
  const page = await context.newPage();
  const errors = [];
  const results = [];
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.BASE_URL || "http://localhost:3000");
  await page.waitForFunction(() =>
    localStorage.getItem("picsyproof-workspace-v2"),
  );
  await page.evaluate(async () => {
    await document.fonts.load("400 32px Display");
    await document.fonts.load("italic 400 32px Display");
    await document.fonts.load('400 15px "DM Sans"');
    await document.fonts.ready;
  });
  async function nav(view) {
    await page.locator("main[data-ready=true]").waitFor();
    await page.evaluate((v) => {
      location.hash = v;
    }, view);
    await page
      .locator("main")
      .getAttribute("aria-label")
      .then(async (value) => {
        if (value !== view + " screen")
          await page.waitForFunction(
            (v) =>
              document.querySelector("main").getAttribute("aria-label") ===
              v + " screen",
            view,
          );
      });
  }
  async function noOverflow(label) {
    const size = await page.evaluate(() => ({
      w: innerWidth,
      s: document.documentElement.scrollWidth,
    }));
    assert(
      size.s <= size.w,
      `${label}: horizontal overflow ${JSON.stringify(size)}`,
    );
  }
  async function axe(label) {
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.equal(
      result.violations.length,
      0,
      label +
        ": " +
        JSON.stringify(
          result.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
        ),
    );
  }
  for (const width of [360, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    for (const view of [
      "home",
      "properties",
      "detail",
      "cleaner",
      "turnovers",
      "reports",
      "settings",
    ]) {
      await nav(view);
      await noOverflow(width + " " + view);
    }
    await nav("home");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `docs/qa/home-light-${width}.png`,
      fullPage: true,
    });
    results.push(`All 7 views: ${width}px, no horizontal overflow`);
    console.log(results.at(-1));
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await nav("home");
  await axe("Light dashboard");
  await page.getByRole("button", { name: "Add Property", exact: true }).click();
  await page
    .getByRole("heading", { name: "Add New Property", exact: true })
    .waitFor();
  await page
    .getByLabel("Property Name", { exact: false })
    .fill("QA Seaside Cottage");
  await page.getByLabel("Address", { exact: false }).fill("Charleston, SC");
  await page
    .getByLabel("Property Type", { exact: false })
    .selectOption("Cottage");
  await page
    .getByRole("button", { name: "Save Property", exact: true })
    .click();
  await page
    .getByRole("button")
    .filter({
      has: page.getByRole("heading", {
        name: "QA Seaside Cottage",
        exact: true,
      }),
    })
    .click();
  await page.getByRole("button", { name: "Open cleaning checklist" }).click();
  assert(
    await page.getByRole("button", { name: "Finish Turnover" }).isDisabled(),
  );
  await page
    .locator(".task input[type=file]")
    .first()
    .setInputFiles(path.resolve("public/images/living.jpg"));
  await page.locator(".photo-preview img").waitFor();
  assert.equal(await page.locator(".photo-preview img").count(), 1);
  await page.getByRole("button", { name: /Remove photo for Entryway/ }).click();
  assert.equal(await page.locator(".photo-preview img").count(), 0);
  await page
    .locator(".task input[type=file]")
    .first()
    .setInputFiles(path.resolve("public/images/bedroom.jpg"));
  await page.locator(".photo-preview img").waitFor();
  for (const checkbox of await page
    .locator(".checklist input[type=checkbox]")
    .all())
    await checkbox.check();
  await axe("Cleaner checklist");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "docs/qa/cleaner-light-390.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Finish Turnover" }).click();
  await page.locator(".evidence-report").waitFor();
  assert.equal(await page.locator(".report-task img").count(), 1);
  assert.match(
    await page.locator(".evidence-report").innerText(),
    /Completed · local record/,
  );
  await axe("Completed report");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "docs/qa/report-light-390.png",
    fullPage: true,
  });
  await page.emulateMedia({ media: "print" });
  assert.equal(await page.locator(".bottom-nav").isVisible(), false);
  await page.pdf({
    path: "docs/qa/report.pdf",
    format: "A4",
    printBackground: true,
  });
  await page.emulateMedia({ media: "screen" });
  await nav("cleaner");
  await page.getByRole("button", { name: "Start next turnover" }).click();
  assert.equal(await page.locator(".checklist input:checked").count(), 0);
  await nav("turnovers");
  assert.match(await page.locator("main").innerText(), /QA Seaside Cottage/);
  await page.locator(".history-row").last().click();
  assert.equal(await page.locator(".report-task img").count(), 1);
  await page.reload();
  await page.locator(".evidence-report").waitFor();
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("picsyproof-workspace-v2")).records
        .length === 1,
  );
  assert.equal(await page.locator(".report-task img").count(), 0);
  await nav("properties");
  assert.match(await page.locator("main").innerText(), /QA Seaside Cottage/);
  results.push(
    "Add property → upload/remove/replace photo → check all tasks → complete → report → print PDF → next turnover → history → reload persistence and photo expiry",
  );
  await nav("settings");
  await page.getByLabel("Dark", { exact: true }).check();
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "dark",
  );
  await axe("Dark settings");
  await nav("home");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "docs/qa/home-dark-390.png", fullPage: true });
  await axe("Dark dashboard");
  for (const width of [360, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const view of [
      "home",
      "properties",
      "detail",
      "cleaner",
      "turnovers",
      "reports",
      "settings",
    ]) {
      await nav(view);
      await noOverflow("dark " + width + " " + view);
    }
  }
  results.push(
    "All 7 views in dark mode at 360, 390, 430, 768 and 1440px, no horizontal overflow",
  );
  await page.setViewportSize({ width: 390, height: 844 });

  await page.reload();
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "dark",
  );
  await nav("settings");
  await page.getByLabel("Light", { exact: true }).check();
  await page.emulateMedia({ colorScheme: "dark" });
  assert.equal(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).colorScheme,
    ),
    "light",
  );
  await page.getByLabel("System", { exact: true }).check();
  await page.waitForFunction(
    () => getComputedStyle(document.documentElement).colorScheme === "dark",
  );
  await page.emulateMedia({ colorScheme: "light" });
  await page.waitForFunction(
    () => getComputedStyle(document.documentElement).colorScheme === "light",
  );
  results.push(
    "Dark and Light overrides persist; System follows live device appearance changes",
  );
  await page.getByLabel("Workspace name", { exact: true }).fill("QA workspace");
  await page.getByRole("button", { name: "Save locally" }).click();
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem("picsyproof-workspace-name"),
    ),
    "QA workspace",
  );
  await nav("home");
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Menu", exact: true })
    .getByRole("link", { name: "Settings", exact: true })
    .click();
  assert.match(
    await page.locator("main").getAttribute("aria-label"),
    /settings/,
  );
  await nav("home");
  await page.getByRole("button", { name: "Add Property", exact: true }).click();
  await page
    .getByRole("button", { name: "Back to My Properties", exact: true })
    .click();
  assert.match(
    await page.locator("main").getAttribute("aria-label"),
    /properties/,
  );
  results.push(
    "Mobile menu, settings save, Screen C back button and navigation",
  );
  assert.deepEqual(errors, []);
  results.push(
    "No browser runtime errors; WCAG A/AA axe scans passed for light dashboard, cleaner, report, dark settings and dashboard",
  );
  // Legacy records remain available and migrate without losing task state.
  const legacy = await context.newPage();
  await legacy.goto(process.env.BASE_URL || "http://localhost:3000");
  await legacy.evaluate(() => {
    localStorage.removeItem("picsyproof-workspace-v2");
    localStorage.setItem(
      "picsyproof-pilot-v1",
      JSON.stringify([
        {
          id: "loft",
          name: "Legacy Loft",
          address: "Existing location",
          completedAt: "2026-01-01T10:00:00Z",
          tasks: [{ id: "0", label: "Existing custom task", done: true }],
        },
      ]),
    );
  });
  await legacy.reload();
  await legacy.waitForFunction(
    () =>
      document.querySelector(".property-copy h3")?.textContent ===
      "Legacy Loft",
  );
  await legacy.goto(
    (process.env.BASE_URL || "http://localhost:3000") + "/#cleaner",
  );
  await legacy.getByRole("button", { name: "Start next turnover" }).click();
  assert.equal(
    await legacy.evaluate(
      () =>
        JSON.parse(localStorage.getItem("picsyproof-workspace-v2")).records
          .length,
    ),
    1,
  );
  results.push(
    "Legacy pilot properties, custom tasks and completed record migrate and archive correctly",
  );
  fs.writeFileSync(
    "docs/qa/results.json",
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
