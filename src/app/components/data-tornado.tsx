import { useEffect, useRef, useState, useMemo } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Copy,
  Share2,
  Play,
  Pause,
  RotateCcw,
  ArrowDown,
  Layers,
  Cpu,
  Database,
  Award,
  ArrowRight,
  Activity,
  Radio,
  ArrowUpRight,
  Car,
  Trees,
  Building2,
  AlertOctagon,
  Wind,
  Leaf,
  Home,
  Train,
  Flame,
  Skull,
  Truck,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  motion,
  AnimatePresence,
  usePresence,
  useScroll,
  useTransform,
  useMotionValue,
  useMotionValueEvent,
} from "motion/react";
import { gsap } from "gsap";
import { CLIMATE_DATA } from "../../../climateData";
import {
  projectId,
  publicAnonKey,
} from "../../../utils/supabase/info";
import videoSrc from "../../imports/0607.mp4";
import heroAudioSrc from "../../imports/inematic_sound_desig__2-1781004954014.mp3";
import chapterQuietBaseline from "../../imports/THE_QUIET_BASELINE__1959_1969_.jpeg";
import chapterFirstSignals from "../../imports/FIRST_SIGNALS__1970_1979_.jpeg";
import chapterAcceleration from "../../imports/ACCELERATION__1980_1999_.jpeg";
import chapterHotDecade from "../../imports/THE_HOT_DECADE__2000_2009_.jpeg";
import chapterVortexEra from "../../imports/VORTEX_ERA__2010_2024_.jpeg";
import fujitaImage from "../../imports/image.png";
import { Slider } from "./ui/slider";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import DisasterWitnessGallery from "./disaster-witness-gallery";
import BirthDateVortex from "./birth-date-vortex";

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-7b7572b4`;

type Entry = (typeof CLIMATE_DATA)[number];
type SeverityKey =
  | "STABLE"
  | "ELEVATED"
  | "CRITICAL"
  | "EXTREME";

const SEVERITY_COLORS: Record<SeverityKey, string> = {
  STABLE: "#4FC3F7",
  ELEVATED: "#FFB74D",
  CRITICAL: "#FF7043",
  EXTREME: "#E53935",
};
const SEVERITY_EMOJI: Record<SeverityKey, string> = {
  STABLE: "🔵",
  ELEVATED: "🟡",
  CRITICAL: "🟠",
  EXTREME: "🔴",
};

const TICK_YEARS = [
  1959, 1970, 1980, 1990, 2000, 2010, 2020, 2024,
];
const FALLBACK_DURATION = 20;
const MIN_YEAR = 1959;
const MAX_YEAR = 2024;
const YEAR_SPAN = MAX_YEAR - MIN_YEAR;

function yearToTime(year: number, duration: number): number {
  const pct = (year - MIN_YEAR) / YEAR_SPAN;
  return Math.min(Math.max(pct, 0), 1) * duration;
}

function timeToYear(t: number, duration: number): number {
  const pct = t / duration;
  const year = MIN_YEAR + Math.round(pct * YEAR_SPAN);
  return Math.min(Math.max(year, MIN_YEAR), MAX_YEAR);
}

function severityFromTime(t: number): SeverityKey {
  if (t < 5) return "STABLE";
  if (t < 10) return "ELEVATED";
  if (t < 15) return "CRITICAL";
  return "EXTREME";
}

function formatAnomaly(a: number): string {
  return `${a >= 0 ? "+" : ""}${a.toFixed(2)}°C`;
}

function VideoBackground({
  videoRef,
  onTimeUpdate,
  onLoadedMetadata,
  onEnded,
  loop,
  onSeeked,
}: {
  videoRef: React.RefObject<HTMLVideoElement>;
  onTimeUpdate: (
    e: React.SyntheticEvent<HTMLVideoElement>,
  ) => void;
  onLoadedMetadata: (
    e: React.SyntheticEvent<HTMLVideoElement>,
  ) => void;
  onEnded: () => void;
  loop: boolean;
  onSeeked: () => void;
}) {
  return (
    <video
      ref={videoRef}
      src={videoSrc}
      muted
      playsInline
      preload="auto"
      loop={loop}
      onTimeUpdate={onTimeUpdate}
      onLoadedMetadata={onLoadedMetadata}
      onEnded={onEnded}
      onSeeked={onSeeked}
      className="absolute inset-0 size-full object-cover z-0 hud-video"
    />
  );
}

function VignetteGlow({ severity }: { severity: SeverityKey }) {
  const color = SEVERITY_COLORS[severity];
  return (
    <div
      className="absolute inset-0 pointer-events-none z-[1] transition-all duration-1000 ease-out"
      style={{
        background: `radial-gradient(circle, transparent 35%, ${color}18 100%)`,
        opacity: 1,
      }}
    />
  );
}

function Sparkline({
  data,
  activeIndex,
  color,
  label,
  valueText,
}: {
  data: number[];
  activeIndex: number;
  color: string;
  label: string;
  valueText: string;
}) {
  const width = 240;
  const height = 40;
  const padding = 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, idx) => {
    const x =
      padding +
      (idx / (data.length - 1)) * (width - padding * 2);
    const y =
      height -
      padding -
      ((val - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Active path up to activeIndex
  const activePoints = points.slice(0, activeIndex + 1);
  const activePathD = activePoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Current point
  const currentPoint = points[activeIndex] || { x: 0, y: 0 };

  return (
    <div className="space-y-1.5 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors relative group">
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] tracking-[0.15em] text-[#888897] uppercase font-mono">
          {label}
        </span>
        <span className="text-white font-mono font-medium text-[12px]">
          {valueText}
        </span>
      </div>
      <div className="relative h-10 w-full overflow-hidden">
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
          {/* Background full line */}
          <path
            d={pathD}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1.2"
          />
          {/* Active progressive line */}
          {activePathD && (
            <path
              d={activePathD}
              fill="none"
              stroke={color}
              strokeWidth="2"
              className="transition-all duration-300"
              style={{
                filter: `drop-shadow(0 0 3px ${color})`,
              }}
            />
          )}
          {/* Pulsing indicator dot */}
          {currentPoint && (
            <g>
              <circle
                cx={currentPoint.x}
                cy={currentPoint.y}
                r="3"
                fill={color}
                className="animate-pulse"
              />
              <circle
                cx={currentPoint.x}
                cy={currentPoint.y}
                r="6"
                fill="none"
                stroke={color}
                strokeWidth="1"
                opacity="0.6"
                className="animate-ping"
                style={{
                  transformOrigin: `${currentPoint.x}px ${currentPoint.y}px`,
                }}
              />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

function RadarSeverityHUD({
  severity,
}: {
  severity: SeverityKey;
}) {
  const color = SEVERITY_COLORS[severity];
  return (
    <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center pointer-events-none select-none hud-severity-badge">
      {/* Outer compass ring */}
      <div className="relative size-60 sm:size-72 md:size-80 flex items-center justify-center">
        {/* Rotating ring 1 */}
        <div
          className="absolute inset-0 rounded-full border border-dashed animate-spin-slow transition-colors duration-500"
          style={{ borderColor: `${color}33` }}
        />
        {/* Rotating ring 2 */}
        <div
          className="absolute inset-4 rounded-full border border-double animate-spin-reverse-slow transition-colors duration-500"
          style={{ borderColor: `${color}22` }}
        />
        {/* Core display - Transparent circle background */}
        <div
          className="size-44 sm:size-48 md:size-52 rounded-full flex flex-col items-center justify-center border transition-all duration-500"
          style={{
            borderColor: color,
            boxShadow: `0 0 30px ${color}15, inset 0 0 20px ${color}08`,
            backgroundColor: "transparent",
            backdropFilter: "none",
          }}
        >
          {/* Telemetry crosshairs */}
          <div className="absolute w-full h-px bg-white/[0.02]" />
          <div className="absolute h-full w-px bg-white/[0.02]" />

          {/* Glowing circular status indicator */}
          <div
            className="w-3 h-3 rounded-full mb-2.5 transition-all duration-500"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 12px ${color}, 0 0 4px ${color}`,
            }}
          />
          <span className="text-[8px] sm:text-[9px] tracking-[0.25em] text-[#888897] font-mono">
            SEVERITY LEVEL
          </span>
          <span
            className="text-[14px] sm:text-[16px] font-bold tracking-[0.2em] font-orbitron mt-1 transition-colors duration-500"
            style={{
              color: color,
              textShadow: `0 0 8px ${color}`,
            }}
          >
            {severity}
          </span>
        </div>
      </div>
    </div>
  );
}

function DataPanel({
  entry,
  severity,
  noise,
  activeIndex,
}: {
  entry: Entry;
  severity: SeverityKey;
  noise: { co2: number; temp: number; tavg: number };
  activeIndex: number;
}) {
  const [open, setOpen] = useState(true);
  const activeColor = SEVERITY_COLORS[severity];

  const co2Data = useMemo(
    () => CLIMATE_DATA.map((d) => d.co2_ppm),
    [],
  );
  const tempData = useMemo(
    () => CLIMATE_DATA.map((d) => d.temp_anomaly),
    [],
  );
  const tavgData = useMemo(
    () => CLIMATE_DATA.map((d) => d.avg_tavg_celsius),
    [],
  );

  return (
    <div className="absolute top-[12%] md:top-1/2 left-0 -translate-y-1/2 z-20 flex items-stretch hud-left-panel">
      <div
        className="overflow-hidden border border-l-0 transition-all duration-300 hud-panel hud-scanlines"
        style={{
          width: open ? 300 : 0,
          borderColor: `${activeColor}22`,
          borderTopRightRadius: 12,
          borderBottomRightRadius: 12,
          boxShadow: `0 0 30px ${activeColor}08`,
        }}
      >
        <div className="w-[300px] p-5 font-sans relative rounded-xl backdrop-blur-md bg-white/5 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          {/* Glowing Top border indicator */}
          <div
            className="h-[3px] w-full absolute top-0 left-0 transition-colors duration-500"
            style={{
              backgroundColor: activeColor,
              boxShadow: `0 2px 8px ${activeColor}`,
            }}
          />

          <div className="mb-4 mt-2 flex items-center justify-between">
            <span className="text-[10px] tracking-[0.25em] text-[#888897] font-orbitron">
              SENSOR TELEMETRY
            </span>
            <span
              className="text-[9px] font-mono px-2 py-0.5 rounded border transition-all duration-500"
              style={{
                borderColor: `${activeColor}44`,
                color: activeColor,
                backgroundColor: `${activeColor}08`,
              }}
            >
              SYS.OK
            </span>
          </div>

          <div className="space-y-4">
            {/* Sparkline 1: CO₂ */}
            <Sparkline
              data={co2Data}
              activeIndex={activeIndex}
              color={activeColor}
              label="Atmospheric CO₂"
              valueText={`${(entry.co2_ppm + noise.co2).toFixed(2)} ppm`}
            />

            {/* Sparkline 2: Temperature Anomaly */}
            <Sparkline
              data={tempData}
              activeIndex={activeIndex}
              color={activeColor}
              label="Global Temp Anomaly"
              valueText={formatAnomaly(
                entry.temp_anomaly + noise.temp,
              )}
            />

            {/* Sparkline 3: Local TAVG */}
            <Sparkline
              data={tavgData}
              activeIndex={activeIndex}
              color={activeColor}
              label="Local Avg Temp"
              valueText={`${(entry.avg_tavg_celsius + noise.tavg).toFixed(2)}°C`}
            />
          </div>
        </div>
      </div>

      {/* Expand/Collapse Handle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-20 w-7 flex flex-col items-center justify-center bg-black/60 hover:bg-black/80 border border-l-0 border-white/[0.08] text-[#888897] hover:text-white transition-all self-center"
        style={{
          borderTopRightRadius: 6,
          borderBottomRightRadius: 6,
        }}
        aria-label={open ? "Collapse panel" : "Expand panel"}
      >
        {open ? (
          <ChevronLeft size={16} />
        ) : (
          <ChevronRight size={16} />
        )}
      </button>
    </div>
  );
}

function CustomBendingSlider({
  year,
  onYearChange,
  severity,
}: {
  year: number;
  onYearChange: (y: number) => void;
  severity: SeverityKey;
}) {
  const containerRef = useRef<SVGSVGElement>(null);
  const isDraggingRef = useRef(false);
  const activeColor = SEVERITY_COLORS[severity];

  const updateValueFromEvent = (clientX: number) => {
    const svg = containerRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const newVal = MIN_YEAR + Math.round(pct * YEAR_SPAN);
    onYearChange(newVal);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    updateValueFromEvent(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    updateValueFromEvent(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
  };

  const cx = ((year - MIN_YEAR) / YEAR_SPAN) * 1000;

  const ticks = useMemo(() => {
    const result = [];
    for (let i = MIN_YEAR; i <= MAX_YEAR; i++) {
      const tx = ((i - MIN_YEAR) / YEAR_SPAN) * 1000;
      const isMajor = TICK_YEARS.includes(i);
      const isActive = year === i;
      result.push({
        year: i,
        tx,
        isMajor,
        isActive,
      });
    }
    return result;
  }, [year]);

  return (
    <svg
      ref={containerRef}
      viewBox="0 0 1000 65"
      className="w-full h-auto cursor-ew-resize select-none overflow-visible"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Ruler Tick Marks */}
      {ticks.map((t) => (
        <g key={t.year} className="transition-all duration-300">
          <line
            x1={t.tx}
            y1={30}
            x2={t.tx}
            y2={t.isMajor ? 14 : 22}
            stroke={
              t.isActive
                ? activeColor
                : t.isMajor
                  ? "rgba(255, 255, 255, 0.3)"
                  : "rgba(255, 255, 255, 0.1)"
            }
            strokeWidth={t.isActive ? 2 : t.isMajor ? 1.2 : 0.8}
          />
          {t.isMajor && (
            <text
              x={t.tx}
              y={8}
              fill={
                t.isActive
                  ? activeColor
                  : "rgba(255, 255, 255, 0.4)"
              }
              fontSize={10}
              fontWeight={t.isActive ? "bold" : "normal"}
              textAnchor="middle"
              fontFamily="'JetBrains Mono', monospace"
              className="select-none transition-colors duration-300"
            >
              {t.year}
            </text>
          )}
        </g>
      ))}

      {/* Active Glowing Track Line (Glow effect behind) */}
      <path
        d={`M 0 30 L ${cx - 30} 30 C ${cx - 16} 30, ${cx - 12} 50, ${cx} 50`}
        fill="none"
        stroke={activeColor}
        strokeWidth={6}
        opacity={0.3}
        className="transition-all duration-300"
        style={{ filter: "blur(4px)" }}
      />

      {/* Active Track Line (Sharp) */}
      <path
        d={`M 0 30 L ${cx - 30} 30 C ${cx - 16} 30, ${cx - 12} 50, ${cx} 50`}
        fill="none"
        stroke={activeColor}
        strokeWidth={3}
        strokeLinecap="round"
        className="transition-all duration-300"
      />

      {/* Outer Bending Outline (Inactive remaining right side) */}
      <path
        d={`M ${cx} 50 C ${cx + 12} 50, ${cx + 16} 30, ${cx + 30} 30 L 1000 30`}
        fill="none"
        stroke="rgba(255, 255, 255, 0.08)"
        strokeWidth={3}
        strokeLinecap="round"
      />

      {/* Floating Dynamic Year Next to the Knob */}
      <text
        x={cx + 20}
        y={48}
        fill={activeColor}
        fontSize={16}
        fontWeight="black"
        fontFamily="'JetBrains Mono', monospace"
        className={`select-none transition-all duration-300 ${
          severity === "CRITICAL" || severity === "EXTREME"
            ? "hud-glitch-text"
            : ""
        }`}
        style={{ textShadow: `0 0 8px ${activeColor}` }}
      >
        {year}
      </text>

      {/* The Knob Group */}
      <g className="cursor-grab active:cursor-grabbing">
        {/* Glow outer */}
        <circle
          cx={cx}
          cy={30}
          r={16}
          fill="none"
          stroke={activeColor}
          strokeWidth={1}
          opacity={0.5}
          className="animate-ping"
          style={{ transformOrigin: `${cx}px 30px` }}
        />
        {/* Main circular knob body */}
        <circle
          cx={cx}
          cy={30}
          r={13}
          fill="#0c0c14"
          stroke={activeColor}
          strokeWidth={2}
          className="transition-colors duration-300"
          style={{
            filter: `drop-shadow(0 0 6px ${activeColor}44)`,
          }}
        />
        {/* Horizontal arrows */}
        <path
          d={`M ${cx - 5} 30 L ${cx - 2} 27 L ${cx - 2} 33 Z`}
          fill={activeColor}
        />
        <path
          d={`M ${cx + 5} 30 L ${cx + 2} 27 L ${cx + 2} 33 Z`}
          fill={activeColor}
        />
      </g>
    </svg>
  );
}

