# Mobile + Tablet Responsiveness Pass

## Context

The Data Tornado site is fully built for desktop and the user is happy with that view. On mobile (<640px) and tablet (640–1024px), the layout breaks: SVG charts overflow at 800px fixed widths, the radar HUD fills the screen, the disaster gallery's fixed 46% left panel + 300–420px flying debris run off-screen, the birth-date 3-column form doesn't collapse, and the share carousel sits at desktop dimensions on a phone.

**Hard constraint from user**: do NOT change anything about how the site looks at desktop sizes. We're only adding mobile + tablet behavior.

## Strategy

Tailwind v4 default breakpoints: `sm:` ≥640px, `md:` ≥768px, `lg:` ≥1024px, `xl:` ≥1280px. The site's existing styling assumes ≥1280px. To preserve desktop without changes, we use this principle:

> Promote existing classes to a `lg:` (or `xl:`) prefix so they kick in at desktop, and add new mobile-first base classes (no prefix) + `md:` tablet overrides underneath them.

For example: `w-[300px]` becomes `w-full md:w-[220px] lg:w-[300px]`. The `lg:` and `xl:` versions reproduce the current desktop values verbatim — desktop renders identically.

For elements that are purely positional/decorative on desktop (radar HUD, flying debris, ghost wind numbers in share page), we hide or shrink them on mobile rather than try to make them fit.

## Files to modify

### 1. `src/app/components/data-tornado.tsx`
Main app — many sections. Apply this pattern per section:
- **Header HUD (around line 3940)**: stack title and right-side controls vertically on mobile (`flex-col md:flex-row`); shrink the year telemetry font (`text-[14px] md:text-[20px]`); hide "AUDIO ON/OFF" text label on mobile, keep only the icon.
- **Radar HUD**: existing `size-60 sm:size-72 md:size-80` is OK for the radar itself, but the absolutely-positioned overlay numbers/labels need `text-[8px] md:text-[10px]` and reduced padding.
- **Left DataPanel (`w-[300px]`)**: on mobile/tablet, change from fixed left-side overlay to a horizontal strip below the HUD: `static w-full md:absolute md:w-[260px] lg:w-[300px]`, and reduce internal padding `p-3 md:p-5`.
- **SVG chart sections (CO₂, Anomaly, Local temp)**: replace fixed `width={800} height={300}` with `viewBox="0 0 800 300"` + `width="100%" preserveAspectRatio="xMidYMid meet"`. Wrap each chart in `<div className="w-full overflow-x-auto">`. This is the single biggest mobile fix.
- **Slider timeline (`px-4`)**: bump to `px-3 md:px-4`, and on mobile stack the year readout above the slider track rather than to the side. Touch target on slider handle: `w-6 h-6 md:w-4 md:h-4`.
- **Section text blocks (h1/h2 hero copy in section 1 hero, section 2 intro, etc.)**: titles `text-3xl md:text-5xl lg:text-6xl` if currently `text-5xl/6xl`; body copy `text-sm md:text-base`. Vertical spacing `py-12 md:py-20 lg:py-28`.

### 2. `src/app/components/disaster-witness-gallery.tsx`
- The flying-debris hero is a full-viewport scene built for desktop. On mobile, switch from a "left panel + flying debris on right" layout to a single stacked column: telemetry panel on top, debris zone below at reduced size.
- Pattern: left panel `w-full md:w-[46%]`, debris container `left-0 top-[50%] md:left-[25%] md:top-0`.
- Debris spawn width range — currently `Math.floor(Math.random() * 120) + 300` (300–420px). On mobile, clamp via window width: read `window.innerWidth` once and cap width at `Math.min(spawn, window.innerWidth * 0.7)` so debris stays within viewport. (Reuse the existing spawner — no new component.)
- Title `text-3xl sm:text-4xl lg:text-[3.6rem]`; section padding `p-4 md:p-6 lg:p-10`.

### 3. `src/app/components/birth-date-vortex.tsx`
- **Date input row**: currently `grid grid-cols-3 gap-3`. Change to `grid grid-cols-1 sm:grid-cols-3 gap-3` so day/month/year stack vertically on phones, side-by-side from sm: up. Tablet view (sm:) keeps 3-column.
- **Featured image**: `h-64 md:h-auto` is fine; just confirm `<img>` uses `object-cover w-full`.
- **Title sizing**: `text-3xl sm:text-4xl md:text-5xl xl:text-6xl`.
- **Padding around form fieldset**: `p-4 md:p-5`.
- **Event grid** (`AllEventsGrid` populated array): existing `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` is already responsive — leave it.
- **EventPhotoCard inner padding/font**: reduce hero card padding on mobile `p-4 md:p-6`.

### 4. `src/app/components/birth-day-share-page.tsx`
- The 3-column flex row (`ghost number | card stack | dot nav`) is built for `height: 500px` fixed. On mobile, hide the ghost wind number column (`hidden md:flex`), shrink the card stack to viewport-aware sizes (`w-[90vw] sm:w-[420px] md:w-[460px]`, height `h-[60vh] md:h-[500px]`), and move the dot nav from right side to bottom on mobile: wrap the whole row in `flex-col md:flex-row` and add `order-last md:order-none` to the dot column → which then renders as a horizontal row of dots beneath the card.
- Card internal padding `p-5 md:p-8`.
- Header (`px-6 pt-6`): change to `px-4 pt-4 md:px-6 md:pt-6`. Hide the middle "The Data Tornado · Shared Memory" tagline on mobile (`hidden md:flex` already, good).
- Date input badge: shrink width `w-24 sm:w-36`.

### 5. `src/app/components/loading-tornado.tsx`
- Already uses `container.clientWidth/clientHeight` for the WebGL canvas — that's fluid. Only the subtitle text needs scaling: `text-[8px] sm:text-[9px] md:text-[10px]`. Otherwise leave alone.

### 6. Global: `src/styles/globals.css` (or equivalent)
Add `html { overflow-x: hidden; }` and `body { min-width: 0; }` to defensively kill any horizontal scroll that slips through. No other global changes.

## Touch-target hygiene

While doing the above, where a button is currently <44px tall on mobile (icon-only buttons, dot nav), add `min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0` so taps work but desktop sizing is unchanged.

## What we are NOT doing

- Not editing `src/styles/theme.css` tokens.
- Not changing the desktop layout, fonts, colors, spacing, or animations at `lg:`+ widths — every existing class is preserved by being promoted to a `lg:` or `xl:` prefix.
- Not touching the landing-page video / LoadingTornado section visually (only the canvas which is already fluid).
- Not adding container queries — Tailwind breakpoints are enough here and stay consistent with the existing code.

## Verification

1. Resize the dev preview to 375px (iPhone), 414px (large phone), 768px (iPad portrait), 1024px (iPad landscape), 1280px+ (desktop).
2. At each width, scroll through all sections: landing/hero, radar HUD, data panels, CO₂ chart, anomaly chart, local-temp chart, disaster witness gallery, birth-date vortex form, birth-day share page.
3. Confirm: no horizontal scrollbar, no text under 12px, no buttons under 44px tap area on mobile, charts scale to viewport width, share carousel is operable on touch.
4. At 1280px+, the page must look pixel-identical to the current state. Diff against a screenshot of the current desktop view to confirm zero regression.
