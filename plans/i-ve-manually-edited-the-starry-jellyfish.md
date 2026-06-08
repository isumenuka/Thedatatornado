# Scroll Narrative Redesign — Sections 2–5 (Landing Page Untouched)

## Context

The landing/hero section (Section 1: video background, year slider, severity badge, share modal, live CO₂ ticker, data panel) is locked — do NOT touch it.

The user shared an inspiration spec (`src/imports/pasted_text/project-setup.md`) describing a Natural History Museum / Paleontology site built with React + Motion. They want that motion language and scroll-narrative structure — staggered letter reveals, large display typography, `whileInView` cascades, a sticky chapter pattern, and SVG-filter sand-dissolve transitions — ported into the sections **below** the landing (currently Sections 2–5 in `src/app/components/data-tornado.tsx`, lines ~1832–2085).

The current Sections 2–5 are all functionally identical: a `ScrollFadeIn` wrapper with staggered delays, a 2-column grid (text + chart stat card), and a chart component. It's repetitive and lacks the cinematic feel of the NHM reference. The Data Tornado aesthetic stays dark/sci-fi (no off-white `#fcfcfc` swap) — we're borrowing **motion + structure**, not the museum palette.

Intended outcome: scrolling past the hero feels like entering an unfolding climate-museum exhibit, with each section having its own entrance choreography, a sticky multi-chapter exploration block replacing the flat Section 5, and a closing footer that gives the page a real ending.

## Files to modify

- `src/app/components/data-tornado.tsx` — only the JSX from the `</section>` closing the hero (~line 1830) to the end of the component. Sections 2–5 and the missing footer.
- `src/styles/theme.css` (or whichever global stylesheet holds utility classes) — add a `.text-mega` utility (21vw display sizing, line-height 0.75, letter-spacing -0.04em) adapted to the dark theme.

No other files.

## Reuse before building

- **`ScrollFadeIn`** (data-tornado.tsx:718) — already an IntersectionObserver-based fade-up. Keep it for body copy. Don't reimplement.
- **`CO2Chart`, `AnomalyChart`, `LocalTempChart`** — keep their internals as-is; just rewrap them.
- **`CLIMATE_DATA`** (`climateData.ts`) — already has `tornado_color`, `severity`, `weave_prompt` per year. Use it to drive the new "Chapter" exhibit (see Section 5 below) instead of inventing new fixtures.
- **`SEVERITY_COLORS`** map (data-tornado.tsx:24) — reuse for accent colors in the chapter list.
- **`motion`** — install only if not already in `package.json`. Check first; the inspiration uses `motion/react`. If absent, install via `pnpm add motion`. (Note: this is a plan-only document, no install yet.)
- **`TICK_YEARS`** — already used for chart axes; reuse for the chapter-counter "01 / 05" pattern.

## Design — new section choreography

### Shared primitives (add near the top of data-tornado.tsx, after existing helpers)

1. **`LetterReveal`** — wraps a string, splits into spans, applies the inspiration's `letterBlock` variant (`y: 120 → 0`, `duration: 1.2`, `ease: [0.16, 1, 0.3, 1]`) with `staggerChildren: 0.06`. Used for section headings only.
2. **`SectionNumber`** — renders "01" / "02" etc. with a thin horizontal rule beside it (mirrors the NHM "01" indicator). Mono, 10–11px, `tracking-[0.2em]`.
3. **`SandTransitionImage`** — port the SVG-filter dissolve from the inspiration verbatim (feTurbulence + feDisplacementMap + feOffset + feGaussianBlur + feColorMatrix, 900ms RAF loop, unique filter id per instance). Used in the new chapter exhibit (Section 5).

### Section 2: THE CARBON TRAJECTORY (rebuild)

- Replace the flat 2-column with a **full-bleed display intro**: `text-mega` utility renders "CARBON" at top, "TRAJECTORY" below, both with `LetterReveal`. Subtitle "// 02 — ATMOSPHERIC CO₂" sits beside the mega text in mono.
- Below the mega type, the existing `CO2Chart` is preserved but wrapped in a `motion.div` with `whileInView` `y: 40 → 0, opacity: 0 → 1, once: true, margin: -100px`.
- Right rail: vertical stat strip ("+34.4%", "1959 → 2024", "ppm/yr trend") instead of one card. Each row uses `fadeUp` staggered by 100ms.

