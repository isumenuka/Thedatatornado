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

// ── birth-date historical events ──────────────────────────────────────────────

interface BirthEvent {
  title: string;
  date: string;
  description: string;
  imageUrl?: string;
  sourceName: string;
  sourceUrl?: string;
  matchLevel: "exact" | "day-month" | "month-year" | "year" | "nearby";
  category: "tornado" | "disaster" | "weather" | "world" | "other";
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function classifyEvent(text: string): BirthEvent["category"] {
  const t = text.toLowerCase();
  if (t.includes("tornado") || t.includes("twister") || t.includes("funnel cloud")) return "tornado";
  if (t.includes("hurricane") || t.includes("typhoon") || t.includes("cyclone") || t.includes("earthquake") ||
      t.includes("tsunami") || t.includes("flood") || t.includes("wildfire") || t.includes("volcano") ||
      t.includes("disaster")) return "disaster";
  if (t.includes("storm") || t.includes("blizzard") || t.includes("heatwave") || t.includes("drought") ||
      t.includes("weather")) return "weather";
  if (t.includes("war") || t.includes("election") || t.includes("president") || t.includes("treaty") ||
      t.includes("assassinat") || t.includes("space") || t.includes("launch")) return "world";
  return "other";
}

async function fetchWikipediaOnThisDay(month: number, day: number): Promise<BirthEvent[]> {
  try {
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`;
    const res = await fetch(url, { headers: { "User-Agent": "TheDataTornado/1.0 (birth-events lookup)" } });
    if (!res.ok) return [];
    const data = await res.json();
    const events = Array.isArray(data.events) ? data.events : [];
    return events.map((ev: any) => {
      const page = ev.pages?.[0];
      const text = ev.text || "";
      return {
        title: page?.normalizedtitle || page?.titles?.normalized || text.split(".")[0],
        date: `${MONTH_NAMES[month - 1]} ${day}, ${ev.year}`,
        description: text,
        imageUrl: page?.thumbnail?.source || page?.originalimage?.source,
        sourceName: "Wikipedia",
        sourceUrl: page?.content_urls?.desktop?.page,
        matchLevel: "day-month" as const,
        category: classifyEvent(text + " " + (page?.extract || "")),
        _year: ev.year as number,
      };
    });
  } catch (err) {
    console.error(`Wikipedia OnThisDay fetch error: ${err}`);
    return [];
  }
}

async function fetchNewsAPI(query: string, from?: string, to?: string): Promise<BirthEvent[]> {
  const key = Deno.env.get("NEWSAPI_KEY");
  if (!key) return [];
  try {
    const params = new URLSearchParams({ q: query, sortBy: "relevancy", pageSize: "10", language: "en", apiKey: key });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`https://newsapi.org/v2/everything?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.articles || []).map((a: any) => ({
      title: a.title || "Event",
      date: a.publishedAt ? new Date(a.publishedAt).toDateString() : "Unknown",
      description: a.description || a.content || "",
      imageUrl: a.urlToImage,
      sourceName: a.source?.name || "NewsAPI",
      sourceUrl: a.url,
      matchLevel: "nearby" as const,
      category: classifyEvent((a.title || "") + " " + (a.description || "")),
    }));
  } catch (err) {
    console.error(`NewsAPI fetch error: ${err}`);
    return [];
  }
}

async function fetchNewsDataIO(query: string, from?: string, to?: string): Promise<BirthEvent[]> {
  const key = Deno.env.get("NEWSDATA_IO_KEY");
  if (!key) return [];
  try {
    const params = new URLSearchParams({ apikey: key, q: query, language: "en" });
    if (from) params.set("from_date", from);
    if (to) params.set("to_date", to);
    const res = await fetch(`https://newsdata.io/api/1/archive?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((a: any) => ({
      title: a.title || "Event",
      date: a.pubDate ? new Date(a.pubDate).toDateString() : "Unknown",
      description: a.description || "",
      imageUrl: a.image_url,
      sourceName: a.source_id || "NewsData.io",
      sourceUrl: a.link,
      matchLevel: "nearby" as const,
      category: classifyEvent((a.title || "") + " " + (a.description || "")),
    }));
  } catch (err) {
    console.error(`NewsData.io fetch error: ${err}`);
    return [];
  }
}

async function fetchTheNewsAPI(query: string, from?: string, to?: string): Promise<BirthEvent[]> {
  const key = Deno.env.get("THENEWSAPI_KEY");
  if (!key) return [];
  try {
    const params = new URLSearchParams({ api_token: key, search: query, language: "en", limit: "10" });
    if (from) params.set("published_after", from);
    if (to) params.set("published_before", to);
    const res = await fetch(`https://api.thenewsapi.com/v1/news/all?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map((a: any) => ({
      title: a.title || "Event",
      date: a.published_at ? new Date(a.published_at).toDateString() : "Unknown",
      description: a.description || a.snippet || "",
      imageUrl: a.image_url,
      sourceName: a.source || "TheNewsAPI",
      sourceUrl: a.url,
      matchLevel: "nearby" as const,
      category: classifyEvent((a.title || "") + " " + (a.description || "")),
    }));
  } catch (err) {
    console.error(`TheNewsAPI fetch error: ${err}`);
    return [];
  }
}

