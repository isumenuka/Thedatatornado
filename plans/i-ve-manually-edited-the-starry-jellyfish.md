# Addendum 5 — Kill the Empty Canvas Under the Tornado

## Context

The "Measuring the vortex" section (`FujitaScale` in `src/app/components/data-tornado.tsx:1888`) still shows ~120vh of empty black canvas after the EF5 climax and handoff callout. The cause is a mismatch between the section's reserved scroll length and the actual content inside it:

- The wrapping `<section>` is `min-h-[500vh]` (data-tornado.tsx:1888).
- Inside it, the natural content totals only ~370–380vh:
  - Header block (`pt-24 md:pt-32` + heading + `mb-16`) ≈ 30–40vh
  - Grid stepper (`lg:min-h-[330vh]`, data-tornado.tsx:1909) = 330vh
  - Hand-off callout (`mt-4 pt-4 mb-6`) ≈ 8–12vh
- The extra ~120vh of `min-h` past the last content row renders as dark empty space the user has to scroll through after EF5 finishes and the handoff disappears, before Section 6 ("Curated from sixty-five years…") begins.

Intended outcome: as soon as the stepper completes EF5 and the "Your climate is currently at EF5 — keep scrolling" line passes, the next section begins immediately — no dark gap.

## File to modify

- `src/app/components/data-tornado.tsx` — only the `<section>` opening tag at line 1888 (inside the selected `<FujitaScale />`).

## Change

Drop the `min-h-[500vh]` utility from the section so it sizes to its actual content. The grid's `lg:min-h-[330vh]` already supplies the scroll distance the sticky stepper needs; the section just needs to stop reserving extra trailing canvas.

Before: `<section ref={sectionRef} style={{ position: "relative" }} className="bg-black text-white z-30 overflow-hidden min-h-[500vh]">`

After:  `<section ref={sectionRef} style={{ position: "relative" }} className="bg-black text-white z-30 overflow-hidden">`

