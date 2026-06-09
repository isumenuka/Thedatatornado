import { useState, useEffect } from "react";
import { Wind, Radio, AlertCircle, Crosshair, Activity } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";


interface NewsItem {
  id: string;
  sourceName: string;
  title: string;
  location: string;
  year: number;
  description: string;
  efScale?: string;
  windSpeed?: string;
  imageUrl: string;
  category: "vortex" | "damage" | "land" | "people";
}

// Locked set of 20 historic tornado events. Images are resolved server-side from
// Wikipedia → NewsAPI → NewsData.io → TheNewsAPI → curated fallback (see /gallery-events).
// These initial Unsplash URLs are placeholder fallbacks shown only until the server responds.
const DISASTER_DATASET: NewsItem[] = [
  { id:"g01", sourceName:"NWS Survey Team", title:"Residential Foundations Swept Clean — Kentucky", location:"Mayfield, Kentucky, USA", year:2021, description:"The 2021 Western Kentucky EF4 outbreak swept hundreds of homes clean off their foundations. Only concrete slabs remained after the 160-mile destruction track.", efScale:"EF4", windSpeed:"190 mph", imageUrl:"https://images.unsplash.com/photo-1542382156909-9ae37b3f56fd?q=80&w=1400&auto=format&fit=crop", category:"damage" },
  { id:"g02", sourceName:"NWS Survey Team", title:"Medical Center Structure Destroyed — Missouri", location:"Joplin, Missouri, USA", year:2011, description:"The devastating Joplin EF5 carved a mile-wide path directly through the city, heavily damaging St. John's Regional Medical Center and leveling over 7,000 homes in minutes.", efScale:"EF5", windSpeed:"200+ mph", imageUrl:"https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1400&auto=format&fit=crop", category:"damage" },
  { id:"g03", sourceName:"NWS Survey Team", title:"Elementary Schools Severely Impacted — Oklahoma", location:"Moore, Oklahoma, USA", year:2013, description:"A violent EF5 tornado tore through heavily populated areas of Moore, completely flattening two elementary schools and sweeping brick homes entirely away.", efScale:"EF5", windSpeed:"210 mph", imageUrl:"https://images.unsplash.com/photo-1509822929464-92b5d5578b94?q=80&w=1400&auto=format&fit=crop", category:"damage" },
  { id:"g04", sourceName:"NWS Survey Team", title:"Town Center Obliterated — Iowa", location:"Greenfield, Iowa, USA", year:2024, description:"An extremely fast-moving EF4 tornado produced catastrophic damage in Greenfield, Iowa. Massive wind turbines were snapped in half and numerous homes were reduced to splinters.", efScale:"EF4", windSpeed:"185 mph", imageUrl:"https://images.unsplash.com/photo-1590071089561-2480ec4b2ef0?q=80&w=1400&auto=format&fit=crop", category:"damage" },
  { id:"g05", sourceName:"NWS Survey Team", title:"Historic Downtown Leveled — Oklahoma", location:"Sulphur, Oklahoma, USA", year:2024, description:"A massive EF3 tornado moved through downtown Sulphur late at night, tearing the roofs and walls off historic brick buildings and tossing heavy vehicles into structures.", efScale:"EF3", windSpeed:"165 mph", imageUrl:"https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1400&auto=format&fit=crop", category:"damage" },
  { id:"g06", sourceName:"DOW Mobile Radar Team", title:"Highest Recorded Winds — Oklahoma", location:"Bridge Creek, Oklahoma, USA", year:1999, description:"This historic F5 tornado produced the highest wind speeds ever recorded on Earth by mobile Doppler radar, deeply scouring the ground and wiping well-built homes off the map.", efScale:"F5", windSpeed:"301 mph (Radar Est.)", imageUrl:"https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?q=80&w=1400&auto=format&fit=crop", category:"vortex" },
  { id:"g07", sourceName:"NWS Survey Team", title:"Major City Corridor Devastated — Alabama", location:"Tuscaloosa, Alabama, USA", year:2011, description:"A massive multi-vortex EF4 tornado tracked straight through Tuscaloosa, utterly destroying commercial corridors, student housing, and critical infrastructure along an 80-mile path.", efScale:"EF4", windSpeed:"190 mph", imageUrl:"https://images.unsplash.com/photo-1509822929464-92b5d5578b94?q=80&w=1400&auto=format&fit=crop", category:"damage" },
  { id:"g08", sourceName:"NWS Survey Team", title:"Rural Communities Wiped Out — Alabama", location:"Hackleburg, Alabama, USA", year:2011, description:"One of the most violent tornadoes in the Super Outbreak completely leveled the town of Hackleburg, throwing vehicles hundreds of yards and causing profound ground scouring.", efScale:"EF5", windSpeed:"210 mph", imageUrl:"https://images.unsplash.com/photo-1580687761972-e4c7a0ff9b52?q=80&w=1400&auto=format&fit=crop", category:"damage" },
  { id:"g09", sourceName:"NWS & DOW Radar Team", title:"Widest Tornado in History — Oklahoma", location:"El Reno, Oklahoma, USA", year:2013, description:"Breaking records with a maximum width of 2.6 miles, this erratic, rapidly expanding multiple-vortex tornado caught veteran storm chasers off guard.", efScale:"EF3", windSpeed:"295 mph (Radar Est.)", imageUrl:"https://images.unsplash.com/photo-1461511669078-d46bf351cd6e?q=80&w=1400&auto=format&fit=crop", category:"vortex" },
  { id:"g10", sourceName:"NWS Survey Team", title:"Nighttime Surprise Destruction — Mississippi", location:"Rolling Fork, Mississippi, USA", year:2023, description:"Striking under the cover of darkness, this violent EF4 tornado leveled the town of Rolling Fork, tossing massive water towers and obliterating nearly all commercial businesses.", efScale:"EF4", windSpeed:"195 mph", imageUrl:"https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1400&auto=format&fit=crop", category:"damage" },
  { id:"g11", sourceName:"NWS Survey Team", title:"Green Rebuild After Total Loss — Kansas", location:"Greensburg, Kansas, USA", year:2007, description:"A massive 1.7-mile-wide EF5 wedge tornado destroyed 95% of Greensburg. The town famously rebuilt as one of the most environmentally sustainable communities in the country.", efScale:"EF5", windSpeed:"205 mph", imageUrl:"https://images.unsplash.com/photo-1560220604-1985ebfe28b1?q=80&w=1400&auto=format&fit=crop", category:"people" },
  { id:"g12", sourceName:"NWS Survey Team", title:"Violent Supercell Outbreak — Iowa", location:"Parkersburg, Iowa, USA", year:2008, description:"In a matter of seconds, an EF5 tornado sheared well-built homes down to the subfloor and completely debarked trees, leaving behind an unrecognizable landscape.", efScale:"EF5", windSpeed:"205 mph", imageUrl:"https://images.unsplash.com/photo-1737674913154-ba7f49b6096e?q=80&w=1400&auto=format&fit=crop", category:"damage" },
  { id:"g13", sourceName:"Historical Survey Data", title:"Super Outbreak Devastation — Ohio", location:"Xenia, Ohio, USA", year:1974, description:"One of the most infamous tornadoes of the 1974 Super Outbreak, the Xenia F5 flattened entire subdivisions and tossed entire freight trains entirely off their tracks.", efScale:"F5", windSpeed:"260 mph (Est.)", imageUrl:"https://images.unsplash.com/photo-1542382156909-9ae37b3f56fd?q=80&w=1400&auto=format&fit=crop", category:"damage" },
  { id:"g14", sourceName:"Historical Survey Data", title:"Air Force Base in Path — Kansas", location:"Andover, Kansas, USA", year:1991, description:"A highly visible F5 tornado famously filmed by residents swept through the Golden Spur Mobile Home Park, completely erasing it and narrowly missing a fleet of B-1 bombers.", efScale:"F5", windSpeed:"260 mph (Est.)", imageUrl:"https://images.unsplash.com/photo-1590071089561-2480ec4b2ef0?q=80&w=1400&auto=format&fit=crop", category:"damage" },
  { id:"g15", sourceName:"Historical Survey Data", title:"Extreme Asphalt Scouring — Texas", location:"Jarrell, Texas, USA", year:1997, description:"Moving at a slow, creeping pace, this monstrous F5 tornado completely pulverized the Double Creek subdivision, scouring asphalt from roads and leaving absolutely nothing behind.", efScale:"F5", windSpeed:"260 mph (Est.)", imageUrl:"https://images.unsplash.com/photo-1534067783941-51c9c23eccfd?q=80&w=1400&auto=format&fit=crop", category:"damage" },
  { id:"g16", sourceName:"NWS Survey Team", title:"Double Tornado Strike — Arkansas", location:"Vilonia, Arkansas, USA", year:2014, description:"Striking a town that had just rebuilt from a 2011 tornado, this high-end EF4 leveled new subdivisions and completely destroyed the local intermediate school.", efScale:"EF4", windSpeed:"190 mph", imageUrl:"https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1400&auto=format&fit=crop", category:"damage" },
  { id:"g17", sourceName:"NWS Survey Team", title:"Twin Wedge Tornadoes — Mississippi", location:"Bassfield, Mississippi, USA", year:2020, description:"Part of a rare twin tornado event, this massive EF4 gouged deep trenches into the earth, shredded dense pine forests, and wiped sturdy homes completely off the map.", efScale:"EF4", windSpeed:"190 mph", imageUrl:"https://images.unsplash.com/photo-1599740831146-2713e2d6b38c?q=80&w=1400&auto=format&fit=crop", category:"damage" },
  { id:"g18", sourceName:"NWS Survey Team", title:"Tiny Hamlet Obliterated — Illinois", location:"Fairdale, Illinois, USA", year:2015, description:"A violently rotating EF4 swept through the small, tight-knit community of Fairdale, taking homes entirely off their foundations and tossing vehicles miles away.", efScale:"EF4", windSpeed:"200 mph", imageUrl:"https://images.unsplash.com/photo-1580687761972-e4c7a0ff9b52?q=80&w=1400&auto=format&fit=crop", category:"damage" },
  { id:"g19", sourceName:"NWS Survey Team", title:"Suburban Tracts Destroyed — Illinois", location:"Washington, Illinois, USA", year:2013, description:"Occurring unusually late in the year, this powerful November EF4 leveled hundreds of homes in Washington, Illinois, tossing cars into living rooms and scattering debris for miles.", efScale:"EF4", windSpeed:"190 mph", imageUrl:"https://images.unsplash.com/photo-1509822929464-92b5d5578b94?q=80&w=1400&auto=format&fit=crop", category:"damage" },
  { id:"g20", sourceName:"Historical Survey Data", title:"Palm Sunday Outbreak — Indiana", location:"Midway, Indiana, USA", year:1965, description:"The infamous double-funneled tornado of the 1965 Palm Sunday Outbreak left profound destruction across mobile home parks, changing severe weather warning systems forever.", efScale:"F4", windSpeed:"200+ mph (Est.)", imageUrl:"https://images.unsplash.com/photo-1542382156909-9ae37b3f56fd?q=80&w=1400&auto=format&fit=crop", category:"damage" },
];


