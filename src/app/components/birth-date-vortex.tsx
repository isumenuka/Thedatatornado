import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Wind, AlertCircle, Share2, ExternalLink, Loader2, Tornado } from "lucide-react";
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

interface BirthEventsResponse {
  fetched_at: string;
  query: { day: number; month: number; year: number; dateString: string };
  featured: BirthEvent | null;
  tornadoes: BirthEvent[];
  disasters: BirthEvent[];
  weather: BirthEvent[];
  world: BirthEvent[];
  totalFound: number;
}

const CATEGORY_COLORS: Record<BirthEvent["category"], string> = {
  tornado: "#E53935",
  disaster: "#FF7043",
  weather: "#FFB74D",
  world: "#4FC3F7",
  other: "#888897",
};

const MATCH_LABEL: Record<BirthEvent["matchLevel"], string> = {
  exact: "Exact Date Match",
  "day-month": "Same Day & Month",
  "month-year": "Same Month & Year",
  year: "Same Year",
  nearby: "Nearby in Time",
};

const CURRENT_YEAR = new Date().getFullYear();

async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permissions policy in iframed previews can block this — fall through.
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

export function BirthDateVortex() {
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BirthEventsResponse | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const validate = (): { d: number; m: number; y: number } | null => {
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (!Number.isInteger(d) || d < 1 || d > 31) {
      setError("Day must be between 1 and 31.");
      dayRef.current?.focus();
      return null;
    }
    if (!Number.isInteger(m) || m < 1 || m > 12) {
      setError("Month must be between 1 and 12.");
      monthRef.current?.focus();
      return null;
    }
    if (!Number.isInteger(y) || y < 1900 || y > CURRENT_YEAR) {
      setError(`Year must be between 1900 and ${CURRENT_YEAR}.`);
      yearRef.current?.focus();
      return null;
    }
    const probe = new Date(y, m - 1, d);
    if (probe.getFullYear() !== y || probe.getMonth() !== m - 1 || probe.getDate() !== d) {
      setError("That date does not exist on the calendar.");
      dayRef.current?.focus();
      return null;
    }
    setError(null);
    return { d, m, y };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (!v) return;
    setLoading(true);
    setResult(null);
    setShareUrl(null);
    setShareCopied(false);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7b7572b4/birth-events`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ day: v.d, month: v.m, year: v.y }),
        },
      );
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Server returned ${res.status}: ${errBody}`);
      }
      const data: BirthEventsResponse = await res.json();
      setResult(data);
    } catch (err) {
      console.error("birth-events lookup error:", err);
      setError(err instanceof Error ? err.message : "Unable to fetch historical events.");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!result?.featured) return;
    const { day: d, month: m, year: y } = result.query;
    const shareText = `On ${MONTHS[m - 1]} ${d}, ${y} — ${result.featured.title} (${result.featured.sourceName}). Found via The Data Tornado.`;
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7b7572b4/share`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ birth_year: y, share_text: shareText }),
        },
      );
      if (!res.ok) throw new Error(`Share returned ${res.status}`);
      const { id } = await res.json();
      const url = `${window.location.origin}${window.location.pathname}?share=${id}`;
      setShareUrl(url);
      const copied = await copyToClipboard(url);
      if (copied) {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      }
    } catch (err) {
      console.error("Share creation error:", err);
      setError("Could not generate share link.");
    }
  };

  const reset = () => {
    setDay("");
    setMonth("");
    setYear("");
    setResult(null);
    setError(null);
    setShareUrl(null);
    setShareCopied(false);
  };

  const featured = result?.featured;
  const accent = featured ? CATEGORY_COLORS[featured.category] : "#E53935";

  return (
    <section
      id="birth-date-vortex"
      className="relative bg-[#05050A] text-white border-t border-white/[0.06] overflow-hidden"
    >
      {/* BG grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)",
          backgroundSize: "55px 55px",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 30%, ${accent}10 0%, transparent 70%)`,
          transition: "background 0.4s ease",
        }}
      />

      <div className="relative z-10 px-6 md:px-12 py-20 md:py-28 max-w-7xl mx-auto">
        {/* Section header */}
        <div className="flex items-center gap-4 font-mono text-[10px] tracking-[0.3em] uppercase mb-6">
          <span style={{ color: accent }}>07</span>
          <span className="h-px w-16" style={{ background: `${accent}55` }} />
          <span className="text-[#888897]">Time-Stamped Vortex</span>
        </div>

        <h2 className="font-orbitron font-black text-3xl md:text-5xl xl:text-6xl tracking-tight leading-[0.95] uppercase text-white max-w-3xl">
          What stormed
          <br />
          the day you
          <br />
          <span style={{ color: accent, textShadow: `0 0 28px ${accent}55` }}>
            were born?
          </span>
        </h2>

        <p className="font-mono text-[11px] md:text-[12px] leading-[1.8] text-white/60 mt-6 max-w-xl">
          Enter your full birth date. We'll sweep historical archives — Wikipedia
          On This Day, NewsAPI, NewsData.io, TheNewsAPI — for tornadoes, natural
          disasters, extreme weather, and major world events from that moment in time.
        </p>

        {/* ── FORM ── */}
        <form
          onSubmit={handleSubmit}
          className="mt-10 flex flex-col gap-4 max-w-2xl"
          aria-labelledby="birth-vortex-heading"
        >
          <fieldset
            className="border border-white/10 bg-black/40 rounded-md p-5"
            disabled={loading}
          >
            <legend
              id="birth-vortex-heading"
              className="font-mono text-[9px] tracking-[0.3em] uppercase text-white/40 px-2"
            >
              <Calendar size={10} className="inline mr-2" />
              Birth Date Input
            </legend>

            <div className="grid grid-cols-3 gap-3 mt-2">
              <DateField
                label="Day"
                placeholder="DD"
                value={day}
                onChange={setDay}
                maxLength={2}
                ref={dayRef}
                id="birth-day"
                ariaInvalid={!!error && (parseInt(day, 10) < 1 || parseInt(day, 10) > 31 || !day)}
              />
              <DateField
                label="Month"
                placeholder="MM"
                value={month}
                onChange={setMonth}
                maxLength={2}
                ref={monthRef}
                id="birth-month"
                ariaInvalid={!!error && (parseInt(month, 10) < 1 || parseInt(month, 10) > 12 || !month)}
              />
              <DateField
                label="Year"
                placeholder="YYYY"
                value={year}
                onChange={setYear}
                maxLength={4}
                ref={yearRef}
                id="birth-year"
                ariaInvalid={!!error && (parseInt(year, 10) < 1900 || parseInt(year, 10) > CURRENT_YEAR || !year)}
              />
            </div>

            {error && (
              <p
                id="birth-vortex-error"
                role="alert"
                className="mt-4 flex items-center gap-2 font-mono text-[10px] text-[#FF7043]"
              >
                <AlertCircle size={11} />
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="font-orbitron text-[10px] tracking-[0.3em] uppercase px-5 py-2.5 rounded border transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: `${accent}15`,
                  borderColor: `${accent}66`,
                  color: accent,
                  boxShadow: `0 0 18px ${accent}22`,
                }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={11} className="animate-spin" />
                    Scanning Archives
                  </span>
                ) : (
                  "Scan Historical Vortex"
                )}
              </button>
              {(result || error) && !loading && (
                <button
                  type="button"
                  onClick={reset}
                  className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/50 hover:text-white px-3 py-2 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </fieldset>
        </form>

        {/* ── RESULT ── */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key={result.query.dateString}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="mt-12"
              aria-live="polite"
            >
              {featured ? (
                <ShareCard
                  event={featured}
                  query={result.query}
                  accent={accent}
                  onShare={handleShare}
                  shareUrl={shareUrl}
                  shareCopied={shareCopied}
                />
              ) : (
                <div className="border border-white/10 bg-black/40 rounded-md p-6 font-mono text-[11px] text-white/60">
                  No matching events found in any archive — try a nearby date.
                </div>
              )}

              {/* Other events listings */}
              <OtherEventsGrid result={result} accent={accent} featured={featured} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ── Date field input ──
import { forwardRef } from "react";

interface DateFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  maxLength: number;
  id: string;
  ariaInvalid: boolean;
}

const DateField = forwardRef<HTMLInputElement, DateFieldProps>(
  ({ label, placeholder, value, onChange, maxLength, id, ariaInvalid }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={id}
          className="font-mono text-[9px] tracking-[0.3em] uppercase text-white/40"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={maxLength}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaInvalid ? "birth-vortex-error" : undefined}
          className="font-orbitron font-black text-2xl tracking-widest text-center bg-black/60 border border-white/10 rounded text-white py-3 focus-visible:outline-none focus-visible:border-[#E53935] focus-visible:ring-1 focus-visible:ring-[#E53935]/40 transition-colors"
        />
      </div>
    );
  },
);
DateField.displayName = "DateField";