function MinimalSliderPanel({
  year,
  onYearChange,
  severity,
}: {
  year: number;
  onYearChange: (y: number) => void;
  severity: SeverityKey;
}) {
  return (
    <div className="w-full px-4 bg-transparent">
      <CustomBendingSlider
        year={year}
        onYearChange={onYearChange}
        severity={severity}
      />
    </div>
  );
}

function LiveCO2Ticker() {
  const [ppm, setPpm] = useState<number | null>(null);
  const [status, setStatus] = useState<
    "loading" | "live" | "error"
  >("loading");

  useEffect(() => {
    let cancelled = false;

    const fetchLiveCO2 = async () => {
      try {
        const res = await fetch(
          "https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_weekly_mlo.csv",
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const lines = text
          .split("\n")
          .filter((l) => l && !l.startsWith("#"));
        for (let i = lines.length - 1; i >= 0; i--) {
          const cols = lines[i].split(",");
          const val = parseFloat(cols[4]);
          if (Number.isFinite(val) && val > 0) {
            if (!cancelled) {
              setPpm(val);
              setStatus("live");
            }
            return;
          }
        }
        throw new Error("No valid weekly mean found");
      } catch (err) {
        console.log(`LiveCO2Ticker fetch error: ${err}`);
        if (!cancelled) setStatus("error");
      }
    };

    fetchLiveCO2();
    const id = setInterval(fetchLiveCO2, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="absolute top-20 right-6 z-30 select-none pointer-events-none">
      <div className="flex flex-col items-end gap-1 px-3 py-2 rounded-md border border-white/[0.08] bg-black/50 backdrop-blur-sm font-mono">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full rounded-full ${
                status === "live"
                  ? "bg-red-500 animate-ping"
                  : "bg-white/20"
              } opacity-75`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                status === "live"
                  ? "bg-red-500"
                  : status === "error"
                    ? "bg-white/20"
                    : "bg-yellow-400"
              }`}
            />
          </span>
          <span className="text-[9px] tracking-[0.3em] text-white/80">
            LIVE
          </span>
          <span className="text-[12px] font-bold text-white tabular-nums tracking-wider">
            {status === "live" && ppm !== null
              ? `${ppm.toFixed(2)} ppm`
              : status === "error"
                ? "— ppm"
                : "···"}
          </span>
        </div>
        <span className="text-[8px] tracking-[0.2em] text-[#888897] uppercase">
          Mauna Loa Observatory
        </span>
      </div>
    </div>
  );
}

function ShareCard({
  todaySeverity,
}: {
  todaySeverity: SeverityKey;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [submittedYear, setSubmittedYear] = useState<
    number | null
  >(null);
  const [copied, setCopied] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);

  const submittedEntry =
    submittedYear !== null
      ? CLIMATE_DATA.find((d) => d.year === submittedYear)
      : null;

  const shareUrl = shareId
    ? `${window.location.origin}?share=${shareId}`
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const y = parseInt(input, 10);
    if (!Number.isFinite(y) || y < MIN_YEAR || y > MAX_YEAR)
      return;
    const entry = CLIMATE_DATA.find((d) => d.year === y);
    const share_text = entry
      ? `In ${y}: CO₂ was ${entry.co2_ppm} ppm and the tornado was ${entry.severity}. Today it is ${todaySeverity}.`
      : `Birth year ${y} — The Data Tornado`;
    setSubmittedYear(y);
    setCopied(false);
    setShareLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ birth_year: y, share_text }),
      });
      const data = await res.json();
      if (data.id) setShareId(data.id);
      else
        console.log(
          `Share creation error: ${JSON.stringify(data)}`,
        );
    } catch (err) {
      console.log(`Share POST error: ${err}`);
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const reset = () => {
    setSubmittedYear(null);
    setInput("");
    setCopied(false);
    setShareId(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <button className="absolute top-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-5 py-2 border border-white/10 bg-black/40 backdrop-blur-sm font-mono text-[10px] tracking-[0.3em] text-white/50 hover:text-white/90 hover:border-white/25 hover:bg-white/5 transition-all duration-300 rounded-sm">
          <Share2 size={10} className="opacity-60" />
          SHARE BIRTH YEAR
        </button>
      </DialogTrigger>
      <DialogContent className="bg-[#0A0A0F]/95 border-white/[0.08] text-white font-mono backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-sm rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-[14px] tracking-[0.2em] text-[#d0d0dc] font-orbitron">
            BIRTH YEAR TELEMETRY
          </DialogTitle>
          <DialogDescription className="text-[11px] text-[#888897]">
            Extract historical climate telemetry for your birth
            year.
          </DialogDescription>
        </DialogHeader>
        {!submittedEntry ? (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 pt-2"
          >
            <Input
              autoFocus
              type="number"
              min={MIN_YEAR}
              max={MAX_YEAR}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`${MIN_YEAR}–${MAX_YEAR}`}
              className="bg-black/40 border-white/[0.08] text-white focus-visible:ring-1 focus-visible:ring-white/20 h-10 font-mono text-center text-lg tracking-widest placeholder:text-white/[0.15]"
            />
            <Button
              type="submit"
              className="w-full bg-white text-black hover:bg-white/90 h-10 font-bold hover:shadow-[0_0_15px_rgba(255,255,255,0.25)] transition-all"
            >
              GENERATE TRANSMISSION
            </Button>
          </form>
        ) : (
          <div className="space-y-4 pt-2">
            <div
              className="rounded-lg border p-5 text-[12px] leading-relaxed transition-all duration-500 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]"
              style={{
                borderColor: `${submittedEntry.tornado_color}44`,
                background: `linear-gradient(135deg, ${submittedEntry.tornado_color}11, transparent)`,
              }}
            >
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/[0.05]">
                <span className="text-[10px] tracking-widest text-[#888897]">
                  LOG REPORT
                </span>
                <span
                  className="size-2 rounded-full"
                  style={{
                    backgroundColor:
                      submittedEntry.tornado_color,
                    boxShadow: `0 0 8px ${submittedEntry.tornado_color}`,
                  }}
                />
              </div>
              <p className="font-sans leading-relaxed text-white/95">
                In{" "}
                <strong
                  className="font-orbitron"
                  style={{
                    color: submittedEntry.tornado_color,
                  }}
                >
                  {submittedEntry.year}
                </strong>
                : CO₂ was{" "}
                <span className="font-mono text-white/95">
                  {submittedEntry.co2_ppm} ppm
                </span>{" "}
                and the vortex severity was{" "}
                <span
                  className="font-mono"
                  style={{
                    color: submittedEntry.tornado_color,
                  }}
                >
                  {submittedEntry.severity}
                </span>
                . Today the system has reached{" "}
                <span
                  className="font-mono font-bold"
                  style={{
                    color: SEVERITY_COLORS[todaySeverity],
                  }}
                >
                  {todaySeverity}
                </span>{" "}
                status.
              </p>
            </div>

            {/* Share URL */}
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
              {shareLoading ? (
                <span className="text-[10px] text-[#888897] animate-pulse">
                  Generating share link…
                </span>
              ) : shareUrl ? (
                <span className="text-[10px] text-[#888897] font-mono break-all leading-relaxed">
                  {shareUrl}
                </span>
              ) : (
                <span className="text-[10px] text-[#888897]">
                  Share link unavailable
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCopy}
                disabled={!shareUrl || shareLoading}
                className="flex-1 bg-white text-black hover:bg-white/90 font-bold disabled:opacity-40"
              >
                <Copy size={12} className="mr-2" />
                {copied ? "LINK COPIED!" : "COPY SHARE LINK"}
              </Button>
              <Button
                onClick={reset}
                variant="outline"
                className="border-white/[0.08] bg-transparent text-[#d0d0dc] hover:bg-white/[0.08] hover:text-white"
              >
                RESET
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { ReactNode } from "react";

function ScrollFadeIn({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 },
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={elementRef}
      className={`transition-all duration-1000 ease-out transform ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function CO2Chart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredData, setHoveredData] = useState<{
    year: number;
    val: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 },
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const width = 800;
  const height = 300;
  const padding = 40;

  const xMin = MIN_YEAR;
  const xMax = MAX_YEAR;
  const yMin = 300; // bottom baseline for CO2 (ppm)
  const yMax = 440; // top limit for CO2

  const getX = (year: number) =>
    padding +
    ((year - xMin) / (xMax - xMin)) * (width - padding * 2);
  const getY = (val: number) =>
    height -
    padding -
    ((val - yMin) / (yMax - yMin)) * (height - padding * 2);

  const points = useMemo(
    () =>
      CLIMATE_DATA.map((d) => ({
        x: getX(d.year),
        y: getY(d.co2_ppm),
        year: d.year,
        val: d.co2_ppm,
      })),
    [],
  );

  const linePath = useMemo(
    () =>
      points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
        .join(" "),
    [points],
  );
  const areaPath = useMemo(
    () =>
      `${linePath} L ${getX(xMax)} ${height - padding} L ${getX(xMin)} ${height - padding} Z`,
    [linePath],
  );

  // Draw some horizontal grid lines
  const gridLines = [320, 340, 360, 380, 400, 420];

  const handlePointerMove = (
    e: React.PointerEvent<SVGSVGElement>,
  ) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * width;

    let closest = points[0];
    let minDist = Math.abs(points[0].x - svgX);
    for (let i = 1; i < points.length; i++) {
      const dist = Math.abs(points[i].x - svgX);
      if (dist < minDist) {
        minDist = dist;
        closest = points[i];
      }
    }
    setHoveredData(closest);
  };

  const handlePointerLeave = () => {
    setHoveredData(null);
  };

  return (
    <div
      ref={containerRef}
      className="w-full relative bg-white/[0.01] border border-white/[0.05] rounded-xl p-6 backdrop-blur-md"
    >
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] animate-pulse" />
        <span className="text-[10px] tracking-widest text-[#888897] font-mono">
          MAUNA LOA SENSOR TELEMETRY
        </span>
      </div>
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[600px] h-auto overflow-visible select-none cursor-crosshair"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          {/* Grid lines */}
          {gridLines.map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <text
                  x={padding - 8}
                  y={y + 4}
                  fill="rgba(255, 255, 255, 0.3)"
                  fontSize={10}
                  fontFamily="'JetBrains Mono', monospace"
                  textAnchor="end"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* X axis years */}
          {TICK_YEARS.map((yr) => {
            const x = getX(yr);
            return (
              <g key={yr}>
                <line
                  x1={x}
                  y1={height - padding}
                  x2={x}
                  y2={height - padding + 6}
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={height - padding + 20}
                  fill="rgba(255, 255, 255, 0.4)"
                  fontSize={10}
                  fontFamily="'JetBrains Mono', monospace"
                  textAnchor="middle"
                >
                  {yr}
                </text>
              </g>
            );
          })}

          {/* Area under curve with gradient */}
          <defs>
            <linearGradient
              id="areaGlow"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#00E5FF"
                stopOpacity="0.15"
              />
              <stop
                offset="100%"
                stopColor="#00E5FF"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          <path
            d={areaPath}
            fill="url(#areaGlow)"
            className={`transition-opacity duration-1000 delay-500 ${isVisible ? "opacity-100" : "opacity-0"}`}
          />

          {/* Active trend line */}
          <path
            d={linePath}
            fill="none"
            stroke="#00E5FF"
            strokeWidth={2.5}
            strokeDasharray={5000}
            strokeDashoffset={isVisible ? 0 : 5000}
            className="transition-all duration-[2000ms] ease-in-out"
            style={{
              filter:
                "drop-shadow(0 0 5px rgba(0, 229, 255, 0.6))",
            }}
          />

          {/* Static dots for background milestones */}
          {points.map((p) => {
            if (p.year % 10 === 0 || p.year === MAX_YEAR) {
              return (
                <circle
                  key={p.year}
                  cx={p.x}
                  cy={p.y}
                  r={isVisible ? 3 : 0}
                  fill="rgba(0, 229, 255, 0.4)"
                  className="transition-all duration-500 delay-[1000ms]"
                />
              );
            }
            return null;
          })}

          {/* Interactive tracking line and details */}
          {hoveredData && (
            <g>
              <line
                x1={hoveredData.x}
                y1={padding}
                x2={hoveredData.x}
                y2={height - padding}
                stroke="rgba(0, 229, 255, 0.3)"
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
              <circle
                cx={hoveredData.x}
                cy={hoveredData.y}
                r="6"
                fill="#00E5FF"
                stroke="#05050A"
                strokeWidth={2}
                style={{
                  filter: "drop-shadow(0 0 5px #00E5FF)",
                }}
              />
              <g>
                {(() => {
                  const boxWidth = 120;
                  const boxHeight = 45;
                  const tx = Math.max(
                    padding,
                    Math.min(
                      width - padding - boxWidth,
                      hoveredData.x - boxWidth / 2,
                    ),
                  );
                  const ty = Math.max(
                    padding,
                    hoveredData.y - boxHeight - 15,
                  );
                  return (
                    <g transform={`translate(${tx}, ${ty})`}>
                      <rect
                        width={boxWidth}
                        height={boxHeight}
                        rx={6}
                        fill="rgba(10, 10, 15, 0.95)"
                        stroke="#00E5FF"
                        strokeWidth={1}
                        style={{
                          filter:
                            "drop-shadow(0 4px 12px rgba(0,0,0,0.5))",
                        }}
                      />
                      <text
                        x={boxWidth / 2}
                        y={18}
                        fill="#fff"
                        fontSize={10}
                        fontWeight="bold"
                        fontFamily="'JetBrains Mono', monospace"
                        textAnchor="middle"
                      >
                        YEAR {hoveredData.year}
                      </text>
                      <text
                        x={boxWidth / 2}
                        y={34}
                        fill="#00E5FF"
                        fontSize={11}
                        fontWeight="bold"
                        fontFamily="'JetBrains Mono', monospace"
                        textAnchor="middle"
                      >
                        {hoveredData.val.toFixed(2)} ppm
                      </text>
                    </g>
                  );
                })()}
              </g>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

function AnomalyChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredData, setHoveredData] = useState<{
    year: number;
    val: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 },
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const width = 800;
  const height = 300;
  const padding = 40;
  const baselineY = height / 2; // neutral 0.0°C baseline in vertical center

  const xMin = MIN_YEAR;
  const xMax = MAX_YEAR;
  const valMin = -0.4;
  const valMax = 1.4;

  const getX = (year: number) =>
    padding +
    ((year - xMin) / (xMax - xMin)) * (width - padding * 2);
  const getY = (val: number) => {
    if (val >= 0) {
      return baselineY - (val / valMax) * (baselineY - padding);
    } else {
      return (
        baselineY +
        (val / valMin) * (height - padding - baselineY)
      );
    }
  };

  const getBarColor = (val: number) => {
    if (val < 0) return "#4FC3F7"; // Cool Stable blue
    if (val < 0.3) return "#FFB74D"; // Elevated warm yellow
    if (val < 0.7) return "#FF7043"; // Critical orange
    return "#E53935"; // Extreme Red
  };

  const points = useMemo(
    () =>
      CLIMATE_DATA.map((d) => ({
        x: getX(d.year),
        y: getY(d.temp_anomaly),
        year: d.year,
        val: d.temp_anomaly,
      })),
    [],
  );

  const handlePointerMove = (
    e: React.PointerEvent<SVGSVGElement>,
  ) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * width;

    let closest = points[0];
    let minDist = Math.abs(points[0].x - svgX);
    for (let i = 1; i < points.length; i++) {
      const dist = Math.abs(points[i].x - svgX);
      if (dist < minDist) {
        minDist = dist;
        closest = points[i];
      }
    }
    setHoveredData(closest);
  };

  const handlePointerLeave = () => {
    setHoveredData(null);
  };

  return (
    <div
      ref={containerRef}
      className="w-full relative bg-white/[0.01] border border-white/[0.05] rounded-xl p-6 backdrop-blur-md"
    >
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[#E53935] animate-pulse" />
        <span className="text-[10px] tracking-widest text-[#888897] font-mono">
          GISS LAND-OCEAN TEMPERATURE INDEX
        </span>
      </div>
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[600px] h-auto overflow-visible select-none cursor-crosshair"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <line
            x1={padding}
            y1={baselineY}
            x2={width - padding}
            y2={baselineY}
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth={1.5}
          />
          <text
            x={padding - 8}
            y={baselineY + 4}
            fill="rgba(255, 255, 255, 0.6)"
            fontSize={10}
            fontFamily="'JetBrains Mono', monospace"
            textAnchor="end"
          >
            0.0°C
          </text>

          {[-0.2, 0.2, 0.5, 0.8, 1.1].map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.03)"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
                <text
                  x={padding - 8}
                  y={y + 4}
                  fill="rgba(255, 255, 255, 0.3)"
                  fontSize={10}
                  fontFamily="'JetBrains Mono', monospace"
                  textAnchor="end"
                >
                  {val >= 0 ? "+" : ""}
                  {val}°C
                </text>
              </g>
            );
          })}

          {TICK_YEARS.map((yr) => {
            const x = getX(yr);
            return (
              <g key={yr}>
                <line
                  x1={x}
                  y1={height - padding}
                  x2={x}
                  y2={height - padding + 6}
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={height - padding + 20}
                  fill="rgba(255, 255, 255, 0.4)"
                  fontSize={10}
                  fontFamily="'JetBrains Mono', monospace"
                  textAnchor="middle"
                >
                  {yr}
                </text>
              </g>
            );
          })}

          {CLIMATE_DATA.map((d, i) => {
            const x = getX(d.year);
            const targetY = getY(d.temp_anomaly);
            const barHeight = Math.abs(targetY - baselineY);
            const y = d.temp_anomaly >= 0 ? targetY : baselineY;
            const isHovered =
              hoveredData && hoveredData.year === d.year;

            return (
              <rect
                key={d.year}
                x={x - 3}
                y={isVisible ? y : baselineY}
                width={6}
                height={isVisible ? barHeight : 0}
                fill={getBarColor(d.temp_anomaly)}
                opacity={isHovered ? 1.0 : 0.8}
                rx={1}
                className="transition-all duration-[1200ms] ease-out"
                style={{
                  transitionDelay: `${i * 12}ms`,
                  filter: `drop-shadow(0 0 2px ${getBarColor(d.temp_anomaly)}${isHovered ? "bb" : "33"})`,
                }}
              />
            );
          })}

          {/* Interactive tracking line and details */}
          {hoveredData && (
            <g>
              <line
                x1={hoveredData.x}
                y1={padding}
                x2={hoveredData.x}
                y2={height - padding}
                stroke={getBarColor(hoveredData.val)}
                strokeWidth={1.5}
                strokeDasharray="3 3"
                opacity={0.6}
              />
              <circle
                cx={hoveredData.x}
                cy={hoveredData.y}
                r="6"
                fill={getBarColor(hoveredData.val)}
                stroke="#05050A"
                strokeWidth={2}
                style={{
                  filter: `drop-shadow(0 0 5px ${getBarColor(hoveredData.val)})`,
                }}
              />
              <g>
                {(() => {
                  const boxWidth = 120;
                  const boxHeight = 45;
                  const tx = Math.max(
                    padding,
                    Math.min(
                      width - padding - boxWidth,
                      hoveredData.x - boxWidth / 2,
                    ),
                  );
                  const ty = Math.max(
                    padding,
                    hoveredData.val >= 0
                      ? hoveredData.y - boxHeight - 15
                      : hoveredData.y + 15,
                  );
                  return (
                    <g transform={`translate(${tx}, ${ty})`}>
                      <rect
                        width={boxWidth}
                        height={boxHeight}
                        rx={6}
                        fill="rgba(10, 10, 15, 0.95)"
                        stroke={getBarColor(hoveredData.val)}
                        strokeWidth={1}
                        style={{
                          filter:
                            "drop-shadow(0 4px 12px rgba(0,0,0,0.5))",
                        }}
                      />
                      <text
                        x={boxWidth / 2}
                        y={18}
                        fill="#fff"
                        fontSize={10}
                        fontWeight="bold"
                        fontFamily="'JetBrains Mono', monospace"
                        textAnchor="middle"
                      >
                        YEAR {hoveredData.year}
                      </text>
                      <text
                        x={boxWidth / 2}
                        y={34}
                        fill={getBarColor(hoveredData.val)}
                        fontSize={11}
                        fontWeight="bold"
                        fontFamily="'JetBrains Mono', monospace"
                        textAnchor="middle"
                      >
                        {formatAnomaly(hoveredData.val)}
                      </text>
                    </g>
                  );
                })()}
              </g>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

function LocalTempChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredData, setHoveredData] = useState<{
    year: number;
    val: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 },
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const width = 800;
  const height = 300;
  const padding = 40;

  const xMin = MIN_YEAR;
  const xMax = MAX_YEAR;
  const yMin = 11.0; // Central Park min is 11.63 (1978)
  const yMax = 15.0; // Central Park max is 14.40 (2024)

  const getX = (year: number) =>
    padding +
    ((year - xMin) / (xMax - xMin)) * (width - padding * 2);
  const getY = (val: number) =>
    height -
    padding -
    ((val - yMin) / (yMax - yMin)) * (height - padding * 2);

  const points = useMemo(
    () =>
      CLIMATE_DATA.map((d) => ({
        x: getX(d.year),
        y: getY(d.avg_tavg_celsius),
        year: d.year,
        val: d.avg_tavg_celsius,
      })),
    [],
  );

  const linePath = useMemo(
    () =>
      points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
        .join(" "),
    [points],
  );

  const milestones = [
    {
      year: 1988,
      label: "Hansen Testimony",
      color: "#FFB74D",
      desc: "Climate warning",
      yOffset: -55,
      xOffset: 0,
    },
    {
      year: 2015,
      label: "Paris Agreement",
      color: "#FF7043",
      desc: "1.5°C threshold",
      yOffset: -45,
      xOffset: -65,
    },
    {
      year: 2024,
      label: "Record Central Park TAVG",
      color: "#E53935",
      desc: "14.40°C Annual Avg",
      yOffset: -50,
      xOffset: -55,
    },
  ];

  const handlePointerMove = (
    e: React.PointerEvent<SVGSVGElement>,
  ) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * width;

    let closest = points[0];
    let minDist = Math.abs(points[0].x - svgX);
    for (let i = 1; i < points.length; i++) {
      const dist = Math.abs(points[i].x - svgX);
      if (dist < minDist) {
        minDist = dist;
        closest = points[i];
      }
    }
    setHoveredData(closest);
  };

  const handlePointerLeave = () => {
    setHoveredData(null);
  };

  return (
    <div
      ref={containerRef}
      className="w-full relative bg-white/[0.01] border border-white/[0.05] rounded-xl p-6 backdrop-blur-md"
    >
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[#FF7043] animate-pulse" />
        <span className="text-[10px] tracking-widest text-[#888897] font-mono">
          CENTRAL PARK OBSERVATORY STATION
        </span>
      </div>
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[600px] h-auto overflow-visible select-none cursor-crosshair"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          {[11.5, 12.0, 12.5, 13.0, 13.5, 14.0, 14.5].map(
            (val) => {
              const y = getY(val);
              return (
                <g key={val}>
                  <line
                    x1={padding}
                    y1={y}
                    x2={width - padding}
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding - 8}
                    y={y + 4}
                    fill="rgba(255, 255, 255, 0.3)"
                    fontSize={10}
                    fontFamily="'JetBrains Mono', monospace"
                    textAnchor="end"
                  >
                    {val.toFixed(1)}°C
                  </text>
                </g>
              );
            },
          )}

          {TICK_YEARS.map((yr) => {
            const x = getX(yr);
            return (
              <g key={yr}>
                <line
                  x1={x}
                  y1={height - padding}
                  x2={x}
                  y2={height - padding + 6}
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={height - padding + 20}
                  fill="rgba(255, 255, 255, 0.4)"
                  fontSize={10}
                  fontFamily="'JetBrains Mono', monospace"
                  textAnchor="middle"
                >
                  {yr}
                </text>
              </g>
            );
          })}

          <path
            d={linePath}
            fill="none"
            stroke="#FF7043"
            strokeWidth={2.5}
            strokeDasharray={5000}
            strokeDashoffset={isVisible ? 0 : 5000}
            className="transition-all duration-[2000ms] ease-in-out"
            style={{
              filter:
                "drop-shadow(0 0 5px rgba(255, 112, 67, 0.6))",
            }}
          />

          {milestones.map((m, idx) => {
            const pt = points.find((p) => p.year === m.year);
            if (!pt) return null;

            // Render milestones translucent on hover proximity
            const isHoveredClose =
              hoveredData &&
              Math.abs(hoveredData.year - m.year) <= 1;

            return (
              <g
                key={m.year}
                className={`transition-all duration-1000 ease-out ${isHoveredClose ? "opacity-25" : "opacity-100"}`}
              >
                <line
                  x1={pt.x}
                  y1={height - padding}
                  x2={pt.x}
                  y2={isVisible ? pt.y : height - padding}
                  stroke={m.color}
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                  className="transition-all duration-[1500ms] ease-out"
                  style={{
                    transitionDelay: `${500 + idx * 300}ms`,
                  }}
                />

                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isVisible ? 5 : 0}
                  fill={m.color}
                  stroke="#05050A"
                  strokeWidth={2}
                  className="transition-all duration-500"
                  style={{
                    transitionDelay: `${1000 + idx * 300}ms`,
                  }}
                />

                <g
                  className={`transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}
                  style={{
                    transitionDelay: `${1200 + idx * 300}ms`,
                  }}
                >
                  {/* Connector line to the staggered box */}
                  {(m.xOffset !== 0 || m.yOffset !== -48) && (
                    <line
                      x1={pt.x}
                      y1={pt.y}
                      x2={pt.x + m.xOffset}
                      y2={pt.y + m.yOffset + 17}
                      stroke={m.color}
                      strokeWidth={1}
                      opacity={0.4}
                    />
                  )}
                  <rect
                    x={pt.x - 70 + m.xOffset}
                    y={pt.y + m.yOffset}
                    width={140}
                    height={34}
                    rx={4}
                    fill="rgba(10, 10, 15, 0.95)"
                    stroke={m.color}
                    strokeWidth={1}
                    opacity={0.9}
                  />
                  <text
                    x={pt.x + m.xOffset}
                    y={pt.y + m.yOffset + 13}
                    fill="#FFF"
                    fontSize={8}
                    fontWeight="bold"
                    fontFamily="'JetBrains Mono', monospace"
                    textAnchor="middle"
                  >
                    {m.label}
                  </text>
                  <text
                    x={pt.x + m.xOffset}
                    y={pt.y + m.yOffset + 25}
                    fill="rgba(255, 255, 255, 0.6)"
                    fontSize={7.5}
                    fontFamily="'JetBrains Mono', monospace"
                    textAnchor="middle"
                  >
                    {m.desc}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Interactive tracking line and details */}
          {hoveredData && (
            <g>
              <line
                x1={hoveredData.x}
                y1={padding}
                x2={hoveredData.x}
                y2={height - padding}
                stroke="rgba(255, 112, 67, 0.3)"
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
              <circle
                cx={hoveredData.x}
                cy={hoveredData.y}
                r="6"
                fill="#FF7043"
                stroke="#05050A"
                strokeWidth={2}
                style={{
                  filter: "drop-shadow(0 0 4px #FF7043)",
                }}
              />
              <g>
                {(() => {
                  const boxWidth = 120;
                  const boxHeight = 45;
                  const tx = Math.max(
                    padding,
                    Math.min(
                      width - padding - boxWidth,
                      hoveredData.x - boxWidth / 2,
                    ),
                  );
                  const ty = Math.max(
                    padding,
                    hoveredData.y - boxHeight - 15,
                  );
                  return (
                    <g transform={`translate(${tx}, ${ty})`}>
                      <rect
                        width={boxWidth}
                        height={boxHeight}
                        rx={6}
                        fill="rgba(10, 10, 15, 0.95)"
                        stroke="#FF7043"
                        strokeWidth={1}
                        style={{
                          filter:
                            "drop-shadow(0 4px 12px rgba(0,0,0,0.5))",
                        }}
                      />
                      <text
                        x={boxWidth / 2}
                        y={18}
                        fill="#fff"
                        fontSize={10}
                        fontWeight="bold"
                        fontFamily="'JetBrains Mono', monospace"
                        textAnchor="middle"
                      >
                        YEAR {hoveredData.year}
                      </text>
                      <text
                        x={boxWidth / 2}
                        y={34}
                        fill="#FF7043"
                        fontSize={11}
                        fontWeight="bold"
                        fontFamily="'JetBrains Mono', monospace"
                        textAnchor="middle"
                      >
                        {hoveredData.val.toFixed(2)}°C
                      </text>
                    </g>
                  );
                })()}
              </g>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

const WORKFLOW_STEPS = [
  {
    id: "figma",
    title: "Figma Agent Design",
    icon: Layers,
    metric: "Design Canvas",
    desc: "Translating atmospheric vortex physics, compass dials, and color-coded temperature severity scales into a clean glassmorphism layout.",
    code: `// Figma Blueprint Telemetry
vortexState.severity = {
  STABLE:   "indigo-glow",
  ELEVATED: "amber-glow",
  CRITICAL: "orange-glow",
  EXTREME:  "red-glitch"
};`,
    insight:
      "Defining the sensory urgency curve before writing a single line of code.",
  },
  {
    id: "weave",
    title: "Weave Simulation",
    icon: Cpu,
    metric: "WebGL Vector Engine",
    desc: "Mapping CSV vectors to dynamically sync background video playback rates and trigger atmospheric noise flickers.",
    code: `// Simulation Sync Loop
const targetSpeed = entry.tornado_speed;
video.playbackRate = targetSpeed;
if (liveFeed) {
  applyMicroFluctuations();
}`,
    insight:
      "Bridges interactive data with physical vector parameters.",
  },
  {
    id: "mcp",
    title: "NOAA API Pipeline",
    icon: Database,
    metric: "Real-time Datasets",
    desc: "Fetching historical telemetry directly from NOAA Mauna Loa and GISS anomaly APIs to populate the simulator model.",
    code: `// NOAA Data Schema
interface TelemetryRecord {
  year: number;
  co2_ppm: number;
  temp_anomaly: number;
  avg_tavg_celsius: number;
}`,
    insight:
      "Eliminates parsing overhead by pre-compiling all metrics into high-speed arrays.",
  },
  {
    id: "impact",
    title: "Personal Share Card",
    icon: Award,
    metric: "Social Virality Unit",
    desc: "Connecting macro-climate trends to the user's birth year, outputting personal comparative telemetry for high social virality.",
    code: `// Social Telemetry Compilator
const text = \`In \${birthYear}: CO2 was \${co2} ppm
and the tornado was \${severity}. Today it
is EXTREME.\`;
copyToClipboard(text);`,
    insight:
      "Converts dry global statistics into personal stories.",
  },
];

function WorkflowTimeline() {
  const [activeStep, setActiveStep] = useState("figma");
  const step =
    WORKFLOW_STEPS.find((s) => s.id === activeStep) ||
    WORKFLOW_STEPS[0];
  const StepIcon = step.icon;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
      <div className="lg:col-span-5 flex flex-col gap-3">
        {WORKFLOW_STEPS.map((s) => {
          const Icon = s.icon;
          const isActive = s.id === activeStep;
          return (
            <button
              key={s.id}
              onClick={() => setActiveStep(s.id)}
              className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-300 relative group overflow-hidden ${
                isActive
                  ? "bg-white/[0.04] border-white/[0.15] shadow-[0_0_20px_rgba(255,255,255,0.02)]"
                  : "bg-white/[0.01] border-white/[0.05] hover:bg-white/[0.02] hover:border-white/[0.08]"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-white" />
              )}
              <div
                className={`p-2.5 rounded-lg border transition-colors duration-300 ${
                  isActive
                    ? "bg-white/10 border-white/20 text-white"
                    : "bg-white/[0.02] border-white/[0.05] text-[#888897]"
                }`}
              >
                <Icon size={18} />
              </div>
              <div>
                <h4
                  className={`text-[13px] font-bold font-orbitron tracking-wider transition-colors duration-300 ${
                    isActive ? "text-white" : "text-[#d0d0dc]"
                  }`}
                >
                  {s.title}
                </h4>
                <p className="text-[10px] text-[#888897] font-mono mt-0.5">
                  {s.metric}
                </p>
              </div>
              <ChevronRight
                size={14}
                className={`ml-auto transition-all duration-300 ${
                  isActive
                    ? "text-white translate-x-0"
                    : "text-white/20 translate-x-[-4px] group-hover:translate-x-0 group-hover:text-white/40"
                }`}
              />
            </button>
          );
        })}
      </div>

      <div className="lg:col-span-7 bg-white/[0.01] border border-white/[0.05] rounded-xl p-6 relative overflow-hidden backdrop-blur-md min-h-[300px] flex flex-col justify-between">
        <div className="absolute top-0 right-0 p-3 bg-white/[0.02] border-b border-l border-white/[0.05] rounded-bl-lg">
          <span className="text-[8px] font-mono tracking-[0.2em] text-[#888897]">
            COMPILE STATUS: OK
          </span>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/5 border border-white/10 rounded-lg text-white">
              <StepIcon size={20} />
            </div>
            <div>
              <h3 className="text-[15px] font-black font-orbitron tracking-wider text-white">
                {step.title}
              </h3>
              <p className="text-[9px] text-[#888897] font-mono uppercase tracking-widest">
                {step.metric}
              </p>
            </div>
          </div>

          <p className="text-[11.5px] leading-relaxed text-white/80 font-sans">
            {step.desc}
          </p>

          <div className="rounded-lg border border-white/[0.05] bg-black/60 p-4 font-mono text-[10px] text-emerald-400/90 relative shadow-inner">
            <div className="absolute top-2 right-2 flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/50" />
              <span className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
            </div>
            <pre className="overflow-x-auto select-none leading-relaxed">
              <code>{step.code}</code>
            </pre>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/[0.03] flex items-center justify-between">
          <span className="text-[8px] tracking-[0.15em] text-[#888897] font-mono uppercase">
            DESIGN SYSTEM INSIGHT
          </span>
          <span className="text-[10px] text-[#d0d0dc] font-mono text-right font-medium">
            "{step.insight}"
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Scroll-narrative primitives (sections 2–5) ───────────────────────────

const LETTER_EASE = [0.16, 1, 0.3, 1] as const;

function LetterReveal({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const chars = Array.from(text);
  return (
    <motion.span
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        staggerChildren: 0.04,
        delayChildren: delay,
      }}
      className={`inline-flex flex-wrap overflow-hidden align-baseline ${className ?? ""}`}
      aria-label={text}
    >
      {chars.map((c, i) => (
        <span key={i} className="inline-block overflow-hidden">
          <motion.span
            className="inline-block"
            variants={{
              initial: { y: "120%", opacity: 0 },
              animate: {
                y: 0,
                opacity: 1,
                transition: {
                  duration: 1.1,
                  ease: LETTER_EASE,
                },
              },
            }}
          >
            {c === " " ? " " : c}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

function SectionNumber({
  n,
  label,
  accent,
}: {
  n: string;
  label: string;
  accent: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="flex items-center gap-4 font-mono text-[10px] tracking-[0.3em] uppercase"
    >
      <span style={{ color: accent }}>{n}</span>
      <span
        className="h-px w-16"
        style={{ backgroundColor: `${accent}55` }}
      />
      <span className="text-[#888897]">{label}</span>
    </motion.div>
  );
}

function SandTransitionImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [isPresent, safeToRemove] = usePresence();
  const filterIdRef = useRef(
    `sand-${Math.random().toString(36).slice(2, 9)}`,
  );
  const filterId = filterIdRef.current;
  const [progress, setProgress] = useState(isPresent ? 0 : 0);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const duration = 900;
    const entering = isPresent;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = entering
        ? 1 - Math.pow(1 - t, 4)
        : Math.pow(t, 3);
      setProgress(entering ? 1 - eased : eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else if (!entering && safeToRemove) {
        safeToRemove();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPresent, safeToRemove]);

  const displacementScale = progress * 150;
  const dy = isPresent ? -80 * progress : 120 * progress;
  const dx = isPresent ? -30 * progress : 30 * progress;
  const blur = progress * 6;
  const opacity = Math.max(0, 1 - progress * 1.2);

  return (
    <div
      className={`relative ${className ?? ""}`}
      style={{ opacity }}
    >
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter
            id={filterId}
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="1.8"
              numOctaves="4"
              seed="3"
            />
            <feDisplacementMap
              in="SourceGraphic"
              scale={displacementScale}
            />
            <feOffset dx={dx} dy={dy} />
            <feGaussianBlur stdDeviation={blur} />
            <feColorMatrix
              type="matrix"
              values={`1 0 0 0 0
                       0 1 0 0 0
                       0 0 1 0 0
                       0 0 0 ${Math.max(0, 1 - progress * 1.2)} 0`}
            />
          </filter>
        </defs>
      </svg>
      <img
        src={src}
        alt={alt}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        className="w-full h-full object-contain"
        style={{
          filter:
            progress > 0.01 ? `url(#${filterId})` : undefined,
        }}
      />
    </div>
  );
}

const CLIMATE_CHAPTERS: Array<{
  range: [number, number];
  title: string;
  blurb: string;
  severityKey: SeverityKey;
  image: string;
}> = [
  {
    range: [1959, 1969],
    title: "The Quiet Baseline",
    blurb:
      "Ice cores hold steady. CO₂ ticks past 315 ppm — barely noticed.",
    severityKey: "STABLE",
    image: chapterQuietBaseline,
  },
  {
    range: [1970, 1979],
    title: "First Signals",
    blurb:
      "Anomaly turns positive. The first climate models warn of what is coming.",
    severityKey: "STABLE",
    image: chapterFirstSignals,
  },
  {
    range: [1980, 1999],
    title: "Acceleration",
    blurb:
      "Hansen testifies. Mauna Loa crosses 360 ppm. Trend lines bend up.",
    severityKey: "ELEVATED",
    image: chapterAcceleration,
  },
  {
    range: [2000, 2009],
    title: "The Hot Decade",
    blurb:
      "Records fall in sequence. Anomaly clears +0.6°C with momentum.",
    severityKey: "CRITICAL",
    image: chapterHotDecade,
  },
  {
    range: [2010, 2024],
    title: "Vortex Era",
    blurb:
      "424 ppm. +1.29°C. The data tornado tightens its spiral.",
    severityKey: "EXTREME",
    image: chapterVortexEra,
  },
];

const FUJITA_TIERS: Array<{
  ef: string;
  wind: string;
  damage: string;
  tier: SeverityKey;
  co2: string;
  anomaly: string;
  icon: React.ComponentType<{
    size?: number;
    className?: string;
  }> | null;
}> = [
  {
    ef: "EF0",
    wind: "65–85 mph",
    damage: "Branches snap. Signs come down.",
    tier: "STABLE",
    co2: "< 320 ppm",
    anomaly: "< 0°C",
    icon: Trees,
  },
  {
    ef: "EF1",
    wind: "86–110 mph",
    damage: "Roofs peel. Mobile homes shift.",
    tier: "STABLE",
    co2: "320–340 ppm",
    anomaly: "0 → +0.2°C",
    icon: null,
  },
  {
    ef: "EF2",
    wind: "111–135 mph",
    damage: "Cars tossed. Large trees uprooted.",
    tier: "ELEVATED",
    co2: "340–360 ppm",
    anomaly: "+0.2 → +0.4°C",
    icon: Car,
  },
  {
    ef: "EF3",
    wind: "136–165 mph",
    damage: "Roofs torn off. Trains overturned.",
    tier: "CRITICAL",
    co2: "360–390 ppm",
    anomaly: "+0.4 → +0.7°C",
    icon: null,
  },
  {
    ef: "EF4",
    wind: "166–200 mph",
    damage: "Frame houses leveled. Cars thrown.",
    tier: "CRITICAL",
    co2: "390–410 ppm",
    anomaly: "+0.7 → +1.0°C",
    icon: Building2,
  },
  {
    ef: "EF5",
    wind: "> 200 mph",
    damage: "Total destruction. Nothing remains.",
    tier: "EXTREME",
    co2: "> 410 ppm",
    anomaly: "> +1.0°C",
    icon: AlertOctagon,
  },
];

const DEBRIS_ITEMS = [
  { label: "Leaf", dotColor: "#4ADE80", offset: "20%" },
  { label: "Twig", dotColor: "#22C55E", offset: "22%" },
  { label: "Signpost", dotColor: "#06B6D4", offset: "25%" },
  { label: "Roof Tile", dotColor: "#B45309", offset: "18%" },
  { label: "Car", dotColor: "#64748B", offset: "24%" },
  { label: "Tree Branch", dotColor: "#15803D", offset: "28%" },
  { label: "SUV", dotColor: "#475569", offset: "16%" },
  { label: "Sedan", dotColor: "#94A3B8", offset: "22%" },
  { label: "Fence", dotColor: "#F59E0B", offset: "26%" },
  { label: "Livestock", dotColor: "#D97706", offset: "15%" },
  { label: "Horse", dotColor: "#78350F", offset: "20%" },
  { label: "Tractor", dotColor: "#EAB308", offset: "25%" },
  { label: "House Wall", dotColor: "#92400E", offset: "18%" },
  { label: "Bus", dotColor: "#CA8A04", offset: "23%" },
  { label: "Trailer", dotColor: "#B45309", offset: "27%" },
  { label: "Train Car", dotColor: "#E2E8F0", offset: "16%" },
  { label: "Building", dotColor: "#B91C1C", offset: "21%" },
  { label: "Debris Cloud", dotColor: "#EF4444", offset: "25%" },
];

function NestedFunnel({
  depth,
  level = 0,
}: {
  depth: number;
  level?: number;
}) {
  const delay = `${(level * -0.05).toFixed(2)}s`;
  const style = { "--delay": delay } as React.CSSProperties;
  if (depth <= 1) {
    return <i style={style} />;
  }
  return (
    <i style={style}>
      <NestedFunnel depth={depth - 1} level={level + 1} />
    </i>
  );
}

function FujitaScale() {
  const containerRef = useRef<HTMLElement | null>(null);
  const scrollYProgress = useMotionValue(0);

  const [activeTier, setActiveTier] = useState(0);
  const [scrollPct, setScrollPct] = useState(0);
  const [pulse, setPulse] = useState(false);
  const firedRef = useRef(false);

  // Scroll listener to update scrollYProgress and handle auto-scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cachedOffsetTop = 0;
    let cachedHeight = 0;
    let raf = 0;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const scrollTop =
        window.scrollY || document.documentElement.scrollTop;
      cachedOffsetTop = rect.top + scrollTop;
      cachedHeight = rect.height;
    };

    const update = () => {
      raf = 0;
      const scrollTop =
        window.scrollY || document.documentElement.scrollTop;
      const scrolled = scrollTop - cachedOffsetTop;
      const vh = window.innerHeight || 1;
      const total = cachedHeight - vh;
      const p =
        total > 0
          ? Math.min(1, Math.max(0, scrolled / total))
          : 0;

      scrollYProgress.set(p);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    const onResize = () => {
      measure();
      update();
    };

    measure();
    update();

    window.addEventListener("scroll", onScroll, {
      passive: true,
    });
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [scrollYProgress]);

  // Track scrollYProgress changes to update activeTier, scrollPct, and pulse
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const steps = FUJITA_TIERS.length;
    const t = Math.min(
      steps - 1,
      Math.max(0, Math.floor(p * steps)),
    );
    setActiveTier((prev) => (prev === t ? prev : t));
    setScrollPct(
      Math.min(99, Math.max(0, Math.round(p * 100))),
    );

    if (p > 0.92 && !firedRef.current) {
      firedRef.current = true;
      setPulse(true);
      setTimeout(() => setPulse(false), 700);
    }
    if (p < 0.6) firedRef.current = false;
  });

  const tier = FUJITA_TIERS[activeTier];
  const accent = SEVERITY_COLORS[tier.tier];

  // Motion transitions
  const meterHeight = useTransform(
    scrollYProgress,
    [0, 1],
    ["0%", "100%"],
  );
  const meterColor = useTransform(
    scrollYProgress,
    [0, 0.2, 0.45, 0.75, 1],
    [
      SEVERITY_COLORS.STABLE,
      SEVERITY_COLORS.STABLE,
      SEVERITY_COLORS.ELEVATED,
      SEVERITY_COLORS.CRITICAL,
      SEVERITY_COLORS.EXTREME,
    ],
  );
  const meterGlow = useTransform(
    meterColor,
    (c) => `0 0 24px ${c}, 0 0 6px ${c}`,
  );

  // Tornado debris levels
  const ef0On = useTransform(
    scrollYProgress,
    [0.0, 0.04, 1.0],
    [0, 1, 1],
  );
  const ef1On = useTransform(
    scrollYProgress,
    [0.16, 0.21, 1.0],
    [0, 1, 1],
  );
  const ef2On = useTransform(
    scrollYProgress,
    [0.33, 0.38, 1.0],
    [0, 1, 1],
  );
  const ef3On = useTransform(
    scrollYProgress,
    [0.5, 0.55, 1.0],
    [0, 1, 1],
  );
  const ef4On = useTransform(
    scrollYProgress,
    [0.66, 0.71, 1.0],
    [0, 1, 1],
  );
  const ef5On = useTransform(
    scrollYProgress,
    [0.83, 0.88, 1.0],
    [0, 1, 1],
  );

  // Click-to-scroll to specific tier
  const scrollToTier = (index: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const scrollTop =
      window.scrollY || document.documentElement.scrollTop;
    const containerTop = rect.top + scrollTop;
    const vh = window.innerHeight || 1;
    const total = rect.height - vh;

    const targetP = index / (FUJITA_TIERS.length - 1);
    const targetScrollY = containerTop + targetP * total;

    window.scrollTo({
      top: targetScrollY,
      behavior: "smooth",
    });
  };

  const latest = CLIMATE_DATA[CLIMATE_DATA.length - 1];
  const currentEF = (() => {
    const a = (latest as any).temp_anomaly ?? 1.29;
    if (a > 1.0) return "EF5";
    if (a > 0.7) return "EF4";
    if (a > 0.4) return "EF3";
    if (a > 0.2) return "EF2";
    if (a > 0) return "EF1";
    return "EF0";
  })();

  return (
    <section
      ref={containerRef}
      style={{ position: "relative" }}
      className="bg-black text-white z-30 overflow-visible lg:h-[260vh]"
    >
      <div className="w-full flex flex-col justify-between lg:sticky lg:top-0 lg:h-screen overflow-hidden">
        {/* Header */}
        <div className="px-6 md:px-12 pt-12 lg:pt-16 pb-4">
          <div className="max-w-7xl mx-auto w-full">
            <div className="mb-4">
              <SectionNumber
                n="05"
                label="Severity Scale"
                accent={SEVERITY_COLORS.EXTREME}
              />
            </div>
            <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
              <h2 className="font-orbitron font-medium text-white text-2xl md:text-4xl xl:text-5xl leading-[1.05] tracking-tight max-w-4xl">
                <LetterReveal text="Measuring the vortex" />
              </h2>
              <div className="font-mono text-[9px] tracking-widest uppercase text-[#888897] max-w-xs">
                The Enhanced Fujita scale
                <br />
                translated into climate.
              </div>
            </div>
          </div>
        </div>

        {/* Content grid */}
        <div className="relative px-6 md:px-12 flex-1 flex items-center">
          <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[64px_1fr_360px] gap-6 lg:gap-10 pb-8">
            {/* STRIP A — Interactive EF meter */}
            <div className="hidden lg:block lg:h-[75vh] py-[2vh] self-center">
              <div className="relative w-8 mx-auto h-full flex flex-col items-stretch">
                <div className="absolute inset-0 border border-white/10 bg-black/60 overflow-hidden">
                  <motion.div
                    className="absolute bottom-0 left-0 right-0"
                    style={{
                      height: meterHeight,
                      background: meterColor,
                      boxShadow: meterGlow,
                    }}
                  />
                </div>
                {/* Tier marks */}
                <div className="relative flex-1 flex flex-col-reverse justify-between py-2">
                  {FUJITA_TIERS.map((t, i) => {
                    return (
                      <button
                        key={t.ef}
                        onClick={() => scrollToTier(i)}
                        className="relative flex items-center w-full text-left cursor-pointer focus:outline-none bg-transparent border-0 p-0 z-10 group"
                        style={{ height: "30px" }}
                        title={`Select ${t.ef}`}
                      >
                        <TierMark
                          ef={t.ef}
                          Icon={t.icon}
                          active={activeTier === i}
                          color={SEVERITY_COLORS[t.tier]}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* STRIP B — Tornado stage */}
            <div className="h-[75vh] lg:h-[75vh] self-center w-full">
              <div className="relative w-full h-full overflow-hidden">
                {/* Ambient tier-color glow behind the funnel */}
                <motion.div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none"
                  animate={{
                    background: `radial-gradient(ellipse 60% 70% at 50% 55%, ${accent}22 0%, ${accent}10 35%, transparent 70%)`,
                  }}
                  transition={{
                    duration: 0.6,
                    ease: "easeOut",
                  }}
                />
                {/* Soft ground shadow */}
                <div
                  aria-hidden
                  className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                  style={{
                    bottom: "12%",
                    width: "60%",
                    height: "30px",
                    background: `radial-gradient(ellipse, ${accent}55 0%, transparent 70%)`,
                    filter: "blur(8px)",
                    transition: "background 600ms ease",
                  }}
                />
                {/* Scanline overlay */}
                <div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-[0.06]"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)",
                  }}
                />
                <style>{`
                    .dt-tornado-stage {
                      perspective: clamp(600px, 80vh, 1100px);
                      transform-style: preserve-3d;
                      animation: dt-swirl 2s linear infinite;
                      display: flex; align-items: center; justify-content: center;
                      will-change: transform;
                    }
                    .dt-tornado-stage > span {
                      position: absolute; left: 50%; top: 50%;
                      width: clamp(250px, 48vh, 550px); height: clamp(250px, 48vh, 550px);
                      margin-left: calc(clamp(250px, 48vh, 550px) / -2);
                      margin-top: calc(clamp(250px, 48vh, 550px) / -2);
                      display: flex; justify-content: center; align-items: center;
                      font-size: 0px; backface-visibility: hidden; border-radius: 100%;
                      transform-style: preserve-3d;
                      transition: opacity 0.4s ease-out;
                      will-change: transform, opacity;
                    }
                    .dt-tornado-stage > span::after,
                    .dt-tornado-stage > span > svg {
                      position: absolute;
                      animation: dt-upndown 4s ease-in-out infinite alternate;
                      transform-style: preserve-3d;
                    }
                    .dt-tornado-stage > span > div {
                      position: absolute;
                      left: var(--orbit-offset, 20%);
                      top: 37.5%;
                      width: 14px;
                      height: 14px;
                      margin-left: -7px;
                      margin-top: -7px;
                      border-radius: 100%;
                      animation: dt-spin 2s linear infinite;
                      transform-style: preserve-3d;
                      transform-origin: 50% 37.5%;
                      transition: background-color 0.5s ease, box-shadow 0.5s ease;
                    }
                    /* EF-tier debris */
                    .dt-tornado-stage > span[data-ef="EF0"] { opacity: var(--ef0-on, 0); }
                    .dt-tornado-stage > span[data-ef="EF1"] { opacity: var(--ef1-on, 0); }
                    .dt-tornado-stage > span[data-ef="EF2"] { opacity: var(--ef2-on, 0); }
                    .dt-tornado-stage > span[data-ef="EF3"] { opacity: var(--ef3-on, 0); }
                    .dt-tornado-stage > span[data-ef="EF4"] { opacity: var(--ef4-on, 0); }
                    .dt-tornado-stage > span[data-ef="EF5"] { opacity: var(--ef5-on, 0); }
                    /* Dust — cool cyan/white to match site palette */
                    .dt-tornado-stage > span:nth-of-type(n+19):nth-of-type(-n+80)::after {
                      content: '•'; color: rgba(200, 220, 240, 0.45); font-size: 40px;
                      animation: dt-dust 1s ease-in-out infinite;
                      transform-origin: 200px 50%;
                      text-shadow: 0 0 6px rgba(79, 195, 247, 0.45);
                    }
                    .dt-tornado-stage > span:nth-of-type(3n+19)::after { color: rgba(79,195,247,0.40); text-shadow: 0 0 6px rgba(79,195,247,0.45); }
                    .dt-tornado-stage > span:nth-of-type(5n+22)::after { color: rgba(229,57,53,0.30); text-shadow: 0 0 8px rgba(229,57,53,0.45); }
                    .dt-tornado-stage > span:nth-of-type(n+50):nth-of-type(-n+75)::after { font-size: 90px; }
                    ${Array.from({ length: 50 })
                      .map((_, i) => {
                        const n = i + 1;
                        const delayAfter = (
                          (n * n) /
                          -4
                        ).toFixed(2);
                        const dur = ((n * 7) % 4) + 2;
                        const delayBefore = (n / -50).toFixed(
                          3,
                        );
                        const dustDelay = (n / -6).toFixed(3);
                        return `.dt-tornado-stage > span:nth-of-type(${n})::after, .dt-tornado-stage > span:nth-of-type(${n}) > svg { animation-delay: ${delayAfter}s, ${dustDelay}s; animation-duration: ${dur}s, 1s; } .dt-tornado-stage > span:nth-of-type(${n}) > div { animation-delay: ${delayBefore}s; }`;
                      })
                      .join("\n")}
                    @keyframes dt-swirl {
                      0% { transform: rotateX(80deg) rotate(0deg) scale(0.85) translateX(-60px); }
                      50% { transform: rotateX(70deg) rotate(360deg) scale(1.05) translateX(60px); }
                      100% { transform: rotateX(80deg) rotate(720deg) scale(0.85) translateX(-60px); }
                    }
                    @keyframes dt-upndown {
                      from { transform: translateY(-25px) rotateX(-50deg) translateZ(var(--orbit-r, 150px)) rotate(0deg); }
                      to   { transform: translateY(-50px) rotateX(-50deg) translateZ(calc(var(--orbit-r, 150px) * -1)) rotate(360deg); }
                    }
                    @keyframes dt-spin {
                      from { transform: translateZ(-300px) rotate(0deg) scale(0); opacity: 0.18; }
                      to   { transform: translateZ(150px) rotate(900deg) scale(1); opacity: 0.6; }
                    }
                    @keyframes dt-dust {
                      0%   { transform: translateZ(-275px) rotateX(-50deg); opacity: 0.25; }
                      25%  { transform: translateZ(-250px) rotate(180deg) rotateX(-50deg); opacity: 0; }
                      50%  { transform: translateZ(-275px) rotateX(-50deg); opacity: 0.25; }
                      100% { transform: translateZ(-250px) rotate(-90deg) rotateX(-50deg); opacity: 0; }
                    }

                    @property --r {
                      syntax: "<angle>";
                      inherits: true;
                      initial-value: 5deg;
                    }
                    .dt-wobbly-funnel {
                      position: absolute;
                      height: 83%;
                      aspect-ratio: 67/78;
                      left: 50%;
                      bottom: 12%;
                      transform: translateX(-50%) scale(0.85);
                      transform-origin: bottom center;
                      animation: dt-wobbly-move 1.5s ease-in-out infinite;
                      z-index: 5;
                      pointer-events: none;
                      will-change: transform;
                    }
                    .dt-wobbly-funnel i {
                      position: relative;
                      display: block;
                      width: 100%;
                      aspect-ratio: 67/20;
                      border-radius: 50% 50% 30% 30% / 33% 33% 66% 66%;
                      background: linear-gradient(
                          to right,
                          transparent,
                          rgba(255, 255, 255, 0.45) 40%,
                          transparent
                        ),
                        radial-gradient(ellipse at center, var(--glow-color, rgba(207, 218, 227, 0.3)), var(--accent-color, #9aa5b1), var(--glow-color, rgba(207, 218, 227, 0.1)));
                      rotate: calc(var(--r, 5deg) * -1);
                      mix-blend-mode: screen;
                      background-size: 100% 100%;
                      animation: dt-wobbly-size 0.3s infinite alternate;
                      transition: background 0.6s ease;
                      will-change: transform;
                    }
                    .dt-wobbly-funnel i i {
                      position: absolute;
                      top: 55%;
                      width: 85%;
                      left: 4%;
                      animation-delay: var(--delay);
                    }
                    .dt-wobbly-funnel i i i {
                      left: 8%;
                      rotate: var(--r, 5deg);
                    }
                    .dt-wobbly-funnel i i i i i i {
                      left: 16%;
                      rotate: calc(var(--r, 5deg) * 1.5);
                    }
                    .dt-wobbly-funnel i i i i i i i i i {
                      left: 20%;
                      rotate: calc(var(--r, 5deg) * -1);
                    }
                    .dt-wobbly-funnel i i i i i i i i i i i i {
                      left: 24%;
                      rotate: calc(var(--r, 5deg) * 1);
                    }
                    .dt-wobbly-funnel span {
                      --dur: 0.2s;
                      --s: 7%;
                      position: absolute;
                      left: 68%;
                      bottom: 0;
                      width: var(--s);
                      aspect-ratio: 1;
                      background-color: var(--accent-color, #6db33f);
                      border-top-left-radius: 100%;
                      border-bottom-right-radius: 100%;
                      transform: translate(-200%, -200%);
                      opacity: 0;
                      animation: dt-wobbly-floor var(--dur) infinite reverse,
                        dt-wobbly-opacity calc(var(--dur) / 2) infinite alternate;
                      animation-delay: calc(var(--dur) / -0.5);
                    }
                    .dt-wobbly-funnel span:nth-of-type(6n + 2) {
                      --dur: 0.3s;
                      transform: translate(200%, -300%);
                    }
                    .dt-wobbly-funnel span:nth-of-type(6n + 3) {
                      --dur: 0.4s;
                      transform: translate(400%, -300%);
                    }
                    .dt-wobbly-funnel span:nth-of-type(6n + 4) {
                      --dur: 0.5s;
                      transform: translate(-400%, -300%);
                    }
                    .dt-wobbly-funnel span:nth-of-type(6n + 5) {
                      --dur: 0.6s;
                      transform: translate(0px, -300%);
                    }
                    .dt-wobbly-funnel span:nth-of-type(6n + 6) {
                      --dur: 0.7s;
                      transform: translate(-500%, -500%);
                    }
                    .dt-wobbly-funnel span:nth-of-type(n + 7) {
                      width: calc(var(--s) / 2.5);
                      border-radius: 50%;
                      background-color: var(--glow-color, #70543e);
                    }
                    .dt-wobbly-funnel .gust {
                      position: absolute;
                      top: 25%;
                      left: 5%;
                      width: 80%;
                      aspect-ratio: 1/0.2;
                      border-top: 1vmin solid var(--accent-color, rgba(255, 255, 255, 0.4));
                      border-radius: 50%;
                      rotate: calc(var(--r, 5deg) * -2);
                      animation: dt-wobbly-gust 0.5s ease infinite;
                    }
                    .dt-wobbly-funnel .gust.gust--b {
                      top: 50%;
                      left: 30%;
                      width: 50%;
                      animation-delay: 0.16s;
                      rotate: calc(var(--r, 5deg) * -3);
                    }
                    .dt-wobbly-funnel .gust.gust--c {
                      top: 75%;
                      left: 50%;
                      width: 25%;
                      animation-delay: 0.32s;
                      rotate: calc(var(--r, 5deg) * -4);
                    }
                    .dt-wobbly-funnel .gust--2 {
                      aspect-ratio: 2/0.4;
                      top: 10%;
                      left: -5%;
                      width: 100%;
                      border-top-width: 1.5vmin;
                      border-top-color: var(--glow-color, rgba(255, 255, 255, 0.2));
                      rotate: calc(var(--r, 5deg) * 0.5);
                      animation: dt-wobbly-gust 0.6s ease infinite;
                    }
                    .dt-wobbly-funnel .gust--2.gust--2b {
                      top: 40%;
                      left: 10%;
                      width: 75%;
                      animation-delay: 0.2s;
                      rotate: calc(var(--r, 5deg) * -2);
                    }
                    .dt-wobbly-funnel .gust--2.gust--2c {
                      aspect-ratio: 2/0.8;
                      top: 65%;
                      left: 45%;
                      width: 30%;
                      animation-delay: 0.4s;
                      rotate: calc(var(--r, 5deg) * -2);
                    }
                    @keyframes dt-wobbly-size {
                      to {
                        transform: rotateY(15deg);
                        background-size: 150% 100%, 200% 500%;
                      }
                    }
                    @keyframes dt-wobbly-move {
                      0% {
                        transform: skewX(-3deg) translateX(-50%) scale(0.85);
                        translate: 10%;
                      }
                      50% {
                        transform: skewX(3deg) translateX(-50%) scale(0.85);
                        translate: -10%;
                        rotate: 5deg;
                      }
                      100% {
                        transform: skewX(-3deg) translateX(-50%) scale(0.85);
                        translate: 10%;
                      }
                    }
                    @keyframes dt-wobbly-floor {
                      to {
                        transform: translate(0px, 0px);
                        rotate: 0.5turn;
                        scale: 0.75;
                      }
                    }
                    @keyframes dt-wobbly-opacity {
                      to {
                        opacity: 0.5;
                      }
                    }
                    @keyframes dt-wobbly-gust {
                      0% {
                        clip-path: polygon(0 0, 0 0, 0 100%, 0 100%);
                      }
                      50% {
                        clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
                      }
                      100% {
                        clip-path: polygon(100% 0, 100% 0, 100% 100%, 100% 100%);
                      }
                    }
                  `}</style>
                <div
                  className="dt-wobbly-funnel"
                  style={{
                    ["--accent-color" as any]: accent,
                    ["--glow-color" as any]: `${accent}33`,
                  }}
                >
                  <NestedFunnel depth={14} />
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <span key={idx} />
                  ))}
                  <div className="gust" />
                  <div className="gust gust--b" />
                  <div className="gust gust--c" />
                  <div className="gust gust--2" />
                  <div className="gust gust--2 gust--2b" />
                  <div className="gust gust--2 gust--2c" />
                </div>
                <motion.div
                  className="dt-tornado-stage absolute inset-0"
                  style={{
                    ["--ef0-on" as any]: ef0On,
                    ["--ef1-on" as any]: ef1On,
                    ["--ef2-on" as any]: ef2On,
                    ["--ef3-on" as any]: ef3On,
                    ["--ef4-on" as any]: ef4On,
                    ["--ef5-on" as any]: ef5On,
                    ["--accent-color" as any]: accent,
                    ["--glow-color" as any]: `${accent}33`,
                  }}
                >
                  {Array.from({ length: 50 }).map((_, i) => {
                    const ef =
                      i < 3
                        ? "EF0"
                        : i < 6
                          ? "EF1"
                          : i < 9
                            ? "EF2"
                            : i < 12
                              ? "EF3"
                              : i < 15
                                ? "EF4"
                                : i < 18
                                  ? "EF5"
                                  : undefined;
                    const debris =
                      i < 18 ? DEBRIS_ITEMS[i] : null;
                    const debrisStyle = debris
                      ? ({
                          "--orbit-offset": debris.offset,
                          "--accent-color": accent,
                          "--glow-color": `${accent}33`,
                        } as React.CSSProperties)
                      : undefined;
                    return (
                      <span
                        key={i}
                        data-ef={ef}
                        style={debrisStyle}
                      >
                        {debris && (
                          /* Only the colored dot orbits in 3D */
                          <div
                            className="w-3.5 h-3.5 rounded-full transition-all duration-500"
                            style={{
                              backgroundColor: debris.dotColor,
                              boxShadow: `0 0 16px ${debris.dotColor}, 0 0 6px ${debris.dotColor}`,
                            }}
                          />
                        )}
                      </span>
                    );
                  })}
                </motion.div>
                {/* Active Ingested Debris Legend */}
                <div className="absolute top-4 right-4 z-20 w-40 bg-black/60 border border-white/10 backdrop-blur-md p-3 rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.6)] hidden md:block select-none pointer-events-none">
                  <div className="text-[9px] font-mono tracking-[0.2em] text-white/40 uppercase mb-2 border-b border-white/5 pb-1.5">
                    // Ingested Objects
                  </div>
                  <div className="space-y-1">
                    {DEBRIS_ITEMS.map((item, idx) => {
                      const efIndex = Math.floor(idx / 3);
                      const isActive = activeTier >= efIndex;
                      return (
                        <div
                          key={idx}
                          className={`flex items-center gap-2 text-[9px] font-mono transition-all duration-500 ${
                            isActive
                              ? "text-white/95 opacity-100 font-medium"
                              : "text-white/20 opacity-30"
                          }`}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-500"
                            style={{
                              backgroundColor: isActive
                                ? item.dotColor
                                : "#27272a",
                              boxShadow: isActive
                                ? `0 0 6px ${item.dotColor}`
                                : "none",
                            }}
                          />
                          <span className="tracking-widest uppercase">
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Corner readouts */}
                <div className="absolute top-4 left-4 pointer-events-none">
                  <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/40">
                    // Fujita Scale — Real-Time
                  </div>
                  <div className="mt-2 w-px h-6 bg-white/20" />
                </div>
                <div className="absolute bottom-4 left-4 pointer-events-none flex items-baseline gap-3">
                  <span
                    className="font-orbitron font-black text-[18px] leading-none"
                    style={{
                      color: accent,
                      textShadow: `0 0 12px ${accent}88`,
                    }}
                  >
                    {tier.ef}
                  </span>
                  <span
                    className="font-mono text-[10px] tracking-[0.25em] uppercase"
                    style={{ color: accent }}
                  >
                    {tier.tier}
                  </span>
                </div>
                <div className="absolute bottom-4 right-4 pointer-events-none font-mono text-[11px] tracking-[0.2em] text-white/40 tabular-nums">
                  {String(scrollPct).padStart(2, "0")} / 99
                </div>
                {/* Red vignette pulse */}
                <AnimatePresence>
                  {pulse && (
                    <motion.div
                      key="pulse"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        boxShadow: `inset 0 0 200px 40px ${SEVERITY_COLORS.EXTREME}`,
                        background: `radial-gradient(ellipse at center, transparent 40%, ${SEVERITY_COLORS.EXTREME}33 100%)`,
                      }}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* STRIP C — Instrument Panel */}
            <div className="h-auto lg:h-[75vh] flex items-center self-center w-full">
              <div className="w-full border border-white/10 bg-white/[0.015] backdrop-blur-sm p-7 rounded-xl">
                {/* Breadcrumb */}
                <div className="flex items-center justify-between mb-7">
                  <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40 tabular-nums">
                    05 / 06
                  </span>
                  <span className="flex-1 mx-3 h-px bg-white/[0.06]" />
                  <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40">
                    Severity
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={tier.ef}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{
                      duration: 0.28,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    {/* EF numeral */}
                    <div
                      className={`font-orbitron font-black text-[88px] leading-[0.85] tracking-tight ${tier.ef === "EF5" && pulse ? "hud-glitch-text" : ""}`}
                      style={{
                        color: accent,
                        textShadow: `0 0 24px ${accent}66`,
                      }}
                    >
                      {tier.ef}
                    </div>
                    <div className="mt-2 font-mono text-[13px] text-white/85 tracking-wide tabular-nums">
                      {tier.wind}
                    </div>

                    <div className="h-px bg-white/[0.06] my-6" />

                    {/* Damage */}
                    <div className="text-[13px] leading-snug text-white/85 max-w-[280px]">
                      {tier.damage}
                    </div>

                    <div className="h-px bg-white/[0.06] my-6" />

                    {/* CO₂ / Anomaly */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/40 mb-1.5">
                          CO₂
                        </div>
                        <div className="font-mono text-[13px] text-white/85 tabular-nums">
                          {tier.co2}
                        </div>
                      </div>
                      <div>
                        <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/40 mb-1.5">
                          Anomaly
                        </div>
                        <div className="font-mono text-[13px] text-white/85 tabular-nums">
                          {tier.anomaly}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                <div className="h-px bg-white/[0.06] my-6" />

                {/* 6-cell progress block */}
                <div className="flex items-center gap-1.5 mb-3">
                  {FUJITA_TIERS.map((t, i) => {
                    const c = SEVERITY_COLORS[t.tier];
                    const filled = activeTier >= i;
                    return (
                      <button
                        key={t.ef}
                        onClick={() => scrollToTier(i)}
                        className="flex-1 h-3 cursor-pointer focus:outline-none transition-all duration-300 bg-transparent p-0 border-0"
                        style={{
                          background: filled
                            ? c
                            : "transparent",
                          border: `1px solid ${filled ? c : "rgba(255,255,255,0.12)"}`,
                          boxShadow: filled
                            ? `0 0 8px ${c}66`
                            : "none",
                        }}
                        aria-label={`Go to ${t.ef}`}
                      />
                    );
                  })}
                </div>
                <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40 tabular-nums">
                  Tier {activeTier + 1} of 6
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hand-off callout */}
        <div className="max-w-7xl mx-auto w-full px-6 md:px-12 pb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-t border-white/10 pt-4 z-20 bg-black">
          <div className="flex items-center gap-3">
            <Wind size={16} className="text-white/50" />
            <span className="font-mono text-[11px] md:text-[13px] tracking-[0.25em] uppercase text-white/80">
              Your climate is currently at{" "}
              <span
                style={{
                  color: SEVERITY_COLORS.EXTREME,
                  textShadow: `0 0 12px ${SEVERITY_COLORS.EXTREME}`,
                }}
                className="font-orbitron font-black"
              >
                {currentEF}
              </span>{" "}
              — keep scrolling
            </span>
          </div>
          <ArrowDown
            size={18}
            className="text-white/40 animate-bounce"
          />
        </div>
      </div>
    </section>
  );
}

function TierMark({
  ef,
  Icon,
  active,
  color,
}: {
  ef: string;
  Icon: React.ComponentType<{
    size?: number;
    className?: string;
  }> | null;
  active: boolean;
  color: string;
}) {
  const [armed, setArmed] = useState(false);
  const [fired, setFired] = useState(false);

  useEffect(() => {
    if (active && !fired) {
      setArmed(true);
      setFired(true);
      const timer = setTimeout(() => setArmed(false), 900);
      return () => clearTimeout(timer);
    } else if (!active) {
      setFired(false);
    }
  }, [active, fired]);

  return (
    <div className="relative flex items-center h-px w-full">
      <span
        className="absolute -left-1 w-4 h-px"
        style={{ background: color }}
      />
      <span
        className={`absolute left-10 font-mono text-[8px] tracking-[0.2em] uppercase transition-colors duration-300 ${active ? "text-white font-bold" : "text-white/40 group-hover:text-white/70"}`}
      >
        {ef}
      </span>
      <AnimatePresence>
        {armed && Icon && (
          <motion.span
            key="ico"
            initial={{ opacity: 0, y: 0, x: 0 }}
            animate={{ opacity: [0, 1, 1, 0], y: -32, x: 12 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute left-6"
            style={{ color }}
          >
            <Icon size={14} />
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

function ClimateChapters() {
  const [active, setActive] = useState(2);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(
      () => setActive((p) => (p + 1) % CLIMATE_CHAPTERS.length),
      3500,
    );
    return () => clearInterval(id);
  }, [paused]);

  const chapter = CLIMATE_CHAPTERS[active];
  const accent = SEVERITY_COLORS[chapter.severityKey];

  const decadeEntry = useMemo(() => {
    const [a, b] = chapter.range;
    const mid = Math.round((a + b) / 2);
    return (
      CLIMATE_DATA.find((d) => d.year === mid) ??
      CLIMATE_DATA.find((d) => d.year === a)
    );
  }, [chapter]);

  return (
    <div
      className="relative w-full bg-[#0a0a0a] text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="h-px w-full bg-white/[0.08]" />
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[520px]">
        {/* Left: dissolve panel */}
        <div className="lg:col-span-4 relative border-b lg:border-b-0 lg:border-r border-white/[0.08] flex flex-col">
          <div className="px-8 pt-8 text-[#666] text-xl tracking-[0.4em]">
            ⁂ ⁂ ⁂
          </div>
          <div className="flex-1 flex items-center justify-center p-6 bg-black">
            <div className="relative w-full max-w-[420px] aspect-square overflow-hidden bg-black">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.6,
                    ease: "easeOut",
                  }}
                  className="absolute inset-0"
                >
                  <img
                    src={chapter.image}
                    alt={`${chapter.title} (${chapter.range[0]}–${chapter.range[1]})`}
                    className="block w-full h-full"
                    style={{
                      aspectRatio: "1 / 1",
                      objectFit: "fill",
                    }}
                  />
                  <div className="absolute left-3 bottom-3 right-3 flex items-baseline justify-between font-mono text-[10px] tracking-[0.25em] uppercase text-white/80">
                    <span
                      className="font-orbitron font-black text-[18px] tracking-tight"
                      style={{
                        color: accent,
                        textShadow: `0 0 12px ${accent}`,
                      }}
                    >
                      {chapter.range[0]}–{chapter.range[1]}
                    </span>
                    <span className="text-white/60">
                      {chapter.title}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          {/* Counter */}
          <div className="px-8 pb-8 pt-4 flex items-baseline gap-2 font-mono text-[10px] tracking-widest uppercase">
            <div className="overflow-hidden h-4 inline-block">
              <AnimatePresence mode="wait">
                <motion.span
                  key={active}
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -16, opacity: 0 }}
                  transition={{
                    duration: 0.4,
                    ease: "easeOut",
                  }}
                  className="inline-block text-[#888897]"
                >
                  {String(active + 1).padStart(2, "0")}
                </motion.span>
              </AnimatePresence>
            </div>
            <span className="text-[#333]">/</span>
            <span className="text-[#555]">
              {String(CLIMATE_CHAPTERS.length).padStart(2, "0")}
            </span>
            {decadeEntry && (
              <span className="ml-auto text-[#888897] font-mono normal-case tracking-wider">
                {decadeEntry.co2_ppm.toFixed(1)} ppm ·{" "}
                {formatAnomaly(decadeEntry.temp_anomaly)}
              </span>
            )}
          </div>
        </div>

        {/* Right: chapter list */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="px-8 py-5 border-b border-white/[0.08] flex items-center justify-between font-mono text-[10px] tracking-widest uppercase text-[#888897]">
            <span>Explore the record. Read the trend.</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={active}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-white"
              >
                Chapter {String(active + 1).padStart(2, "0")}
              </motion.span>
            </AnimatePresence>
          </div>
          {CLIMATE_CHAPTERS.map((c, i) => {
            const isActive = i === active;
            const rowAccent = SEVERITY_COLORS[c.severityKey];
            return (
              <button
                key={c.title}
                onClick={() => setActive(i)}
                className={`group flex items-center justify-between border-b border-white/[0.05] px-8 py-7 text-left transition-colors duration-300 ${
                  isActive
                    ? "text-white"
                    : "text-[#444] hover:text-[#999]"
                }`}
              >
                <div className="flex flex-col gap-1">
                  <span
                    className="text-2xl md:text-[2rem] font-medium tracking-tight font-orbitron"
                    style={
                      isActive
                        ? {
                            color: rowAccent,
                            textShadow: `0 0 12px ${rowAccent}66`,
                          }
                        : undefined
                    }
                  >
                    {c.title}
                  </span>
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#666]">
                    {c.range[0]} – {c.range[1]} · {c.blurb}
                  </span>
                </div>
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="shrink-0 ml-4"
                    >
                      <ArrowUpRight
                        size={22}
                        strokeWidth={1}
                        style={{ color: rowAccent }}
                      />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function DataTornado({
  isReady = true,
  defaultYear,
}: {
  isReady?: boolean;
  defaultYear?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingSeekTimeRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const [audioMuted, setAudioMuted] = useState(true);

  const [year, setYear] = useState(defaultYear ?? MIN_YEAR);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(FALLBACK_DURATION);
  const [liveData, setLiveData] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loop, setLoop] = useState(true);

  // Real-time micro-fluctuations (replaced with real NOAA deltas when live)
  const [noise, setNoise] = useState({
    co2: 0,
    temp: 0,
    tavg: 0,
  });
  const [liveReading, setLiveReading] = useState<{
    current_co2: number | null;
    current_sst: number | null;
  } | null>(null);

  const severity = severityFromTime(currentTime);
  const entry = useMemo(
    () =>
      CLIMATE_DATA.find((d) => d.year === year) ??
      CLIMATE_DATA[0],
    [year],
  );
  const todaySeverity = severityFromTime(duration - 0.001);
  const activeIndex = useMemo(
    () => CLIMATE_DATA.findIndex((d) => d.year === year),
    [year],
  );

  const videoBrightness = useMemo(() => {
    switch (severity) {
      case "STABLE":
        return 0.5;
      case "ELEVATED":
        return 0.6;
      case "CRITICAL":
        return 0.7;
      case "EXTREME":
        return 0.8;
      default:
        return 0.6;
    }
  }, [severity]);

  // Fetch real NOAA data when LIVE DATA is toggled on
  useEffect(() => {
    if (!liveData) {
      setNoise({ co2: 0, temp: 0, tavg: 0 });
      setLiveReading(null);
      return;
    }
    let cancelled = false;
    fetch(`${SERVER_URL}/live`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setLiveReading({
          current_co2: data.current_co2,
          current_sst: data.current_sst,
        });
        const ref = CLIMATE_DATA[CLIMATE_DATA.length - 1];
        setNoise({
          co2:
            data.current_co2 != null
              ? data.current_co2 - ref.co2_ppm
              : 0,
          temp:
            data.current_sst != null
              ? data.current_sst - ref.temp_anomaly
              : 0,
          tavg: 0,
        });
      })
      .catch((err) =>
        console.log(`Live data fetch error: ${err}`),
      );
    return () => {
      cancelled = true;
    };
  }, [liveData]);

  // Seek to defaultYear when it arrives asynchronously (deep-link share)
  useEffect(() => {
    if (defaultYear == null) return;
    setYear(defaultYear);
    const v = videoRef.current;
    if (v) {
      const d = v.duration || FALLBACK_DURATION;
      v.currentTime = yearToTime(defaultYear, d);
    }
  }, [defaultYear]);

  // Update video playback settings
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      v.play().catch(() => {
        setIsPlaying(false);
      });
    } else {
      v.pause();
    }
  }, [isPlaying]);

  // ── Hero audio: mirror video play/pause; loop, sync time, follow speed ──
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.muted = audioMuted;
    a.loop = true;
    a.playbackRate = playbackRate;
    if (isPlaying) {
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  }, [isPlaying, audioMuted, playbackRate]);

  // Keep audio loosely synced to the video's current time (drift correction)
  useEffect(() => {
    const a = audioRef.current;
    const v = videoRef.current;
    if (!a || !v) return;
    const id = setInterval(() => {
      if (!v.duration || !a.duration) return;
      // Wrap video time into the audio's duration (audio may be shorter/longer)
      const target = v.currentTime % a.duration;
      if (Math.abs(a.currentTime - target) > 0.4) {
        a.currentTime = target;
      }
    }, 800);
    return () => clearInterval(id);
  }, []);

  // Smooth throttled seeking
  const seekToTime = (time: number) => {
    const v = videoRef.current;
    if (!v) return;
    if (v.seeking) {
      pendingSeekTimeRef.current = time;
    } else {
      v.currentTime = time;
    }
  };

  const handleSeeked = () => {
    if (pendingSeekTimeRef.current !== null) {
      const target = pendingSeekTimeRef.current;
      pendingSeekTimeRef.current = null;
      if (videoRef.current) {
        videoRef.current.currentTime = target;
      }
    }
  };

  const handleYearChange = (y: number) => {
    // Stop playback immediately when user drags the slider
    if (isPlaying) {
      setIsPlaying(false);
    }
    isDraggingRef.current = true;
    setYear(y);

    const target = yearToTime(y, duration);
    setCurrentTime(target);
    seekToTime(target);

    // Release drag lock on a brief timeout to let timeline snap
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 50);
  };

  const handleTimeUpdate = (
    e: React.SyntheticEvent<HTMLVideoElement>,
  ) => {
    const v = e.currentTarget;
    const t = v.currentTime;
    setCurrentTime(t);

    if (!isDraggingRef.current) {
      const computedYear = timeToYear(t, duration);
      if (computedYear !== year) {
        setYear(computedYear);
      }
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setYear(MIN_YEAR);
    setCurrentTime(0);
    seekToTime(0);
  };

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const toggleLoop = () => {
    setLoop((prev) => !prev);
  };

  const changeSpeed = () => {
    setPlaybackRate((prev) => {
      if (prev === 1) return 1.5;
      if (prev === 1.5) return 2;
      return 1;
    });
  };

  const handleEnded = () => {
    if (!loop) {
      setIsPlaying(false);
    }
  };

  // ── Global scroll-reveal for post-landing sections ────────────────────
  // Tags every <section> inside this container (except the first, which is
  // the video hero) with [data-reveal], then uses IntersectionObserver to
  // toggle a CSS class that fades + slides them in. Inspired by Prisma's
  // cinematic card entrances but using site's red/dark sci-fi accent.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const sections = Array.from(root.querySelectorAll("section"));
    const targets = sections.slice(1); // skip hero (landing)
    targets.forEach((el) => el.setAttribute("data-reveal", "true"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("dt-revealed");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen w-full bg-[#05050A] text-white font-sans hud-grid scroll-smooth"
    >
      <style>{`
        section[data-reveal] {
          opacity: 0;
          transform: translateY(48px) scale(0.985);
          filter: blur(6px);
          transition:
            opacity 1.05s cubic-bezier(0.22, 1, 0.36, 1),
            transform 1.05s cubic-bezier(0.22, 1, 0.36, 1),
            filter 0.8s cubic-bezier(0.22, 1, 0.36, 1);
          will-change: opacity, transform, filter;
        }
        section[data-reveal].dt-revealed {
          opacity: 1;
          transform: translateY(0) scale(1);
          filter: blur(0);
        }
        /* Section heading underline sheen — draws in once revealed */
        section[data-reveal] h2::after,
        section[data-reveal] h3::after { content: none; }
        @media (prefers-reduced-motion: reduce) {
          section[data-reveal] { opacity: 1 !important; transform: none !important; filter: none !important; }
        }
      `}</style>
      {/* SECTION 1: INTERACTIVE CHAMBER HERO */}
      <section className="relative h-screen w-full overflow-hidden flex flex-col justify-between">
        {/* Hero ambient audio — mirrors video, controlled by speaker button */}
        <audio
          ref={audioRef}
          src={heroAudioSrc}
          preload="auto"
          loop
          muted={audioMuted}
        />
        <VideoBackground
          videoRef={videoRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) {
              setDuration(d);
              // Seek to current year on loaded metadata
              e.currentTarget.currentTime = yearToTime(year, d);
            }
          }}
          onEnded={handleEnded}
          loop={loop}
          onSeeked={handleSeeked}
        />

        {/* TOP HEADER - Gradient Fade (No Hard Border) */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 pt-6 pb-12 bg-gradient-to-b from-black/95 via-black/40 to-transparent hud-header">
          {/* Left Brand */}
          <div className="flex flex-col">
            <span
              className={`font-orbitron text-[11px] font-black tracking-[0.25em] text-white ${
                severity === "CRITICAL" ||
                severity === "EXTREME"
                  ? "hud-glitch-text"
                  : ""
              }`}
            >
              THE DATA TORNADO
            </span>
            <span className="text-[8px] tracking-[0.15em] text-[#888897] font-mono mt-0.5">
              CLIMATE ANOMALY ANALYSIS INTERFACE // VORTEX.V1
            </span>
          </div>

          {/* Right: Year Telemetry + LIVE DATA toggle */}
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setAudioMuted((m) => !m)}
              aria-label={audioMuted ? "Unmute hero audio" : "Mute hero audio"}
              className="flex items-center gap-2 px-3 h-8 rounded-sm border border-white/15 bg-black/40 hover:bg-[#E53935]/10 hover:border-[#E53935]/60 transition-colors font-mono"
            >
              {audioMuted ? (
                <VolumeX size={13} className="text-white/60" />
              ) : (
                <Volume2 size={13} className="text-[#E53935]" />
              )}
              <span className="text-[8px] tracking-[0.18em] text-white/70 uppercase">
                {audioMuted ? "AUDIO OFF" : "AUDIO ON"}
              </span>
            </button>
            <div className="flex items-baseline gap-2">
              <span className="text-[8px] tracking-[0.15em] text-[#888897] font-mono uppercase">
                COORDINATE TIME
              </span>
              <span
                className={`text-[20px] font-black font-orbitron tracking-wider text-white select-none ${
                  severity === "CRITICAL" ||
                  severity === "EXTREME"
                    ? "hud-glitch-text"
                    : ""
                }`}
              >
                {year}
              </span>
            </div>
          </div>
        </div>

        {/* LEFT DATA TELEMETRY PANEL */}
        <DataPanel
          entry={entry}
          severity={severity}
          noise={noise}
          activeIndex={activeIndex}
        />

        {/* Bottom Gradient Fade Overlay (No Hard Border) */}
        <div className="absolute bottom-0 left-0 right-0 h-[280px] bg-gradient-to-t from-[#05050A] via-[#05050A]/80 via-[#05050A]/30 to-transparent pointer-events-none z-10" />

        {/* BOTTOM CONTROL SYSTEM - FLOATING SLIDER */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-[800px] hud-timeline-panel">
          <MinimalSliderPanel
            year={year}
            onYearChange={handleYearChange}
            severity={severity}
          />
        </div>

        {/* SCROLL ARROW GUIDE */}
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
          onClick={() => {
            window.scrollTo({
              top: window.innerHeight,
              behavior: "smooth",
            });
          }}
        >
          <span className="text-[8px] tracking-[0.25em] font-mono text-[#888897]">
            SCROLL TO EXPLORE TELEMETRY
          </span>
          <ArrowDown
            size={12}
            className="animate-bounce text-[#888897]"
          />
        </div>

        {/* LIVE CO₂ TICKER */}
        <LiveCO2Ticker />

        {/* SHARE MODAL TRIGGER */}
        <ShareCard todaySeverity={todaySeverity} />

        {/* Viewport Warning Vignette Overlay for CRITICAL & EXTREME states */}
        {(severity === "CRITICAL" ||
          severity === "EXTREME") && (
          <div
            className={`absolute inset-0 pointer-events-none z-30 transition-all duration-300 ${
              severity === "EXTREME"
                ? "animate-warning-pulse-red"
                : "animate-warning-pulse-orange"
            }`}
            style={{
              borderWidth: "3px",
              borderStyle: "solid",
            }}
          />
        )}
      </section>

      {/* SECTION 2: CARBON TRAJECTORY */}
      <section className="relative min-h-screen py-24 md:py-32 px-6 md:px-12 flex flex-col justify-center bg-[#05050A] z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(0,229,255,0.04)_0%,transparent_60%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto w-full">
          <div className="mb-10">
            <SectionNumber
              n="02"
              label="Atmospheric Carbon"
              accent="#00E5FF"
            />
          </div>
          <div className="font-orbitron font-black text-white text-mega-sm md:text-mega select-none leading-[0.78]">
            <div>
              <LetterReveal text="CARBON" />
            </div>
            <div className="text-white/30">
              <LetterReveal text="TRAJECTORY" delay={0.15} />
            </div>
          </div>

          <div className="mt-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="lg:col-span-8 w-full"
            >
              <CO2Chart />
            </motion.div>
            <div className="lg:col-span-4 space-y-6">
              {[
                { val: "+34.4%", label: "Rise 1959 → 2024" },
                { val: "424.61", label: "ppm — 2024 peak" },
                {
                  val: "≈ 2.4",
                  label: "ppm / yr recent trend",
                },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{
                    duration: 0.7,
                    ease: "easeOut",
                    delay: 0.1 * i,
                  }}
                  className="border-l-2 border-[#00E5FF]/40 pl-5 py-2"
                >
                  <div className="font-orbitron font-black text-white text-3xl md:text-4xl tracking-tight">
                    {s.val}
                  </div>
                  <div className="mt-1 font-mono text-[10px] tracking-widest uppercase text-[#888897]">
                    {s.label}
                  </div>
                </motion.div>
              ))}
              <ScrollFadeIn delay={450}>
                <p className="text-[13px] leading-relaxed text-[#888897] pt-4">
                  Since the industrial era, atmospheric CO₂ has
                  surged exponentially. Mauna Loa Observatory
                  readings climbed from{" "}
                  <span className="text-white font-mono">
                    315.98 ppm
                  </span>{" "}
                  in 1959 to a record{" "}
                  <span className="text-white font-mono">
                    424.61 ppm
                  </span>{" "}
                  in 2024.
                </p>
              </ScrollFadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: GLOBAL ANOMALY */}
      <section className="relative min-h-screen py-24 md:py-32 px-6 md:px-12 flex flex-col justify-center bg-[#05050A] z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(229,57,53,0.05)_0%,transparent_60%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto w-full">
          <div className="mb-10">
            <SectionNumber
              n="03"
              label="Thermal Deviations"
              accent="#E53935"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5 space-y-6 relative">
              <h2 className="font-orbitron font-black text-white text-4xl md:text-6xl leading-[0.95] tracking-tight">
                <div>
                  <LetterReveal text="GLOBAL" />
                </div>
                <div>
                  <LetterReveal text="ANOMALY" delay={0.1} />
                </div>
                <div className="text-[#E53935]">
                  <LetterReveal text="INDEX" delay={0.2} />
                </div>
              </h2>
              <ScrollFadeIn delay={400}>
                <p className="text-[13px] leading-relaxed text-[#888897] max-w-md">
                  Surface thermal deviation from the
                  mid-20th-century baseline. The Earth shifted
                  from cooling stability into a rapid thermal
                  surge, reaching{" "}
                  <span className="text-[#E53935] font-bold">
                    +1.29°C
                  </span>{" "}
                  in 2024.
                </p>
              </ScrollFadeIn>
              <div className="hidden lg:block absolute top-0 right-0 h-full w-px bg-white/[0.08]" />
            </div>
            <motion.div
              initial={{ opacity: 0, x: 80 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="lg:col-span-7 w-full"
            >
              <AnomalyChart />
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 4: CENTRAL PARK LOCAL TRENDS */}
      <section className="relative min-h-screen py-24 md:py-32 px-6 md:px-12 flex flex-col justify-center bg-[#05050A] z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,112,67,0.04)_0%,transparent_60%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto w-full space-y-12">
          <div className="flex flex-col gap-6">
            <SectionNumber
              n="04"
              label="Observatory Telemetry"
              accent="#FF7043"
            />
            <h2 className="font-orbitron font-black text-white text-3xl md:text-5xl tracking-tight">
              <LetterReveal text="CENTRAL PARK — LOCAL TRENDS" />
            </h2>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="w-full"
          >
            <LocalTempChart />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <ScrollFadeIn>
              <p className="text-[13px] leading-relaxed text-[#888897]">
                Local station logs mirror the planetary signal.
                Central Park's annual TAVG climbed from{" "}
                <span className="text-white font-mono">
                  12.34°C
                </span>{" "}
                in the 1960s to{" "}
                <span className="text-[#FF7043] font-bold">
                  14.40°C
                </span>{" "}
                in 2024.
              </p>
            </ScrollFadeIn>
            <ScrollFadeIn delay={150}>
              <div className="border-l-2 border-[#FF7043]/40 pl-5 py-2">
                <div className="font-orbitron font-black text-white text-4xl tracking-tight">
                  13.88°C
                </div>
                <div className="mt-1 font-mono text-[10px] tracking-widest uppercase text-[#888897]">
                  2019–2024 mean
                </div>
              </div>
            </ScrollFadeIn>
            <ScrollFadeIn delay={300}>
              <div className="flex md:justify-end items-end gap-3 h-full">
                <div className="size-12 rounded-full border border-white/15 flex items-center justify-center">
                  <div className="flex gap-[3px]">
                    <span className="w-px h-3 bg-white/60" />
                    <span className="w-px h-3 bg-white/60" />
                  </div>
                </div>
                <span className="text-[10px] font-mono tracking-widest uppercase text-[#888897] pb-3">
                  Continue telemetry
                </span>
              </div>
            </ScrollFadeIn>
          </div>
        </div>
      </section>

      {/* SECTION 5: FUJITA SCALE CROSSOVER */}
      <FujitaScale />

      {/* SECTION 6: VORTEX DEBRIS & DISASTER ARCHIVE */}
      <DisasterWitnessGallery />

      {/* SECTION 6.5: BIRTH-DATE TIME-STAMPED VORTEX */}
      <BirthDateVortex />

      {/* SECTION 7: CLIMATE CHAPTERS */}
      <section
        id="climate-chapters"
        className="relative bg-[#0a0a0a] text-white z-30 overflow-hidden"
      >
        <div className="px-6 md:px-12 pt-12 md:pt-16 pb-12">
          <div className="max-w-7xl mx-auto w-full">
            <div className="mb-10">
              <SectionNumber
                n="07"
                label="Decade Chapters"
                accent="#888897"
              />
            </div>
            <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-8">
              <h2 className="font-orbitron font-medium text-white text-3xl md:text-5xl xl:text-6xl leading-[1.05] tracking-tight max-w-3xl">
                <LetterReveal text="Curated from sixty-five years of climate record" />
              </h2>
              <div className="font-mono text-[10px] tracking-widest uppercase text-[#888897] max-w-xs">
                We don't just plot data —<br />
                we walk through the record.
              </div>
            </div>
          </div>
        </div>
        <ClimateChapters />
        <div className="h-px w-full bg-white/[0.08]" />
        <div className="px-8 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-mono text-[10px] tracking-widest uppercase text-[#888897]">
          <span>Digging into the climate record</span>
          <span>The Data Tornado © 2026</span>
        </div>
      </section>
    </div>
  );
}
