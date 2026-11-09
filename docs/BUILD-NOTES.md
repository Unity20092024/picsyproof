# PicsyProof frontend delivery

## Repository inspection

- `main` at `e41c8ac` contained only the introductory README.
- `feat/pilot-prototype` at `5f017c5` contained the working Next.js 15 / React 19 / TypeScript prototype, local property management, six-task checklists, image previews, printable reports and system/light/dark controls.
- Development branch: `feat/approved-mobile-design`, based on the pilot branch. Existing pilot history and workflows were retained. No merge to `main` was performed.
- Important original limitations: no authentication/backend/storage, browser-generated timestamps, session-only photos, no historical turnover snapshots, and stacked CSS overrides. These constraints informed the implementation.

## Delivered

The supplied mobile screenshot informed the lavender/off-white palette, purple camera branding, flowing header edge, serif/italic headline, photo-led horizontal property cards, asymmetric statistic cards and sculpted gradient actions. This design is extended to all frontend screens rather than using a dashboard template. Stock interior photos are illustrative substitutes for the screenshot's unavailable original image assets.

Screens: host dashboard and recent activity, property list and native add-property dialog, property detail and requirements, cleaner checklist and photo workflow, current/completed turnovers, draft/completed evidence reports with print/PDF, and local workspace/theme settings.

Counts derive from local data. Sample properties are labeled. Starting another turnover preserves the completed checklist as a local history snapshot. Existing pilot data migrates into the new versioned store while leaving the original key intact. Photo replacement/removal and legacy cleaner preview links remain functional.

## Files

| Files                                      | Purpose                                                                                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/page.tsx`                             | Screen composition, navigation, local persistence/migration, property creation, completion/history workflow and dialog                                                          |
| `components/ui.tsx`                        | SwoopCard, SwoopButton, PropertyCard, StatCard, MobileHeader, BottomNavigation, PhotoUploader, TurnoverChecklist, ProgressIndicator, StatusBadge, ThemeSwitcher, EvidenceReport |
| `lib/model.ts`                             | Typed domain model, sample data, validated store loading, legacy migration and photo-free persisted metadata                                                                    |
| `app/globals.css`                          | Consolidated responsive design system, theme tokens, curves, focus/reduced-motion rules, print layout and safe-area spacing                                                     |
| `app/layout.tsx`                           | Metadata, viewport-fit cover, theme-color and pre-paint theme preference script                                                                                                 |
| `app/studio.css`, `app/theme.css`          | Removed redundant former style layers; their functionality is consolidated in globals.css                                                                                       |
| `public/fonts/`                            | Self-hosted DM Sans / DM Serif Display and license notices                                                                                                                      |
| `public/images/`                           | Two illustrative stock property images and source notes                                                                                                                         |
| `package.json`, `package-lock.json`        | Reproducible dependency tree, development-only QA tools, scripts and compatible PostCSS patch override                                                                          |
| `tests/verify.cjs`, `tests/navigation.cjs` | Repeatable workflow, accessibility, theme, migration and fixed-navigation regression checks                                                                                     |
| `docs/qa/`                                 | Browser screenshots, PDF sample and machine-readable measurements/results                                                                                                       |
| `README.md`, `docs/NAVIGATION-QA.md`       | Run instructions, prototype limitations and positioning diagnosis                                                                                                               |
| `next-env.d.ts`                            | Next.js-generated type references                                                                                                                                               |

## Verification results

Production build: **passed**, Next.js 15.5.29, static page generation and TypeScript validation. Home route first-load JavaScript approximately **113 kB**, app route approximately **9.87 kB**. `npm run typecheck` and `git diff --check` passed. `npm audit --omit=dev --audit-level=high` reported **zero vulnerabilities** after overriding PostCSS to the compatible patched 8.5.x release; no Next.js major upgrade was introduced.

`npm run test:ui`: **passed** against the production server in Chromium.

- All seven screen states tested for horizontal overflow at **360, 390, 430, 768 and 1440px**, in both light and dark mode.
- Form submission, property navigation, checklist gating/progress, image upload/remove/replace, completion, report preview, browser PDF rendering, next-turnover reset and retained history.
- Reload persistence and deliberate photo expiry, old pilot custom-task migration, completion archiving, workspace-name save, menu navigation and native dialog Escape behavior.
- Light and dark overrides, preference persistence and System reacting to live device color-scheme changes.
- WCAG A/AA axe scans: light dashboard, cleaner checklist, completed report, dark settings and dark dashboard — **zero reported violations**. This does not constitute a full accessibility audit.
- **No browser runtime errors** during the tested flow.

`npm run test:navigation`: **passed**. At each of 360, 390 and 430px, a twelve-property page taller than 2500px was scrolled to top/middle/bottom with normal and simulated 34px bottom safe areas. The bar stayed fixed, camera stayed elevated, all five actions remained accessible and functional, and the footer could scroll completely above the camera/bar. See the [detailed diagnosis](NAVIGATION-QA.md).

Visual review: inspected rendered 360, 390, 430, tablet, desktop, dark and cleaner captures against the supplied screenshot's visual direction. Viewport and full-page captures show why fixed navigation appears across the middle of an exported tall image. Full-page captures intentionally preserve real fixed-position behavior.

## Remaining limitations and backend work

- Tests ran in desktop Chromium with mobile viewport sizes. Physical iOS/Android browser chrome, actual camera hardware, keyboard resizing and hardware safe areas have not been tested. The 34px safe area is an explicit simulation.
- Photos remain browser-memory previews and are lost on reload; local metadata/history can be modified by the user. Times and reports are unverified. The UI and exported reports disclose this.
- Secure accounts/profile editing, workspace memberships, authorization, private persistent uploads, server-generated timestamps, audit logs, durable reports, retention/deletion policies and secure cross-device cleaner invitations remain backend work.
- Printing opens the browser Print / Save PDF workflow. The automated check generated a real PDF with Chromium; interacting with an operating system print dialog was not automated.
- The prototype uses hash navigation within the existing single-page app. Property/report selection persists locally; cleaner preview links do not transfer data to another device.

## Running

`npm ci`, then `npm run dev`. Production: `npm run build`, then `npm start`. UI tests require Chromium and a running app. See the root README for environment overrides and exact commands.
