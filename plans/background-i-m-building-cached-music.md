# Plan: Switch Data Tornado to video background + time-driven severity

## Context
The existing app renders a per-year tornado image that swaps as the user drags a 1959–2024 slider. The user has supplied a ~20-second video at `src/imports/0607.mp4` and wants it to become the full-screen background. The slider should now scrub the video instead of selecting a year, and the severity badge should be derived from playback time using fixed 5-second bands.

## Files
- **Modify**: `src/app/components/data-tornado.tsx` — swap `TornadoImage` for a `<video>` element, change `Timeline` to scrub video time, derive severity from `currentTime`.
- **Asset**: `import videoSrc from "../../../src/imports/0607.mp4"` (ES module import so Vite emits the asset; never hardcode the path string).

## Behavior
- **Video element**: `<video ref={videoRef} src={videoSrc} autoPlay muted playsInline loop>` positioned `absolute inset-0 size-full object-cover` behind all chrome.
- **Playback state**: track `currentTime` via `onTimeUpdate`; track `duration` via `onLoadedMetadata` (fallback 20s).
- **Slider**: `min=0`, `max=duration`, `step=0.05`. Value bound to `currentTime`; `onValueChange` sets `videoRef.current.currentTime`. Ticks at `0, 5, 10, 15, 20` seconds.
- **Severity helper** `severityFromTime(t)`:
  - `t < 5` → STABLE (🔵 `#4FC3F7`)
  - `t < 10` → ELEVATED (🟡 `#FFB74D`)
  - `t < 15` → CRITICAL (🟠 `#FF7043`)
  - else → EXTREME (🔴 `#E53935`)
- **Severity badge**: prominent overlay (emoji + label + colored dot) that updates live with playback.
- **Left data panel + share modal**: keep existing UI; drop year lookup or linear-map `currentTime → year` so CO₂/anomaly readouts still animate. Default: linear map (`year = round(1959 + (t/duration) * 65)`).
- **Top label, LIVE DATA toggle**: unchanged.

## Verification
- Video autoplays muted, fills viewport behind chrome.
- Badge reads 🔵 / 🟡 / 🟠 / 🔴 in the four 5-second bands.
- Slider seeks both directions smoothly; thumb follows playback when idle.

---

# (Earlier plan retained below for reference)

# Plan: Build "The Data Tornado" full-screen dark web app

## Context
The user has the merged `CLIMATE_DATA` array ready at `/workspaces/default/code/climateData.ts`. They now want a full-screen single-page React UI in `src/app/App.tsx` that visualizes the data: large central tornado image keyed to a year slider, with a left collapsible panel, top labels, a share-birth-year modal, and a "LIVE DATA" toggle. The app must use the existing shadcn/ui primitives (`src/app/components/ui/*`) — slider, button, dialog, sheet — rather than rebuilding them.

## Files
- **Modify**: `src/app/App.tsx` — main composition.
- **Create**: `src/app/components/data-tornado.tsx` — top-level layout.
- **Create**: `src/app/components/tornado-display.tsx` — center 70vh image with crossfade + colored border.
- **Create**: `src/app/components/year-timeline.tsx` — slider + tick marks (1959, 1970, 1980, 1990, 2000, 2010, 2020, 2024).
- **Create**: `src/app/components/data-panel.tsx` — left collapsible strip (uses `ui/sheet.tsx` or simple controlled `aside` + arrow button).
- **Create**: `src/app/components/share-card.tsx` — bottom-right button + dialog modal with birth-year input and result card with copy button.
- **Reuse**: `src/app/components/ui/slider.tsx`, `button.tsx`, `dialog.tsx`, `input.tsx`.
- **Read from**: `/workspaces/default/code/climateData.ts` (`CLIMATE_DATA`).

## Behavior
- State (in `App.tsx`): `selectedYear: number = 1959`, `liveData: boolean = false`, `panelOpen: boolean = false`, `shareOpen: boolean`, `birthYear: number | null`.
- Lookup helper: `const entry = CLIMATE_DATA.find(d => d.year === selectedYear)!`.
- **Severity dot color**: map STABLE→`#4FC3F7`, ELEVATED→`#FFB74D`, CRITICAL→`#FF7043`, EXTREME→`#E53935`; if severity===EXTREME and `temp_anomaly > 1.5` → `#FFFFFF`.
- **Image**: `<img src={`/tornado-images/${year}.jpg`} />` with two stacked layers cross-faded via `opacity` transition `800ms`. Fallback: grey `#1a1a22` div if image fails (`onError` swap).
- **Border tint**: 2px solid border on the image container using `entry.tornado_color`, with a subtle box-shadow glow same color.
- **Slider**: shadcn `Slider` min=1959 max=2024 step=1; tick row below using flex with absolute-positioned labels at the 8 listed years.
- **LIVE DATA toggle**: small button top-right, toggles `liveData` boolean (no real wiring yet — TODO comment).
- **Left panel**: collapsed = 32px-wide vertical strip with a `>` arrow button; expanded = 280px panel showing Year, CO₂ ppm, Temp anomaly (with `+` sign for ≥0), Severity label with colored dot.
- **Share modal**: `Dialog` with `Input` for birth year (validate 1959–2024); on submit show card "In {birthYear}: CO₂ was {co2_ppm} ppm and the tornado was {severity}. Today it is EXTREME." and a copy button (`navigator.clipboard.writeText`).

## Layout
- Outer `<div>`: `bg-[#0A0A0F] h-screen w-screen overflow-hidden text-white relative`.
- Top-left absolute: `THE DATA TORNADO` — `font-mono text-[11px] text-[#888897]`.
- Top-right absolute: LIVE DATA button.
- Center: tornado image area, `h-[70vh]` centered.
- Bottom: timeline pinned to bottom with `pb-8 px-12`.
- Left: collapsible strip absolute-positioned `top-1/2 -translate-y-1/2 left-0`.
- Bottom-right absolute: Share button.

## Verification
- Open the dev preview; default year shows 1959 data.
- Drag slider — year, CO₂, anomaly, severity dot color, and image source change instantly with an 800ms crossfade.
- Tick marks render at the 8 specified years.
- Left arrow expands/collapses the data panel.
- Share button opens dialog → entering a valid year shows the templated card → copy button writes correct text to clipboard.
- For year 2024 (anomaly 1.29) severity dot is `#E53935`; manually testing a year where anomaly>1.5 (none in dataset, but logic preserved) would show `#FFFFFF`.
- Image border tint matches `tornado_color` of the selected year.
