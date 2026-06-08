# Plan: Supabase — Caching, Sharing & Live Readings

## Context

The Data Tornado is currently fully static — no persistence, no sharing, no live data. This plan wires up a Supabase backend to add three capabilities:

1. **tornado_cache** — per-year climate data + image URL cache (avoids re-generating)
2. **shared_tornadoes** — viral birth-year share links with unique URLs and view counts
3. **live_readings** — real NOAA CO₂ and temperature data, cached for 6 hours so users don't hammer the API

## Constraint: No New Tables

The Make environment supports only the existing `kv_store_7b7572b4` table. All three logical "tables" are implemented as structured KV key namespaces — flexible, no setup required.

| Schema | KV key pattern | Value shape |
|---|---|---|
| tornado_cache | `tornado_cache:{year}` | `{ year, co2_ppm, sst_anomaly, temp_index, image_url_1x1, image_url_16x9, image_url_9x16, generated_at }` |
| shared_tornadoes | `share:{uuid}` | `{ id, birth_year, share_text, view_count, created_at }` |
| live_readings | `live:latest` | `{ fetched_at, current_co2, current_sst, current_image_url }` |

KV functions used: `get`, `set` — from `/supabase/functions/server/kv_store.tsx`.

---

## 1. Server Routes

**File:** `/supabase/functions/server/index.tsx`  
Currently has only `GET /make-server-7b7572b4/health`. Add five new routes:

### `GET /make-server-7b7572b4/cache/:year`
Return stored tornado_cache entry for year, or `{ cached: false }`.

### `POST /make-server-7b7572b4/cache/:year`
Body: `{ co2_ppm, sst_anomaly, temp_index, image_url_1x1, image_url_16x9, image_url_9x16 }`  
Write to KV with `generated_at: new Date().toISOString()`. Return `{ ok: true }`.

### `POST /make-server-7b7572b4/share`
Body: `{ birth_year, share_text }`  
Generate UUID with `crypto.randomUUID()`. Write KV key `share:{uuid}` with `view_count: 0`.  
Return `{ id: uuid }`.

### `GET /make-server-7b7572b4/share/:id`
Read KV `share:{id}`. If not found → 404.  
Increment `view_count` and re-write. Return full record.

### `GET /make-server-7b7572b4/live`
1. Read `live:latest` from KV.
2. If exists and `fetched_at` is less than 6 hours ago → return cached value.
3. Otherwise fetch fresh data from two sources (see below), write `live:latest`, return it.

---

## 2. Live Data Sources

**CO₂ (no API key needed):**  
`https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_weekly_mlo.csv` — NOAA GML public endpoint.  
Parse: skip `#` comment lines, grab last data line, column index 4 = weekly average PPM.

**Temperature (requires NOAA CDO token):**  
NOAA CDO REST API: `https://www.ncei.noaa.gov/cdo-web/api/v2/data`  
- Dataset: `GSOM`, datatype: `TAVG`, station: `GHCND:USW00094728` (Central Park)  
- Date range: last 2 months (to ensure at least one result despite ~1-month CDO lag)  
- Token in header: `token: ${Deno.env.get("NOAA_CDO_TOKEN")}`  
- `current_sst` = fetched TAVG minus 12.5°C (historical 1951–1980 Central Park baseline, consistent with CLIMATE_DATA's early-era `avg_tavg_celsius` values)

**`current_image_url`:** Left empty string on initial write — populated later by image generation. The live panel can omit the image field gracefully.

**Secret needed:** `NOAA_CDO_TOKEN` — use `create_supabase_secret` tool before writing server code.

---

## 3. Frontend Changes

### `data-tornado.tsx`

**Share Modal** (around lines 551–679, `ShareCard` component):
- `handleSubmit` currently only sets local state. After setting `submittedYear`, POST to server:
  ```
  POST /share  { birth_year: y, share_text: generatedShareText }
  → { id }
  ```
- Store `shareId` in state. Build URL: `window.location.origin + '?share=' + id`
- Copy the shareable URL (not just text) to clipboard
- Display view count returned from a follow-up GET if you want it; or skip for simplicity

**Live Data Toggle** (around lines 1562–1576):
- On `liveData` becoming `true`, fetch `GET /live`
- If response has `current_co2` and `current_sst`, store as `liveReading` state
- Compute noise delta: `co2delta = liveReading.current_co2 - CLIMATE_DATA[last].co2_ppm`
- Replace the simulated `setInterval` noise with this real delta, shown as a stable "LIVE • NOAA" offset rather than a flicker
- On `liveData` false, clear back to zero noise (existing behavior)

### `App.tsx`

On mount, parse `new URLSearchParams(window.location.search).get('share')`.  
If present:
1. Skip the LoadingTornado animation entirely (`setShowDashboard(true)` immediately)
2. Fetch `GET /share/:id` from server
3. Pass `defaultYear={record.birth_year}` prop to `DataTornado`
4. `DataTornado` currently has only `isReady` prop — add optional `defaultYear?: number` prop that seeds the year slider initial position (line 1530 is the export signature)

---

## 4. Files to Modify

| File | Change |
|---|---|
| `supabase/functions/server/index.tsx` | Add 5 routes (cache CRUD, share create/get, live) |
| `src/app/App.tsx` | Parse `?share=` param, pass `defaultYear` to DataTornado |
| `src/app/components/data-tornado.tsx` | Share POST, live fetch, `defaultYear` prop |

No new files needed.

---

## 5. Verification

1. **Share flow**: Submit a birth year in the modal → confirm a UUID URL appears → open that URL in a new tab → confirm the year slider jumps to that year → confirm `view_count` incremented
2. **Cache**: Hit `GET /cache/1985` before and after a POST → confirm round-trip
3. **Live toggle**: Enable LIVE DATA → confirm displayed CO₂ differs from static CLIMATE_DATA value and matches NOAA GML (check against `co2_weekly_mlo.csv` last line manually)
4. **6-hour cache**: Toggle live off and on within 6 hours → confirm server returns KV value without re-fetching (check server logs via `console.log`)
