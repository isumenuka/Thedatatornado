import { useEffect, useRef, useState, useMemo } from "react";
import { ChevronRight, ChevronLeft, Copy, Share2, Play, Pause, RotateCcw, ArrowDown, Layers, Cpu, Database, Award, ArrowRight, Activity } from "lucide-react";
import { gsap } from "gsap";
import { CLIMATE_DATA } from "../../../climateData";
import videoSrc from "../../imports/0607.mp4";
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

type Entry = (typeof CLIMATE_DATA)[number];
type SeverityKey = "STABLE" | "ELEVATED" | "CRITICAL" | "EXTREME";

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

const TICK_YEARS = [1959, 1970, 1980, 1990, 2000, 2010, 2020, 2024];
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
  onTimeUpdate: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onLoadedMetadata: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
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
    const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // Active path up to activeIndex
  const activePoints = points.slice(0, activeIndex + 1);
  const activePathD = activePoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // Current point
  const currentPoint = points[activeIndex] || { x: 0, y: 0 };

  return (
    <div className="space-y-1.5 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors relative group">
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] tracking-[0.15em] text-[#888897] uppercase font-mono">{label}</span>
        <span className="text-white font-mono font-medium text-[12px]">{valueText}</span>
      </div>
      <div className="relative h-10 w-full overflow-hidden">
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
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
                style={{ transformOrigin: `${currentPoint.x}px ${currentPoint.y}px` }}
              />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

function RadarSeverityHUD({ severity }: { severity: SeverityKey }) {
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
          
          <span className="text-[20px] sm:text-[24px] mb-1 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
            {SEVERITY_EMOJI[severity]}
          </span>
          <span className="text-[8px] sm:text-[9px] tracking-[0.25em] text-[#888897] font-mono">SEVERITY LEVEL</span>
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

  const co2Data = useMemo(() => CLIMATE_DATA.map((d) => d.co2_ppm), []);
  const tempData = useMemo(() => CLIMATE_DATA.map((d) => d.temp_anomaly), []);
  const tavgData = useMemo(() => CLIMATE_DATA.map((d) => d.avg_tavg_celsius), []);

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
        <div className="w-[300px] p-5 font-sans relative">
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
              valueText={formatAnomaly(entry.temp_anomaly + noise.temp)}
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
        {open ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
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
            stroke={t.isActive ? activeColor : t.isMajor ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.1)"}
            strokeWidth={t.isActive ? 2 : t.isMajor ? 1.2 : 0.8}
          />
          {t.isMajor && (
            <text
              x={t.tx}
              y={8}
              fill={t.isActive ? activeColor : "rgba(255, 255, 255, 0.4)"}
              fontSize={10}
              fontWeight={t.isActive ? "bold" : "normal"}
              textAnchor="middle"
              fontFamily="Orbitron, monospace"
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
        fontFamily="Orbitron, monospace"
        className={`select-none transition-all duration-300 ${
          (severity === "CRITICAL" || severity === "EXTREME") ? "hud-glitch-text" : ""
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
          style={{ filter: `drop-shadow(0 0 6px ${activeColor}44)` }}
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

function ShareCard({ todaySeverity }: { todaySeverity: SeverityKey }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [submittedYear, setSubmittedYear] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const submittedEntry =
    submittedYear !== null
      ? CLIMATE_DATA.find((d) => d.year === submittedYear)
      : null;

  const cardText = submittedEntry
    ? `In ${submittedEntry.year}: CO₂ was ${submittedEntry.co2_ppm} ppm and the tornado was ${submittedEntry.severity}. Today it is ${todaySeverity}.`
    : "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const y = parseInt(input, 10);
    if (Number.isFinite(y) && y >= MIN_YEAR && y <= MAX_YEAR) {
      setSubmittedYear(y);
      setCopied(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cardText);
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
        <button className="absolute bottom-6 right-6 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/[0.08] bg-black/60 backdrop-blur-md font-mono text-[11px] tracking-[0.15em] text-[#d0d0dc] hover:border-white/20 hover:text-white transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5)] hud-right-btn hover:scale-105">
          <Share2 size={12} />
          SHARE BIRTH YEAR
        </button>
      </DialogTrigger>
      <DialogContent className="bg-[#0A0A0F]/95 border-white/[0.08] text-white font-mono backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-sm rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-[14px] tracking-[0.2em] text-[#d0d0dc] font-orbitron">
            BIRTH YEAR TELEMETRY
          </DialogTitle>
          <DialogDescription className="text-[11px] text-[#888897]">
            Extract historical climate telemetry for your birth year.
          </DialogDescription>
        </DialogHeader>
        {!submittedEntry ? (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
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
              GENERATE DECRIPTION
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
                <span className="text-[10px] tracking-widest text-[#888897]">LOG REPORT</span>
                <span
                  className="size-2 rounded-full"
                  style={{
                    backgroundColor: submittedEntry.tornado_color,
                    boxShadow: `0 0 8px ${submittedEntry.tornado_color}`,
                  }}
                />
              </div>
              <p className="font-sans leading-relaxed text-white/95">
                In <strong className="font-orbitron" style={{ color: submittedEntry.tornado_color }}>{submittedEntry.year}</strong>:
                CO₂ was <span className="font-mono text-white/95">{submittedEntry.co2_ppm} ppm</span> and the vortex severity was <span className="font-mono" style={{ color: submittedEntry.tornado_color }}>{submittedEntry.severity}</span>.
                Today the system has reached <span className="font-mono font-bold" style={{ color: SEVERITY_COLORS[todaySeverity] }}>{todaySeverity}</span> status.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCopy}
                className="flex-1 bg-white text-black hover:bg-white/90 font-bold"
              >
                <Copy size={12} className="mr-2" />
                {copied ? "COPIED TO CLIPBOARD" : "COPY REPORT"}
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

function ScrollFadeIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
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
      { threshold: 0.1 }
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
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
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
  const [hoveredData, setHoveredData] = useState<{ year: number; val: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
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

  const getX = (year: number) => padding + ((year - xMin) / (xMax - xMin)) * (width - padding * 2);
  const getY = (val: number) => height - padding - ((val - yMin) / (yMax - yMin)) * (height - padding * 2);

  const points = useMemo(() => CLIMATE_DATA.map(d => ({
    x: getX(d.year),
    y: getY(d.co2_ppm),
    year: d.year,
    val: d.co2_ppm
  })), []);

  const linePath = useMemo(() => points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" "), [points]);
  const areaPath = useMemo(() => `${linePath} L ${getX(xMax)} ${height - padding} L ${getX(xMin)} ${height - padding} Z`, [linePath]);

  // Draw some horizontal grid lines
  const gridLines = [320, 340, 360, 380, 400, 420];

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
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
    <div ref={containerRef} className="w-full relative bg-white/[0.01] border border-white/[0.05] rounded-xl p-6 backdrop-blur-md">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] animate-pulse" />
        <span className="text-[10px] tracking-widest text-[#888897] font-mono">MAUNA LOA SENSOR TELEMETRY</span>
      </div>
      <div className="w-full overflow-x-auto">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full min-w-[600px] h-auto overflow-visible select-none cursor-crosshair"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          {/* Grid lines */}
          {gridLines.map(val => {
            const y = getY(val);
            return (
              <g key={val}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255, 255, 255, 0.05)" strokeWidth={1} strokeDasharray="4 4" />
                <text x={padding - 8} y={y + 4} fill="rgba(255, 255, 255, 0.3)" fontSize={10} fontFamily="monospace" textAnchor="end">{val}</text>
              </g>
            );
          })}

          {/* X axis years */}
          {TICK_YEARS.map(yr => {
            const x = getX(yr);
            return (
              <g key={yr}>
                <line x1={x} y1={height - padding} x2={x} y2={height - padding + 6} stroke="rgba(255, 255, 255, 0.15)" strokeWidth={1} />
                <text x={x} y={height - padding + 20} fill="rgba(255, 255, 255, 0.4)" fontSize={10} fontFamily="Orbitron, monospace" textAnchor="middle">{yr}</text>
              </g>
            );
          })}

          {/* Area under curve with gradient */}
          <defs>
            <linearGradient id="areaGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
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
              filter: "drop-shadow(0 0 5px rgba(0, 229, 255, 0.6))"
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
                style={{ filter: "drop-shadow(0 0 5px #00E5FF)" }}
              />
              <g>
                {(() => {
                  const boxWidth = 120;
                  const boxHeight = 45;
                  const tx = Math.max(padding, Math.min(width - padding - boxWidth, hoveredData.x - boxWidth / 2));
                  const ty = Math.max(padding, hoveredData.y - boxHeight - 15);
                  return (
                    <g transform={`translate(${tx}, ${ty})`}>
                      <rect
                        width={boxWidth}
                        height={boxHeight}
                        rx={6}
                        fill="rgba(10, 10, 15, 0.95)"
                        stroke="#00E5FF"
                        strokeWidth={1}
                        style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }}
                      />
                      <text x={boxWidth / 2} y={18} fill="#fff" fontSize={10} fontWeight="bold" fontFamily="Orbitron, monospace" textAnchor="middle">
                        YEAR {hoveredData.year}
                      </text>
                      <text x={boxWidth / 2} y={34} fill="#00E5FF" fontSize={11} fontWeight="bold" fontFamily="monospace" textAnchor="middle">
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
  const [hoveredData, setHoveredData] = useState<{ year: number; val: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
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

  const getX = (year: number) => padding + ((year - xMin) / (xMax - xMin)) * (width - padding * 2);
  const getY = (val: number) => {
    if (val >= 0) {
      return baselineY - (val / valMax) * (baselineY - padding);
    } else {
      return baselineY + (val / valMin) * (height - padding - baselineY);
    }
  };

  const getBarColor = (val: number) => {
    if (val < 0) return "#4FC3F7"; // Cool Stable blue
    if (val < 0.3) return "#FFB74D"; // Elevated warm yellow
    if (val < 0.7) return "#FF7043"; // Critical orange
    return "#E53935"; // Extreme Red
  };

  const points = useMemo(() => CLIMATE_DATA.map(d => ({
    x: getX(d.year),
    y: getY(d.temp_anomaly),
    year: d.year,
    val: d.temp_anomaly
  })), []);

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
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
    <div ref={containerRef} className="w-full relative bg-white/[0.01] border border-white/[0.05] rounded-xl p-6 backdrop-blur-md">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[#E53935] animate-pulse" />
        <span className="text-[10px] tracking-widest text-[#888897] font-mono">GISS LAND-OCEAN TEMPERATURE INDEX</span>
      </div>
      <div className="w-full overflow-x-auto">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full min-w-[600px] h-auto overflow-visible select-none cursor-crosshair"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <line x1={padding} y1={baselineY} x2={width - padding} y2={baselineY} stroke="rgba(255, 255, 255, 0.25)" strokeWidth={1.5} />
          <text x={padding - 8} y={baselineY + 4} fill="rgba(255, 255, 255, 0.6)" fontSize={10} fontFamily="monospace" textAnchor="end">0.0°C</text>

          {[-0.2, 0.2, 0.5, 0.8, 1.1].map(val => {
            const y = getY(val);
            return (
              <g key={val}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255, 255, 255, 0.03)" strokeWidth={1} strokeDasharray="2 2" />
                <text x={padding - 8} y={y + 4} fill="rgba(255, 255, 255, 0.3)" fontSize={10} fontFamily="monospace" textAnchor="end">{val >= 0 ? "+" : ""}{val}°C</text>
              </g>
            );
          })}

          {TICK_YEARS.map(yr => {
            const x = getX(yr);
            return (
              <g key={yr}>
                <line x1={x} y1={height - padding} x2={x} y2={height - padding + 6} stroke="rgba(255, 255, 255, 0.15)" strokeWidth={1} />
                <text x={x} y={height - padding + 20} fill="rgba(255, 255, 255, 0.4)" fontSize={10} fontFamily="Orbitron, monospace" textAnchor="middle">{yr}</text>
              </g>
            );
          })}

          {CLIMATE_DATA.map((d, i) => {
            const x = getX(d.year);
            const targetY = getY(d.temp_anomaly);
            const barHeight = Math.abs(targetY - baselineY);
            const y = d.temp_anomaly >= 0 ? targetY : baselineY;
            const isHovered = hoveredData && hoveredData.year === d.year;

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
                  filter: `drop-shadow(0 0 2px ${getBarColor(d.temp_anomaly)}${isHovered ? "bb" : "33"})`
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
                style={{ filter: `drop-shadow(0 0 5px ${getBarColor(hoveredData.val)})` }}
              />
              <g>
                {(() => {
                  const boxWidth = 120;
                  const boxHeight = 45;
                  const tx = Math.max(padding, Math.min(width - padding - boxWidth, hoveredData.x - boxWidth / 2));
                  const ty = Math.max(padding, hoveredData.val >= 0 ? hoveredData.y - boxHeight - 15 : hoveredData.y + 15);
                  return (
                    <g transform={`translate(${tx}, ${ty})`}>
                      <rect
                        width={boxWidth}
                        height={boxHeight}
                        rx={6}
                        fill="rgba(10, 10, 15, 0.95)"
                        stroke={getBarColor(hoveredData.val)}
                        strokeWidth={1}
                        style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }}
                      />
                      <text x={boxWidth / 2} y={18} fill="#fff" fontSize={10} fontWeight="bold" fontFamily="Orbitron, monospace" textAnchor="middle">
                        YEAR {hoveredData.year}
                      </text>
                      <text x={boxWidth / 2} y={34} fill={getBarColor(hoveredData.val)} fontSize={11} fontWeight="bold" fontFamily="monospace" textAnchor="middle">
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
  const [hoveredData, setHoveredData] = useState<{ year: number; val: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
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

  const getX = (year: number) => padding + ((year - xMin) / (xMax - xMin)) * (width - padding * 2);
  const getY = (val: number) => height - padding - ((val - yMin) / (yMax - yMin)) * (height - padding * 2);

  const points = useMemo(() => CLIMATE_DATA.map(d => ({
    x: getX(d.year),
    y: getY(d.avg_tavg_celsius),
    year: d.year,
    val: d.avg_tavg_celsius
  })), []);

  const linePath = useMemo(() => points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" "), [points]);

  const milestones = [
    { year: 1988, label: "Hansen Testimony", color: "#FFB74D", desc: "Climate warning", yOffset: -55, xOffset: 0 },
    { year: 2015, label: "Paris Agreement", color: "#FF7043", desc: "1.5°C threshold", yOffset: -45, xOffset: -65 },
    { year: 2024, label: "Record Central Park TAVG", color: "#E53935", desc: "14.40°C Annual Avg", yOffset: -50, xOffset: -55 }
  ];

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
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
    <div ref={containerRef} className="w-full relative bg-white/[0.01] border border-white/[0.05] rounded-xl p-6 backdrop-blur-md">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[#FF7043] animate-pulse" />
        <span className="text-[10px] tracking-widest text-[#888897] font-mono">CENTRAL PARK OBSERVATORY STATION</span>
      </div>
      <div className="w-full overflow-x-auto">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full min-w-[600px] h-auto overflow-visible select-none cursor-crosshair"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          {[11.5, 12.0, 12.5, 13.0, 13.5, 14.0, 14.5].map(val => {
            const y = getY(val);
            return (
              <g key={val}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255, 255, 255, 0.05)" strokeWidth={1} strokeDasharray="4 4" />
                <text x={padding - 8} y={y + 4} fill="rgba(255, 255, 255, 0.3)" fontSize={10} fontFamily="monospace" textAnchor="end">{val.toFixed(1)}°C</text>
              </g>
            );
          })}

          {TICK_YEARS.map(yr => {
            const x = getX(yr);
            return (
              <g key={yr}>
                <line x1={x} y1={height - padding} x2={x} y2={height - padding + 6} stroke="rgba(255, 255, 255, 0.15)" strokeWidth={1} />
                <text x={x} y={height - padding + 20} fill="rgba(255, 255, 255, 0.4)" fontSize={10} fontFamily="Orbitron, monospace" textAnchor="middle">{yr}</text>
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
              filter: "drop-shadow(0 0 5px rgba(255, 112, 67, 0.6))"
            }}
          />

          {milestones.map((m, idx) => {
            const pt = points.find(p => p.year === m.year);
            if (!pt) return null;
            
            // Render milestones translucent on hover proximity
            const isHoveredClose = hoveredData && Math.abs(hoveredData.year - m.year) <= 1;

            return (
              <g key={m.year} className={`transition-all duration-1000 ease-out ${isHoveredClose ? "opacity-25" : "opacity-100"}`}>
                <line
                  x1={pt.x}
                  y1={height - padding}
                  x2={pt.x}
                  y2={isVisible ? pt.y : height - padding}
                  stroke={m.color}
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                  className="transition-all duration-[1500ms] ease-out"
                  style={{ transitionDelay: `${500 + idx * 300}ms` }}
                />
                
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isVisible ? 5 : 0}
                  fill={m.color}
                  stroke="#05050A"
                  strokeWidth={2}
                  className="transition-all duration-500"
                  style={{ transitionDelay: `${1000 + idx * 300}ms` }}
                />

                <g
                  className={`transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}
                  style={{ transitionDelay: `${1200 + idx * 300}ms` }}
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
                    fontFamily="Orbitron, monospace"
                    textAnchor="middle"
                  >
                    {m.label}
                  </text>
                  <text
                    x={pt.x + m.xOffset}
                    y={pt.y + m.yOffset + 25}
                    fill="rgba(255, 255, 255, 0.6)"
                    fontSize={7.5}
                    fontFamily="monospace"
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
                style={{ filter: "drop-shadow(0 0 4px #FF7043)" }}
              />
              <g>
                {(() => {
                  const boxWidth = 120;
                  const boxHeight = 45;
                  const tx = Math.max(padding, Math.min(width - padding - boxWidth, hoveredData.x - boxWidth / 2));
                  const ty = Math.max(padding, hoveredData.y - boxHeight - 15);
                  return (
                    <g transform={`translate(${tx}, ${ty})`}>
                      <rect
                        width={boxWidth}
                        height={boxHeight}
                        rx={6}
                        fill="rgba(10, 10, 15, 0.95)"
                        stroke="#FF7043"
                        strokeWidth={1}
                        style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }}
                      />
                      <text x={boxWidth / 2} y={18} fill="#fff" fontSize={10} fontWeight="bold" fontFamily="Orbitron, monospace" textAnchor="middle">
                        YEAR {hoveredData.year}
                      </text>
                      <text x={boxWidth / 2} y={34} fill="#FF7043" fontSize={11} fontWeight="bold" fontFamily="monospace" textAnchor="middle">
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
    insight: "Defining the sensory urgency curve before writing a single line of code."
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
    insight: "Bridges interactive data with physical vector parameters."
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
    insight: "Eliminates parsing overhead by pre-compiling all metrics into high-speed arrays."
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
    insight: "Converts dry global statistics into personal stories."
  }
];

function WorkflowTimeline() {
  const [activeStep, setActiveStep] = useState("figma");
  const step = WORKFLOW_STEPS.find(s => s.id === activeStep) || WORKFLOW_STEPS[0];
  const StepIcon = step.icon;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
      <div className="lg:col-span-5 flex flex-col gap-3">
        {WORKFLOW_STEPS.map(s => {
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
                  isActive ? "bg-white/10 border-white/20 text-white" : "bg-white/[0.02] border-white/[0.05] text-[#888897]"
                }`}
              >
                <Icon size={18} />
              </div>
              <div>
                <h4 className={`text-[13px] font-bold font-orbitron tracking-wider transition-colors duration-300 ${
                  isActive ? "text-white" : "text-[#d0d0dc]"
                }`}>
                  {s.title}
                </h4>
                <p className="text-[10px] text-[#888897] font-mono mt-0.5">{s.metric}</p>
              </div>
              <ChevronRight
                size={14}
                className={`ml-auto transition-all duration-300 ${
                  isActive ? "text-white translate-x-0" : "text-white/20 translate-x-[-4px] group-hover:translate-x-0 group-hover:text-white/40"
                }`}
              />
            </button>
          );
        })}
      </div>

      <div className="lg:col-span-7 bg-white/[0.01] border border-white/[0.05] rounded-xl p-6 relative overflow-hidden backdrop-blur-md min-h-[300px] flex flex-col justify-between">
        <div className="absolute top-0 right-0 p-3 bg-white/[0.02] border-b border-l border-white/[0.05] rounded-bl-lg">
          <span className="text-[8px] font-mono tracking-[0.2em] text-[#888897]">COMPILE STATUS: OK</span>
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
              <p className="text-[9px] text-[#888897] font-mono uppercase tracking-widest">{step.metric}</p>
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
          <span className="text-[8px] tracking-[0.15em] text-[#888897] font-mono uppercase">DESIGN SYSTEM INSIGHT</span>
          <span className="text-[10px] text-[#d0d0dc] font-mono text-right font-medium">
            "{step.insight}"
          </span>
        </div>
      </div>
    </div>
  );
}

export function DataTornado({ isReady = true }: { isReady?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pendingSeekTimeRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  const [year, setYear] = useState(MIN_YEAR);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(FALLBACK_DURATION);
  const [liveData, setLiveData] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loop, setLoop] = useState(true);
  
  // Real-time micro-fluctuations
  const [noise, setNoise] = useState({ co2: 0, temp: 0, tavg: 0 });

  const severity = severityFromTime(currentTime);
  const entry = useMemo(() => CLIMATE_DATA.find((d) => d.year === year) ?? CLIMATE_DATA[0], [year]);
  const todaySeverity = severityFromTime(duration - 0.001);
  const activeIndex = useMemo(() => CLIMATE_DATA.findIndex((d) => d.year === year), [year]);

  const videoBrightness = useMemo(() => {
    switch (severity) {
      case "STABLE": return 0.50;
      case "ELEVATED": return 0.60;
      case "CRITICAL": return 0.70;
      case "EXTREME": return 0.80;
      default: return 0.60;
    }
  }, [severity]);

  // Noise flickers when LIVE DATA is active
  useEffect(() => {
    if (!liveData) {
      setNoise({ co2: 0, temp: 0, tavg: 0 });
      return;
    }
    const interval = setInterval(() => {
      setNoise({
        co2: (Math.random() - 0.5) * 0.12,
        temp: (Math.random() - 0.5) * 0.02,
        tavg: (Math.random() - 0.5) * 0.04,
      });
    }, 150);
    return () => clearInterval(interval);
  }, [liveData]);



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

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
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

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen w-full overflow-x-hidden bg-[#05050A] text-white font-sans hud-grid scroll-smooth"
    >
      {/* SECTION 1: INTERACTIVE CHAMBER HERO */}
      <section className="relative h-screen w-full overflow-hidden flex flex-col justify-between">
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
            <span className={`font-orbitron text-[11px] font-black tracking-[0.25em] text-white ${
              (severity === "CRITICAL" || severity === "EXTREME") ? "hud-glitch-text" : ""
            }`}>
              THE DATA TORNADO
            </span>
            <span className="text-[8px] tracking-[0.15em] text-[#888897] font-mono mt-0.5">
              CLIMATE ANOMALY ANALYSIS INTERFACE // VORTEX.V1
            </span>
          </div>

          {/* Right: Year Telemetry */}
          <div className="flex items-center gap-6">
            <div className="flex items-baseline gap-2">
              <span className="text-[8px] tracking-[0.15em] text-[#888897] font-mono uppercase">COORDINATE TIME</span>
              <span className={`text-[20px] font-black font-orbitron tracking-wider text-white select-none ${
                (severity === "CRITICAL" || severity === "EXTREME") ? "hud-glitch-text" : ""
              }`}>
                {year}
              </span>
            </div>
          </div>
        </div>

        {/* LEFT DATA TELEMETRY PANEL */}
        <DataPanel entry={entry} severity={severity} noise={noise} activeIndex={activeIndex} />

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
              behavior: "smooth"
            });
          }}
        >
          <span className="text-[8px] tracking-[0.25em] font-mono text-[#888897]">SCROLL TO EXPLORE TELEMETRY</span>
          <ArrowDown size={12} className="animate-bounce text-[#888897]" />
        </div>

        {/* SHARE MODAL TRIGGER */}
        <ShareCard todaySeverity={todaySeverity} />

        {/* Viewport Warning Vignette Overlay for CRITICAL & EXTREME states */}
        {(severity === "CRITICAL" || severity === "EXTREME") && (
          <div
            className={`absolute inset-0 pointer-events-none z-30 transition-all duration-300 ${
              severity === "EXTREME" ? "animate-warning-pulse-red" : "animate-warning-pulse-orange"
            }`}
            style={{
              borderWidth: "3px",
              borderStyle: "solid",
            }}
          />
        )}
      </section>

      {/* SECTION 2: CARBON SURGE */}
      <section className="relative min-h-screen py-24 px-6 md:px-12 flex flex-col justify-center bg-[#05050A] z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,229,255,0.015)_0%,transparent_60%)] pointer-events-none" />
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <ScrollFadeIn>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-[#00E5FF] font-mono text-[9px] tracking-[0.2em] uppercase">
                Atmospheric Carbon // 02
              </div>
            </ScrollFadeIn>
            
            <ScrollFadeIn delay={150}>
              <h2 className="text-3xl md:text-4xl font-black font-orbitron tracking-wider text-white">
                THE CARBON TRAJECTORY
              </h2>
            </ScrollFadeIn>

            <ScrollFadeIn delay={300}>
              <p className="text-[13px] leading-relaxed text-[#888897]">
                Since the industrial era, greenhouse gas concentration has surged at an exponential rate. Readings from the Mauna Loa Observatory show atmospheric CO₂ climbing from <span className="text-white font-mono">315.98 ppm</span> in 1959 to a record-breaking <span className="text-white font-mono">424.61 ppm</span> in 2024.
              </p>
            </ScrollFadeIn>

            <ScrollFadeIn delay={450}>
              <div className="p-5 rounded-xl border border-[#00E5FF]/20 bg-[#00E5FF]/5 backdrop-blur-sm relative overflow-hidden group hover:border-[#00E5FF]/40 transition-all duration-300">
                <div className="absolute top-0 right-0 p-2 bg-[#00E5FF]/10 text-[#00E5FF] font-mono text-[8px] tracking-wider rounded-bl">
                  STAT SCALE
                </div>
                <div className="text-4xl md:text-5xl font-black font-orbitron text-white tracking-tight">
                  +34.4%
                </div>
                <div className="text-[10px] text-[#888897] font-mono mt-2 uppercase tracking-wider">
                  Increase in Atmospheric Carbon dioxide (1959–2024)
                </div>
              </div>
            </ScrollFadeIn>
          </div>

          <div className="lg:col-span-7 w-full">
            <ScrollFadeIn delay={300}>
              <CO2Chart />
            </ScrollFadeIn>
          </div>
        </div>
      </section>

      {/* SECTION 3: GLOBAL ANOMALY */}
      <section className="relative min-h-screen py-24 px-6 md:px-12 flex flex-col justify-center bg-[#05050A] z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(229,57,53,0.02)_0%,transparent_60%)] pointer-events-none" />
        
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 w-full order-last lg:order-first">
            <ScrollFadeIn delay={300}>
              <AnomalyChart />
            </ScrollFadeIn>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <ScrollFadeIn>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/20 bg-red-500/5 text-[#E53935] font-mono text-[9px] tracking-[0.2em] uppercase">
                Thermal Deviations // 03
              </div>
            </ScrollFadeIn>

            <ScrollFadeIn delay={150}>
              <h2 className="text-3xl md:text-4xl font-black font-orbitron tracking-wider text-white">
                GLOBAL ANOMALY INDEX
              </h2>
            </ScrollFadeIn>

            <ScrollFadeIn delay={300}>
              <p className="text-[13px] leading-relaxed text-[#888897]">
                Global temperature anomaly tracks surface thermal deviations relative to the mid-20th-century baseline. Driven by greenhouse feedback, the Earth shifted from stabilizing cooling periods to a rapid thermal surge, reaching <span className="text-[#E53935] font-bold">+1.29°C</span> in 2024.
              </p>
            </ScrollFadeIn>

            <ScrollFadeIn delay={450}>
              <div className="p-5 rounded-xl border border-red-500/20 bg-red-500/5 backdrop-blur-sm relative overflow-hidden group hover:border-red-500/40 transition-all duration-300">
                <div className="absolute top-0 right-0 p-2 bg-red-500/10 text-[#E53935] font-mono text-[8px] tracking-wider rounded-bl">
                  EXTREME STATUS
                </div>
                <div className="text-4xl md:text-5xl font-black font-orbitron text-white tracking-tight">
                  +1.29°C
                </div>
                <div className="text-[10px] text-[#888897] font-mono mt-2 uppercase tracking-wider">
                  Global Temperature Anomaly Peak in 2024
                </div>
              </div>
            </ScrollFadeIn>
          </div>
        </div>
      </section>

      {/* SECTION 4: LOCAL PROFILE */}
      <section className="relative min-h-screen py-24 px-6 md:px-12 flex flex-col justify-center bg-[#05050A] z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,112,67,0.015)_0%,transparent_60%)] pointer-events-none" />
        <div className="max-w-6xl mx-auto w-full space-y-12">
          {/* Header Grid: Text on left, Stat Card on right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-6">
              <ScrollFadeIn>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/20 bg-orange-500/5 text-[#FF7043] font-mono text-[9px] tracking-[0.2em] uppercase">
                  Observatory Telemetry // 04
                </div>
              </ScrollFadeIn>

              <ScrollFadeIn delay={150}>
                <h2 className="text-3xl md:text-4xl font-black font-orbitron tracking-wider text-white">
                  CENTRAL PARK LOCAL TRENDS
                </h2>
              </ScrollFadeIn>

              <ScrollFadeIn delay={300}>
                <p className="text-[13px] leading-relaxed text-[#888897]">
                  Local weather station logs are indicative of broader trends. Analyzing Central Park’s annual averages (TAVG) reveals a decadal shift. The mean temperature climbed from <span className="text-white font-mono">12.34°C</span> in the 1960s to <span className="text-white font-mono">13.88°C</span> in the 2020s, culminating in a record high of <span className="text-[#FF7043] font-bold">14.40°C</span> in 2024.
                </p>
              </ScrollFadeIn>
            </div>

            <div className="lg:col-span-5 w-full">
              <ScrollFadeIn delay={450}>
                <div className="p-5 rounded-xl border border-[#FF7043]/20 bg-[#FF7043]/5 backdrop-blur-sm relative overflow-hidden group hover:border-[#FF7043]/40 transition-all duration-300">
                  <div className="absolute top-0 right-0 p-2 bg-[#FF7043]/10 text-[#FF7043] font-mono text-[8px] tracking-wider rounded-bl">
                    DECADE MEAN
                  </div>
                  <div className="text-4xl md:text-5xl font-black font-orbitron text-white tracking-tight">
                    13.88°C
                  </div>
                  <div className="text-[10px] text-[#888897] font-mono mt-2 uppercase tracking-wider">
                    2019-2024 Average Local Temperature
                  </div>
                </div>
              </ScrollFadeIn>
            </div>
          </div>

          {/* Full Width Chart Row */}
          <div className="w-full">
            <ScrollFadeIn delay={300}>
              <LocalTempChart />
            </ScrollFadeIn>
          </div>
        </div>
      </section>

      {/* SECTION 5: CONFIG MAKEATHON SHOWCASE */}
      <section className="relative min-h-screen py-24 px-6 md:px-12 flex flex-col justify-center bg-[#05050A] z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.015)_0%,transparent_60%)] pointer-events-none" />
        <div className="max-w-6xl mx-auto w-full space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <ScrollFadeIn>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-400 font-mono text-[9px] tracking-[0.2em] uppercase">
                Innovation Showcase // 05
              </div>
            </ScrollFadeIn>

            <ScrollFadeIn delay={150}>
              <h2 className="text-3xl md:text-4xl font-black font-orbitron tracking-wider text-white">
                CONFIG MAKEATHON BLUEPRINT
              </h2>
            </ScrollFadeIn>

            <ScrollFadeIn delay={300}>
              <p className="text-[13px] leading-relaxed text-[#888897]">
                A breakdown of how Figma canvas architecture, Weave simulation vectors, and live API pipelines were unified to engineer the final Data Tornado simulator.
              </p>
            </ScrollFadeIn>
          </div>

          <ScrollFadeIn delay={450}>
            <WorkflowTimeline />
          </ScrollFadeIn>
        </div>
      </section>
    </div>
  );
}