No other changes — the stepper math (`activeTier = floor(p * 6)` over the section's scrollYProgress) keeps working because `scrollYProgress` is derived from the section's actual bounding rect, not from a hard-coded `min-h`. With the section sized to its content (~370vh = header + 330vh grid + handoff), the six tiers still distribute evenly across the pinned grid scroll range.

## Why nothing else needs to change

- The grid's `lg:min-h-[330vh]` is the load-bearing scroll-canvas; it is preserved.
- Strip B (`lg:sticky lg:top-0 h-screen`) and Strip C (`lg:sticky lg:top-0 h-screen flex items-center`) pin against the grid, not the section, so removing the section min-h does not break the stepper.
- The handoff callout sits inside the same wrapping `<div className="relative px-6 md:px-12">` as the grid (data-tornado.tsx:1908 → 2204), so it stays attached to the grid's bottom and no gap re-opens between them.

## Verification

1. Reload the dev preview and scroll into "Measuring the vortex".
2. Watch the tier counter step 1/6 → 6/6 with each tier holding for roughly one viewport-height. The tornado, meter, and instrument panel remain pinned.
3. When EF5 is fully shown and the "Your climate is currently at EF5 — keep scrolling" line appears, continue scrolling — the page should transition **directly** into "06 / Curated from sixty-five years of climate record" with no dark empty canvas in between.
4. Resize to mobile (<lg): grid collapses, sticky disables, content stacks naturally. No empty trailing space.

---

# Addendum 4 — Fix the Stepper Pin Range + Kill the Black Gap

## Context

After the Addendum 3 redesign, the "Measuring the vortex" section behaves wrong in two visible ways:

1. **Sticky strips release way too early.** The section's outer `<section>` is `min-h-[700vh]`, but the grid block inside it (`grid-cols-[64px_1fr_360px]`) is auto-height — its tallest child is `lg:h-screen`, so the grid is only ~1 viewport tall. Browser sticky pins each strip *only while its parent (the grid) is in view*. So after ~200vh of scroll the grid leaves the viewport, all three strips unstick, and the remaining ~500vh of the section is **empty black space**. The user sees the tier stepper start, then everything scrolls away long before EF5 is reached.
2. **Visible dead-air between Section 5 and Section 6.** Even once #1 is fixed, the hand-off callout adds `mt-16 mb-24 pt-10` (~13rem of vertical breathing room) and the next section (`SECTION 6: CLIMATE CHAPTERS`) opens with `pt-24 md:pt-32` (~8rem). Stacked together that's a ~21rem black canyon between the EF5 climax and the chapter list.

Intended outcome: scrolling through the section locks the tornado + meter + instrument panel in place and steps cleanly EF0→EF1→…→EF5 (each tier getting one full viewport of scroll dwell). The moment EF5 (tier 6 of 6) is fully shown, the page releases straight into "Curated from sixty-five years of climate record" with no empty black scroll in between.

## Files to modify

- `src/app/components/data-tornado.tsx` — the selected grid block + the hand-off callout below it (still inside the same `<section>`), and one outer change (see "Outside the selection" below).

## Reuse before building

- All existing motion values (`scrollYProgress`, `ef0On..ef5On`, `meterHeight/Color/Glow`), `activeTier` state, `FUJITA_TIERS`, `SEVERITY_COLORS`, the CSS tornado stage, `TierMark`, and the instrument-panel JSX stay exactly as they are. This addendum only fixes geometry + spacing — not visuals, not logic.

## Design

### 1. Give the grid a real pin range

Inside the selected grid block:

- Add `lg:min-h-[600vh]` to the outer grid `<div>`. This makes the grid container 600vh tall on desktop, so each `lg:sticky lg:top-0 h-screen` strip remains pinned for the entire 600vh stretch — i.e. five full viewport-heights of scroll, one per tier transition with EF5 holding for the final 100vh.
- Mobile (< lg) collapses to a single column with no sticky, so the `lg:` prefix keeps mobile unaffected.

### 2. Re-tune the section height to match the new grid range

The `<section>` wrapping the block (outside the selection but in the same component function) should change from `min-h-[700vh]` to `min-h-[640vh]` — 600vh for the pinned stepper plus ~40vh for the hand-off callout and natural release. Anything beyond 640vh is the empty black space the user is complaining about.

### 3. Trim the hand-off callout's vertical padding

The callout below the grid currently uses `mt-16 mb-24 pt-10`. Change to `mt-10 mb-10 pt-6` so the section ends ~14rem sooner. The callout content stays identical.

### 4. Outside the selection — one small change in Section 6

`<section className="relative bg-[#0a0a0a] text-white z-30 overflow-hidden">` at data-tornado.tsx:2825 wraps the chapters block with `pt-24 md:pt-32`. Reduce to `pt-12 md:pt-16` so the chapters' "06 — Curated …" header appears immediately after the FujitaScale section's hand-off line instead of after another ~8rem of black.

This is the only change outside the selected element and is summarized in plain terms below.

### 5. Confirm the stepper math still lines up

With `min-h-[640vh]` and the grid pinning over 600vh:
- `scrollYProgress` 0 → 1 maps to the section's scroll range.
- Existing `activeTier = floor((p / 0.86) * 6)` already lights EF5 at p ≈ 0.72 and holds it to p=1, which corresponds to the last ~28% of section scroll = ~180vh — comfortably long enough for the EF5 climax + the red vignette pulse (which fires at p > 0.92) before the section releases.
- No code changes needed for activeTier, EF on-thresholds, or the meter — geometry alone fixes the user-visible bug.

## Outside the selected element — one change requiring your OK

The next section's opening padding (`pt-24 md:pt-32` on the Section 6 wrapper at data-tornado.tsx:2826) adds ~8rem of empty space immediately after the Fujita section ends. To kill the visible black gap, reduce that to `pt-12 md:pt-16`. **In plain terms:** when the tornado finishes EF5, the "Curated from sixty-five years of climate record" headline appears right away instead of after another half-screen of black scroll. Confirm before implementation.

## Verification

1. Reload the dev preview and scroll into "Measuring the vortex".
2. Watch the tier counter on the instrument panel: it should step `1/6 → 2/6 → … → 6/6` with each tier holding for roughly one viewport-height of scroll. The tornado meter on the left fills steadily; the funnel core glow shifts from cyan → amber → red.
3. The meter, tornado pane, and instrument panel must stay pinned in place through the entire EF0→EF5 progression — none of them should scroll out mid-stepper.
4. When the 6-cell progress block is fully filled (EF5) and the red vignette pulses, continue scrolling ~one more viewport. The page should transition **directly** into "06 / Curated from sixty-five years of climate record" with no empty black gap in between.
5. Resize to mobile (<lg): grid collapses to a single column, sticky disables, content stacks naturally. No empty space, no horizontal scroll.
6. Confirm nothing else changed: hero section, Sections 2–4, the instrument panel content, the tornado CSS, the meter, and the chapters block themselves all render identically.

---

# Addendum 3 — Minimalist Editorial Redesign of "Measuring the Vortex"

## Context

The current FujitaScale section (the selected `<div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 lg:gap-16">` block in `src/app/components/data-tornado.tsx`) renders the CSS tornado on the left and a stack of six tall (`min-h-[60vh]`) tier rows on the right. Two structural problems:

1. **Dead vertical space** — each right-column row reserves 60vh just for a one-line EF label + windspeed + damage + a small analog card. With the tornado pane sticky on the left, this means roughly ~3.5 screen-heights of mostly black background scroll past the eye with very little content density.
2. **Repetitive card-stack feeling** — six identical card-shaped tier blocks read as a list, not a *scale*. The reader never sees the EF tiers as a single coherent system; they only see them serially.

Intended outcome: a tight, editorial, museum-grade UI that (a) keeps the scroll-driven tornado growing EF0→EF5 but (b) reframes the right column as a single living dashboard where data updates *in place* as the tornado intensifies — no more six redundant blocks, no more empty 60vh canyons. The reader should feel they are watching a single instrument panel respond to a single rising storm.

Scope: ONLY the selected grid block. Section header above and hand-off callout below stay untouched.

## Files to modify

- `src/app/components/data-tornado.tsx` — only the selected grid block. The existing `FUJITA_TIERS`, `SEVERITY_COLORS`, `scrollYProgress`, EF on/off motion values, and the inner CSS tornado stage all stay; the right-column JSX is rebuilt and the left column is reorganized.

## Reuse before building

- **`scrollYProgress`** (already from `useScroll` in `FujitaScale`) — drive the active-tier index.
- **`useTransform` + `useMotionValueEvent`** (already imported) — derive the active tier as `Math.min(5, Math.floor(p * 6))`.
- **`FUJITA_TIERS`** — single source of truth, indexed by current tier.
- **`SEVERITY_COLORS`** — palette stays exactly as is.
- **`TierMark`**, **`pulse`** state, **`meterHeight`/`meterColor`/`meterGlow`**, and the **inline CSS tornado stage** — keep verbatim.

## Design — minimalist editorial dashboard

### New layout — three vertical strips, not two columns

Replace `grid-cols-[1fr_1fr]` with `grid-cols-1 lg:grid-cols-[64px_1fr_360px]`:

1. **Strip A (left, 64px)** — the existing vertical EF meter + TierMarks, unchanged. Becomes the section's spine.
2. **Strip B (center, fluid)** — the tornado stage. Now occupies far more horizontal real estate (was sharing 50%, now sharing ~60–65%). The funnel reads as the *primary subject*, not a sidecar.
3. **Strip C (right, 360px)** — the new single-card dashboard. Replaces the six 60vh rows entirely.

The whole strip is **sticky** (`lg:sticky lg:top-0 h-screen`). To preserve scroll distance, the parent `<section ref={sectionRef}>` keeps `min-h-[260vh]` so `scrollYProgress` still sweeps 0→1.

### Strip C — the "Instrument Panel"

A single 360px-wide card that lives at the right edge of the viewport for the entire section. Inside, three stacked modules transition between tier values as scroll advances:

```
┌─────────────────────────────────┐
│ 05 / 06 ─────────── SEVERITY    │   ← thin section breadcrumb
│                                 │
│ EF3                             │   ← huge numeral, color = tier
│ 136–165 mph                     │   ← windspeed in mono
│                                 │
│ ─────────────────────────────── │
│                                 │
│ Roofs torn off. Trains          │   ← damage description, ≤2 lines
│ overturned.                     │
│                                 │
│ ─────────────────────────────── │
│                                 │
│ CO₂              ANOMALY        │
│ 360–390 ppm      +0.4 → +0.7°C  │   ← compact two-cell readout
│                                 │
│ ─────────────────────────────── │
│                                 │
│ ▣▣▣▣▢▢                          │   ← 6-cell EF progress block
│ TIER 4 OF 6                     │
└─────────────────────────────────┘
```

Implementation: a single `motion.div` whose contents are keyed by `activeTier`. Use `AnimatePresence mode="wait"` for the EF numeral / windspeed / damage / readout group so they crossfade-and-slide (`y: 12 → 0`, 280ms) on tier change. The 6-cell progress block uses static markup with each cell's `background` driven by `activeTier >= i ? SEVERITY_COLORS[FUJITA_TIERS[i].tier] : "transparent"` with a 1px border — no animation needed, just instant fill.

Card chrome: `border border-white/10 bg-white/[0.015] backdrop-blur-sm p-7`, a single thin internal divider rule (`h-px bg-white/[0.06]`) between modules, and **no nested boxes** — every old "Climate Analog" sub-card and its border is deleted.

### Strip B — tornado + ambient annotations (kills the dead space)

The tornado stage stays the full inline `<style>` block, but the surrounding `flex-1 relative overflow-hidden` pane gains three minimalist editorial layers absolutely positioned at the corners — these replace the current HUD corner brackets and the "NOAA / EF Scale" label:

- **Top-left**: a small mono caption `// FUJITA SCALE — REAL-TIME` with a 1px x 24px vertical hairline below it.
- **Bottom-left** (live tier readout): the current EF tier number in **Orbitron 18px** + the tier's `tier` word ("CRITICAL") next to it, color = severity. This anchors the eye when emoji are spinning.
- **Bottom-right**: an animated scroll percentage `00 → 99` (driven directly off `scrollYProgress`) in mono 11px — a quiet sense that the section is *running*.

These three corner readouts give the tornado pane the calm-but-active feel of a Bloomberg terminal without putting any heavy chrome on top of the funnel.

Delete: the four hair-thin corner brackets and the centered "NOAA / EF Scale" pill — the new corner readouts replace them more elegantly.

### Killing the empty scroll canyons

The vertical scroll length is preserved (so the tornado still grows full EF0→EF5) but **no large empty right-column rows remain**. The whole reading experience becomes:

- Scroll = the tornado intensifies + the right panel mutates in place.
- No row-by-row reveals; no `whileInView` waterfall on the right; no `min-h-[60vh]` blocks.
- The previous six tier rows collapse into the single sticky instrument panel that *cycles* through tiers as `activeTier` advances.

### Type & color discipline

- One display face: Orbitron (already in project) for the EF numeral *only*.
- Everything else: project mono (JetBrains Mono via `font-mono`).
- Three weights total: numeral 88px black, labels 10px tracking-[0.25em] uppercase white/40, body 13px white/85.
- Zero gradients except the existing tornado dust. No drop shadows except the EF numeral's `textShadow: 0 0 24px ${color}66`.

This is the minimalism guardrail: if a rule isn't load-bearing, delete it.

### Active tier derivation

```ts
const [activeTier, setActiveTier] = useState(0);
useMotionValueEvent(scrollYProgress, "change", (p) => {
  setActiveTier(Math.min(FUJITA_TIERS.length - 1, Math.max(0, Math.floor(p * FUJITA_TIERS.length))));
});
const tier = FUJITA_TIERS[activeTier];
const accent = SEVERITY_COLORS[tier.tier];
```

`activeTier` also drives the bottom-left tornado-pane readout so the funnel + instrument panel are perfectly in sync.

## Verification

1. Open the running dev preview and scroll into "Measuring the Vortex".
2. The right column is now a single fixed-width (360px) card sticky on the right edge of the viewport — no stack of six tall rows, no dead 60vh black gaps.
3. Scrolling EF0 → EF5 should mutate the card *in place*: the EF numeral, windspeed, damage line, CO₂/anomaly row, and 6-cell progress block all switch with a 280ms crossfade as `scrollYProgress` crosses each 1/6 threshold.
4. The tornado pane now has corner readouts (`// FUJITA SCALE — REAL-TIME` top-left, EF + tier word bottom-left in severity color, live scroll-percent bottom-right) instead of HUD brackets / NOAA pill.
5. The vertical EF meter on the far left still fills and color-interpolates exactly as before; TierMark icons still pop on tier crossings.
6. At `scrollYProgress > 0.92` the red vignette pulse still fires across the tornado pane.
7. Resize to mobile (`< lg`): the three-strip grid collapses to a single column — meter hidden (already `hidden lg:flex`), tornado on top with corner readouts, instrument panel stacks below at full width.
8. Confirm nothing outside the selected grid block changed: section header text, hand-off callout below, the chapters Section 6, and the hero stay identical.

---

# Addendum 2 — Full-Length CSS Tornado + EF-Mapped Debris

## Context

The CSS-pen tornado is now living inside `<div className="flex-1 relative overflow-hidden">` (the right pane of the FujitaScale left column, around data-tornado.tsx:1897). Three problems with the current state:

1. The tornado only fills a small middle portion of the pane because the stage is hard-coded to 300×300 with `marginLeft/Top: -150` and `scale: 0.6 → 1.6` — it doesn't grow to occupy the *full vertical length* of the parent (which is `lg:h-screen`, ~80vh max).
2. The pane has a `linear-gradient(#4d81bb → #e79d3d)` sky/sunset background plus a `.dt-ground` polygon silhouette. User wants both removed — the tornado should sit on the section's existing dark background, transparent.
3. Emoji debris is the original SCSS demo set (🐄 🏚 🚙 🐎 🚶 🐖 🌭 🏄). User wants EF0–EF5-correct debris with throw distance matching real EF damage tiers — small/close at EF0, heavy/far at EF5.

Scope of edit: ONLY the selected `<div className="max-w-7xl mx-auto w-full grid …">` block (the two-column grid). The right column (tier rows) stays untouched. Inside the left column only the "Infographic" `<div className="flex-1 relative overflow-hidden">` and the `<motion.div className="dt-tornado-stage">` need changes.

Intended outcome: a transparent, full-height tornado that visually fills the sticky pane top-to-bottom, with realistic EF-tier debris (branches → mobile homes → cars → livestock → houses → trains) orbiting at increasing radii as the user scrolls EF0 → EF5.

## Files to modify

- `src/app/components/data-tornado.tsx` — only inside the selected grid block; the stage `<div>`, its inline `<style>`, the `.dt-ground` div, and the `<motion.div className="dt-tornado-stage">` wrapper. Nothing outside the selection.

## Reuse before building

- **`scrollYProgress`** (already in scope from `useScroll` at the top of `FujitaScale`) — drive the active-EF orbit-radius scale.
- **`useTransform`** (already imported from `motion/react`) — already used on the stage's `scale`; extend to also drive a `--orbit-radius` CSS custom property and stage height.
- **`SEVERITY_COLORS`** — keep using for the red vignette pulse; no new color tokens.
- **`FUJITA_TIERS`** ordering (data-tornado.tsx ~line 1750) — the source of truth for tier index → EF level. Reuse the same 0..5 indexing for the debris-by-tier scheme.

## Design

### 1. Remove the painted background

Inside the selected block, on the "Infographic" `<div>`:
- Drop the `style={{ background: "linear-gradient(...) ..." }}` so the pane is transparent and inherits the section's dark bg.
- Delete the `<div className="dt-ground" />` element and the `.dt-ground` rule inside the inline `<style>`.

Keep: the HUD corner brackets, the "NOAA / EF Scale" label, and the red-vignette `AnimatePresence` pulse — those are still wanted.

### 2. Make the tornado full-height

The stage must fill the parent's full height instead of being a 300×300 fixed square scaled in JS.

- Change `<motion.div className="dt-tornado-stage absolute left-1/2 top-1/2" style={{ marginLeft: -150, marginTop: -150, scale: … }}>` to `<motion.div className="dt-tornado-stage absolute inset-0">` with `style={{ "--tornado-h": "100%", "--orbit-base": "30vh" }}`.
- In the inline `<style>`, change `.dt-tornado-stage > span { width: 300px; height: 300px; … }` to size the stage children relative to the stage: keep them circular (`width: clamp(220px, 30vh, 360px)`, `height` same) and center them with `left: 50%; top: 50%; margin-left: -calc(width/2)` — but simplest: keep flex centering by wrapping the spans in a `position:absolute; inset:0; display:flex; align-items:center; justify-content:center;` inner container so each `<span>` lives at the pane's geometric center and only the keyframes' `translateZ` / `translateX` move them.
- Drive the perspective from the parent height: in the inline style block bump `perspective: 700px` → `perspective: clamp(600px, 80vh, 1100px)` so the tornado's depth scales with the pane.
- Drop the JS `scale` motion value entirely — replace with a CSS variable `--ef-radius` set via `useTransform(scrollYProgress, [0,1], [120, 320])` and consumed inside the keyframes for the orbit translate distance (`translateZ(calc(var(--ef-radius) * -1px))` etc.). This gives a *true* widening of the tornado as scroll advances, not just a uniform scale of a fixed-size sprite.

### 3. EF-mapped debris

Replace the original `:nth-of-type(1..8)::after { content: 'cow' }` block with EF-tier debris. Use 18 emoji-bearing spans (3 per EF level) so each tier has visible representation; the remaining 82 spans stay as dust dots.

| Span index | EF tier | Emoji | Throw radius (px) | Font size |
|------------|---------|-------|-------------------|-----------|
| 1, 2, 3 | EF0 | 🍃 🌿 🪧 | 80 | 28px |
| 4, 5, 6 | EF1 | 🏚️ 🛻 🌳 | 130 | 32px |
| 7, 8, 9 | EF2 | 🚗 🚙 🪵 | 180 | 38px |
| 10, 11, 12 | EF3 | 🐄 🐎 🚜 | 230 | 44px |
| 13, 14, 15 | EF4 | 🏠 🚌 ⛺ | 290 | 52px |
| 16, 17, 18 | EF5 | 🚂 🏚️ 💥 | 360 | 62px |

Implementation: per-span `nth-of-type` rule sets `--orbit-r` and `font-size` on the `::after`; the `dt-upndown` keyframe uses `translateZ(calc(var(--orbit-r) * -1px))` so each piece of debris orbits at its own EF-appropriate radius regardless of scroll.

Dust: shift the dust range from `:nth-of-type(n+10):nth-of-type(-n+60)` → `:nth-of-type(n+19):nth-of-type(-n+80)` so the 18 emoji indices are exclusive of the dust range. The 90px super-dust band moves from 40–60 to 50–75. Dust color stays the same warm orange.

### 4. Scroll-bound debris reveal (subtle wow)

Each tier's emoji visibility is gated by scroll progress so EF5 debris only appears once you've passed the EF5 row:

- In the inline style, set `.dt-tornado-stage > span[data-ef="EF5"] { opacity: var(--ef5-on, 0); }` etc. for each EF.
- In JS, compute six `useTransform(scrollYProgress, [tierStart, tierEnd], [0, 1])` motion values and apply them as inline CSS vars on the stage wrapper (`--ef0-on`, …, `--ef5-on`).
- Render the 18 emoji spans with a `data-ef` attribute so the selector matches.

This way the tornado *gains* debris weight as the EF scale climbs, instead of throwing everything at once.

## Verification

1. Open the running dev preview (Vite is already serving).
2. Scroll into the "Measuring the Vortex" section. The left pane should now be transparent — no blue-to-orange sky, no orange ground silhouette — just the dark section background with the tornado.
3. The tornado funnel should reach top-to-bottom of the sticky pane (full ~screen height), not be confined to a small middle blob.
4. At the top of the section (EF0 row in view) only leaves/branches/signs should be visible spinning near the funnel core.
5. Scrolling down: mobile homes/trucks (EF1), cars (EF2), livestock (EF3), houses/buses (EF4), then trains/explosions (EF5) appear in sequence, each orbiting at a visibly larger radius than the previous tier.
6. At EF5 (>92% scroll progress) the existing red-vignette pulse still fires and the EF5 debris is at maximum orbit distance.
7. Resize to mobile: the left sticky pane collapses (existing behavior); the tornado should still render full-height in its column without horizontal overflow.
8. Confirm nothing outside the selected grid block changed: right-column tier rows, section header, hand-off callout, and the chapters Section 6 all render identically.

---

# Addendum — Section 4.5: "Measuring the Vortex" (Fujita Scale Crossover)

## Context

The user dropped `src/imports/image.png` — a Magellan TV infographic titled "MEASURING TORNADOES: The Enhanced Fujita Scale" showing EF0–EF5 with windspeeds (65 → >200 mph) and damage levels (broken branches → total destruction), composited around a real tornado with a flying car and cow. They want a *new* creative section built around this asset — "do something creative and surprise me."

The Data Tornado app already uses a 4-tier severity ladder (STABLE / ELEVATED / CRITICAL / EXTREME) tied to the year slider. The EF scale is the obvious real-world analog. The wow move: make the EF chart the bridge between *real* tornado meteorology and the app's climate-severity metaphor — a "decoder ring" section that earns the project name.

Intended outcome: an interactive scroll-driven section where the EF infographic sits sticky on the left while EF0→EF5 tiers unlock on the right as the user scrolls. Each tier maps to a Data Tornado climate band (CO₂ ppm range + temp anomaly + severity color), so by the end the reader has internalized: *yes, the climate trajectory is on the Fujita ladder too*.

## Placement

Insert as a new `<section>` in `src/app/components/data-tornado.tsx` **between Section 4 (Local Trends) and Section 5 (Climate Chapters)**. Section 5 stays the capstone; this new section primes the reader with the severity vocabulary that the chapter list then plays out.

Numbering shifts: the existing Section 5 SectionNumber goes from "05" → "06"; the new one takes "05 — Severity Scale".

## Files to modify

- `src/app/components/data-tornado.tsx` — add a new `FujitaScale` component (kept local to this file like `ClimateChapters`), render it as Section 5, renumber the chapter section to 06.
- No new CSS — reuse existing primitives.

## Reuse before building

- **`SectionNumber`** and **`LetterReveal`** (already defined in `data-tornado.tsx`) — for the header.
- **`SEVERITY_COLORS`** map — drive the per-tier accent color so EF5 = `#E53935` (EXTREME), EF3 = `#FF7043` (CRITICAL), EF1 = `#FFB74D` (ELEVATED), EF0 = `#4FC3F7` (STABLE).
- **`motion`**, **`AnimatePresence`** from `motion/react` — already imported.
- **`useScroll` + `useTransform`** from `motion/react` — pull these in (already shipped with the `motion` package, no new install) to drive a scroll-bound progress meter without extra state.
- **Image asset**: `import fujitaImage from "../../imports/image.png"` next to the existing chapter image imports.

## Design — the "wow" choreography

### Layout

- Two-column sticky scrollytell, `min-h-[200vh]` so the right column has scroll distance.
- **Left column (sticky)**: `lg:sticky lg:top-0 h-screen` flex-centered. Holds the EF infographic at its natural 4:3 ratio inside a black-matted card. A thin vertical "EF meter" runs alongside it — a vertical bar segmented EF0–EF5, with a glowing fill that climbs as you scroll. The fill color interpolates through the severity palette.
- **Right column (scrolls)**: six tier rows (`EF0 → EF5`), each `min-h-[60vh]`, each a `motion.div` with `whileInView` reveal. Row contents:
  - Big EF# label (Orbitron, color from severity map)
  - Windspeed range (mono)
  - Damage description from the infographic
  - **Climate analog card** — the Data Tornado severity badge for that tier, with the matching CO₂ ppm band + temp anomaly band pulled from `CLIMATE_DATA` thresholds.

### Scroll-driven mechanics

- `useScroll({ target: sectionRef, offset: ["start start", "end end"] })` returns `scrollYProgress` (0 → 1) across the section.
- The vertical EF meter's `height` is `useTransform(scrollYProgress, [0, 1], ["0%", "100%"])`.
- The image gets a subtle `useTransform` parallax: `scale: [1, 1.04]` and `filter` brightness rising from 0.85 → 1.1 — the tornado feels like it's intensifying as you scroll.
- At ~`scrollYProgress > 0.92`, a one-shot screen-pulse fires: a red vignette flashes (`AnimatePresence`, 600ms) and the EF5 row gets a `hud-glitch-text` class for one beat. This is the payoff.

### Easter-egg touch

- The flying objects in the infographic (car, cow) are part of the source PNG — can't isolate them without re-cutting the asset. So the *wow* substitute: as the meter passes each tier, a small lucide icon (`Car` for EF2, `Trees` for EF1, `Building2` for EF4, `AlertOctagon` for EF5) animates out from the meter mark with `y: -20, opacity: 0 → 1 → 0` over 1s — a sense of *things being thrown* by the rising tornado.

### Final transition

- Below the last row, a single-line callout: **"YOUR CLIMATE IS CURRENTLY AT EF{n} — KEEP SCROLLING"**, where `{n}` is derived from today's anomaly (`+1.29°C` → EF3). This hands the reader off to Section 6 (Chapters) with stakes set.

## EF ↔ Climate severity mapping

| EF | Windspeed | Damage | Climate tier | CO₂ band | Anomaly band |
|----|-----------|--------|--------------|----------|--------------|
| EF0 | 65–85 mph | Branches, signs | STABLE | < 320 ppm | < 0°C |
| EF1 | 86–110 mph | Roofs, mobile homes | STABLE | 320–340 | 0 – +0.2 |
| EF2 | 111–135 mph | Cars tossed | ELEVATED | 340–360 | +0.2 – +0.4 |
| EF3 | 136–165 mph | Roofs off | CRITICAL | 360–390 | +0.4 – +0.7 |
| EF4 | 166–200 mph | Frame houses leveled | CRITICAL | 390–410 | +0.7 – +1.0 |
| EF5 | >200 mph | Total destruction | EXTREME | > 410 ppm | > +1.0°C |

These constants live as a `FUJITA_TIERS` array next to `CLIMATE_CHAPTERS`.

## Verification

1. Open the running dev preview.
2. Scroll to between Section 4 and the (now Section 6) chapters. The new "Measuring the Vortex" section should appear with the EF infographic sticky on the left.
3. Scroll within the section: the vertical meter fills, the image scales subtly, EF tier rows reveal one at a time on the right, small lucide icons pop near the meter as each tier unlocks.
4. At the very end of the section the EF5 row should glitch once and a red vignette should flash for ~600ms.
5. Hand-off line "YOUR CLIMATE IS CURRENTLY AT EF3" should render with the correct EF derived from the 2024 anomaly value.
6. Resize to mobile: the sticky two-column collapses to a stacked layout — image at top, tier cards below — and the meter renders as a thin horizontal progress bar above the cards. No horizontal scroll.
7. Existing Section 1 (hero) and Sections 2/3/4/6 remain untouched aside from Section 6's number changing from "05" to "06".

---

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
