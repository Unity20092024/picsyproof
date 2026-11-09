# Mobile navigation diagnosis

The navigation in the middle of a full-page image is a **capture artifact**, not document-relative positioning. A full-page screenshot includes content below the current viewport while a fixed bar is rendered at the viewport's position within the captured image. It can therefore appear across property cards halfway down a long exported image.

Before the spacing update, at widths 360, 390 and 430px with an 844px-high viewport, the bar's bounding rectangle was consistently **top 766px, bottom 844px**, at the top, middle and bottom of document scrolling. Its `position` was `fixed`. Every ancestor (`.app-shell`, `body`, `html`) had `transform: none`, `filter: none`, `perspective: none`, `contain: none` and no `will-change` hint. The footer could be scrolled entirely above the bar.

## Change

Preserved the approved swoop shape, purple gradient selection and elevated camera. Navigation remains a sibling of `main`, fixed to the viewport bottom. Added a shared `--mobile-safe-bottom: env(safe-area-inset-bottom, 0px)` token used by both navigation padding and main content clearance. Main content now reserves **130px plus the safe-area inset**. This covers the bar, the camera protrusion and extra breathing room, including phones with a bottom home indicator. No transformed or filtered wrapper was added.

## Regression checks

`npm run test:navigation` exercises an actual twelve-property dashboard taller than 2500px, at 360, 390 and 430px widths and 844px height:

- Measures navigation at top, middle and end of document scrolling; its bottom must stay at 844px and its top must stay constant.
- Checks all fixed-position ancestors for transforms, filters, perspective and containment.
- Checks every navigation target is at least 44×44px, within horizontal viewport bounds, above the bottom home indicator, and functional after scrolling.
- Confirms the camera stays above the bar and the entire footer scrolls above both.
- Runs with normal 0px inset and an explicitly simulated 34px inset. Desktop Chromium cannot reproduce an actual phone's hardware safe-area environment; physical iOS/Android verification remains outstanding.
- Captures normal viewport, scrolled viewport, end-of-page viewport and full-page screenshots at each width. Full-page images intentionally retain the fixed bar in its viewport position; the application does not switch the bar to absolute/static positioning for screenshots.

Compare [390px visible viewport](qa/navigation-390-viewport.png), [scrolled viewport](qa/navigation-390-scrolled-viewport.png), [bottom of page](qa/navigation-390-bottom.png), and [full page](qa/navigation-390-fullpage.png). Machine measurements are in [navigation-metrics.json](qa/navigation-metrics.json).