### Section 3: GLOBAL ANOMALY INDEX (rebuild)

- **Horizontal split-scroll**: heading on left as `LetterReveal`, `AnomalyChart` enters from the right with `x: 80 → 0` instead of `y: 40 → 0` to differentiate it from Section 2.
- Add a faint vertical `h-px → w-px` divider rule between text and chart (inspiration's `h-[1px] bg-gray-800` adapted to `bg-white/10`).

### Section 4: CENTRAL PARK LOCAL TRENDS (rebuild)

- **Full-width chart on top, text annotations below** — invert the current order so the eye lands on the data first.
- Heading appears as a quiet `fadeUp` (no LetterReveal here; we don't want every section shouting).
- Add a small "circle + pause-lines" scroll affordance (inspiration's 1G) at the bottom right with text "CONTINUE TELEMETRY" to bridge into Section 5.

### Section 5: CLIMATE CHAPTERS (NEW — replaces the WorkflowTimeline block)

This is the centerpiece port of the NHM Section 3 chapter pattern.

- Dark panel (`bg-[#0a0a0a]`) with an overlapping decorative element absolutely positioned at the top (the tornado SVG / a still frame from `0607.mp4` can serve the role of the pterodactyl). Animate with `whileInView` `y: "-65%" → "-78%"`, `duration: 1.4`.
- Two-column body: left 35% shows the **active chapter's representative image / decade still** via `SandTransitionImage` with `AnimatePresence mode="wait"`. Bottom of the left column shows a "01 / 05" counter where the numeral slides vertically when the chapter changes.
- Right 65%: a clickable list of five "chapters" derived from `CLIMATE_DATA` decade buckets:
  - 1960s — The Quiet Baseline
  - 1970s — First Signals
  - 1980s–90s — Acceleration
  - 2000s — The Hot Decade
  - 2010s–2024 — Vortex Era
- Active chapter row uses `text-white`, inactive `text-[#444] hover:text-[#999]`. Active row reveals an `ArrowUpRight` icon. Auto-cycles every 3500ms via `setInterval` mod 5 (matches the inspiration's `activeChapter` behavior), pauses on hover.
- Each chapter row's accent color is pulled from `SEVERITY_COLORS` so the dark museum theme still belongs to The Data Tornado.

### New closing footer

- `h-px bg-white/10` divider, then a row with "DIGGING INTO THE CLIMATE RECORD" on the left and "THE DATA TORNADO © 2026" on the right — mono, 10px, `tracking-widest`, `text-[#888897]`. Mirrors the inspiration's Section 3D footer.

## Animation conventions

- Letter reveals: `[0.16, 1, 0.3, 1]` cubic bezier, 1.2s — only on section headings.
- `whileInView` triggers: `once: true`, `margin: "-100px"` so reveals fire slightly before the section is fully in frame.
- Stagger delays cap at 450ms total per section — don't out-stagger the existing landing-page rhythm.
- All scroll animations are GPU-friendly (transform + opacity only). Avoid animating `top`/`height`.

## What stays exactly the same

- Section 1 (hero) and everything inside it: `VideoBackground`, `DataPanel`, `RadarSeverityHUD`, `MinimalSliderPanel`, `ShareCard`, `LiveCO2Ticker`, `VignetteGlow`, warning vignette overlay.
- The chart components themselves (`CO2Chart`, `AnomalyChart`, `LocalTempChart`) — only their wrappers change.
- `SEVERITY_COLORS`, `CLIMATE_DATA`, slider logic, severity math.

## Verification

1. Open the running dev preview (Vite is already serving — do NOT start it manually).
2. Confirm Section 1 is byte-identical visually: year slider scrubs the video, severity badge cycles, live CO₂ ticker shows ppm, share modal opens.
3. Scroll down. Each new section heading should animate in with the letter-block reveal (visible per-character lift). Scroll back up, scroll down again — `once: true` means the reveal should *not* replay.
4. In Section 5, watch the chapter list auto-cycle every ~3.5s. Hover a row → cycling pauses, row highlights. Click a row → sand-dissolve transition runs on the left image (~900ms).
5. Resize to mobile width: chapter list stacks, mega type clamps via `vw` units without horizontal scroll.
6. Lighthouse/devtools Performance recording during scroll: animations should stay on the compositor (no layout thrash from animating non-transform properties).
7. Confirm the new closing footer renders below Section 5 and the page no longer ends abruptly.
