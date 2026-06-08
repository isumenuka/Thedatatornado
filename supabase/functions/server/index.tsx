import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use('*', logger(console.log));

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check
app.get("/make-server-7b7572b4/health", (c) => {
  return c.json({ status: "ok" });
});

// ── tornado_cache ─────────────────────────────────────────────────────────────

app.get("/make-server-7b7572b4/cache/:year", async (c) => {
  const year = parseInt(c.req.param("year"), 10);
  if (!Number.isFinite(year)) return c.json({ error: "Invalid year" }, 400);
  const data = await kv.get(`tornado_cache:${year}`);
  if (!data) return c.json({ cached: false });
  return c.json({ cached: true, ...data });
});

app.post("/make-server-7b7572b4/cache/:year", async (c) => {
  const year = parseInt(c.req.param("year"), 10);
  if (!Number.isFinite(year)) return c.json({ error: "Invalid year" }, 400);
  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  await kv.set(`tornado_cache:${year}`, { year, ...body, generated_at: new Date().toISOString() });
  return c.json({ ok: true });
});

// ── shared_tornadoes ──────────────────────────────────────────────────────────

app.post("/make-server-7b7572b4/share", async (c) => {
  let body: { birth_year?: number; share_text?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const { birth_year, share_text } = body;
  if (!birth_year || !share_text) {
    return c.json({ error: "birth_year and share_text are required" }, 400);
  }
  const id = crypto.randomUUID();
  await kv.set(`share:${id}`, {
    id,
    birth_year,
    share_text,
    view_count: 0,
    created_at: new Date().toISOString(),
  });
  console.log(`Share created: id=${id} year=${birth_year}`);
  return c.json({ id });
});

app.get("/make-server-7b7572b4/share/:id", async (c) => {
  const id = c.req.param("id");
  const record = await kv.get(`share:${id}`);
  if (!record) {
    return c.json({ error: "Share not found" }, 404);
  }
  const updated = { ...record, view_count: (record.view_count ?? 0) + 1 };
  await kv.set(`share:${id}`, updated);
  console.log(`Share viewed: id=${id} views=${updated.view_count}`);
  return c.json(updated);
});

// ── live_readings ─────────────────────────────────────────────────────────────

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

app.get("/make-server-7b7572b4/live", async (c) => {
  // Return cached reading if fresh
  const cached = await kv.get("live:latest");
  if (cached?.fetched_at) {
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    if (age < SIX_HOURS_MS) {
      console.log(`Live cache hit — age: ${Math.round(age / 60000)}min`);
      return c.json(cached);
    }
  }

  // Fetch latest weekly CO₂ from NOAA GML (free public CSV, no auth)
  let current_co2: number | null = null;
  try {
    const res = await fetch("https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_weekly_mlo.csv");
    const text = await res.text();
    const dataLines = text.split("\n").filter(l => l.trim() && !l.startsWith("#"));
    const lastLine = dataLines[dataLines.length - 1];
    // CSV columns: year,month,day,decimal_year,weekly_mean,n_days,-999=missing
    const cols = lastLine.trim().split(",");
    const val = parseFloat(cols[4]);
    if (Number.isFinite(val) && val > 300) current_co2 = val;
    console.log(`GML CO₂ fetched: ${current_co2} ppm`);
  } catch (err) {
    console.log(`GML CO₂ fetch error: ${err}`);
  }

  // Fetch recent TAVG from NOAA CDO for Central Park (GHCND:USW00094728)
  let current_sst: number | null = null;
  const cdoToken = Deno.env.get("NOAA_CDO_TOKEN");
  if (cdoToken) {
    try {
      const now = new Date();
      const twoMonthsAgo = new Date(now);
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      const start = twoMonthsAgo.toISOString().slice(0, 10);
      const end = now.toISOString().slice(0, 10);
      const url = `https://www.ncei.noaa.gov/cdo-web/api/v2/data?datasetid=GSOM&stationid=GHCND:USW00094728&datatypeid=TAVG&startdate=${start}&enddate=${end}&units=metric&limit=10`;
      const res = await fetch(url, { headers: { token: cdoToken } });
      const json = await res.json();
      if (json.results?.length) {
        const latest = json.results[json.results.length - 1];
        // Anomaly vs 1951–1980 Central Park baseline (~12.5°C)
        current_sst = parseFloat((latest.value - 12.5).toFixed(2));
        console.log(`CDO TAVG fetched: ${latest.value}°C → anomaly ${current_sst}`);
      }
    } catch (err) {
      console.log(`CDO temp fetch error: ${err}`);
    }
  } else {
    console.log("NOAA_CDO_TOKEN not set — skipping CDO temperature fetch");
  }

  const live = {
    fetched_at: new Date().toISOString(),
    current_co2,
    current_sst,
    current_image_url: "",
  };
  await kv.set("live:latest", live);
  return c.json(live);
});

Deno.serve(app.fetch);
