import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Tornado,
  Calendar,
  ChevronRight,
  Search,
  AlertCircle,
  CloudRain,
  AlertTriangle,
  ShieldAlert,
  Cloud,
  Sparkles,
} from "lucide-react";
import {
  projectId,
  publicAnonKey,
} from "../../../utils/supabase/info";
import { CLIMATE_DATA } from "../../../climateData";

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface BirthEvent {
  title: string;
  date: string;
  description: string;
  imageUrl?: string;
  sourceName: string;
  sourceUrl?: string;
  matchLevel:
    | "exact"
    | "day-month"
    | "month-year"
    | "year"
    | "nearby";
  category:
    | "tornado"
    | "disaster"
    | "weather"
    | "world"
    | "other";
}

interface ShareRecord {
  id: string;
  birth_year: number;
  birth_month: number | null;
  birth_day: number | null;
  share_text: string;
  events: BirthEvent[];
  featured: BirthEvent | null;
  view_count: number;
  created_at: string;
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const CATEGORY_COLORS: Record<BirthEvent["category"], string> =
  {
    tornado: "#E53935",
    disaster: "#FF7043",
    weather: "#FFB74D",
    world: "#4FC3F7",
    other: "#888897",
  };

const CATEGORY_RGBS: Record<BirthEvent["category"], string> = {
  tornado: "229, 57, 53",
  disaster: "255, 112, 67",
  weather: "255, 183, 77",
  world: "79, 195, 247",
  other: "136, 136, 151",
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
// Only real fetched images allowed — no fallbacks. Events without imageUrl are filtered out upstream.
function imageFor(ev: BirthEvent): string {
  return ev.imageUrl && /^https?:\/\//.test(ev.imageUrl)
    ? ev.imageUrl
    : "";
}

const hasRealImage = (e: BirthEvent | null | undefined): e is BirthEvent =>
  !!e && typeof e.imageUrl === "string" && /^https?:\/\//.test(e.imageUrl);

function getCategoryIcon(category: BirthEvent["category"]) {
  switch (category) {
    case "tornado":
      return Tornado;
    case "disaster":
      return AlertTriangle;
    case "weather":
      return CloudRain;
    case "world":
      return ShieldAlert;
    default:
      return Cloud;
  }
}

function getClimateForYear(dateStr: string) {
  const m = dateStr.match(/\d{4}/);
  if (m) {
    const yr = parseInt(m[0], 10);
    const found = CLIMATE_DATA.find((d) => d.year === yr);
    if (found) return found;
  }
  return {
    year: 1993,
    co2_ppm: 357.21,
    temp_anomaly: 0.23,
    avg_tavg_celsius: 12.8,
    tornado_speed: 0.38,
    tornado_color: "#FFB74D",
    severity: "ELEVATED",
  };
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through */
    }
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

const WIND_RAW: Record<BirthEvent["category"], number> = {
  tornado: 185,
  disaster: 125,
  weather: 80,
  world: 60,
  other: 50,
};

/* ─── Component ──────────────────────────────────────────────────────────── */
interface Props {
  shareId: string;
  onExit: () => void;
}

export default function BirthDaySharePage({
  shareId,
  onExit,
}: Props) {
  const [record, setRecord] = useState<ShareRecord | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speedUnit, setSpeedUnit] = useState<"mph" | "kph">(
    "mph",
  );
  const [shareCopied, setShareCopied] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTrans, setIsTrans] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(
    null,
  );

