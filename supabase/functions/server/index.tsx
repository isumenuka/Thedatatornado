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
  let body: {
    birth_year?: number;
    birth_month?: number;
    birth_day?: number;
    share_text?: string;
    events?: unknown;
    featured?: unknown;
    query?: unknown;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const { birth_year, birth_month, birth_day, share_text, events, featured, query } = body;
  if (!birth_year || !share_text) {
    return c.json({ error: "birth_year and share_text are required" }, 400);
  }
  const id = crypto.randomUUID();
  await kv.set(`share:${id}`, {
    id,
    birth_year,
    birth_month: birth_month ?? null,
    birth_day: birth_day ?? null,
    share_text,
    events: Array.isArray(events) ? events : [],
    featured: featured ?? null,
    query: query ?? null,
    view_count: 0,
    created_at: new Date().toISOString(),
  });
  console.log(`Share created: id=${id} date=${birth_day}/${birth_month}/${birth_year} events=${Array.isArray(events) ? events.length : 0}`);
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
  if (t.includes("tornado") || t.includes("twister") || t.includes("funnel cloud") || t.includes("supercell")) return "tornado";
  if (t.includes("hurricane") || t.includes("typhoon") || t.includes("cyclone") || t.includes("tsunami") ||
      t.includes("flood") || t.includes("wildfire") || t.includes("volcano") || t.includes("earthquake") ||
      t.includes("disaster")) return "disaster";
  if (t.includes("storm") || t.includes("blizzard") || t.includes("heatwave") || t.includes("drought") ||
      t.includes("hail") || t.includes("derecho") || t.includes("squall") || t.includes("severe weather") ||
      t.includes("weather")) return "weather";
  return "other";
}

// Strict relevance gate — accept only tornado / disaster / weather content.
function isRelevantWeatherEvent(text: string): boolean {
  const cat = classifyEvent(text);
  return cat === "tornado" || cat === "disaster" || cat === "weather";
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
  const queries = ["tornado", "severe storm", "severe weather"];

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

  // Strict filter — keep only tornado / disaster / weather events. Drop everything else.
  const relevant = collected.filter(
    (e) => e.category === "tornado" || e.category === "disaster" || e.category === "weather",
  );
  const ranked = rankEvents(relevant);

  const tornadoes = ranked.filter((e) => e.category === "tornado");
  const disasters = ranked.filter((e) => e.category === "disaster");
  const weather = ranked.filter((e) => e.category === "weather");
  const featured = tornadoes[0] || disasters[0] || weather[0] || null;

  const result = {
    fetched_at: new Date().toISOString(),
    query: { day, month, year, dateString: dateStr },
    featured,
    tornadoes: tornadoes.slice(0, 12),
    disasters: disasters.slice(0, 12),
    weather: weather.slice(0, 12),
    world: [],
    totalFound: ranked.length,
  };

  await kv.set(cacheKey, result);
  console.log(`birth-events fetched: ${dateStr} — ${ranked.length} events`);
  return c.json(result);
});

// ── gallery-events (locked set of 20 historic tornadoes; images resolved live) ─

interface GalleryEvent {
  id: string;
  sourceName: string;
  title: string;
  location: string;
  year: number;
  description: string;
  efScale: string;
  windSpeed: string;
  category: "vortex" | "damage" | "land" | "people";
  imageQuery: string;            // free-text search query for image lookup
  wikiCandidates: string[];      // Wikipedia page titles to try in order
  imageUrl?: string;             // populated by enrichment
  imageSource?: string;          // wikipedia | newsapi | newsdata | thenewsapi | fallback
  fallbackImage: string;         // last-resort image (curated)
}

