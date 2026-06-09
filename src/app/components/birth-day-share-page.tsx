import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Tornado, ExternalLink, Sparkles, Calendar, ChevronRight } from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

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

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CATEGORY_COLORS: Record<BirthEvent["category"], string> = {
  tornado: "#E53935",
  disaster: "#FF7043",
  weather: "#FFB74D",
  world: "#4FC3F7",
  other: "#888897",
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?q=80&w=1400&auto=format&fit=crop";

interface Props {
  shareId: string;
  onExit: () => void;
}

export default function BirthDaySharePage({ shareId, onExit }: Props) {
  const [record, setRecord] = useState<ShareRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  useEffect(() => {
    let cancelled = false;
    const url = `https://${projectId}.supabase.co/functions/v1/make-server-7b7572b4/share/${shareId}`;
    fetch(url, { headers: { Authorization: `Bearer ${publicAnonKey}` } })
      .then((r) => {
        if (!r.ok) throw new Error(`Share lookup returned ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setRecord(data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("share fetch error:", err);
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
    const arr = [...(record.events || [])];
    if (record.featured && !arr.some((e) => e.title === record.featured!.title)) {
      arr.unshift(record.featured);
    }
    return arr;
  }, [record]);

  const total = events.length;
  const safeIndex = total === 0 ? 0 : ((index % total) + total) % total;
  const current = events[safeIndex];
  const accent = current ? CATEGORY_COLORS[current.category] : "#E53935";

  const next = () => {
    setDirection(1);
    setIndex((i) => i + 1);
  };
  const prev = () => {
    setDirection(-1);
    setIndex((i) => i - 1);
  };

  const dateString = record
    ? record.birth_day && record.birth_month
      ? `${MONTHS[record.birth_month - 1]} ${record.birth_day}, ${record.birth_year}`
      : `${record.birth_year}`
    : "";

  return (
    <motion.div
      key="share-page"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[60] overflow-y-auto bg-[#05050A] text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Shared birth-date storm memory"
    >
      <style>{`
        @keyframes shareScan {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .share-scan {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%);
          animation: shareScan 7s linear infinite;
          mix-blend-mode: overlay;
        }
        .share-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px),
            linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px);
          background-size: 60px 60px;
          opacity: 0.7;
        }
        .card-3d {
          transform-style: preserve-3d;
          backface-visibility: hidden;
        }
      `}</style>

      <div className="share-grid" />
      <div className="share-scan" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 60% at 50% 30%, ${accent}18 0%, transparent 70%)`,
          transition: "background 0.7s ease",
        }}
      />

      {/* Top bar */}
      <div className="relative z-10 px-6 md:px-12 pt-6 md:pt-8 flex items-center justify-between max-w-7xl mx-auto">
        <button
          onClick={onExit}
          className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/60 hover:text-white flex items-center gap-2 transition-colors"
          aria-label="Return to The Data Tornado main site"
        >
          <ArrowLeft size={14} /> Back to Tornado
        </button>
        <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40 flex items-center gap-2">
          <Tornado size={12} style={{ color: accent }} />
          The Data Tornado · Shared Memory
        </div>
      </div>

      <div className="relative z-10 px-6 md:px-12 py-10 md:py-16 max-w-7xl mx-auto">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <div className="flex items-center gap-4 font-mono text-[10px] tracking-[0.3em] uppercase mb-6">
            <span style={{ color: accent }}>07.SHARE</span>
            <span className="h-px w-20" style={{ background: `${accent}55` }} />
            <span className="text-[#888897]">Time-Stamped Vortex</span>
          </div>

          <h1 className="font-orbitron font-black text-3xl md:text-5xl xl:text-6xl tracking-tight leading-[0.95] uppercase">
            On{" "}
            <span style={{ color: accent, textShadow: `0 0 28px ${accent}55` }}>
              {dateString || "—"}
            </span>
          </h1>
          <p className="font-orbitron font-bold text-xl md:text-3xl text-white/85 mt-3 uppercase tracking-tight">
            The sky was not quiet.
          </p>
          <p className="font-mono text-[11px] md:text-[12px] leading-[1.8] text-white/60 mt-5 max-w-xl flex items-center gap-2">
            <Calendar size={11} />
            {total} archived storm{total === 1 ? "" : "s"} surfaced for this date.
            Tap a card or use ← → to flip through the deck.
          </p>
        </motion.div>

        {/* Loading / error */}
        {loading && (
          <div className="mt-16 flex flex-col items-center gap-4 font-mono text-[10px] tracking-[0.3em] uppercase text-white/50">
            <Tornado size={28} className="animate-spin" style={{ color: accent }} />
            Loading shared memory…
          </div>
        )}
        {error && (
          <div className="mt-16 text-center font-mono text-[11px] tracking-[0.2em] uppercase text-[#E53935]">
            {error}
          </div>
        )}
        {!loading && !error && total === 0 && (
          <div className="mt-16 text-center font-mono text-[11px] tracking-[0.2em] uppercase text-white/50">
            No archived storms were found for this date.
          </div>
        )}

        {/* Card deck */}
        {!loading && !error && total > 0 && current && (
          <div className="mt-14 md:mt-20 relative">
            {/* Stack background cards (peek-through visual) */}
            <div className="relative h-[500px] md:h-[560px] mx-auto max-w-3xl select-none" style={{ perspective: "1800px" }}>
              {/* Shadow stack — shows the next 2-3 cards under the active one */}
              {[2, 1].map((offset) => {
                const ev = events[(safeIndex + offset) % total];
                if (!ev) return null;
                const ec = CATEGORY_COLORS[ev.category];
                return (
                  <motion.div
                    key={`shadow-${offset}-${ev.title}`}
                    aria-hidden="true"
                    initial={false}
                    animate={{
                      y: offset * 14,
                      x: offset * 8,
                      scale: 1 - offset * 0.04,
                      rotate: offset * 1.5,
                    }}
                    transition={{ type: "spring", stiffness: 220, damping: 30 }}
                    className="absolute inset-0 rounded-2xl border overflow-hidden"
                    style={{
                      borderColor: `${ec}25`,
                      background: `linear-gradient(180deg, ${ec}08 0%, #0A0A12 60%)`,
                      boxShadow: `0 ${offset * 8}px ${30 + offset * 10}px -10px rgba(0,0,0,0.6)`,
                      zIndex: 10 - offset,
                    }}
                  />
                );
              })}

              {/* Active flipping card */}
              <AnimatePresence mode="wait" custom={direction}>
                <motion.article
                  key={current.title + safeIndex}
                  custom={direction}
                  initial={(d: number) => ({
                    rotateY: d > 0 ? -120 : 120,
                    opacity: 0,
                    x: d > 0 ? 120 : -120,
                  })}
                  animate={{ rotateY: 0, opacity: 1, x: 0 }}
                  exit={(d: number) => ({
                    rotateY: d > 0 ? 120 : -120,
                    opacity: 0,
                    x: d > 0 ? -160 : 160,
                  })}
                  transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                  className="card-3d absolute inset-0 rounded-2xl overflow-hidden cursor-pointer group"
                  style={{
                    border: `1px solid ${accent}40`,
                    background: `linear-gradient(180deg, ${accent}10 0%, #0A0A12 55%)`,
                    boxShadow: `0 30px 80px -20px ${accent}33, 0 0 0 1px ${accent}20`,
                    zIndex: 20,
                  }}
                  onClick={next}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      next();
                    }
                  }}
                  aria-label={`Storm ${safeIndex + 1} of ${total}: ${current.title}`}
                >
                  {/* Image */}
                  <div className="relative w-full h-[55%] overflow-hidden">
                    <motion.img
                      src={current.imageUrl || FALLBACK_IMAGE}
                      alt={current.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
                      }}
                      initial={{ scale: 1.08 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(180deg, transparent 30%, #0A0A12ee 95%)`,
                      }}
                    />
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <span
                        className="font-mono text-[9px] tracking-[0.3em] uppercase px-2 py-1 rounded-sm"
                        style={{
                          color: accent,
                          background: `${accent}18`,
                          border: `1px solid ${accent}55`,
                        }}
                      >
                        {current.category}
                      </span>
                      <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-white/60 px-2 py-1 rounded-sm border border-white/10 bg-black/40">
                        {current.matchLevel.replace("-", " ")}
                      </span>
                    </div>
                    <div className="absolute top-4 right-4 font-mono text-[9px] tracking-[0.3em] uppercase text-white/60 px-2 py-1 rounded-sm border border-white/10 bg-black/40">
                      {String(safeIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-6 md:p-8 flex flex-col h-[45%]">
                    <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/40 mb-2">
                      {current.date} · {current.sourceName}
                    </div>
                    <h2
                      className="font-orbitron font-bold text-lg md:text-2xl leading-tight uppercase tracking-tight"
                      style={{ color: "#fff" }}
                    >
                      {current.title}
                    </h2>
                    <p className="font-mono text-[11px] md:text-[12px] leading-[1.7] text-white/70 mt-3 line-clamp-3">
                      {current.description}
                    </p>

                    <div className="mt-auto flex items-center justify-between pt-4">
                      {current.sourceUrl ? (
                        <a
                          href={current.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-[10px] tracking-[0.25em] uppercase flex items-center gap-2 hover:underline"
                          style={{ color: accent }}
                        >
                          Open source <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/30">
                          Archived
                        </span>
                      )}
                      <span
                        className="font-mono text-[10px] tracking-[0.25em] uppercase flex items-center gap-2 text-white/60 group-hover:text-white transition-colors"
                      >
                        Flip <ChevronRight size={11} />
                      </span>
                    </div>
                  </div>

                  {/* Scanline */}
                  <div
                    className="pointer-events-none absolute inset-0 opacity-30"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px)",
                    }}
                  />
                </motion.article>
              </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="mt-10 flex items-center justify-center gap-4 font-mono text-[10px] tracking-[0.3em] uppercase">
              <button
                onClick={prev}
                disabled={total < 2}
                className="px-4 py-2 border border-white/15 rounded-sm text-white/70 hover:text-white hover:border-white/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Previous storm"
              >
                ← Prev
              </button>
              <div className="flex items-center gap-1.5">
                {events.slice(0, Math.min(total, 12)).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setDirection(i > safeIndex ? 1 : -1);
                      setIndex(i);
                    }}
                    className="w-2 h-2 rounded-full transition-all"
                    style={{
                      background: i === safeIndex ? accent : "rgba(255,255,255,0.15)",
                      boxShadow: i === safeIndex ? `0 0 10px ${accent}` : "none",
                      transform: i === safeIndex ? "scale(1.4)" : "scale(1)",
                    }}
                    aria-label={`Go to storm ${i + 1}`}
                  />
                ))}
                {total > 12 && (
                  <span className="ml-2 text-white/40">+{total - 12}</span>
                )}
              </div>
              <button
                onClick={next}
                disabled={total < 2}
                className="px-4 py-2 border rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  borderColor: `${accent}55`,
                  color: accent,
                  background: `${accent}10`,
                }}
                aria-label="Next storm"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mt-20 md:mt-28 pt-10 border-t border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        >
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40 mb-2 flex items-center gap-2">
              <Sparkles size={11} style={{ color: accent }} /> Want your own?
            </div>
            <p className="font-orbitron font-bold text-xl md:text-2xl uppercase tracking-tight">
              Find what stormed{" "}
              <span style={{ color: accent }}>your</span> birthday.
            </p>
          </div>
          <button
            onClick={onExit}
            className="font-mono text-[10px] tracking-[0.3em] uppercase px-6 py-3 border rounded-sm transition-colors"
            style={{
              borderColor: `${accent}55`,
              color: accent,
              background: `${accent}10`,
            }}
          >
            Enter The Data Tornado →
          </button>
        </motion.div>
      </div>

      {/* Keyboard navigation */}
      <KeyHandler onNext={next} onPrev={prev} onExit={onExit} />
    </motion.div>
  );
}

function KeyHandler({
  onNext,
  onPrev,
  onExit,
}: {
  onNext: () => void;
  onPrev: () => void;
  onExit: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") onNext();
      else if (e.key === "ArrowLeft") onPrev();
      else if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onNext, onPrev, onExit]);
  return null;
}
