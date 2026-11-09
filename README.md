# PicsyProof

A mobile-first Next.js 15 / React 19 / TypeScript prototype for rental turnover checklists and local photo previews. Built on the existing `feat/pilot-prototype` application; `main` originally contained only this repository's introductory README.

```bash
npm ci
npm run dev
```

Open http://localhost:3000. For production: `npm run build && npm start`.

## Included

- Screenshot-led lavender and purple design, SVG flowing header, asymmetric photo cards and gradient swoop actions.
- Host dashboard, properties/add-property dialog, property detail and requirements, cleaner checklist, turnover history, printable draft/completed reports, settings.
- Native camera/file picker, validated JPEG/PNG/WebP previews up to 5 MB, replacement/removal, checklist completion gate, immutable local history snapshots when starting another turnover.
- System / Light / Dark appearance, saved locally with a pre-paint theme script. Self-hosted DM Sans and DM Serif Display fonts.
- Keyboard controls, native modal focus management, reduced-motion support, safe-area-aware fixed navigation and content clearance.
- Migration of the original `picsyproof-pilot-v1` checklist/property data to `picsyproof-workspace-v2` without changing the original stored data.

## Prototype boundaries

This is a **local demo**, not a secure production evidence platform. Included properties and interior photos are explicitly illustrative. Counters derive from the current data; the initial workspace has two sample properties and zero completed turnovers/photos.

Properties, tasks, completion metadata, history and settings persist in this browser's localStorage. Photos stay in memory, including history snapshots, and disappear on reload. Completion times come from the user's device and are unverified. PDF export uses the browser's Print / Save PDF dialog. Cleaner links open a local preview; they do not share data or grant access across devices.

Backend work remaining: authentication and profiles, workspace/property permissions, secure cleaner invitations, private persistent photo storage, server timestamps, append-only audit events, permanent reports, upload validation and retention/deletion policies. No payments, Airbnb integration or AI features are connected.

## Validation

```bash
npm run typecheck
npm run build
# In another terminal, start the app first:
npm start
npm run test:ui
npm run test:navigation
```

Browser tests use installed Chromium at `/usr/bin/chromium`. Set `CHROMIUM_PATH` for another installation and `BASE_URL` for a different app address. Test dependencies are development-only. Tests use isolated local browser contexts.

See [QA and delivery notes](docs/BUILD-NOTES.md), [mobile navigation diagnosis](docs/NAVIGATION-QA.md), and [screenshots](docs/qa/).