const GALLERY_EVENTS: GalleryEvent[] = [
  { id:"g01", sourceName:"NWS Survey Team", title:"Residential Foundations Swept Clean — Kentucky", location:"Mayfield, Kentucky, USA", year:2021, description:"The 2021 Western Kentucky EF4 outbreak swept hundreds of homes clean off their foundations. Only concrete slabs remained after the 160-mile destruction track.", efScale:"EF4", windSpeed:"190 mph", category:"damage", imageQuery:"Mayfield Kentucky 2021 tornado aftermath damage", wikiCandidates:["2021 Western Kentucky tornado","Tornado outbreak of December 10–11, 2021"], fallbackImage:"https://images.unsplash.com/photo-1542382156909-9ae37b3f56fd?q=80&w=1400&auto=format&fit=crop" },
  { id:"g02", sourceName:"NWS Survey Team", title:"Medical Center Structure Destroyed — Missouri", location:"Joplin, Missouri, USA", year:2011, description:"The devastating Joplin EF5 carved a mile-wide path directly through the city, heavily damaging St. John's Regional Medical Center and leveling over 7,000 homes in minutes.", efScale:"EF5", windSpeed:"200+ mph", category:"damage", imageQuery:"Joplin Missouri 2011 tornado hospital damage", wikiCandidates:["2011 Joplin tornado"], fallbackImage:"https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1400&auto=format&fit=crop" },
  { id:"g03", sourceName:"NWS Survey Team", title:"Elementary Schools Severely Impacted — Oklahoma", location:"Moore, Oklahoma, USA", year:2013, description:"A violent EF5 tornado tore through heavily populated areas of Moore, completely flattening two elementary schools and sweeping brick homes entirely away.", efScale:"EF5", windSpeed:"210 mph", category:"damage", imageQuery:"Moore Oklahoma 2013 tornado school damage aerial", wikiCandidates:["2013 Moore tornado"], fallbackImage:"https://images.unsplash.com/photo-1509822929464-92b5d5578b94?q=80&w=1400&auto=format&fit=crop" },
  { id:"g04", sourceName:"NWS Survey Team", title:"Town Center Obliterated — Iowa", location:"Greenfield, Iowa, USA", year:2024, description:"An extremely fast-moving EF4 tornado produced catastrophic damage in Greenfield, Iowa. Massive wind turbines were snapped in half and numerous homes were reduced to splinters.", efScale:"EF4", windSpeed:"185 mph", category:"damage", imageQuery:"Greenfield Iowa 2024 tornado wind turbine damage", wikiCandidates:["2024 Greenfield tornado","Tornado outbreak of May 19–27, 2024"], fallbackImage:"https://images.unsplash.com/photo-1590071089561-2480ec4b2ef0?q=80&w=1400&auto=format&fit=crop" },
  { id:"g05", sourceName:"NWS Survey Team", title:"Historic Downtown Leveled — Oklahoma", location:"Sulphur, Oklahoma, USA", year:2024, description:"A massive EF3 tornado moved through downtown Sulphur late at night, tearing the roofs and walls off historic brick buildings and tossing heavy vehicles into structures.", efScale:"EF3", windSpeed:"165 mph", category:"damage", imageQuery:"Sulphur Oklahoma 2024 tornado downtown damage", wikiCandidates:["Tornado outbreak of April 25–28, 2024","2024 Sulphur Oklahoma tornado"], fallbackImage:"https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1400&auto=format&fit=crop" },
  { id:"g06", sourceName:"DOW Mobile Radar Team", title:"Highest Recorded Winds — Oklahoma", location:"Bridge Creek, Oklahoma, USA", year:1999, description:"This historic F5 tornado produced the highest wind speeds ever recorded on Earth by mobile Doppler radar, deeply scouring the ground and wiping well-built homes off the map.", efScale:"F5", windSpeed:"301 mph (Radar Est.)", category:"vortex", imageQuery:"Bridge Creek Oklahoma 1999 tornado damage", wikiCandidates:["1999 Bridge Creek–Moore tornado"], fallbackImage:"https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?q=80&w=1400&auto=format&fit=crop" },
  { id:"g07", sourceName:"NWS Survey Team", title:"Major City Corridor Devastated — Alabama", location:"Tuscaloosa, Alabama, USA", year:2011, description:"A massive multi-vortex EF4 tornado tracked straight through Tuscaloosa, utterly destroying commercial corridors, student housing, and critical infrastructure along an 80-mile path.", efScale:"EF4", windSpeed:"190 mph", category:"damage", imageQuery:"Tuscaloosa Alabama 2011 tornado damage cityscape", wikiCandidates:["2011 Tuscaloosa–Birmingham tornado"], fallbackImage:"https://images.unsplash.com/photo-1509822929464-92b5d5578b94?q=80&w=1400&auto=format&fit=crop" },
  { id:"g08", sourceName:"NWS Survey Team", title:"Rural Communities Wiped Out — Alabama", location:"Hackleburg, Alabama, USA", year:2011, description:"One of the most violent tornadoes in the Super Outbreak completely leveled the town of Hackleburg, throwing vehicles hundreds of yards and causing profound ground scouring.", efScale:"EF5", windSpeed:"210 mph", category:"damage", imageQuery:"Hackleburg Alabama 2011 tornado damage aftermath", wikiCandidates:["2011 Hackleburg–Phil Campbell tornado"], fallbackImage:"https://images.unsplash.com/photo-1580687761972-e4c7a0ff9b52?q=80&w=1400&auto=format&fit=crop" },
  { id:"g09", sourceName:"NWS & DOW Radar Team", title:"Widest Tornado in History — Oklahoma", location:"El Reno, Oklahoma, USA", year:2013, description:"Breaking records with a maximum width of 2.6 miles, this erratic, rapidly expanding multiple-vortex tornado caught veteran storm chasers off guard.", efScale:"EF3", windSpeed:"295 mph (Radar Est.)", category:"vortex", imageQuery:"El Reno Oklahoma 2013 tornado widest funnel", wikiCandidates:["2013 El Reno tornado"], fallbackImage:"https://images.unsplash.com/photo-1461511669078-d46bf351cd6e?q=80&w=1400&auto=format&fit=crop" },
  { id:"g10", sourceName:"NWS Survey Team", title:"Nighttime Surprise Destruction — Mississippi", location:"Rolling Fork, Mississippi, USA", year:2023, description:"Striking under the cover of darkness, this violent EF4 tornado leveled the town of Rolling Fork, tossing massive water towers and obliterating nearly all commercial businesses.", efScale:"EF4", windSpeed:"195 mph", category:"damage", imageQuery:"Rolling Fork Mississippi 2023 tornado damage water tower", wikiCandidates:["2023 Rolling Fork–Silver City tornado","Tornado outbreak of March 24–27, 2023"], fallbackImage:"https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1400&auto=format&fit=crop" },
  { id:"g11", sourceName:"NWS Survey Team", title:"Green Rebuild After Total Loss — Kansas", location:"Greensburg, Kansas, USA", year:2007, description:"A massive 1.7-mile-wide EF5 wedge tornado destroyed 95% of Greensburg. The town famously rebuilt as one of the most environmentally sustainable communities in the country.", efScale:"EF5", windSpeed:"205 mph", category:"people", imageQuery:"Greensburg Kansas 2007 tornado aerial destruction", wikiCandidates:["2007 Greensburg tornado"], fallbackImage:"https://images.unsplash.com/photo-1560220604-1985ebfe28b1?q=80&w=1400&auto=format&fit=crop" },
  { id:"g12", sourceName:"NWS Survey Team", title:"Violent Supercell Outbreak — Iowa", location:"Parkersburg, Iowa, USA", year:2008, description:"In a matter of seconds, an EF5 tornado sheared well-built homes down to the subfloor and completely debarked trees, leaving behind an unrecognizable landscape.", efScale:"EF5", windSpeed:"205 mph", category:"damage", imageQuery:"Parkersburg Iowa 2008 tornado foundation damage", wikiCandidates:["2008 Parkersburg–New Hartford tornado"], fallbackImage:"https://images.unsplash.com/photo-1737674913154-ba7f49b6096e?q=80&w=1400&auto=format&fit=crop" },
  { id:"g13", sourceName:"Historical Survey Data", title:"Super Outbreak Devastation — Ohio", location:"Xenia, Ohio, USA", year:1974, description:"One of the most infamous tornadoes of the 1974 Super Outbreak, the Xenia F5 flattened entire subdivisions and tossed entire freight trains entirely off their tracks.", efScale:"F5", windSpeed:"260 mph (Est.)", category:"damage", imageQuery:"Xenia Ohio 1974 tornado train derailment damage", wikiCandidates:["1974 Xenia tornado","1974 Super Outbreak"], fallbackImage:"https://images.unsplash.com/photo-1542382156909-9ae37b3f56fd?q=80&w=1400&auto=format&fit=crop" },
  { id:"g14", sourceName:"Historical Survey Data", title:"Air Force Base in Path — Kansas", location:"Andover, Kansas, USA", year:1991, description:"A highly visible F5 tornado famously filmed by residents swept through the Golden Spur Mobile Home Park, completely erasing it and narrowly missing a fleet of B-1 bombers.", efScale:"F5", windSpeed:"260 mph (Est.)", category:"damage", imageQuery:"Andover Kansas 1991 tornado famous funnel", wikiCandidates:["1991 Andover tornado outbreak","Andover, Kansas tornado"], fallbackImage:"https://images.unsplash.com/photo-1590071089561-2480ec4b2ef0?q=80&w=1400&auto=format&fit=crop" },
  { id:"g15", sourceName:"Historical Survey Data", title:"Extreme Asphalt Scouring — Texas", location:"Jarrell, Texas, USA", year:1997, description:"Moving at a slow, creeping pace, this monstrous F5 tornado completely pulverized the Double Creek subdivision, scouring asphalt from roads and leaving absolutely nothing behind.", efScale:"F5", windSpeed:"260 mph (Est.)", category:"damage", imageQuery:"Jarrell Texas 1997 tornado asphalt scoured ground", wikiCandidates:["1997 Central Texas tornado outbreak","Jarrell tornado"], fallbackImage:"https://images.unsplash.com/photo-1534067783941-51c9c23eccfd?q=80&w=1400&auto=format&fit=crop" },
  { id:"g16", sourceName:"NWS Survey Team", title:"Double Tornado Strike — Arkansas", location:"Vilonia, Arkansas, USA", year:2014, description:"Striking a town that had just rebuilt from a 2011 tornado, this high-end EF4 leveled new subdivisions and completely destroyed the local intermediate school.", efScale:"EF4", windSpeed:"190 mph", category:"damage", imageQuery:"Vilonia Arkansas 2014 tornado neighborhood damage", wikiCandidates:["2014 Mayflower–Vilonia tornado","Tornado outbreak of April 27–30, 2014"], fallbackImage:"https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1400&auto=format&fit=crop" },
  { id:"g17", sourceName:"NWS Survey Team", title:"Twin Wedge Tornadoes — Mississippi", location:"Bassfield, Mississippi, USA", year:2020, description:"Part of a rare twin tornado event, this massive EF4 gouged deep trenches into the earth, shredded dense pine forests, and wiped sturdy homes completely off the map.", efScale:"EF4", windSpeed:"190 mph", category:"damage", imageQuery:"Bassfield Mississippi 2020 tornado forest damage", wikiCandidates:["2020 Easter tornado outbreak","Bassfield Mississippi tornado"], fallbackImage:"https://images.unsplash.com/photo-1599740831146-2713e2d6b38c?q=80&w=1400&auto=format&fit=crop" },
  { id:"g18", sourceName:"NWS Survey Team", title:"Tiny Hamlet Obliterated — Illinois", location:"Fairdale, Illinois, USA", year:2015, description:"A violently rotating EF4 swept through the small, tight-knit community of Fairdale, taking homes entirely off their foundations and tossing vehicles miles away.", efScale:"EF4", windSpeed:"200 mph", category:"damage", imageQuery:"Fairdale Illinois 2015 tornado drone aftermath", wikiCandidates:["2015 Rochelle–Fairdale tornado"], fallbackImage:"https://images.unsplash.com/photo-1580687761972-e4c7a0ff9b52?q=80&w=1400&auto=format&fit=crop" },
  { id:"g19", sourceName:"NWS Survey Team", title:"Suburban Tracts Destroyed — Illinois", location:"Washington, Illinois, USA", year:2013, description:"Occurring unusually late in the year, this powerful November EF4 leveled hundreds of homes in Washington, Illinois, tossing cars into living rooms and scattering debris for miles.", efScale:"EF4", windSpeed:"190 mph", category:"damage", imageQuery:"Washington Illinois 2013 tornado subdivision damage", wikiCandidates:["2013 Washington, Illinois tornado","November 17, 2013 tornado outbreak"], fallbackImage:"https://images.unsplash.com/photo-1509822929464-92b5d5578b94?q=80&w=1400&auto=format&fit=crop" },
  { id:"g20", sourceName:"Historical Survey Data", title:"Palm Sunday Outbreak — Indiana", location:"Midway, Indiana, USA", year:1965, description:"The infamous double-funneled tornado of the 1965 Palm Sunday Outbreak left profound destruction across mobile home parks, changing severe weather warning systems forever.", efScale:"F4", windSpeed:"200+ mph (Est.)", category:"damage", imageQuery:"Midway Indiana 1965 tornado Palm Sunday outbreak", wikiCandidates:["1965 Palm Sunday tornado outbreak"], fallbackImage:"https://images.unsplash.com/photo-1542382156909-9ae37b3f56fd?q=80&w=1400&auto=format&fit=crop" },
];

