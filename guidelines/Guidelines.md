# The Data Tornado — AI Guidelines

This document defines rules, conventions, and design patterns for AI-assisted development on **The Data Tornado** — an interactive climate telemetry dashboard.

---

## General Guidelines

- **Keep files focused and small.** Helper functions belong in separate utility files (e.g., `utils/`). Do not dump unrelated logic into `data-tornado.tsx`.
- **Never use absolute positioning unless strictly necessary.** Prefer responsive layouts using Flexbox and CSS Grid.
- **Refactor as you go.** Do not leave dead code, unused imports, or commented-out blocks behind.
- **TypeScript is required everywhere.** Never use `any`. Always define proper types and interfaces.
- **All data-fetching side effects must be cancellable.** Use the `cancelled` flag pattern (already established in `LiveCO2Ticker`) to avoid memory leaks on component unmount.
- **Do not add new npm dependencies without a strong reason.** The stack is already large. Prefer built-in browser APIs and existing libraries.
- **The project uses pnpm.** Run `pnpm install` — never `npm install`.

---

## Tech Stack Reference

| Layer         | Technology                                                           |
| ------------- | -------------------------------------------------------------------- |
| Framework     | React 18 + TypeScript + Vite                                         |
| Styling       | Tailwind CSS v4                                                      |
| UI Primitives | Radix UI + Lucide Icons                                              |
| Animation     | GSAP (complex timelines), Motion/React (declarative transitions)     |
| 3D/WebGL      | Three.js (vortex shader in `loading-tornado.tsx`)                    |
| Charts/SVG    | Custom responsive SVGs (no third-party chart library for sparklines) |
| Backend       | Supabase Edge Functions (`make-server-7b7572b4`)                     |
| Data          | NOAA/GISS/Central Park datasets via `climateData.ts`                 |

---

## Design System Guidelines

### Color Palette

The site uses a **dark, atmospheric telemetry aesthetic**. The base background is `#05050A` (near black). All UI is designed for dark mode only.

**Severity-coded color system (core identity):**
| Severity | Color | Usage |
|---|---|---|
| STABLE | `#4FC3F7` (ice blue) | 1959–1969 era, cool readings |
| ELEVATED | `#FFB74D` (amber) | Rising CO₂ levels |
| CRITICAL | `#FF7043` (orange-red) | Dangerous anomaly territory |
| EXTREME | `#E53935` (deep red) | 2010–2024 era, crisis-level readings |

- **Never use flat/primary red, blue, or green directly.** Always use the severity color tokens above or derive from them.
- Accent glows are always `${color}15` to `${color}44` opacity variations of the severity color.
- Borders use `${color}22` or `rgba(255, 255, 255, 0.08)` for subtle HUD framing.

### Typography

- **Primary font:** `JetBrains Mono` — used for all UI text, labels, and data readouts. This is the _only_ approved font.
- **Never introduce a new Google Font or system font** without updating `--font-sans`, `--font-mono`, and `--font-orbitron` in `theme.css`.
- Use `tracking-[0.25em]` for section labels and HUD indicators. Example: `SENSOR TELEMETRY`, `SEVERITY LEVEL`.
- Labels in ALL CAPS: use `uppercase` + `tracking-[0.15em]` to `tracking-[0.3em]`.
- Base font size is `16px` (set via `--font-size` in `theme.css`).
- Font sizes for HUD overlays are intentionally tiny: `text-[8px]`, `text-[9px]`, `text-[10px]`. Do not increase these — it is part of the design language.

### Spacing & Layout

- **No hardcoded pixel margins/paddings in inline styles.** Use Tailwind utility classes.
- The `DataPanel` (left HUD) is `300px` wide when open. Do not change this without testing on mobile.
- The `RadarSeverityHUD` uses `size-60 sm:size-72 md:size-80` — always maintain responsive sizing.
- Bottom control bar sits at `z-20`. The video background is `z-0`. HUD overlays are `z-10` to `z-30`.

### Glassmorphism

The HUD panels use a consistent glassmorphism style:

```css
backdrop-blur-md
bg-white/5
border border-white/10
shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]
```

- Always apply `backdrop-blur-md` to floating panels over video.
- Never use a solid opaque background (`bg-black`, `bg-white`) on overlay panels.

---

## Component Guidelines

### Buttons

- **Primary Button:** Filled with severity color. Used for main CTAs like "ENTER THE STORM" or "Generate Share Card".
- **Secondary Button:** Outlined with severity color, transparent background. Used alongside primary buttons.
- **Tertiary / Icon Buttons:** Text/icon only, no border. Used for collapse toggles and control icons.
- Maximum **one primary button** per visible screen section. Do not stack multiple primary buttons.
- Never place a floating action button alongside the bottom toolbar.

### Sparklines (`Sparkline` component)