// ── Featured event share card ──
function ShareCard({
  event,
  query,
  accent,
  onShare,
  shareUrl,
  shareCopied,
}: {
  event: BirthEvent;
  query: { day: number; month: number; year: number };
  accent: string;
  onShare: () => void;
  shareUrl: string | null;
  shareCopied: boolean;
}) {
  const formattedDate = `${MONTHS[query.month - 1]} ${query.day}, ${query.year}`;
  return (
    <article
      className="relative border rounded-lg overflow-hidden"
      style={{
        borderColor: `${accent}44`,
        background: `linear-gradient(135deg, ${accent}08 0%, transparent 70%)`,
        boxShadow: `0 0 60px -10px ${accent}33`,
      }}
    >
      <div className="grid md:grid-cols-[1.1fr_1fr]">
        {/* Image */}
        <div
          className="relative h-64 md:h-auto bg-black"
          style={{
            backgroundImage: event.imageUrl
              ? `url(${event.imageUrl})`
              : `radial-gradient(circle at 30% 40%, ${accent}33 0%, transparent 70%)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to right, transparent 0%, rgba(5,5,10,0.4) 100%)`,
            }}
          />
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span
              className="font-orbitron font-black text-[10px] tracking-[0.3em] uppercase px-2 py-1 rounded"
              style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}66` }}
            >
              {event.category}
            </span>
            <span className="font-mono text-[9px] tracking-widest uppercase text-white/70 bg-black/60 px-2 py-1 rounded">
              {MATCH_LABEL[event.matchLevel]}
            </span>
          </div>
        </div>

        {/* Text */}
        <div className="p-6 md:p-8 flex flex-col gap-4">
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40 flex items-center gap-2">
            <Tornado size={11} style={{ color: accent }} />
            Birth Date Vortex
          </div>

          <h3 className="font-orbitron font-black text-xl md:text-2xl leading-tight text-white">
            {event.title}
          </h3>

          <div className="flex flex-wrap items-center gap-4 font-mono text-[10px] text-white/60">
            <span className="flex items-center gap-1.5">
              <Calendar size={11} /> {formattedDate}
            </span>
            <span className="flex items-center gap-1.5">
              <Wind size={11} style={{ color: accent }} />
              Event: {event.date}
            </span>
          </div>

          <p className="font-mono text-[11px] leading-[1.75] text-white/75">
            {event.description || "No description available."}
          </p>

          <div
            className="h-px"
            style={{ background: `linear-gradient(to right, ${accent}55, transparent)` }}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-[9px] tracking-widest uppercase text-white/40">
              Source: {event.sourceName}
            </span>
            <div className="flex items-center gap-3">
              {event.sourceUrl && (
                <a
                  href={event.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/60 hover:text-white inline-flex items-center gap-1.5 transition-colors"
                >
                  Read More <ExternalLink size={10} />
                </a>
              )}
              <button
                type="button"
                onClick={onShare}
                className="font-orbitron text-[10px] tracking-[0.3em] uppercase px-4 py-2 rounded border inline-flex items-center gap-2 transition-colors duration-200"
                style={{
                  background: `${accent}15`,
                  borderColor: `${accent}66`,
                  color: accent,
                }}
              >
                <Share2 size={11} />
                {shareCopied ? "Link Copied" : "Share Card"}
              </button>
            </div>
          </div>

          {shareUrl && (
            <div className="flex items-center gap-2 border border-white/[0.06] bg-black/40 rounded px-3 py-2">
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Shareable link"
                className="flex-1 bg-transparent font-mono text-[9px] text-white/60 outline-none"
              />
              <button
                type="button"
                onClick={async () => {
                  const ok = await copyToClipboard(shareUrl);
                  if (ok) {
                    setShareCopied(true);
                    setTimeout(() => setShareCopied(false), 2500);
                  }
                }}
                className="font-mono text-[9px] tracking-widest uppercase text-white/60 hover:text-white transition-colors"
              >
                {shareCopied ? "Copied" : "Copy"}
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

// ── Secondary event listings ──
function OtherEventsGrid({
  result,
  accent,
  featured,
}: {
  result: BirthEventsResponse;
  accent: string;
  featured: BirthEvent | null;
}) {
  const groups: Array<{ key: keyof BirthEventsResponse; label: string; color: string }> = [
    { key: "tornadoes", label: "Tornadoes", color: CATEGORY_COLORS.tornado },
    { key: "disasters", label: "Natural Disasters", color: CATEGORY_COLORS.disaster },
    { key: "weather", label: "Extreme Weather", color: CATEGORY_COLORS.weather },
    { key: "world", label: "World Events", color: CATEGORY_COLORS.world },
  ];

  const isFeatured = (ev: BirthEvent) => featured && ev.title === featured.title && ev.date === featured.date;

  const populated = groups.filter((g) => {
    const arr = result[g.key] as BirthEvent[];
    return arr && arr.filter((e) => !isFeatured(e)).length > 0;
  });

  if (populated.length === 0) {
    return (
      <p className="mt-6 font-mono text-[10px] tracking-widest uppercase text-white/30">
        — No further matches in archive ({result.totalFound} total scanned) —
      </p>
    );
  }

  return (
    <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
      {populated.map((g) => {
        const items = (result[g.key] as BirthEvent[]).filter((e) => !isFeatured(e)).slice(0, 4);
        return (
          <div
            key={g.key}
            className="border border-white/[0.06] bg-black/40 rounded-md p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: g.color }}
              />
              <h4 className="font-orbitron font-black text-[11px] tracking-[0.3em] uppercase text-white">
                {g.label}
              </h4>
              <span className="font-mono text-[9px] text-white/30 ml-auto">
                {items.length} event{items.length === 1 ? "" : "s"}
              </span>
            </div>
            <ul className="flex flex-col gap-3">
              {items.map((ev, i) => (
                <li
                  key={`${g.key}-${i}`}
                  className="border-l-2 pl-3 py-1"
                  style={{ borderColor: `${g.color}66` }}
                >
                  <div className="font-mono text-[10px] text-white/85 leading-snug">
                    {ev.title}
                  </div>
                  <div className="font-mono text-[8px] tracking-widest uppercase text-white/35 mt-1 flex items-center gap-2">
                    <span>{ev.date}</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span>{ev.sourceName}</span>
                    <span className="ml-auto" style={{ color: g.color }}>
                      {MATCH_LABEL[ev.matchLevel]}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <div className="md:col-span-2 font-mono text-[9px] tracking-widest uppercase text-white/25 text-right">
        {result.totalFound} total events scanned across all archives
      </div>
    </div>
  );
}

export default BirthDateVortex;