async function tryWikipediaImage(candidates: string[]): Promise<string | null> {
  for (const title of candidates) {
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`;
      const res = await fetch(url, { headers: { "User-Agent": "TheDataTornado/1.0 (gallery image lookup)" } });
      if (!res.ok) continue;
      const data = await res.json();
      const img = data.originalimage?.source || data.thumbnail?.source;
      if (img) return img;
    } catch {
      continue;
    }
  }
  return null;
}

async function tryNewsAPIImage(query: string): Promise<string | null> {
  const key = Deno.env.get("NEWSAPI_KEY");
  if (!key) return null;
  try {
    const res = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=relevancy&pageSize=5&language=en&apiKey=${key}`,
    );
    if (!res.ok) return null;
    const { articles } = await res.json();
    for (const a of articles || []) {
      if (a.urlToImage) return a.urlToImage;
    }
  } catch (err) {
    console.error(`NewsAPI image lookup error: ${err}`);
  }
  return null;
}

async function tryNewsDataImage(query: string): Promise<string | null> {
  const key = Deno.env.get("NEWSDATA_IO_KEY");
  if (!key) return null;
  try {
    const res = await fetch(
      `https://newsdata.io/api/1/news?apikey=${key}&q=${encodeURIComponent(query)}&language=en`,
    );
    if (!res.ok) return null;
    const { results } = await res.json();
    for (const a of results || []) {
      if (a.image_url) return a.image_url;
    }
  } catch (err) {
    console.error(`NewsData.io image lookup error: ${err}`);
  }
  return null;
}

