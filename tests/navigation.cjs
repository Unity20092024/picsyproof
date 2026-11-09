const { chromium } = require("playwright");
const fs = require("node:fs");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    colorScheme: "light",
  });
  const base = process.env.BASE_URL || "http://localhost:3000";
  const results = [];
  await page.goto(base);
  await page.locator("main[data-ready=true]").waitFor();
  await page.evaluate(() => document.fonts.ready);
  // A real scrolling dashboard with twelve local sample properties, in this isolated test browser.
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("picsyproof-workspace-v2"));
    const original = data.properties[0];
    data.properties = Array.from({ length: 12 }, (_, i) => ({
      ...original,
      id: "nav-test-" + i,
      name: "Sample Property " + (i + 1),
    }));
    localStorage.setItem("picsyproof-workspace-v2", JSON.stringify(data));
  });
  await page.reload();
  await page.locator("main[data-ready=true]").waitFor();
  await page.evaluate(() => document.fonts.ready);
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const inset of [0, 34]) {
      // Desktop Chromium reports zero hardware inset. 34px explicitly simulates a phone home indicator.
      await page.evaluate(
        (value) =>
          document.documentElement.style.setProperty(
            "--mobile-safe-bottom",
            value + "px",
          ),
        inset,
      );
      let initialTop;
      for (const point of ["top", "middle", "bottom"]) {
        await page.evaluate((p) => {
          const max = document.documentElement.scrollHeight - innerHeight;
          window.scrollTo({
            top: p === "top" ? 0 : p === "middle" ? max / 2 : max,
            behavior: "instant",
          });
        }, point);
        const metrics = await page.evaluate(() => {
          const nav = document.querySelector(".bottom-nav"),
            n = nav.getBoundingClientRect(),
            camera = document
              .querySelector(".camera-nav")
              .getBoundingClientRect();
          let parent = nav.parentElement;
          const ancestors = [];
          while (parent) {
            const s = getComputedStyle(parent);
            ancestors.push({
              tag: parent.tagName,
              class: parent.className,
              transform: s.transform,
              filter: s.filter,
              backdropFilter: s.backdropFilter,
              perspective: s.perspective,
              contain: s.contain,
              willChange: s.willChange,
            });
            parent = parent.parentElement;
          }
          return {
            scrollY,
            viewportHeight: innerHeight,
            documentHeight: document.documentElement.scrollHeight,
            position: getComputedStyle(nav).position,
            nav: { top: n.top, bottom: n.bottom, height: n.height },
            camera: { top: camera.top, bottom: camera.bottom },
            footerBottom: document
              .querySelector(".app-footer")
              .getBoundingClientRect().bottom,
            padding: parseFloat(
              getComputedStyle(document.querySelector("main")).paddingBottom,
            ),
            links: [...nav.querySelectorAll("a")].map((a) => {
              const r = a.getBoundingClientRect();
              return {
                label: a.getAttribute("aria-label"),
                left: r.left,
                right: r.right,
                top: r.top,
                bottom: r.bottom,
                width: r.width,
                height: r.height,
              };
            }),
            ancestors,
          };
        });
        assert.equal(metrics.position, "fixed");
        assert.equal(metrics.nav.bottom, 844);
        assert(metrics.documentHeight > 2500, "Must exercise a tall document");
        assert(metrics.camera.top < metrics.nav.top, "Camera stays elevated");
        if (initialTop === undefined) initialTop = metrics.nav.top;
        assert.equal(
          metrics.nav.top,
          initialTop,
          "Navigation must not move with document scrolling",
        );
        assert.equal(metrics.links.length, 5);
        for (const link of metrics.links) {
          assert(link.width >= 44 && link.height >= 44, "44px touch targets");
          assert(link.left >= 0 && link.right <= width);
          assert(
            link.top >= 0 && link.bottom <= 844 - inset,
            "All actions above the home indicator",
          );
        }
        for (const a of metrics.ancestors) {
          assert.equal(a.transform, "none");
          assert.equal(a.filter, "none");
          assert.equal(a.backdropFilter, "none");
          assert.equal(a.perspective, "none");
          assert.equal(a.contain, "none");
          assert.equal(a.willChange, "auto");
        }
        assert(
          metrics.padding >= metrics.nav.height + 22 + 16,
          "Content clears the raised camera as well as the bar",
        );
        if (point === "bottom")
          assert(
            metrics.footerBottom < metrics.camera.top,
            "Footer scrolls fully above the camera and bar",
          );
        results.push({ width, inset, point, ...metrics });
        if (point === "middle" && inset === 0)
          await page.screenshot({
            path: `docs/qa/navigation-${width}-scrolled-viewport.png`,
          });
      }
      if (inset === 0) {
        await page.screenshot({
          path: `docs/qa/navigation-${width}-bottom.png`,
        });
        await page.evaluate(() =>
          window.scrollTo({ top: 0, behavior: "instant" }),
        );
        await page.screenshot({
          path: `docs/qa/navigation-${width}-viewport.png`,
        });
        await page.screenshot({
          path: `docs/qa/navigation-${width}-fullpage.png`,
          fullPage: true,
        });
      }
    }
    await page.evaluate(() =>
      document.documentElement.style.removeProperty("--mobile-safe-bottom"),
    );
    // Exercise every button after scrolling, without changing its appearance or layout.
    for (const [label, view] of [
      ["Properties", "properties"],
      ["Camera: choose a turnover and upload photos", "cleaner"],
      ["Turnovers", "turnovers"],
      ["Reports", "reports"],
      ["Home", "home"],
    ]) {
      await page.evaluate(() =>
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: "instant",
        }),
      );
      await page
        .getByRole("navigation", { name: "Mobile navigation" })
        .getByRole("link", { name: label, exact: true })
        .click();
      await page.waitForFunction(
        (v) =>
          document.querySelector("main").getAttribute("aria-label") ===
          v + " screen",
        view,
      );
    }
    console.log(
      `${width}px: fixed at top/middle/bottom; safe insets 0 and simulated 34px; five accessible working buttons; footer clears raised camera.`,
    );
  }
  fs.writeFileSync(
    "docs/qa/navigation-metrics.json",
    JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2),
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
