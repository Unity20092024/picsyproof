# PicsyProof pilot prototype

Mobile-first sample workflow for short-term rental hosts and cleaning operators.

## What's included
- Host dashboard with multiple editable sample properties
- Add property modal
- Interactive cleaner checklist
- Local photo preview per task (JPEG, PNG, WebP; up to 5 MB)
- Completion state and printable report / Save as PDF
- Mobile-responsive purple-and-white UI
- Browser-local demo checklist data

## Run locally

```bash
npm install
npm run dev
```

Visit http://localhost:3000.

## Important: prototype limitations
- There is no Supabase integration, authentication, storage bucket, real cleaner invitation or production permission system yet.
- Property and checkbox data save only in the current browser's localStorage.
- Attached photos live in browser memory and are lost on reload. Print the report while photos are still displayed.
- "Copy demo link" does **not** transfer property data to another device; it is a UI preview only.
- Timestamps are browser-generated and not tamper-proof.
- Do not use this prototype for actual property disputes, insurance or legal evidence.

## Pilot validation (before building a paid product)
Show the cleaner checklist to five independent hosts or cleaning operators. Ask them to complete a test turnover on a phone, describe the missing features and say whether they'd pay for recurring photo evidence. Record commitments, not just positive comments.

## Next production milestone
Supabase Auth for hosts, per-property permissions, server-created single-use or expiring cleaner invitation tokens, securely scoped photo uploads, immutable server-side event logs, permanent downloadable reports, required-photo enforcement, deletion/retention controls, and tests. Do not deploy for real customer records until implemented.