async function tryTheNewsAPIImage(query: string): Promise<string | null> {
  const key = Deno.env.get("THENEWSAPI_KEY");
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.thenewsapi.com/v1/news/all?api_token=${key}&search=${encodeURIComponent(query)}&language=en&limit=5`,
    );
    if (!res.ok) return null;
    const { data } = await res.json();
    for (const a of data || []) {
      if (a.image_url) return a.image_url;
    }
  } catch (err) {
    console.error(`TheNewsAPI image lookup error: ${err}`);
  }
  return null;
}

async function resolveImageForEvent(
  ev: GalleryEvent,
): Promise<{ url: string; source: string }> {
  // 1. Wikipedia first (most accurate for famous tornadoes)
  const wiki = await tryWikipediaImage(ev.wikiCandidates);
  if (wiki) return { url: wiki, source: "wikipedia" };

  // 2. NewsAPI
  const news = await tryNewsAPIImage(ev.imageQuery);
  if (news) return { url: news, source: "newsapi" };

  // 3. NewsData.io
  const nd = await tryNewsDataImage(ev.imageQuery);
  if (nd) return { url: nd, source: "newsdata" };

  // 4. TheNewsAPI
  const tn = await tryTheNewsAPIImage(ev.imageQuery);
  if (tn) return { url: tn, source: "thenewsapi" };

  // 5. Curated Unsplash fallback
  return { url: ev.fallbackImage, source: "fallback" };
}

const GALLERY_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

app.get("/make-server-7b7572b4/gallery-events", async (c) => {
  const cached = await kv.get("gallery_events:latest");
  if (cached?.fetched_at) {
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    if (age < GALLERY_CACHE_TTL_MS) {
      console.log(`gallery-events cache hit — age: ${Math.round(age / 60000)}min`);
      return c.json(cached);
    }
  }

  // Resolve images in parallel (20 events × up to 4 sources each is fine)
  const enriched = await Promise.all(
    GALLERY_EVENTS.map(async (ev) => {
      const { url, source } = await resolveImageForEvent(ev);
      return {
        id: ev.id,
        sourceName: ev.sourceName,
        title: ev.title,
        location: ev.location,
        year: ev.year,
        description: ev.description,
        efScale: ev.efScale,
        windSpeed: ev.windSpeed,
        category: ev.category,
        imageUrl: url,
        imageSource: source,
      };
    }),
  );

  const sourceCounts = enriched.reduce<Record<string, number>>((acc, e) => {
    acc[e.imageSource] = (acc[e.imageSource] || 0) + 1;
    return acc;
  }, {});

  const payload = {
    fetched_at: new Date().toISOString(),
    events: enriched,
    count: enriched.length,
    imageSourceCounts: sourceCounts,
  };

  await kv.set("gallery_events:latest", payload);
  console.log(`gallery-events enriched: ${enriched.length} events, sources=${JSON.stringify(sourceCounts)}`);
  return c.json(payload);
});

// ── disaster-feed (used by Disaster Witness Gallery) ──────────────────────────

const DISASTER_FALLBACK_IMAGES: Record<string, string[]> = {
  vortex: [
    "https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?q=80&w=1400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1527482797697-8795b05a13fd?q=80&w=1400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1561470508-fd4df1ed90b2?q=80&w=1400&auto=format&fit=crop",
  ],
  damage: [
    "https://images.unsplash.com/photo-1542382156909-9ae37b3f56fd?q=80&w=1400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1590071089561-2480ec4b2ef0?q=80&w=1400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1509822929464-92b5d5578b94?q=80&w=1400&auto=format&fit=crop",
  ],
  land: [
    "https://images.unsplash.com/photo-1599740831146-2713e2d6b38c?q=80&w=1400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1534067783941-51c9c23eccfd?q=80&w=1400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=1400&auto=format&fit=crop",
  ],
  people: [
    "https://images.unsplash.com/photo-1606613817011-84d20b0959ca?q=80&w=1400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1560220604-1985ebfe28b1?q=80&w=1400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1531983412531-1f49a365ffed?q=80&w=1400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1518391846015-55a9cc003b25?q=80&w=1400&auto=format&fit=crop",
  ],
};

function classifyDisaster(text: string): "vortex" | "damage" | "land" | "people" {
  const t = text.toLowerCase();
  if (t.includes("funnel") || t.includes("vortex") || t.includes("rotation") || t.includes("supercell") || t.includes("tornado") || t.includes("twister")) return "vortex";
  if (t.includes("damage") || t.includes("destroyed") || t.includes("leveled") || t.includes("collapsed") || t.includes("flatten")) return "damage";
  if (t.includes("forest") || t.includes("field") || t.includes("flood") || t.includes("erosion") || t.includes("scour")) return "land";
  return "people";
}

// Strict gate: only accept articles whose text mentions tornado / severe weather terms.
function isRelevantDisaster(text: string): boolean {
  const t = text.toLowerCase();
  const tornadoTerms = ["tornado", "twister", "funnel cloud", "supercell", "wedge", "ef-5", "ef5", "ef-4", "ef4", "ef-3", "ef3"];
  const weatherTerms = ["storm", "severe weather", "thunderstorm", "hail", "derecho", "squall", "blizzard", "hurricane", "cyclone", "typhoon"];
  const all = [...tornadoTerms, ...weatherTerms];
  return all.some((term) => t.includes(term));
}

function pickFallbackImage(category: string, seed: number): string {
  const pool = DISASTER_FALLBACK_IMAGES[category] || DISASTER_FALLBACK_IMAGES.vortex;
  return pool[seed % pool.length];
}

const DISASTER_FEED_TTL_MS = 30 * 60 * 1000; // 30 min

app.get("/make-server-7b7572b4/disaster-feed", async (c) => {
  const cached = await kv.get("disaster_feed:latest");
  if (cached?.fetched_at) {
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    if (age < DISASTER_FEED_TTL_MS) {
      console.log(`disaster-feed cache hit — age: ${Math.round(age / 60000)}min`);
      return c.json(cached);
    }
  }

  const items: any[] = [];
  let usedSources: string[] = [];
  let seed = 0;

  // NewsAPI
  const newsApiKey = Deno.env.get("NEWSAPI_KEY");
  if (newsApiKey) {
    try {
      const res = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent("tornado OR \"severe storm\" OR \"severe weather\" OR \"supercell\"")}&sortBy=publishedAt&pageSize=30&language=en&apiKey=${newsApiKey}`,
      );
      if (res.ok) {
        const { articles } = await res.json();
        for (const a of articles || []) {
          const text = `${a.title || ""} ${a.description || ""}`;
          if (!isRelevantDisaster(text)) continue;
          const category = classifyDisaster(text);
          items.push({
            id: `na-${seed++}`,
            sourceName: a.source?.name || "NewsAPI",
            title: a.title || "Tornado Event",
            location: "Global",
            year: a.publishedAt ? new Date(a.publishedAt).getFullYear() : new Date().getFullYear(),
            description: a.description || "Tornado-related news event reported.",
            efScale: "Est. EF2+",
            windSpeed: "Severe",
            imageUrl: a.urlToImage || pickFallbackImage(category, seed),
            category,
            url: a.url,
          });
        }
        if (articles?.length) usedSources.push("NewsAPI");
      }
    } catch (err) {
      console.error(`NewsAPI disaster-feed error: ${err}`);
    }
  }

  // NewsData.io
  const newsDataKey = Deno.env.get("NEWSDATA_IO_KEY");
  if (newsDataKey) {
    try {
      const res = await fetch(
        `https://newsdata.io/api/1/news?apikey=${newsDataKey}&q=${encodeURIComponent("tornado OR \"severe storm\"")}&language=en&category=environment`,
      );
      if (res.ok) {
        const { results } = await res.json();
        for (const a of (results || []).slice(0, 20)) {
          const text = `${a.title || ""} ${a.description || ""}`;
          if (!isRelevantDisaster(text)) continue;
          const category = classifyDisaster(text);
          items.push({
            id: `nd-${seed++}`,
            sourceName: a.source_id || "NewsData.io",
            title: a.title || "Disaster Event",
            location: (a.country?.[0] || "Global").toUpperCase(),
            year: a.pubDate ? new Date(a.pubDate).getFullYear() : new Date().getFullYear(),
            description: a.description || "Disaster event reported.",
            efScale: "Est. EF2+",
            windSpeed: "Severe",
            imageUrl: a.image_url || pickFallbackImage(category, seed),
            category,
            url: a.link,
          });
        }
        if (results?.length) usedSources.push("NewsData.io");
      }
    } catch (err) {
      console.error(`NewsData.io disaster-feed error: ${err}`);
    }
  }

  // TheNewsAPI
  const theNewsApiKey = Deno.env.get("THENEWSAPI_KEY");
  if (theNewsApiKey) {
    try {
      const res = await fetch(
        `https://api.thenewsapi.com/v1/news/all?api_token=${theNewsApiKey}&search=${encodeURIComponent("tornado | \"severe storm\" | \"severe weather\"")}&language=en&limit=25`,
      );
      if (res.ok) {
        const { data } = await res.json();
        for (const a of data || []) {
          const text = `${a.title || ""} ${a.description || ""}`;
          if (!isRelevantDisaster(text)) continue;
          const category = classifyDisaster(text);
          items.push({
            id: `tn-${seed++}`,
            sourceName: a.source || "TheNewsAPI",
            title: a.title || "Storm Event",
            location: "Global",
            year: a.published_at ? new Date(a.published_at).getFullYear() : new Date().getFullYear(),
            description: a.description || a.snippet || "Severe weather event reported.",
            efScale: "Est. EF2+",
            windSpeed: "Severe",
            imageUrl: a.image_url || pickFallbackImage(category, seed),
            category,
            url: a.url,
          });
        }
        if (data?.length) usedSources.push("TheNewsAPI");
      }
    } catch (err) {
      console.error(`TheNewsAPI disaster-feed error: ${err}`);
    }
  }

  // NWS active tornado alerts (always free)
  try {
    const res = await fetch(
      "https://api.weather.gov/alerts/active?event=Tornado%20Warning,Tornado%20Watch",
      { headers: { "User-Agent": "TheDataTornado/1.0" } },
    );
    if (res.ok) {
      const { features } = await res.json();
      for (const f of (features || []).slice(0, 15)) {
        const p = f.properties;
        const category = "vortex";
        items.push({
          id: `nws-${seed++}`,
          sourceName: p.senderName || "NWS",
          title: p.headline || p.event,
          location: (p.areaDesc || "USA").split(";")[0],
          year: p.sent ? new Date(p.sent).getFullYear() : new Date().getFullYear(),
          description: p.description || "Active tornado alert.",
          efScale: p.severity === "Extreme" ? "EF4+ Alert" : "EF2 Alert",
          windSpeed: p.severity === "Extreme" ? ">165 mph" : "Severe",
          imageUrl: pickFallbackImage(category, seed),
          category,
          url: p.uri,
        });
      }
      if (features?.length) usedSources.push("NWS");
    }
  } catch (err) {
    console.error(`NWS disaster-feed error: ${err}`);
  }

  const feed = {
    fetched_at: new Date().toISOString(),
    sources: usedSources,
    sourceName: usedSources.length ? `Live: ${usedSources.join(" · ")}` : "Historical Database",
    items,
    count: items.length,
  };
  await kv.set("disaster_feed:latest", feed);
  console.log(`disaster-feed fetched: ${items.length} items from ${usedSources.join(",")}`);
  return c.json(feed);
});

Deno.serve(app.fetch);