const CATEGORY_COLORS: Record<string, string> = {
  vortex: "#4FC3F7",
  damage: "#E53935",
  land: "#81C784",
  people: "#FFB74D",
};

interface DebrisItem {
  uuid: string;
  newsItem: NewsItem;
  top: number;
  width: number;
  height: number;
  spawnTime: number;
}

export default function DisasterWitnessGallery() {
  const [activeDebris, setActiveDebris] = useState<DebrisItem[]>([]);
  const [hoveredItem, setHoveredItem] = useState<NewsItem | null>(null);
  const [feedSource, setFeedSource] = useState<string>("Historical Database");
  const [liveFeed, setLiveFeed] = useState<NewsItem[]>(DISASTER_DATASET);
  const [debrisCount, setDebrisCount] = useState(0);

  // Pull the locked 20-event gallery from Supabase Edge Function. Server resolves
  // each event's image via Wikipedia → NewsAPI → NewsData.io → TheNewsAPI → fallback.
  // Tolerates cold-deploy 404/503 with one retry; silently keeps placeholder fallbacks
  // (same 20 events) if the route is unreachable.
  useEffect(() => {
    let cancelled = false;
    const url = `https://${projectId}.supabase.co/functions/v1/make-server-7b7572b4/gallery-events`;

    const attempt = async (): Promise<Response | null> => {
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        });
        return res;
      } catch (err) {
        console.warn("gallery-events network error:", err);
        return null;
      }
    };

    const tryLive = async () => {
      let res = await attempt();
      if (res && (res.status === 404 || res.status === 503) && !cancelled) {
        await new Promise((r) => setTimeout(r, 2500));
        if (cancelled) return;
        res = await attempt();
      }
      if (!res || !res.ok) {
        if (res) console.warn(`gallery-events unavailable (status ${res.status}) — using placeholder images.`);
        return;
      }
      try {
        const data = await res.json();
        const events: NewsItem[] = (data.events || []).map((it: any) => ({
          id: it.id,
          sourceName: it.sourceName,
          title: it.title,
          location: it.location,
          year: it.year,
          description: it.description,
          efScale: it.efScale,
          windSpeed: it.windSpeed,
          imageUrl: it.imageUrl,
          category: (it.category as NewsItem["category"]) || "damage",
        }));
        if (cancelled) return;
        if (events.length) {
          // Replace (do not merge) — the gallery is EXACTLY this locked 20-event set.
          setLiveFeed(events);
          const counts = data.imageSourceCounts || {};
          const sourceLabel = Object.entries(counts)
            .map(([k, v]) => `${k}:${v}`)
            .join(" · ");
          setFeedSource(sourceLabel ? `Image sources — ${sourceLabel}` : "Gallery Live");
        }
      } catch (err) {
        console.warn("gallery-events parse error:", err);
      }
    };

    tryLive();
    return () => {
      cancelled = true;
    };
  }, []);

  // Spawner — large images every 1 second
  useEffect(() => {
    if (!liveFeed.length) return;
    const id = setInterval(() => {
      const item = liveFeed[Math.floor(Math.random() * liveFeed.length)];
      const uuid = Math.random().toString(36).slice(2);
      const vh = window.innerHeight;
      const width  = Math.floor(Math.random() * 180) + 520;  // 520–700px
      const height = Math.floor(width * 0.62);
      const maxTop = Math.max(0, vh - height - 90);
      const top = Math.floor(Math.random() * maxTop);
      setDebrisCount(c => c + 1);
      setActiveDebris(prev => {
        const now = Date.now();
        return [...prev.filter(d => now - d.spawnTime < 6500), { uuid, newsItem: item, top, width, height, spawnTime: now }];
      });
    }, 1000);
    return () => clearInterval(id);
  }, [liveFeed]);

  const catColor = hoveredItem ? CATEGORY_COLORS[hoveredItem.category] ?? "#E53935" : "#E53935";

  return (
    <section
      className="relative w-full overflow-hidden bg-[#05050A] border-t border-white/10"
      style={{ height: "100vh" }}
    >
      {/* ── CSS ── */}
      <style>{`
        @keyframes vortexFly {
          0%   { transform: perspective(900px) translateX(-100px) scale(0.88) rotateY(-10deg); opacity: 0; filter: brightness(0.4); }
          12%  { opacity: 1; filter: brightness(1); }
          80%  { opacity: 1; }
          100% { transform: perspective(900px) translateX(110vw) scale(1.08) rotateY(28deg); opacity: 0; filter: brightness(0.35); }
        }
        .vortex-debris {
          position: absolute;
          background-size: cover;
          background-position: center;
          border-radius: 10px;
          border: 2px solid rgba(255,255,255,0.07);
          box-shadow: 0 24px 70px -10px rgba(0,0,0,0.95), inset 0 0 30px rgba(0,0,0,0.5);
          animation: vortexFly 6s cubic-bezier(0.2,0.6,0.8,0.4) forwards;
          cursor: crosshair;
          overflow: hidden;
          will-change: transform, opacity;
          transition: border-color 0.18s, box-shadow 0.18s;
        }
        .vortex-debris:hover {
          border-color: #E53935;
          box-shadow: 0 0 50px rgba(229,57,53,0.65), 0 30px 80px -10px rgba(0,0,0,1);
          animation-play-state: paused;
          z-index: 80 !important;
        }
        .scanlines {
          background: repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.2) 3px,rgba(0,0,0,0.2) 4px);
        }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      {/* BG grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage:"linear-gradient(rgba(255,255,255,0.011) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.011) 1px,transparent 1px)", backgroundSize:"55px 55px" }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background:"radial-gradient(ellipse 70% 70% at 50% 50%,rgba(229,57,53,0.035) 0%,transparent 100%)" }} />
      <div className="absolute inset-0 scanlines opacity-30 pointer-events-none z-10" />

      {/* ── LEFT PANEL (0%–46%) ── */}
      <div className="absolute top-0 left-0 bottom-0 flex flex-col justify-between p-10 pointer-events-none z-30"
        style={{ width: "46%" }}>

        {/* Top title block */}
        <div className="flex flex-col gap-3">
          {/* Section label */}
          <motion.div
            initial={{ opacity:0, y:16 }}
            whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }}
            transition={{ duration:0.7 }}
            className="flex items-center gap-4 font-mono text-[10px] tracking-[0.3em] uppercase"
          >
            <span style={{ color:"#E53935" }}>06</span>
            <span className="h-px w-16 bg-[#E53935]/35" />
            <span className="text-[#888897]">Disaster Witness Gallery</span>
          </motion.div>

          <h2 className="font-orbitron font-black text-4xl md:text-[3.6rem] tracking-tight leading-[0.9] uppercase text-white">
            VORTEX<br/>DEBRIS<br/>
            <span style={{ color:"#E53935", textShadow:"0 0 28px rgba(229,57,53,0.5)" }}>FLOW</span>
          </h2>

          <div className="flex items-center gap-2 font-mono text-[9px] tracking-[0.2em] text-[#888897] uppercase mt-1">
            <Radio size={9} className="text-[#E53935] animate-pulse" />
            {feedSource}
          </div>
        </div>

        {/* ── TELEMETRY PANEL — appears on hover ── */}
        <div className="flex-1 flex flex-col justify-center mt-8">
          <AnimatePresence mode="wait">
            {hoveredItem ? (
              <motion.div
                key={hoveredItem.id}
                initial={{ opacity:0, x:-24, filter:"blur(4px)" }}
                animate={{ opacity:1, x:0, filter:"blur(0px)" }}
                exit={{ opacity:0, x:-16, filter:"blur(3px)" }}
                transition={{ duration:0.22, ease:"easeOut" }}
                className="flex flex-col gap-4"
              >
                {/* Category + EF badges */}
                <div className="flex items-center gap-3">
                  <div className="font-mono text-[10px] tracking-widest uppercase bg-white/5 border border-white/10 text-white/80 px-2.5 py-1 rounded">
                    CATEGORY: <span style={{ color: catColor }}>{hoveredItem.category}</span>
                  </div>
                  {hoveredItem.efScale && (
                    <div className="font-orbitron font-black text-[11px] px-2.5 py-1 rounded border"
                      style={{ background:`${catColor}18`, borderColor:`${catColor}44`, color:catColor, textShadow:`0 0 10px ${catColor}88` }}>
                      {hoveredItem.efScale}
                    </div>
                  )}
                </div>

                {/* Title */}
                <div>
                  <h3 className="font-orbitron font-black text-white text-[15px] leading-snug tracking-wide uppercase">
                    {hoveredItem.title}
                  </h3>
                  <div className="flex justify-between items-center font-mono text-[9px] text-[#888897] mt-2 pt-2 border-t border-white/[0.06]">
                    <span>📍 {hoveredItem.location}</span>
                    <span>🗓 {hoveredItem.year}</span>
                  </div>
                </div>

                {/* Wind speed */}
                {hoveredItem.windSpeed && hoveredItem.windSpeed !== "N/A" && (
                  <div className="flex items-center gap-2 font-mono font-bold text-[11px]"
                    style={{ color: catColor }}>
                    <Wind size={12} />
                    PEAK WINDS: {hoveredItem.windSpeed}
                  </div>
                )}

                {/* Divider */}
                <div className="h-px" style={{ background:`linear-gradient(to right, ${catColor}55, transparent)` }} />

                {/* Description */}
                <p className="font-mono text-[10px] leading-[1.75] text-white/80">
                  {hoveredItem.description}
                </p>

                {/* Source */}
                <div className="flex items-center gap-2 font-mono text-[8px] tracking-widest uppercase pt-1 border-t border-white/[0.06]"
                  style={{ color: catColor }}>
                  <AlertCircle size={9} />
                  SOURCE: {hoveredItem.sourceName.toUpperCase()}
                </div>
              </motion.div>
            ) : (
              /* Idle state */
              <motion.div
                key="idle"
                initial={{ opacity:0 }}
                animate={{ opacity:1 }}
                exit={{ opacity:0 }}
                transition={{ duration:0.3 }}
                className="flex flex-col items-start gap-4"
              >
                {/* Scanning animation */}
                <div className="flex items-center gap-3">
                  <div className="relative w-8 h-8 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border border-[#E53935]/30 animate-ping" style={{ animationDuration:"2s" }} />
                    <Crosshair size={18} className="text-[#E53935]/60" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] tracking-[0.25em] text-white/50 uppercase">Awaiting Target</span>
                    <span className="font-mono text-[8px] tracking-widest text-[#888897] uppercase">// hover any debris image →</span>
                  </div>
                </div>

                {/* Fake scanning bars */}
                <div className="flex flex-col gap-2 w-full max-w-[260px]">
                  {["TITLE", "LOCATION", "EF SCALE", "WIND SPEED", "DESCRIPTION"].map((label) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="font-mono text-[8px] tracking-widest text-white/20 uppercase w-20 shrink-0">{label}</span>
                      <div className="h-px flex-1 bg-white/[0.06]" />
                      <span className="font-mono text-[7px] tracking-wider text-white/15">---</span>
                    </div>
                  ))}
                </div>

                {/* Activity icon */}
                <div className="flex items-center gap-2 mt-2">
                  <Activity size={12} className="text-[#E53935]/40" />
                  <span className="font-mono text-[8px] tracking-widest text-white/20 uppercase">
                    {debrisCount} DEBRIS OBJECTS LOGGED
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Fujita legend */}
        <div className="flex flex-col gap-1.5 items-start">
          {[["EF5","#9C27B0"],["EF4","#E53935"],["EF3","#FF7043"],["EF2","#FFB74D"],["EF1","#4FC3F7"],["EF0","#81C784"]].map(([ef,color]) => (
            <div key={ef} className="flex items-center gap-2 font-mono text-[8px] tracking-widest uppercase">
              <span style={{ width:28, height:1, background:color, display:"inline-block" }} />
              <span style={{ color }}>{ef}</span>
            </div>
          ))}
          <span className="font-mono text-[7px] tracking-widest text-white/15 uppercase mt-1">FUJITA SCALE REF</span>
        </div>
      </div>

      {/* ── DEBRIS FIELD (right 75%) ── */}
      <div className="absolute top-0 bottom-0 right-0 overflow-hidden" style={{ left:"25%", zIndex:0 }}>

        {/* Radar rings */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 pointer-events-none opacity-10">
          {[500,320,160].map((r,i) => (
            <div key={r} className="absolute rounded-full border border-white/[0.06]"
              style={{ width:r, height:r, top:"50%", left:0, marginTop:-r/2, marginLeft:-r/2,
                animation:`spin ${(i+1)*6}s linear infinite ${i%2===1?"reverse":""}` }} />
          ))}
          <div className="absolute w-3 h-3 rounded-full bg-[#E53935] top-1/2 -translate-y-1/2 animate-ping opacity-60" />
        </div>

        {/* Flying debris */}
        {activeDebris.map(item => (
          <div
            key={item.uuid}
            className="vortex-debris"
            style={{
              top: item.top,
              left: 0,          // spawn from left edge of this sub-container (= 50% of full screen)
              width: item.width,
              height: item.height,
              backgroundImage: `url(${item.newsItem.imageUrl})`,
              zIndex: 5,
            }}
            onMouseEnter={() => setHoveredItem(item.newsItem)}
            onMouseLeave={() => setHoveredItem(null)}
          />
        ))}
      </div>

      {/* ── Bottom bar ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none px-10 py-4 border-t border-white/[0.05] flex items-center justify-between select-none"
        style={{ background:"linear-gradient(to top,rgba(5,5,10,0.92),transparent)" }}>
        <div className="flex items-center gap-2 font-mono text-[9px] tracking-widest text-[#888897] uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E53935] animate-ping" />
          VORTEX CHAMBER ACTIVE — {liveFeed.length} EVENTS LOADED
        </div>
        <div className="font-mono text-[9px] tracking-widest text-white/25 uppercase">
          ACTIVE DEBRIS: {activeDebris.length} &nbsp;|&nbsp; TOTAL LOGGED: {debrisCount}
        </div>
      </div>
    </section>
  );
}
