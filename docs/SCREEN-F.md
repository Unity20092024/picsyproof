# Screen F — Create Turnover

Implemented on the existing `feat/approved-mobile-design` branch, starting at `7473621`. Only Screen F was added. Existing property, cleaner and report screens received the entry points and job-data wiring needed to use the new turnover records. Screen G was not started. Nothing was merged to main.

## Visual reference limitation

The request describes an attached approved Screen F screenshot, but **no Screen F image was present in the received message**. This was reported before implementation. The screen follows the written layout and the established PicsyProof design: focused flowing branded header, property photography, asymmetric cards, purple/orchid actions, shared fonts and light/dark tokens. Rendered screenshots were inspected for clipping, hierarchy, theme readability and control overlap. **Comparison against the approved Screen F screenshot remains outstanding** until that image is supplied; no pixel-match or visual approval is claimed.

## Working experience

- Create Turnover opens from the existing Turnovers Dashboard or Property Details. The property origin is preselected and Back returns to the originating screen. Dirty drafts use the existing native unsaved-changes dialog, including menu/hash navigation protection. Native beforeunload also guards refresh/closing, subject to browser policy.
- Property selection is photo-led, searchable and marks the current choice. Changing property loads its configured tasks, mandatory photo requirements, time zone and optional duration. Edited tasks or a nondefault checklist choice require confirmation before replacement. Other draft fields remain in place.
- Native date/time inputs accept real local scheduling values; the form rejects past dates/times and invalid input. A 12-hour AM/PM readout accompanies the time input.
- A property's valid IANA `timeZone`, when present, determines the UTC conversion. If absent or invalid, the form explicitly identifies the device-zone fallback and asks the host to confirm it matches the rental. There is no city-based inference. Nonexistent daylight-saving times and repeated ambiguous times are rejected with an explanation.
- Available local cleaner records are read from the workspace if provided. Otherwise, clearly labeled demonstration cleaners and Unassigned are offered. Avatars display where available; demonstration cleaners use initials. No acceptance or availability is invented.
- Default, other-property and previously created custom checklists can be selected. The existing custom task editor also supports per-job edits. Counts reflect the actual assigned tasks, including mandatory property tasks that must be retained.
- Every new job gets a separate fresh checklist snapshot, with unchecked tasks and no copied evidence. The global evidence switch requires a photo preview for every task. With it off, individually mandatory property requirements still apply; missing mandatory tasks are appended rather than silently dropped.
- Notify Cleaner saves a preference only, is disabled for Unassigned and resets when assignment is removed. The UI says notifications are coming soon. No service is called and no delivery event is recorded.
- Special instructions support multiline text with a 2,000-character limit. The adjustable duration loads an actual property estimate when available, otherwise shows a neutral placeholder. It saves positive whole minutes, up to 1,440.
- Submit uses a synchronous duplicate guard and loading/disabled state. It confirms a write through the existing browser store before showing success and returning to the Turnovers Dashboard. A failed write keeps the draft for retry.
- Upcoming jobs appear immediately in the dashboard and property history. Selecting a job opens the existing cleaner workflow with its own checklist, instructions, assignment, estimate and scheduled date/zone. Required photos block completion. Completing a job creates a separate report linked to that job without rewriting the property's old checklist progress or earlier completed reports.

## Data model and migration

The existing `picsyproof-workspace-v2` storage key remains the single workspace source. No backend or separate persistence system was introduced.

