"use client";

import { useEffect, useRef, useState } from "react";

interface ForeverScaleProps {
  score: number;   // 0–100
  status: string;  // "safe" | "caution" | "danger"
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Interpolate green (#22c55e) → yellow (#eab308) → red (#ef4444) by score
function scoreToColor(score: number): string {
  if (score <= 50) {
    const t = score / 50;
    const r = Math.round(0x22 + t * (0xea - 0x22));
    const g = Math.round(0xc5 + t * (0xb3 - 0xc5));
    const b = Math.round(0x5e + t * (0x08 - 0x5e));
    return `rgb(${r},${g},${b})`;
  } else {
    const t = (score - 50) / 50;
    const r = Math.round(0xea + t * (0xef - 0xea));
    const g = Math.round(0xb3 + t * (0x44 - 0xb3));
    const b = Math.round(0x08 + t * (0x44 - 0x08));
    return `rgb(${r},${g},${b})`;
  }
}

// SVG arc path for the filled portion of the gauge
function describeArc(cx: number, cy: number, r: number, score: number): string {
  const angleDeg = 180 - (score / 100) * 180;
  const angleRad = (angleDeg * Math.PI) / 180;
  const x = cx + r * Math.cos(angleRad);
  const y = cy - r * Math.sin(angleRad);
  const largeArc = score > 50 ? 1 : 0;
  return `M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${x} ${y}`;
}

// Needle tip position for a given score
function needleCoords(cx: number, cy: number, r: number, score: number) {
  const angleDeg = 180 - (score / 100) * 180;
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy - r * Math.sin(angleRad),
  };
}

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  safe:    "Low Exposure",
  caution: "Moderate Exposure",
  danger:  "High Exposure",
};

const CX = 160;
const CY = 150;
const R_OUTER  = 120;
const R_NEEDLE = 108;
const DURATION = 800; // ms

// ── Component ────────────────────────────────────────────────────────────────

export default function ForeverScaleGauge({ score, status }: ForeverScaleProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const rafRef       = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Animate needle 0 → score over 800ms on mount (ease-out cubic)
  useEffect(() => {
    const target = Math.max(0, Math.min(100, score));
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed  = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / DURATION, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [score]);

  const color  = scoreToColor(animatedScore);
  const needle = needleCoords(CX, CY, R_NEEDLE, animatedScore);
  const arc    = animatedScore > 0 ? describeArc(CX, CY, R_OUTER, animatedScore) : null;

  // Tick marks at every 10 points
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const s        = i * 10;
    const angleRad = ((180 - (s / 100) * 180) * Math.PI) / 180;
    const r1 = R_OUTER + 6;
    const r2 = R_OUTER + (i % 5 === 0 ? 16 : 10);
    return {
      x1: CX + r1 * Math.cos(angleRad),
      y1: CY - r1 * Math.sin(angleRad),
      x2: CX + r2 * Math.cos(angleRad),
      y2: CY - r2 * Math.sin(angleRad),
      major: i % 5 === 0,
      label: s,
    };
  });

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: "0.5rem", padding: "1.5rem 1rem 1rem",
      background: "var(--color-background-primary)",
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: "var(--border-radius-lg)",
      maxWidth: "340px", margin: "0 auto",
    }}>
      <svg
        viewBox="0 0 320 190"
        width="100%"
        role="img"
        aria-label={`REI Score: ${score} out of 100. Status: ${STATUS_LABELS[status] ?? status}`}
        suppressHydrationWarning={true}
      >
        {/* Background track */}
        <path
          d={`M ${CX - R_OUTER} ${CY} A ${R_OUTER} ${R_OUTER} 0 1 1 ${CX + R_OUTER} ${CY}`}
          fill="none"
          stroke="#334155"
          strokeWidth="14"
          strokeLinecap="round"
        />

        {/* Filled arc */}
        {arc && (
          <path
            d={arc}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
          />
        )}

        {/* Tick marks */}
        {ticks.map((t) => (
          <line
            key={t.label}
            x1={t.x1} y1={t.y1}
            x2={t.x2} y2={t.y2}
            stroke="var(--color-border-secondary)"
            strokeWidth={t.major ? 1.5 : 0.75}
            suppressHydrationWarning={true}
          />
        ))}

        {/* Scale labels: 0, 50, 100 */}
        {([0, 50, 100] as const).map((val) => {
          const angleRad = ((180 - (val / 100) * 180) * Math.PI) / 180;
          const r = R_OUTER + 28;
          return (
            <text
              key={val}
              x={CX + r * Math.cos(angleRad)}
              y={CY - r * Math.sin(angleRad)}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="11"
              fill="var(--color-text-secondary)"
              fontFamily="var(--font-sans)"
            >
              {val}
            </text>
          );
        })}

        {/* Needle */}
        <line
          x1={CX} y1={CY}
          x2={needle.x} y2={needle.y}
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r="6" fill={color} />
        <circle cx={CX} cy={CY} r="3" fill="var(--color-background-primary)" />

        {/* Score number */}
        <text
          x={CX} y={CY + 34}
          textAnchor="middle"
          fontSize="32" fontWeight="500"
          fill="var(--color-text-primary)"
          fontFamily="var(--font-sans)"
        >
          {animatedScore}
        </text>
        <text
          x={CX} y={CY + 56}
          textAnchor="middle"
          fontSize="11"
          fill="var(--color-text-secondary)"
          fontFamily="var(--font-sans)"
        >
          / 100
        </text>

        {/* Range labels */}
        <text x="20"       y={CY + 18} fontSize="10" fill="#22c55e" fontFamily="var(--font-sans)" fontWeight="500">Safe</text>
        <text x={CX}       y="20"      fontSize="10" fill="#eab308" fontFamily="var(--font-sans)" fontWeight="500" textAnchor="middle">Caution</text>
        <text x={CX * 2 - 20} y={CY + 18} fontSize="10" fill="#ef4444" fontFamily="var(--font-sans)" fontWeight="500" textAnchor="end">Danger</text>
      </svg>

      {/* Status badge */}
      <div style={{
        fontSize: "13px", fontWeight: 500, color,
        padding: "4px 14px",
        border: `1px solid ${color}`,
        borderRadius: "999px",
        lineHeight: 1.4,
      }}>
        {STATUS_LABELS[status] ?? status}
      </div>

      {/* Label */}
      <p style={{
        margin: 0, fontSize: "12px",
        color: "var(--color-text-secondary)",
        textAlign: "center",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
      }}>
        Relative Exposure Index
      </p>
    </div>
  );
}