  /* Lock page scroll */
  useEffect(() => {
    const htmlOv = document.documentElement.style.overflow;
    const bodyOv = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = htmlOv;
      document.body.style.overflow = bodyOv;
    };
  }, []);

  /* Load data */
  useEffect(() => {
    if (shareId === "test") {
      setRecord({
        id: "test",
        birth_year: 1993,
        birth_month: 2,
        birth_day: 26,
        share_text: "Test share",
        view_count: 12,
        created_at: "2026-06-09T12:00:00Z",
        events: [
          {
            title: "1974 Super Outbreak",
            date: "April 3, 1974",
            description:
              "The second-largest tornado outbreak on record for a single 24-hour period, spawning 148 tornadoes across 13 U.S. states.",
            imageUrl:
              "https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?q=80&w=1400&auto=format&fit=crop",
            sourceName: "Wikipedia",
            sourceUrl:
              "https://en.wikipedia.org/wiki/1974_Super_Outbreak",
            matchLevel: "exact",
            category: "tornado",
          },
          {
            title: "Hurricane Katrina",
            date: "August 29, 2005",
            description:
              "A devastating Category 5 hurricane that caused over 1,800 deaths and catastrophic damage along the U.S. Gulf Coast.",
            imageUrl:
              "https://images.unsplash.com/photo-1509822929464-92b5d5578b94?q=80&w=1400&auto=format&fit=crop",
            sourceName: "Wikipedia",
            sourceUrl:
              "https://en.wikipedia.org/wiki/Hurricane_Katrina",
            matchLevel: "month-year",
            category: "disaster",
          },
          {
            title: "Great Blizzard of 1888",
            date: "March 11, 1888",
            description:
              "A historic winter storm that paralyzed the East Coast of the United States with up to 50 inches of snow.",
            imageUrl:
              "https://images.unsplash.com/photo-1542382156909-9ae37b3f56fd?q=80&w=1400&auto=format&fit=crop",
            sourceName: "Wikipedia",
            sourceUrl:
              "https://en.wikipedia.org/wiki/Great_Blizzard_of_1888",
            matchLevel: "nearby",
            category: "weather",
          },
        ],
        featured: {
          title: "1974 Super Outbreak",
          date: "April 3, 1974",
          description:
            "The second-largest tornado outbreak on record for a single 24-hour period, spawning 148 tornadoes across 13 U.S. states.",
          imageUrl:
            "https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?q=80&w=1400&auto=format&fit=crop",
          sourceName: "Wikipedia",
          sourceUrl:
            "https://en.wikipedia.org/wiki/1974_Super_Outbreak",
          matchLevel: "exact",
          category: "tornado",
        },
      });
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-7b7572b4/share/${shareId}`,
      { headers: { Authorization: `Bearer ${publicAnonKey}` } },
    )
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (!cancelled) setRecord(d);
      })
      .catch(() => {
        if (!cancelled)
          setError("This shared memory could not be located.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shareId]);

  const events = useMemo<BirthEvent[]>(() => {
    if (!record) return [];
    const arr = [...(record.events ?? [])];
    if (
      record.featured &&
      !arr.some((e) => e.title === record.featured!.title)
    )
      arr.unshift(record.featured);
    // Only show events that have a real image fetched from a news/wiki source.
    return arr.filter(hasRealImage);
  }, [record]);

  // Clamp activeIndex if the count shrinks after filtering.
  useEffect(() => {
    if (activeIndex >= events.length && events.length > 0) {
      setActiveIndex(0);
    }
  }, [events.length, activeIndex]);

  const dateString = record
    ? record.birth_day && record.birth_month
      ? `${MONTHS[record.birth_month - 1]} ${record.birth_day}, ${record.birth_year}`
      : `${record.birth_year}`
    : "";

  const handleShare = async () => {
    const ok = await copyToClipboard(
      `${window.location.origin}${window.location.pathname}?share=${shareId}`,
    );
    if (ok) {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    }
  };

  const windVal = (cat: BirthEvent["category"]) => {
    const raw = WIND_RAW[cat] ?? 50;
    return speedUnit === "mph"
      ? raw
      : Math.round(raw * 1.60934);
  };

  /* Wheel / touch */
  const go = (dir: 1 | -1) => {
    if (isTrans || events.length <= 1) return;
    const next = activeIndex + dir;
    if (next < 0 || next >= events.length) return;
    setActiveIndex(next);
    setIsTrans(true);
    setTimeout(() => setIsTrans(false), 550);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY > 15) go(1);
    else if (e.deltaY < -15) go(-1);
  };
  const handleTouchStart = (e: React.TouchEvent) =>
    setTouchStartY(e.touches[0].clientY);
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    const diff = touchStartY - e.touches[0].clientY;
    if (diff > 40) {
      go(1);
      setTouchStartY(null);
    }
    if (diff < -40) {
      go(-1);
      setTouchStartY(null);
    }
  };

  /* ─── Render ────────────────────────────────────────────────────────────── */
  return (
    <motion.div
      key="share-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      style={{
        background:
          "radial-gradient(circle at center, #1a1a1a 0%, #0f0f0f 100%)",
        backgroundColor: "#0f0f0f",
      }}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      className="fixed inset-0 z-[60] overflow-hidden text-white flex flex-col justify-between items-center select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Shared birth-date storm memory"
    >
      <style>{`
        @keyframes floatSlow { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .float-slow { animation: floatSlow 4.5s ease-in-out infinite; animation-delay:1s; }
        .share-grid {
          position:absolute; inset:0; pointer-events:none;
          background-image: linear-gradient(rgba(255,255,255,.012) 1px,transparent 1px),
                            linear-gradient(90deg,rgba(255,255,255,.012) 1px,transparent 1px);
          background-size:60px 60px; opacity:.5;
        }

        /* ── Glitch number ── */
        .glitch-wrap { position:relative; display:inline-block; }

        /* Red channel clone — shifts left, sliced */
        .glitch-wrap::before {
          content: attr(data-val);
          position: absolute; inset: 0;
          color: #ff3b3b;
          font: inherit;
          clip-path: polygon(0 15%, 100% 15%, 100% 35%, 0 35%);
          transform: translateX(-4px);
          opacity: 0;
          animation: glitchR 4.5s steps(1) infinite;
          mix-blend-mode: screen;
        }
        /* Cyan channel clone — shifts right, different slice */
        .glitch-wrap::after {
          content: attr(data-val);
          position: absolute; inset: 0;
          color: #00e5ff;
          font: inherit;
          clip-path: polygon(0 55%, 100% 55%, 100% 72%, 0 72%);
          transform: translateX(4px);
          opacity: 0;
          animation: glitchC 4.5s steps(1) infinite 0.1s;
          mix-blend-mode: screen;
        }

        @keyframes glitchR {
          0%,89%,100%  { opacity:0; transform:translateX(-4px); clip-path:polygon(0 15%,100% 15%,100% 35%,0 35%); }
          90%           { opacity:0.85; transform:translateX(-6px); clip-path:polygon(0 10%,100% 10%,100% 28%,0 28%); }
          91%           { opacity:0; }
          92%           { opacity:0.7; transform:translateX(-3px); clip-path:polygon(0 60%,100% 60%,100% 75%,0 75%); }
          93%,94%       { opacity:0; transform:translateX(-4px); }
          95%           { opacity:0.9; transform:translateX(-8px); clip-path:polygon(0 5%,100% 5%,100% 22%,0 22%); }
          96%,99%       { opacity:0; }
        }
        @keyframes glitchC {
          0%,89%,100%  { opacity:0; transform:translateX(4px); clip-path:polygon(0 55%,100% 55%,100% 72%,0 72%); }
          90%           { opacity:0.8; transform:translateX(6px); clip-path:polygon(0 50%,100% 50%,100% 68%,0 68%); }
          91%           { opacity:0; }
          92%           { opacity:0.75; transform:translateX(3px); clip-path:polygon(0 30%,100% 30%,100% 48%,0 48%); }
          93%,94%       { opacity:0; transform:translateX(4px); }
          95%           { opacity:0.85; transform:translateX(9px); clip-path:polygon(0 78%,100% 78%,100% 92%,0 92%); }
          96%,99%       { opacity:0; }
        }

        /* Base number jitter during glitch burst */
        @keyframes glitchBase {
          0%,89%,100%  { transform:translateX(0) skewX(0deg); }
          90%           { transform:translateX(2px) skewX(-1deg); }
          91%           { transform:translateX(-2px) skewX(1deg); }
          92%           { transform:translateX(0); }
          95%           { transform:translateX(-3px) skewX(-0.5deg); }
          96%           { transform:translateX(0); }
        }
        .glitch-base { animation: glitchBase 4.5s steps(1) infinite; display:block; }

        /* Scanline rule */
        @keyframes scanPulse {
          0%,100% { opacity:0.15; transform:scaleX(0.5); }
          50%     { opacity:0.6;  transform:scaleX(1); }
        }
        .scan-pulse { animation: scanPulse 2.8s ease-in-out infinite; }
      `}</style>

      <div className="share-grid" />

      {/* Full-screen background image — fills entire viewport, any size */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <AnimatePresence mode="wait">
          {events[activeIndex] && (
            <motion.div
              key={`bg-${activeIndex}`}
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: "easeOut" }}
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${imageFor(events[activeIndex])})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            />
          )}
        </AnimatePresence>
        {/* Dark vignette overlay — dims image so content stays readable */}
        <div
          className="absolute inset-0"
          style={{
            background: [
              "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.82) 100%)",
              "linear-gradient(to bottom, rgba(15,15,15,0.70) 0%, rgba(15,15,15,0.30) 40%, rgba(15,15,15,0.30) 60%, rgba(15,15,15,0.85) 100%)",
            ].join(", "),
          }}
        />
      </div>

      {/* ── Header ── */}
      <div className="w-full max-w-7xl mx-auto px-4 pt-4 md:px-6 md:pt-6 flex items-center justify-between z-10 relative gap-3">
        <button
          onClick={onExit}
          className="flex items-center gap-3 text-white/70 hover:text-white transition-colors group cursor-pointer"
          aria-label="Back"
        >
          <div className="flex flex-col gap-1">
            <span className="w-5 h-0.5 bg-current transition-transform duration-300 group-hover:rotate-45 group-hover:translate-y-1.5" />
            <span className="w-5 h-0.5 bg-current transition-opacity duration-300 group-hover:opacity-0" />
            <span className="w-5 h-0.5 bg-current transition-transform duration-300 group-hover:-rotate-45 group-hover:-translate-y-1.5" />
          </div>
          <span className="font-mono text-xs tracking-[0.2em] uppercase">
            Back
          </span>
        </button>

        <div className="hidden md:flex items-center gap-3 font-mono text-[10px] tracking-[0.3em] uppercase text-white/40">
          <Tornado
            size={12}
            className="animate-pulse text-white/60"
          />
          The Data Tornado · Shared Memory
          {events.length > 0 && (
            <span className="text-white/60 border-l border-white/15 pl-3">
              <span className="text-[#E53935]">{events.length}</span>{" "}
              {events.length === 1 ? "EVENT" : "EVENTS"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 backdrop-blur-md">
          <Search size={14} className="text-white/40" />
          <input
            type="text"
            readOnly
            value={dateString || "Loading…"}
            className="bg-transparent border-none outline-none text-[11px] font-mono text-white/80 w-24 sm:w-36 cursor-default"
          />
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 z-10 relative">
          <Tornado
            size={36}
            className="animate-spin text-white/70"
          />
          <span className="font-mono text-xs tracking-[0.3em] uppercase text-white/50">
            Loading archives…
          </span>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 z-10 relative">
          <AlertCircle size={36} className="text-red-500" />
          <span className="font-mono text-xs tracking-[0.2em] uppercase text-red-400">
            {error}
          </span>
          <button
            onClick={onExit}
            className="mt-4 font-mono text-xs tracking-[0.2em] uppercase px-4 py-2 border border-white/20 rounded hover:bg-white/10 transition-colors"
          >
            Go Back
          </button>
        </div>
      )}

      {/* ── Main content ── */}
      {!loading && !error && (
        <div className="flex-1 w-full flex items-center justify-center z-10 py-4 px-4">
          {events.length === 0 ? (
            <div className="font-mono text-xs tracking-[0.2em] uppercase text-white/40">
              No imaged events archived for this date.
            </div>
          ) : (
            /*
             *  THREE-COLUMN FLEX ROW  — nothing overlaps anything
             *  [  ghost number  ] | [    card stack    ] | [ dots ]
             */
            <div
              className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 w-full md:w-auto md:h-[500px]"
            >
              {/* COL 1 — Ghost wind speed number, purely decorative */}
              <div
                className="relative flex-shrink-0 hidden md:flex items-center justify-center"
                style={{ width: "130px", height: "500px" }}
              >
                {events.map((ev, i) => {
                  const rgb = CATEGORY_RGBS[ev.category];
                  const val = windVal(ev.category);
                  const offset = i - activeIndex;
                  return (
                    <motion.div
                      key={`ghost-${i}`}
                      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none"
                      animate={{
                        y: offset * 260,
                        opacity: offset === 0 ? 1 : 0,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 26,
                      }}
                    >
                      {/* ── Glitch number wrapper ── */}
                      {/* data-val drives ::before / ::after pseudo-element content */}
                      <div
                        className="glitch-wrap font-orbitron font-black leading-[0.82]"
                        data-val={String(val)}
                        style={{
                          fontSize: "clamp(72px, 8vw, 116px)",
                        }}
                      >
                        <span
                          className="glitch-base"
                          style={{
                            color: `rgba(${rgb}, 0.82)`,
                            WebkitTextStroke: `1px rgba(${rgb}, 0.25)`,
                          }}
                        >
                          {val}
                        </span>
                      </div>

                      {/* Scan-line separator */}
                      <span
                        className="scan-pulse block mt-3 mb-2 rounded-full"
                        style={{
                          width: "55%",
                          height: "1px",
                          background: `linear-gradient(90deg, transparent, rgba(${rgb}, 0.7), transparent)`,
                        }}
                      />

                      {/* Unit — stencil mono tag, no glow */}
                      <span
                        className="font-mono font-bold uppercase tracking-[0.45em] px-2 py-px"
                        style={{
                          fontSize: "10px",
                          color: `rgba(${rgb}, 0.65)`,
                          borderTop: `1px solid rgba(${rgb}, 0.22)`,
                          borderBottom: `1px solid rgba(${rgb}, 0.22)`,
                          letterSpacing: "0.45em",
                        }}
                      >
                        {speedUnit}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              {/* COL 2 — Card stack */}
              <div
                className="relative flex-shrink-0 flex items-center justify-center w-[92vw] sm:w-[420px] md:w-[460px] h-[62vh] sm:h-[500px]"
              >
                {events.map((ev, i) => {
                  const color = CATEGORY_COLORS[ev.category];
                  const rgb = CATEGORY_RGBS[ev.category];
                  const bg = imageFor(ev);
                  const Icon = getCategoryIcon(ev.category);
                  const co2 = `${Math.round(getClimateForYear(ev.date).co2_ppm)} ppm`;
                  const offset = i - activeIndex;

                  return (
                    <motion.article
                      key={`card-${ev.title}-${i}`}
                      animate={{
                        y: offset * 260,
                        scale: offset === 0 ? 1 : 0.9,
                        opacity: offset === 0 ? 1 : 0.35,
                        rotate: offset * 2,
                        zIndex: offset === 0 ? 45 : 10 + i,
                      }}
                      whileHover={
                        offset === 0
                          ? {
                              y: -12,
                              scale: 1.02,
                              boxShadow: `0 30px 60px -12px rgba(${rgb},.35)`,
                            }
                          : {}
                      }
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 26,
                      }}
                      style={{
                        pointerEvents:
                          offset === 0 ? "auto" : "none",
                        border: `1px solid rgba(${rgb}, 0.25)`,
                        background: `linear-gradient(135deg, rgba(${rgb}, 0.15) 0%, rgba(15,15,15,0.95) 80%)`,
                        boxShadow: "0 15px 45px rgba(0,0,0,.6)",
                        backdropFilter: "blur(16px)",
                        WebkitBackdropFilter: "blur(16px)",
                      }}
                      className="absolute inset-0 rounded-[28px] p-5 md:p-8 overflow-hidden flex flex-col transition-shadow duration-500"
                    >
                      {/* Card BG image */}
                      <div
                        className="absolute inset-0 rounded-[28px] overflow-hidden pointer-events-none opacity-20 mix-blend-luminosity"
                        style={{
                          backgroundImage: `url(${bg})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      />

                      {/* Icon + meta row */}
                      <div className="flex items-start justify-between relative z-10">
                        <div className="float-slow">
                          <Icon
                            size={42}
                            className="text-white"
                          />
                        </div>
                        <div className="flex flex-col items-end gap-1 font-mono text-[11px] text-white/50 text-right">
                          <span className="flex items-center gap-1">
                            <Calendar size={11} /> {ev.date}
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-white/70">
                            <Sparkles
                              size={11}
                              style={{ color }}
                            />{" "}
                            {co2}
                          </span>
                        </div>
                      </div>

                      {/* Title */}
                      <h2
                        className="font-orbitron font-semibold text-white tracking-[-1.2px] leading-[1.1] mt-6 relative z-10"
                        style={{
                          fontSize: "clamp(22px, 3.5vw, 32px)",
                        }}
                      >
                        {ev.title}
                      </h2>

                      {/* Description */}
                      <p className="text-[15px] text-[#A0A0A0] leading-[1.65] mt-3 mb-6 relative z-10 line-clamp-3">
                        {ev.description}
                      </p>

                      {/* Tags + CTA */}
                      <div className="mt-auto flex flex-col gap-3 relative z-10">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center bg-white/10 text-[12px] font-medium px-3 py-1 rounded-[8px] text-white uppercase tracking-wider">
                            {ev.category}
                          </span>
                          <span className="inline-flex items-center bg-white/10 text-[12px] font-medium px-3 py-1 rounded-[8px] text-white/70">
                            {ev.matchLevel.replace("-", " ")}
                          </span>
                        </div>
                        <motion.a
                          href={ev.sourceUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            if (!ev.sourceUrl) {
                              e.preventDefault();
                              onExit();
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 py-4 bg-white text-[#0f0f0f] rounded-[12px] font-semibold text-[16px] group/btn"
                          whileHover={{ scale: 0.98 }}
                        >
                          <span>
                            {ev.sourceUrl
                              ? "Open Archive"
                              : "Back to Tornado"}
                          </span>
                          <ChevronRight
                            size={16}
                            className="transition-transform duration-300 group-hover/btn:translate-x-1"
                          />
                        </motion.a>
                      </div>
                    </motion.article>
                  );
                })}
              </div>

              {/* COL 3 — Vertical dot navigation (horizontal on mobile) */}
              <div
                className="flex-shrink-0 flex flex-row md:flex-col gap-2.5 items-center justify-center md:h-[500px]"
              >
                {events.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveIndex(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer relative before:content-[''] before:absolute before:inset-[-12px] md:before:inset-0 ${
                      idx === activeIndex
                        ? "bg-white scale-125 shadow-[0_0_8px_#fff]"
                        : "bg-white/20 hover:bg-white/40"
                    }`}
                    aria-label={`Go to card ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="w-full max-w-7xl mx-auto px-6 pb-6 flex items-center justify-between z-10 relative">
        {/* MPH / KPH toggle */}
        <div className="flex gap-2 text-[11px] font-mono font-semibold text-white/50 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
          {(["mph", "kph"] as const).map((u, i, arr) => (
            <>
              <button
                key={u}
                onClick={() => setSpeedUnit(u)}
                className={`transition-colors cursor-pointer ${speedUnit === u ? "text-white" : "hover:text-white/80"}`}
              >
                {u.toUpperCase()}
              </button>
              {i < arr.length - 1 && (
                <span className="text-white/20 select-none">
                  /
                </span>
              )}
            </>
          ))}
        </div>

        {/* Share "+" button */}
        <div className="relative">
          <button
            onClick={handleShare}
            className="flex items-center justify-center w-9 h-9 rounded-full border border-white/20 bg-white/5 text-white/70 hover:bg-white hover:text-black hover:border-white transition-all duration-300 backdrop-blur-md cursor-pointer"
            title="Copy share link"
            aria-label="Copy share link"
          >
            <span className="text-xl font-light leading-none">
              +
            </span>
          </button>
          <AnimatePresence>
            {shareCopied && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-12 right-0 bg-white text-black text-[10px] font-mono font-semibold px-2 py-1 rounded shadow-lg whitespace-nowrap"
              >
                Link Copied!
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <KeyHandler
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
        total={events.length}
        onExit={onExit}
      />
    </motion.div>
  );
}

/* ─── Keyboard handler ───────────────────────────────────────────────────── */
function KeyHandler({
  activeIndex,
  setActiveIndex,
  total,
  onExit,
}: {
  activeIndex: number;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  total: number;
  onExit: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
      else if (
        (e.key === "ArrowDown" || e.key === "ArrowRight") &&
        activeIndex < total - 1
      )
        setActiveIndex((p) => p + 1);
      else if (
        (e.key === "ArrowUp" || e.key === "ArrowLeft") &&
        activeIndex > 0
      )
        setActiveIndex((p) => p - 1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [activeIndex, setActiveIndex, total, onExit]);
  return null;
}