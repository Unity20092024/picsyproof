# Screen C — Add New Property

This milestone implements **only Add New Property**. It replaces the former small add-property dialog on the existing `feat/approved-mobile-design` branch. Existing screens remain in place; no Screen D work was started. A successful save returns to the existing property list.

## Implementation

The approved Screen C screenshot guided the focused back/logo/menu header, integrated exterior photograph, asymmetric photo frames, curved detail fields, three cleaning-plan choices, frequency row and sculpted purple Save Property action. It reuses the established theme tokens, DM Sans / display typography, SVG header, SwoopCard and SwoopButton. Stock house/kitchen photos illustrate the layout rather than representing uploaded customer images.

- Home and property-list Add Property actions open `#add-property` through the existing hash navigation.
- Required name, manual address and property type, optional Other description, bedrooms 0–20, bathrooms 0–20 in half increments, and guest count 1–100. Values are trimmed when saved. Validation stays beside the affected controls, preserves inputs and prevents invalid records.
- Multiple JPEG/PNG/WebP originals, maximum 10 MB each and 12 photos. No compression or canvas processing. Readable-image validation, immediate blob-URL previews, cover selection, reorder arrows, removal, and separate native camera picker with `capture="environment"`.
- The initial gallery uses labeled illustrations. After selection, empty supporting slots become add-photo controls; stock images are not counted as selected files.
- Default retains the current six-task checklist. Copy clones labels and photo-required flags into fresh unchecked tasks without copying evidence or altering the source. Custom supports add/edit/remove/reorder and photo-required flags. Empty or unnamed checklists cannot save.
- Frequency defaults to After Each Stay, offers the requested alternatives and a required description for Custom. It stores a preference without creating jobs.
- Save locks against repeated submissions, shows a loading state, and first confirms a write to the existing `picsyproof-workspace-v2` localStorage record. Storage errors preserve the form and photo previews for retry. The successful record immediately updates the property list and dashboard count.
- Unsaved-change protection covers back, cancel, menu and browser hash/back navigation. Keep editing retains all in-memory sections; Discard returns to the requested existing screen. A standard beforeunload guard also covers refresh/closing the tab. Enter in text fields does not submit.
- Selected photo object URLs are revoked on removal, rejected image decoding and discarded form cleanup. On save their ownership transfers to the existing workspace session; they remain usable while navigating and are released when the app unmounts. Persisted records omit gallery blobs and blob cover URLs, so reload does not leave broken preview links.
- Existing task photos, records and source properties are retained. The existing cleaner completion gate honors the newly configured required-photo flags, and starting another turnover preserves those flags. No other screen was expanded or redesigned.

## Files and components

| File                                                   | Change                                                                                                                                                                                         |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/property-form.tsx`                         | PropertyForm, PropertyPhotoUploader, SwoopInput, SwoopSelect, CleaningSetupCard, ChecklistSelector, CustomChecklistEditor, TurnoverFrequencySelect, UnsavedChangesDialog and custom broom icon |
| `components/property-form.css`                         | Scoped Screen C layout, photo framing, form states, selection styling and responsive/dark support through shared tokens                                                                        |
| `app/page.tsx`                                         | Replace add dialog with Screen C, route/unsaved guards, verified local write, in-session gallery ownership, and minimal required-photo workflow wiring                                         |
| `components/ui.tsx`                                    | Reuse MobileHeader with optional back action, prevent native anchor navigation from bypassing the guard, display configured photo requirements in the existing checklist                       |
| `lib/model.ts`                                         | Backward-compatible optional property details, photo/checklist settings and required-photo flag; strip temporary property photo URLs from persisted data                                       |
| `tests/property-form.cjs`                              | Screen C browser, layout, persistence, failure-recovery, accessibility and photo tests                                                                                                         |
| `tests/verify.cjs`                                     | Update the former dialog steps to enter/save through Screen C; preserve existing workflow regression coverage                                                                                  |
| `package.json`                                         | Add `test:property-form`; no new dependencies                                                                                                                                                  |
| `public/images/house.jpg`, `public/images/kitchen.jpg` | Self-hosted illustrative images and attribution update                                                                                                                                         |
| `docs/qa/screen-c/`                                    | Mobile, tablet, desktop, dark and populated form screenshots; machine-readable results                                                                                                         |

## Verification

Production build and TypeScript validation passed on Next.js 15.5.29. `npm run test:property-form` exercises:

1. Home and Properties entry points; back returns to Properties; required, blank, numeric and custom-field validation prevents invalid saves.
2. Bedrooms 0, bathrooms 1.5, guest count and Other description; repeated form submission creates exactly one stable-ID record.
3. Multi-photo preview, cover changes, reorder and removal; unsupported, oversized and unreadable-image errors; native camera file-picker wiring.
4. Custom tasks, photo-required flags, copy source isolation, current default tasks, and custom cleaning preference.
5. Retained form state through checklist mode changes and canceled navigation; browser Back and menu warnings; explicit discard and URL revocation.
6. Simulated unavailable/full local storage: meaningful error, no lost fields/photos, and successful retry.
7. New properties immediately in the existing list and updated dashboard count; persisted metadata survives reload while selected photos intentionally expire.
8. All requested viewport widths: **360, 390, 430, 768 and 1440px**, in light and dark. No horizontal overflow; gallery/controls/fields have explicit non-overlap assertions. Screen C has no bottom navigation to cover Save.
9. System appearance responds to device theme changes. WCAG A/AA axe checks pass on empty light, populated custom and dark form states; no browser runtime errors.
10. Required-photo setup is honored by the existing turnover completion gate. Existing turnover, report, PDF, theme and legacy-migration regression suite passes via `npm run test:ui`.

Rendered mobile, dark, tablet and desktop captures were inspected against the supplied reference. The original composite screenshot's source photographs were not provided separately, so equivalent illustrative stock photography is used.

## Screenshots

- [390px light](qa/screen-c/light-390.png)
- [360px light](qa/screen-c/light-360.png)
- [430px light](qa/screen-c/light-430.png)
- [390px dark](qa/screen-c/dark-390.png)
- [Selected photos and custom checklist](qa/screen-c/custom-photos-390.png)
- [Tablet](qa/screen-c/light-768.png), [desktop](qa/screen-c/light-1440.png)
- [Browser results](qa/screen-c/results.json)

## Limitations

Storage is local to this browser, not secure cloud persistence. Gallery photos and task-photo previews expire on reload; no permanent upload or evidence verification is claimed. File-picker integration was tested in Chromium, including the environment-camera capture attribute; physical phone cameras, virtual keyboards and real iOS/Android safe areas remain untested. Standard beforeunload prompts depend on browser policy; in-app dirty-navigation dialogs were tested directly. Existing local metadata has no authenticated access controls or server timestamps. No scheduling, address API, backend, cloud storage or new persistence system was introduced.

## Run

`npm ci`, `npm run build`, then `npm start`. With the app running: `npm run test:property-form` and `npm run test:ui`. Tests use `/usr/bin/chromium` by default; `CHROMIUM_PATH` and `BASE_URL` can override it.
