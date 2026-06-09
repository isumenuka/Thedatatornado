import { useRef, type ReactNode } from "react";
import { motion, useInView, useScroll, useTransform, type MotionValue } from "motion/react";

// ── Words pull up — each word slides up from y:20 with stagger ───────────
// Matches site sci-fi aesthetic: subtle red glow underline on hover-able headings.
export function WordsPullUp({
  text,
  className = "",
  delay = 0,
  stagger = 0.07,
  accent,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  accent?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const words = text.split(" ");

  return (
    <div ref={ref} className={`inline-flex flex-wrap ${className}`} style={accent ? { color: accent } : undefined}>
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="overflow-hidden inline-flex pr-[0.25em]">
          <motion.span
            initial={{ y: 28, opacity: 0 }}
            animate={inView ? { y: 0, opacity: 1 } : { y: 28, opacity: 0 }}
            transition={{
              duration: 0.6,
              delay: delay + i * stagger,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="inline-block will-change-transform"
          >
            {w}
          </motion.span>
        </span>
      ))}
    </div>
  );
}

// ── Multi-style words — same animation, different per-segment styling ────
export function WordsPullUpMulti({
  segments,
  className = "",
  stagger = 0.07,
  delay = 0,
}: {
  segments: Array<{ text: string; className?: string }>;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  let idx = 0;
  return (
    <div ref={ref} className={`inline-flex flex-wrap ${className}`}>
      {segments.map((seg, sIdx) =>
        seg.text.split(" ").map((w, wIdx) => {
          const i = idx++;
          return (
            <span key={`${sIdx}-${wIdx}`} className="overflow-hidden inline-flex pr-[0.25em]">
              <motion.span
                initial={{ y: 28, opacity: 0 }}
                animate={inView ? { y: 0, opacity: 1 } : { y: 28, opacity: 0 }}
                transition={{
                  duration: 0.6,
                  delay: delay + i * stagger,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={`inline-block will-change-transform ${seg.className ?? ""}`}
              >
                {w}
              </motion.span>
            </span>
          );
        }),
      )}
    </div>
  );
}

// ── Scroll-linked character reveal (progressive read effect) ─────────────
function AnimatedChar({
  ch,
  progress,
  range,
}: {
  ch: string;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const opacity = useTransform(progress, range, [0.18, 1]);
  return (
    <motion.span style={{ opacity }} className="inline">
      {ch}
    </motion.span>
  );
}

export function ScrollCharReveal({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.25"],
  });
  const chars = text.split("");
  const total = chars.length;
  return (
    <p ref={ref} className={className}>
      {chars.map((ch, i) => {
        if (ch === " ") return <span key={i}>&nbsp;</span>;
        const p = i / total;
        return (
          <AnimatedChar
            key={i}
            ch={ch}
            progress={scrollYProgress}
            range={[Math.max(0, p - 0.08), Math.min(1, p + 0.04)]}
          />
        );
      })}
    </p>
  );
}

// ── Card / block entrance — scale + fade in on view ──────────────────────
export function ScrollRevealCard({
  children,
  delay = 0,
  className = "",
  y = 32,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y, scale: 0.96 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y, scale: 0.96 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Section underline — animated red accent bar that draws in on view ────
export function ScrollAccentBar({
  color = "#E53935",
  className = "",
  delay = 0,
}: {
  color?: string;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <div ref={ref} className={`relative h-px overflow-hidden ${className}`}>
      <motion.div
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
        style={{
          transformOrigin: "left",
          background: `linear-gradient(to right, ${color} 0%, ${color}55 60%, transparent 100%)`,
          boxShadow: `0 0 14px ${color}88`,
        }}
        className="absolute inset-0"
      />
    </div>
  );
}
