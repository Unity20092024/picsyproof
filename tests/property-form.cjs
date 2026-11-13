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
    colorScheme: "light",
  });
  await context.addInitScript(() => {
    window.__revoked = [];
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL = (url) => {
      window.__revoked.push(url);
      revoke(url);
    };
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "picsyproof-workspace-v2" && window.__failSave)
        throw new DOMException("Test storage failure", "QuotaExceededError");
      return set.call(this, key, value);
    };
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const errors = [];
  const results = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.locator("main[data-ready=true]").waitFor();
  const initial = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("picsyproof-workspace-v2")),
  );
  async function open() {
    await page
      .getByRole("button", { name: "Add Property", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Add New Property", exact: true })
      .waitFor();
  }
  async function fields(name = "  Screen C Cottage  ") {
    await page.getByLabel("Property Name", { exact: false }).fill(name);
    await page
      .getByLabel("Address", { exact: false })
      .fill("  20 Seaside Road, Charleston, SC 29401  ");
    await page
      .getByLabel("Property Type", { exact: false })
      .selectOption("Cottage");
  }
  async function snapshot(name) {
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    await page.screenshot({
      path: `docs/qa/screen-c/${name}.png`,
      fullPage: true,
    });
  }
  async function axe(name) {
    const a = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.equal(
      a.violations.length,
      0,
      name +
        ": " +
        JSON.stringify(
          a.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              summary: n.failureSummary,
            })),
          })),
        ),
    );
  }
  await open();
  assert.equal(
    await page.getByRole("navigation", { name: "Mobile navigation" }).count(),
    0,
  );
  await page.getByRole("button", { name: "Back to My Properties" }).click();
  await page
    .getByRole("button", { name: "Add Property", exact: true })
    .waitFor();
  assert.match(
    await page.locator("main").getAttribute("aria-label"),
    /properties/,
  );
  await open();
  for (const width of [360, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      width,
    );
    const bounds = await page.evaluate(() => {
      const gallery = document
          .querySelector(".property-photo-grid")
          .getBoundingClientRect(),
        cover = document
          .querySelector(".cover-photo-frame")
          .getBoundingClientRect(),
        thumbs = document
          .querySelector(".supporting-photos")
          .getBoundingClientRect(),
        actions = document
          .querySelector(".photo-actions")
          .getBoundingClientRect(),
        firstField = document
          .querySelector(".property-details-grid")
          .getBoundingClientRect();
      return {
        galleryBottom: gallery.bottom,
        coverBottom: cover.bottom,
        thumbsBottom: thumbs.bottom,
        actionsTop: actions.top,
        actionsBottom: actions.bottom,
        firstFieldTop: firstField.top,
      };
    });
    assert(
      bounds.coverBottom <= bounds.galleryBottom + 1,
      "Cover must stay in gallery",
    );
    assert(
      bounds.thumbsBottom <= bounds.galleryBottom + 1,
      "Thumbnails must stay in gallery",
    );
    assert(
      bounds.galleryBottom <= bounds.actionsTop,
      "Gallery must clear controls",
    );
    assert(
      bounds.actionsBottom <= bounds.firstFieldTop,
      "Photos must not cover form fields",
    );
    await snapshot("light-" + width);
    assert.equal(
      await page
        .getByRole("button", { name: "Open menu", exact: true })
        .isVisible(),
      true,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await axe("Empty light form");
  await page
    .getByRole("button", { name: "Save Property", exact: true })
    .click();
  assert.match(
    await page.locator("#property-name-error").innerText(),
    /Enter a property name/,
  );
  assert.match(
    await page.locator("#property-address-error").innerText(),
    /full property address/,
  );
  assert.match(
    await page.locator("#property-type-error").innerText(),
    /Choose a property type/,
  );
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("picsyproof-workspace-v2")).properties
          .length,
    ),
    2,
  );
  await fields();
  await page.getByLabel("Bedrooms", { exact: true }).selectOption("0");
  await page.getByLabel("Bathrooms", { exact: true }).selectOption("1.5");
  await page.getByLabel("Sleeps (Guests)", { exact: true }).selectOption("3");
  for (const [id, invalid, valid] of [
    ["bedrooms", "1.5", "0"],
    ["bathrooms", "1.2", "1.5"],
    ["guests", "0", "3"],
    ["guests", "1.5", "3"],
  ]) {
    await page
      .locator("#" + id)
      .evaluate(
        (select, value) => select.add(new Option("Invalid test value", value)),
        invalid,
      );
    await page.locator("#" + id).selectOption(invalid);
    await page
      .getByRole("button", { name: "Save Property", exact: true })
      .click();
    assert.equal(
      await page.locator("#" + id).getAttribute("aria-invalid"),
      "true",
    );
    await page.locator("#" + id).selectOption(valid);
  }
  await page.getByLabel("Property Name", { exact: false }).press("Enter");
  assert.equal(
    await page
      .getByRole("heading", { name: "Add New Property", exact: true })
      .isVisible(),
    true,
  );
  await page.getByRole("button", { name: "Back to My Properties" }).click();
  await page
    .getByRole("dialog", { name: "Keep your property setup?" })
    .waitFor();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  assert.equal(
    await page.getByLabel("Property Name", { exact: false }).inputValue(),
    "  Screen C Cottage  ",
  );
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Menu", exact: true })
    .getByRole("link", { name: "Properties", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Keep your property setup?" })
    .waitFor();
  await page.keyboard.press("Escape");
  assert.equal(
    await page
      .getByRole("heading", { name: "Add New Property", exact: true })
      .isVisible(),
    true,
  );
  // Native browser Back is also guarded and keeps the in-memory form intact.
  await page.goBack();
  await page
    .getByRole("dialog", { name: "Keep your property setup?" })
    .waitFor();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  await page
    .getByLabel("Select property photos", { exact: true })
    .setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an image"),
    });
  await page
    .getByText("notes.txt: choose a JPEG, PNG or WebP image.", { exact: true })
    .waitFor();
  await page
    .getByLabel("Select property photos", { exact: true })
    .setInputFiles({
      name: "huge.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
    });
  await page
    .getByText("huge.jpg: choose an image no larger than 10 MB.", {
      exact: true,
    })
    .waitFor();
  await page
    .getByLabel("Select property photos", { exact: true })
    .setInputFiles({
      name: "broken.png",
      mimeType: "image/png",
      buffer: Buffer.from("broken"),
    });
  await page
    .getByText("broken.png: this image could not be read.", { exact: true })
    .waitFor();
  const [cameraChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Use camera", exact: true }).click(),
  ]);
  assert.equal(
    await cameraChooser.element().getAttribute("capture"),
    "environment",
  );
  await cameraChooser.setFiles([]);
  await page
    .getByLabel("Select property photos", { exact: true })
    .setInputFiles(
      ["living.jpg", "bedroom.jpg", "house.jpg"].map((p) =>
        path.resolve("public/images", p),
      ),
    );
  await page.waitForFunction(
    () =>
      document.querySelectorAll(".selected-property-photos li").length === 3,
  );
  await page
    .getByRole("button", { name: "Set cover: house.jpg", exact: true })
    .click();
  assert.match(
    await page.locator(".selected-property-photos li").first().innerText(),
    /house.jpg/,
  );
  await page
    .getByRole("button", { name: "Move photo later: house.jpg", exact: true })
    .click();
  assert.match(
    await page.locator(".selected-property-photos li").first().innerText(),
    /living.jpg/,
  );
  await page
    .getByRole("button", { name: "Move photo earlier: house.jpg", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Remove photo: bedroom.jpg", exact: true })
    .click();
  assert.equal(await page.locator(".selected-property-photos li").count(), 2);
  const cover = await page
    .locator(".cover-photo-frame>img")
    .getAttribute("src");
  assert.match(cover, /^blob:/);
  assert(await page.evaluate(() => window.__revoked.length >= 2));
  await page.getByRole("radio", { name: /Create Custom Checklist/ }).check();
  while (await page.locator(".custom-checklist-editor li").count())
    await page
      .getByRole("button", { name: "Remove task 1", exact: true })
      .click();
  await page
    .getByRole("button", { name: "Save Property", exact: true })
    .click();
  await page
    .getByText("Add at least one cleaning task.", { exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Add cleaning task", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save Property", exact: true })
    .click();
  await page
    .getByText("Give every cleaning task a name.", { exact: true })
    .waitFor();
  await page.getByLabel("Task 1", { exact: true }).fill(" Restock coffee ");
  await page.getByLabel("Photo required", { exact: true }).check();
  await page
    .getByRole("button", { name: "Add cleaning task", exact: true })
    .click();
  await page.getByLabel("Task 2", { exact: true }).fill("Inspect patio");
  await page
    .getByRole("button", { name: "Move task 2 up", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("Task 1", { exact: true }).inputValue(),
    "Inspect patio",
  );
  await page.getByRole("radio", { name: /Use Default Checklist/ }).check();
  await page.getByRole("radio", { name: /Create Custom Checklist/ }).check();
  assert.equal(
    await page.getByLabel("Task 1", { exact: true }).inputValue(),
    "Inspect patio",
  );
  await page
    .getByLabel("Turnover Frequency", { exact: true })
    .selectOption("Custom");
  await page
    .getByRole("button", { name: "Save Property", exact: true })
    .click();
  await page
    .getByText("Describe your cleaning preference.", { exact: true })
    .waitFor();
  await page
    .getByLabel("Custom cleaning preference", { exact: false })
    .fill("Every Monday and after each stay");
  await page
    .getByLabel("Property Type", { exact: false })
    .selectOption("Other");
  await page
    .getByLabel("Describe property type (optional)", { exact: true })
    .fill("Houseboat");
  await snapshot("custom-photos-390");
  await axe("Populated custom form");
  await page.evaluate(() => {
    window.__failSave = true;
  });
  await page
    .getByRole("button", { name: "Save Property", exact: true })
    .click();
  await page
    .getByText(/This property could not be saved to this browser/)
    .waitFor();
  assert.equal(
    await page.getByLabel("Property Name", { exact: false }).inputValue(),
    "  Screen C Cottage  ",
  );
  assert.equal(await page.locator(".selected-property-photos li").count(), 2);
  await page.evaluate(() => {
    window.__failSave = false;
  });
  await page.evaluate(() => {
    const form = document.querySelector(".property-form");
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });
  await page.waitForFunction(
    () =>
      document.querySelector("main").getAttribute("aria-label") ===
      "properties screen",
  );
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("picsyproof-workspace-v2")),
  );
  assert.equal(saved.properties.length, 3);
  assert.deepEqual(saved.properties.slice(0, 2), initial.properties);
  assert.deepEqual(saved.records, initial.records);
  const created = saved.properties[2];
  assert.equal(created.name, "Screen C Cottage");
  assert.equal(created.address, "20 Seaside Road, Charleston, SC 29401");
  assert.equal(created.propertyType, "Other");
  assert.equal(created.otherType, "Houseboat");
  assert.equal(created.bedrooms, 0);
  assert.equal(created.bathrooms, 1.5);
  assert.equal(created.guests, 3);
  assert.equal(created.cleaningSetup.frequency, "Custom");
  assert.equal(
    created.cleaningSetup.customFrequency,
    "Every Monday and after each stay",
  );
  assert.deepEqual(
    created.tasks.map((t) => ({
      label: t.label,
      requiresPhoto: t.requiresPhoto,
      done: t.done,
    })),
    [
      { label: "Inspect patio", requiresPhoto: false, done: false },
      { label: "Restock coffee", requiresPhoto: true, done: false },
    ],
  );
  assert.equal(created.photos, undefined);
  assert.equal(created.image, undefined);
  const propertyCard = page.getByRole("button").filter({
    has: page.getByRole("heading", { name: "Screen C Cottage", exact: true }),
  });
  assert.equal(await propertyCard.count(), 1);
  assert.equal(await propertyCard.locator("img").getAttribute("src"), cover);
  assert.equal(
    await propertyCard
      .locator("img")
      .evaluate((img) => img.complete && img.naturalWidth > 0),
    true,
  );
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Home", exact: true })
    .click();
  assert.equal(
    await page.locator(".stat-card strong").first().innerText(),
    "3",
  );
  results.push(
    "Dashboard and My Properties open Screen C; back, menu and browser Back guard dirty state; Enter does not submit; required validation creates no record.",
  );
  results.push(
    "Three photo selections, cover change, photo reorder/removal, original image preview and invalid/oversized/unreadable-file rejection passed; temporary URLs released on removal.",
  );
  results.push(
    "Custom task add/edit/delete/reorder and required-photo flag; studio bedrooms 0, half bathroom 1.5, guest count, Other type, custom frequency and storage-failure retry passed; repeated submission created exactly one record.",
  );
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Properties", exact: true })
    .click();
  await page
    .getByRole("button")
    .filter({
      has: page.getByRole("heading", { name: "Screen C Cottage", exact: true }),
    })
    .click();
  await page
    .getByRole("button", { name: "Open cleaning checklist", exact: true })
    .click();
  for (const checkbox of await page
    .locator(".checklist input[type=checkbox]")
    .all())
    await checkbox.check();
  assert(
    await page
      .getByRole("button", { name: "Finish Turnover", exact: true })
      .isDisabled(),
  );
  await page
    .locator(".task input[type=file]")
    .nth(1)
    .setInputFiles(path.resolve("public/images/living.jpg"));
  await page.locator(".photo-preview img").waitFor();
  assert(
    await page
      .getByRole("button", { name: "Finish Turnover", exact: true })
      .isEnabled(),
  );
  for (const checkbox of await page
    .locator(".checklist input[type=checkbox]")
    .all())
    await checkbox.uncheck();
  await page
    .getByRole("button", {
      name: "Remove photo for Restock coffee",
      exact: true,
    })
    .click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Properties", exact: true })
    .click();
  results.push(
    "The saved required-photo flag is honored by the existing turnover completion gate.",
  );
  // Copy from an existing property; source task structure, completion and photos must remain untouched.
  await open();
  await fields("Copied Cottage");
  await page.getByRole("radio", { name: /Copy from Another Property/ }).check();
  await page
    .getByRole("button", { name: "Save Property", exact: true })
    .click();
  await page
    .getByText("Choose a property to copy its checklist.", { exact: true })
    .waitFor();
  await page
    .getByLabel("Copy checklist from", { exact: true })
    .selectOption(created.id);
  await page
    .getByRole("button", { name: "Save Property", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector("main").getAttribute("aria-label") ===
      "properties screen",
  );
  const copied = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("picsyproof-workspace-v2")),
  );
  assert.equal(copied.properties.length, 4);
  assert.deepEqual(copied.properties[2], created);
  assert.deepEqual(
    copied.properties[3].tasks.map((t) => [t.label, t.done, t.requiresPhoto]),
    created.tasks.map((t) => [t.label, false, t.requiresPhoto]),
  );
  assert.notEqual(copied.properties[3].tasks[0].id, created.tasks[0].id);
  assert.equal(copied.properties[3].cleaningSetup.sourcePropertyId, created.id);
  await open();
  await fields("Default Cottage");
  assert(
    await page
      .getByRole("radio", { name: /Use Default Checklist/ })
      .isChecked(),
  );
  assert.equal(
    await page.getByLabel("Turnover Frequency", { exact: true }).inputValue(),
    "After Each Stay",
  );
  await page
    .getByRole("button", { name: "Save Property", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector("main").getAttribute("aria-label") ===
      "properties screen",
  );
  const defaults = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("picsyproof-workspace-v2")),
  );
  assert.deepEqual(
    defaults.properties.at(-1).tasks.map((t) => t.label),
    initial.properties[0].tasks.map((t) => t.label),
  );
  results.push(
    "Copy preserves source, resets task state and retains photo-required flags; default retains current six-task checklist; new properties appear immediately and dashboard count updates.",
  );
  await open();
  await page.getByLabel("Property Name", { exact: false }).fill("Discard test");
  await page
    .getByLabel("Select property photos", { exact: true })
    .setInputFiles(path.resolve("public/images/house.jpg"));
  await page.locator(".selected-property-photos li").waitFor();
  const discardedUrl = await page
    .locator(".cover-photo-frame>img")
    .getAttribute("src");
  await page
    .getByRole("button", { name: "Cancel and return to My Properties" })
    .click();
  await page
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector("main").getAttribute("aria-label") ===
      "properties screen",
  );
  assert(
    await page.evaluate((url) => window.__revoked.includes(url), discardedUrl),
  );
  await page.reload();
  await page.locator("main[data-ready=true]").waitFor();
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("picsyproof-workspace-v2")).properties
          .length,
    ),
    5,
  );
  assert.equal(
    await page.locator('.property-card img[src^="blob:"]').count(),
    0,
  );
  // Appearance through the established theme system, all requested dimensions.
  await page
    .getByRole("button", { name: "Open settings", exact: true })
    .click();
  await page.getByLabel("Dark", { exact: true }).check();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Properties", exact: true })
    .click();
  await open();
  await axe("Dark form");
  for (const width of [360, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      width,
    );
    if (width === 390) await snapshot("dark-390");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Back to My Properties" }).click();
  await page
    .getByRole("button", { name: "Open settings", exact: true })
    .click();
  await page.getByLabel("System", { exact: true }).check();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Properties", exact: true })
    .click();
  await open();
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForFunction(
    () => getComputedStyle(document.documentElement).colorScheme === "dark",
  );
  await page.emulateMedia({ colorScheme: "light" });
  await page.waitForFunction(
    () => getComputedStyle(document.documentElement).colorScheme === "light",
  );
  results.push(
    "Light and dark layouts passed at 360/390/430/768/1440px with no horizontal overflow; system appearance follows device changes; axe WCAG A/AA checks passed for empty light, populated custom and dark form.",
  );
  // Empty-workspace copy option is explicitly unavailable.
  const emptyContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await emptyContext.addInitScript(() =>
    localStorage.setItem(
      "picsyproof-workspace-v2",
      JSON.stringify({ properties: [], records: [] }),
    ),
  );
  const empty = await emptyContext.newPage();
  await empty.goto(base + "/#add-property");
  await empty.locator("main[data-ready=true]").waitFor();
  assert(
    await empty
      .getByRole("radio", { name: /Copy from Another Property/ })
      .isDisabled(),
  );
  await empty
    .getByText("Copy is unavailable until a property has a checklist.", {
      exact: true,
    })
    .waitFor();
  await emptyContext.close();
  assert.deepEqual(errors, []);
  results.push(
    "Cancel discards and revokes temporary photo URLs; saved metadata survives reload while photos expire; existing data remains unchanged; empty-source copy disabled; no browser runtime errors.",
  );
  fs.writeFileSync(
    "docs/qa/screen-c/results.json",
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