function rankEvents(events: BirthEvent[]): BirthEvent[] {
  const matchOrder = { exact: 0, "day-month": 1, "month-year": 2, year: 3, nearby: 4 };
  const catOrder = { tornado: 0, disaster: 1, weather: 2, world: 3, other: 4 };
  return [...events].sort((a, b) => {
    const m = matchOrder[a.matchLevel] - matchOrder[b.matchLevel];
    if (m !== 0) return m;
    return catOrder[a.category] - catOrder[b.category];
  });
}

app.post("/make-server-7b7572b4/birth-events", async (c) => {
  let body: { day?: number; month?: number; year?: number };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const day = Number(body.day);
  const month = Number(body.month);
  const year = Number(body.year);
  if (!Number.isInteger(day) || day < 1 || day > 31 ||
      !Number.isInteger(month) || month < 1 || month > 12 ||
      !Number.isInteger(year) || year < 1900 || year > new Date().getFullYear()) {
    return c.json({ error: "day (1-31), month (1-12), year (1900-current) required" }, 400);
  }

  const cacheKey = `birth_events:${day}-${month}-${year}`;
  const cached = await kv.get(cacheKey);
  if (cached?.fetched_at) {
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    if (age < 7 * 24 * 60 * 60 * 1000) {
      console.log(`birth-events cache hit: ${cacheKey}`);
      return c.json(cached);
    }
  }

  const collected: BirthEvent[] = [];

  // 1. Wikipedia On This Day — full history, free
  const wikiEvents = await fetchWikipediaOnThisDay(month, day);
  for (const ev of wikiEvents) {
    const evYear = (ev as any)._year;
    delete (ev as any)._year;
    if (evYear === year) ev.matchLevel = "exact";
    else if (evYear) ev.matchLevel = "day-month";
    collected.push(ev);
  }

  // 2. News providers — useful for recent birth years (within ~30 days for NewsAPI free tier)
  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const fromDate = new Date(year, month - 1, Math.max(1, day - 3));
  const toDate = new Date(year, month - 1, Math.min(28, day + 3));
  const fromStr = fromDate.toISOString().slice(0, 10);
  const toStr = toDate.toISOString().slice(0, 10);
  const queries = ["tornado", "natural disaster", "extreme weather"];

  const newsResults = await Promise.all([
    ...queries.map(q => fetchNewsAPI(q, fromStr, toStr)),
    ...queries.map(q => fetchNewsDataIO(q, fromStr, toStr)),
    ...queries.map(q => fetchTheNewsAPI(q, fromStr, toStr)),
  ]);
  for (const batch of newsResults) {
    for (const ev of batch) {
      // Try to refine matchLevel from publication date
      const evDate = new Date(ev.date);
      if (Number.isFinite(evDate.getTime())) {
        if (evDate.getFullYear() === year && evDate.getMonth() + 1 === month && evDate.getDate() === day) ev.matchLevel = "exact";
        else if (evDate.getFullYear() === year && evDate.getMonth() + 1 === month) ev.matchLevel = "month-year";
        else if (evDate.getFullYear() === year) ev.matchLevel = "year";
      }
      collected.push(ev);
    }
  }

  const ranked = rankEvents(collected);

  // Tiered selection: prefer tornado > disaster > weather > world
  const tornadoes = ranked.filter(e => e.category === "tornado");
  const disasters = ranked.filter(e => e.category === "disaster");
  const weather = ranked.filter(e => e.category === "weather");
  const world = ranked.filter(e => e.category === "world");
  const featured =
    tornadoes[0] || disasters[0] || weather[0] || world[0] || ranked[0] || null;

  const result = {
    fetched_at: new Date().toISOString(),
    query: { day, month, year, dateString: dateStr },
    featured,
    tornadoes: tornadoes.slice(0, 5),
    disasters: disasters.slice(0, 5),
    weather: weather.slice(0, 5),
    world: world.slice(0, 5),
    totalFound: ranked.length,
  };

  await kv.set(cacheKey, result);
  console.log(`birth-events fetched: ${dateStr} — ${ranked.length} events`);
  return c.json(result);
});

Deno.serve(app.fetch);