- Sparklines always render at `240×40` SVG viewport.
- The active/progressive line uses the current severity color with `drop-shadow(0 0 3px ${color})`.
- The inactive background line uses `rgba(255, 255, 255, 0.08)`.
- The pulsing indicator dot uses `animate-pulse` + `animate-ping` on a ring — **do not remove these animations**.
- Sparklines are always inside a `rounded-lg bg-white/[0.02] border border-white/[0.05]` card.

### Timeline Slider (`CustomBendingSlider` component)

- The SVG viewBox is always `0 0 1000 65`. Do not change this.
- The active bending Bezier formula is: `M 0 30 L ${cx - 30} 30 C ${cx - 16} 30, ${cx - 12} 50, ${cx} 50`. **Do not alter the curve math.**
- The year label uses `textShadow: 0 0 8px ${activeColor}` for the glow. Keep this.
- Add the `hud-glitch-text` CSS class to the year label when severity is `CRITICAL` or `EXTREME`.

### Modals & Dialogs

- All dialogs use Radix UI `Dialog` primitives from `./ui/dialog`.
- Dialog content must include `DialogHeader`, `DialogTitle`, and `DialogDescription` for accessibility.
- ShareCard dialogs overlay the full experience — ensure `AnimatePresence` wraps exit animations.

### Video Background

- The video source is `0607.mp4` (located in `src/imports/`).
- The video is always `muted`, `playsInline`, `preload="auto"`.
- Video playback rate is synchronized to climate severity — do not set a fixed `playbackRate`.
- The video uses `object-cover` and `absolute inset-0 size-full` to fill the viewport.

---

## Severity System Rules

The four severity states (`STABLE`, `ELEVATED`, `CRITICAL`, `EXTREME`) drive everything:

- Video playback speed
- Vignette glow color
- Border/shadow colors
- HUD badge label
- Sparkline active color
- Timeline knob color
- Glitch text effects (only `CRITICAL`/`EXTREME`)

When adding any new UI element, **it must respond to severity changes** using the `SEVERITY_COLORS` record. Hard-coding a color that doesn't change with severity is a design violation.

---

## Data Guidelines

- All historical climate data lives in `climateData.ts` as `CLIMATE_DATA`. Never inline data in components.
- Year range is **1959–2024** (`MIN_YEAR` to `MAX_YEAR`). Never extrapolate beyond this range.
- The live CO₂ feed comes from `https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_weekly_mlo.csv` and is polled every 60 seconds. Do not change the polling interval.
- Date formats: display years as plain integers (e.g., `2024`). Never use `Jun 10` style for timeline data.

---

## Animation Guidelines

- **GSAP** is used for complex, performance-critical timelines (scroll-driven, entrance sequences).
- **Motion/React (`motion/react`)** is used for declarative component-level animations (opacity, scale, presence transitions).
- **Do not mix GSAP and Motion on the same element.** Pick one per element/component.
- All `AnimatePresence` wrappers require a `key` prop on their direct child.
- Slow decorative animations use CSS: `animate-spin-slow`, `animate-spin-reverse-slow`. These are custom Tailwind keyframes — check `theme.css` before adding new ones.

---

## File Structure Conventions

```
src/
  app/
    App.tsx                      # Entry coordinator only. No business logic here.
    components/
      data-tornado.tsx           # Main interactive dashboard (large, intentional)
      loading-tornado.tsx        # Three.js WebGL preloader
      birth-date-vortex.tsx      # Birth year telemetry
      birth-day-share-page.tsx   # Shareable card page
      disaster-witness-gallery.tsx
      scroll-animations.tsx
      ui/                        # Radix UI primitives — do not modify
  imports/                       # Static assets (video, audio, images)
  styles/
    theme.css                    # All CSS variables and Tailwind theme tokens
    globals.css                  # Global base styles
    fonts.css                    # Font-face declarations
climateData.ts                   # NOAA/GISS dataset
utils/
  supabase/                      # Supabase client and keys
```

- `App.tsx` should remain a thin coordinator. Do not add logic to it.
- `data-tornado.tsx` is intentionally large (single interactive experience). Sub-components within it are function components defined in the same file.
- The `ui/` folder contains Radix UI wrappers. **Do not modify these files.**

---

## Accessibility

- All interactive icon buttons must have an `aria-label`.
- Example: `aria-label={open ? "Collapse panel" : "Expand panel"}`.
- Dialog components must always include `DialogTitle` and `DialogDescription` (even if visually hidden).
- HUD overlays that are purely decorative must have `pointer-events-none` and `aria-hidden` (or `select-none`).

---

## What NOT to Do

- ❌ Do not add a light mode. This is a dark-only experience.
- ❌ Do not use `position: absolute` for layout — only for overlay HUD elements.
- ❌ Do not install Recharts or Chart.js for new charts. Use the existing custom SVG pattern.
- ❌ Do not change the base font from JetBrains Mono.
- ❌ Do not add `console.log` statements in production paths (only `console.log` inside catch blocks for errors, as already established).
- ❌ Do not place business logic in `App.tsx`.
- ❌ Do not use `npm` or `yarn` — this project uses `pnpm`.