| Model         | Extension                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Workspace`   | Adds `turnovers: Turnover[]`; optional `cleaners: Cleaner[]` for local workspace records                                                                                                                                                                                                                                                                                                        |
| `Property`    | Optional `timeZone` and `estimatedDurationMinutes`; existing fields remain unchanged                                                                                                                                                                                                                                                                                                            |
| `Turnover`    | Unique ID, property ID plus name/address snapshots, UTC `scheduledAt`, local wall-clock value, IANA time zone and property/device provenance, cleaner ID/name/demo flag, scheduled/in-progress/completed status, independent checklist snapshot and source property ID, global photo requirement, notification preference, instructions, duration, device creation/update/completion timestamps |
| `RecordEntry` | Optional `turnoverId` links a new completed report to its scheduled job; old report shape stays valid                                                                                                                                                                                                                                                                                           |

Older v2 workspaces gain an empty turnover collection when loaded. Original property progress and completed records are retained as they are; no fictional scheduled jobs are synthesized from them. The existing pilot-v1 property migration remains supported. Multiple new turnovers can belong to the same property. Snapshot progress and evidence requirements belong to each job, rather than being overwritten by the next property checklist.

Persistence strips photo previews from both new job snapshots and existing report/task data, consistent with the earlier prototype. In-memory previews continue to work while navigating. A reload deliberately removes them; a pending job with a mandatory photo then cannot finish until a new preview is supplied. Completed local metadata stays completed and remains explicitly unverified.

## Components and files

| File                                  | Purpose                                                                                                                                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `components/create-turnover-form.tsx` | CreateTurnoverForm, PropertySelector, DatePicker, TimePicker, CleanerSelector, turnover ChecklistSelector, SwoopToggle, SpecialInstructionsField, DurationSelector and native selection/replace panels |
| `components/create-turnover-form.css` | Scoped Screen F cards, toggles, picker panels, instructions, duration and responsive states                                                                                                            |
| `lib/scheduling.ts`                   | Zone selection, wall-time-to-UTC conversion, DST validation, task snapshot/mandatory-requirement merging and schedule labels                                                                           |
| `lib/model.ts`                        | Backward-compatible model additions, empty-collection migration and snapshot photo stripping                                                                                                           |
| `app/page.tsx`                        | Entry points, origin/back guard, confirmed local creation/success, dashboard/history rows and existing cleaner/report integration                                                                      |
| `components/property-form.tsx`        | Generalizes the reused unsaved-changes dialog's title/description; existing property form behavior is preserved                                                                                        |
| `components/ui.tsx`                   | Shared header back action gets the appropriate Screen F accessible label                                                                                                                               |
| `tests/create-turnover.cjs`           | Full scheduling/browser/regression/visual checks                                                                                                                                                       |
| `tests/scheduling.cjs`                | Time-zone/DST and immutable snapshot domain checks                                                                                                                                                     |
| `package.json`                        | Adds `test:create-turnover` and `test:scheduling`; no dependencies added                                                                                                                               |
| `docs/qa/screen-f/`                   | Light/dark/configured mobile captures, tablet/desktop captures and results                                                                                                                             |

Reused components include **MobileHeader, SwoopCard, SwoopButton, CustomChecklistEditor, UnsavedChangesDialog, TurnoverChecklist, PhotoUploader, ProgressIndicator, StatusBadge and EvidenceReport**. There is no normal bottom navigation on this focused form; it cannot cover the submit button. The existing safe-area tokens and viewport configuration are retained.

## Verification

- `npm run build`: passed, Next.js 15.5.29. Static generation and TypeScript validation succeeded; route first-load JavaScript approximately 125 kB.
- `npm run typecheck`: passed.
- `npm run test:scheduling`: passed. UTC conversions in Los Angeles (winter/summer), Tokyo, London and Kathmandu; DST gaps/repeated hours; invalid dates/times; explicit device/invalid-zone fallback; immutable fresh tasks and mandatory-photo merging.
- `npm run test:create-turnover`: passed against the production server. Covers both entry points, preselection/origin return, search/change/confirmation, date/time and validation, demo cleaner/removal/Unassigned, alternative/custom tasks, photo and notification preferences, instructions, duration, failed storage/retry, duplicate-submit protection, real persistence, dashboard/property history, two independent jobs for one property, source-default edits after scheduling, missing-photo completion gate, completed report preservation, reload/photo expiry, empty workspace and device-zone disclosure.
- Browser layout checks passed at **360, 390, 430, 768 and 1440px**, in light and dark mode, with no horizontal overflow. System appearance follows device changes. The native menu is accessible above the hero photo. The form scrolls normally and has no bottom bar.
- WCAG A/AA axe scans passed for the empty form, configured form, dark form and property-selector dialog. No browser runtime errors occurred in the Screen F suite. These automated checks are not a complete accessibility audit.
- `npm run test:ui`: passed for the existing property/checklist/completion/report/PDF/theme/legacy migration flows.
- `npm run test:property-form`: passed for the previously delivered Screen C after the shared dialog/header changes.

Screenshots: [390px light](qa/screen-f/light-390.png), [360px](qa/screen-f/light-360.png), [430px](qa/screen-f/light-430.png), [390px dark](qa/screen-f/dark-390.png), [configured form](qa/screen-f/configured-390.png), [tablet](qa/screen-f/light-768.png), [desktop](qa/screen-f/light-1440.png). Machine results: [results.json](qa/screen-f/results.json).

## Limitations and remaining backend work

All records and assignments are local to this browser. There is no authenticated cleaner acceptance, cross-device assignment, notification delivery, permanent photo upload or verified evidence. Device-generated timestamps and local storage can be edited. Existing properties do not have time zones configured by default; fallback disclosure is therefore material. When a valid zone is provided, conversion is supported; ambiguous repeated times require choosing outside the repeated hour. Physical phone cameras, virtual keyboards, real iOS/Android safe areas and operating-system picker UI remain untested in this desktop Chromium environment. The missing approved Screen F image prevents reference comparison.

Production needs authenticated workspace/property permissions, authoritative scheduling and timestamps, reliable notification delivery, private photo storage, durable reports and server-side evidence validation. No recurring jobs, payment processing, AI estimates or Airbnb integration were added.

## Run

`npm ci`, `npm run build`, `npm start`. With the app running: `npm run test:create-turnover`. Pure domain checks: `npm run test:scheduling`. Existing regression checks: `npm run test:ui` and `npm run test:property-form`. Browser scripts default to `/usr/bin/chromium` and `http://localhost:3000`; override with `CHROMIUM_PATH` and `BASE_URL` if needed.
