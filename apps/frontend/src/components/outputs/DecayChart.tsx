"use client";

import { useState } from "react";
import { DecayPoint, Scenario } from "@/store/appStore";

interface DecayChartProps {
  /** Single-scenario data (backward compatible) */
  data?: DecayPoint[] | null;
  /** Multiple scenarios to overlay on one chart */
  scenarios?: Scenario[] | null;
}

// ── Scenario colors ────────────────────────────────────────────────────────────
// Ordered: Current (amber) → Filter+Diet (teal) → Full Overhaul (emerald) → Medical (violet)
const SCENARIO_COLORS = ["#f59e0b", "#10b981", "#34d399", "#a78bfa"];
const SCENARIO_DASHES: string[] = ["none", "none", "none", "6 3"];

export default function DecayChart({ data, scenarios }: DecayChartProps) {
  // Prefer the multi-scenario view when scenarios are provided
  const multiMode = !!(scenarios && scenarios.length > 0);

  // Build a unified data set for sizing
  const primaryData: DecayPoint[] =
    multiMode ? scenarios![0].data : (data ?? []);

  const maxWeek =
    primaryData.length > 0
      ? Math.max(...primaryData.map((d) => d.week), 260)
      : 260;
  const maxYears = parseFloat((maxWeek / 52).toFixed(1));
  const [displayYears, setDisplayYears] = useState(Math.min(Math.max(5, maxYears), 10));

  if (!multiMode && (!data || data.length === 0)) {
    return (
      <div className="w-full h-64 bg-slate-800/60 border border-teal-700/30 rounded-xl flex items-center justify-center">
        <p className="text-gray-400 font-semibold">No decay data available</p>
      </div>
    );
  }

  const displayWeeks = displayYears * 52;

  const pad = { top: 28, right: 28, bottom: 44, left: 52 };
  const W = 560;
  const H = 280;
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const xScale = (week: number) => pad.left + (week / displayWeeks) * innerW;
  const yScale = (load: number) => pad.top + innerH - (load / 100) * innerH;

  // Year ticks
  const tickStep = displayYears <= 1 ? 0.25 : displayYears <= 3 ? 0.5 : 1;
  const yearTicks: number[] = [];
  for (let y = 0; y <= displayYears + 0.001; y += tickStep) {
    yearTicks.push(parseFloat(y.toFixed(2)));
  }

  // ── Half-life annotation ───────────────────────────────────────────────────
  const mainData = multiMode ? scenarios![0].data : (data ?? []);
  const startLoad = mainData[0]?.bodyLoad ?? 100;
  const halfTarget = startLoad * 0.5;
  const hlPoint = mainData.find(
    (d, i) => i > 0 && d.bodyLoad <= halfTarget && d.week <= displayWeeks,
  );
  const hlX = hlPoint ? xScale(hlPoint.week) : null;

  // ── Build paths for each series ───────────────────────────────────────────
  interface SeriesPath {
    label: string;
    color: string;
    dash: string;
    linePath: string;
    endLoad: number;
  }

  function buildSeriesPath(
    seriesData: DecayPoint[],
    color: string,
    dash: string,
    label: string,
  ): SeriesPath {
    const pts = seriesData
      .filter((d) => d.week <= displayWeeks)
      .map((d) => ({ x: xScale(d.week), y: yScale(d.bodyLoad), load: d.bodyLoad }));
    const linePath = pts
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");
    return { label, color, dash, linePath, endLoad: pts[pts.length - 1]?.load ?? 0 };
  }

  const series: SeriesPath[] = multiMode
    ? scenarios!.map((sc, i) =>
        buildSeriesPath(
          sc.data,
          SCENARIO_COLORS[i] ?? "#94a3b8",
          SCENARIO_DASHES[i] ?? "none",
          sc.label,
        ),
      )
    : [buildSeriesPath(data!, SCENARIO_COLORS[0], "none", "Body Load")];

  const firstSeries = series[0];

  return (
    <div className="w-full">
      {/* Header + slider */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-gray-100 text-xl">
            {multiMode ? "Scenario Comparison" : "PFAS Body Load Over Time"}
          </h3>
          {multiMode && (
            <p className="text-xs text-gray-400 mt-1">
              All curves start at the same exposure level. Divergence shows the impact of interventions.
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-300 flex-shrink-0">
          <span className="text-gray-400 text-xs">Simulate:</span>
          <input
            type="range"
            min={5}
            max={maxYears}
            step={0.5}
            value={displayYears}
            onChange={(e) => setDisplayYears(parseFloat(e.target.value))}
            className="w-28 accent-teal-400"
          />
          <span className="text-teal-400 font-bold font-mono text-sm w-16 text-right">
            {displayYears} yr{displayYears !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Legend (multi-line mode) */}
      {multiMode && (
        <div className="flex flex-wrap gap-3 mb-4">
          {series.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
              <svg width="28" height="10">
                <line
                  x1="0" y1="5" x2="28" y2="5"
                  stroke={s.color}
                  strokeWidth="2.5"
                  strokeDasharray={s.dash === "none" ? undefined : s.dash}
                  strokeLinecap="round"
                />
              </svg>
              <span>{s.label}</span>
            </div>
          ))}
          {hlPoint && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <svg width="28" height="10">
                <line x1="0" y1="5" x2="28" y2="5" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 3" />
              </svg>
              <span>50% crossover</span>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <div className="bg-slate-800/80 border border-teal-700/30 rounded-xl p-3 overflow-x-auto">
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto w-full"
        >
          <defs>
            {series.map((_s, i) => (
              <linearGradient key={i} id={`decayArea${i}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={SCENARIO_COLORS[i] ?? "#10b981"} stopOpacity={i === 0 ? 0.22 : 0} />
                <stop offset="100%" stopColor={SCENARIO_COLORS[i] ?? "#10b981"} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {/* Horizontal grid */}
          {[0, 25, 50, 75, 100].map((val) => (
            <line
              key={`hg-${val}`}
              x1={pad.left}
              y1={yScale(val)}
              x2={W - pad.right}
              y2={yScale(val)}
              stroke="#1e293b"
              strokeDasharray="4 3"
              strokeWidth="1"
            />
          ))}

          {/* Half-life vertical annotation */}
          {hlX !== null && (
            <>
              <line
                x1={hlX}
                y1={pad.top}
                x2={hlX}
                y2={pad.top + innerH}
                stroke="#64748b"
                strokeDasharray="4 3"
                strokeWidth="1.5"
              />
              <text x={hlX + 5} y={pad.top + 14} fontSize="10" fill="#64748b" fontFamily="monospace">
                50% ≈ {(hlPoint!.week / 52).toFixed(1)}y
              </text>
            </>
          )}

          {/* Axes */}
          <line x1={pad.left} y1={pad.top + innerH} x2={W - pad.right} y2={pad.top + innerH} stroke="#334155" strokeWidth="1.5" />
          <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + innerH} stroke="#334155" strokeWidth="1.5" />

          {/* Y labels */}
          {[0, 25, 50, 75, 100].map((val) => (
            <text key={`yl-${val}`} x={pad.left - 6} y={yScale(val) + 4} textAnchor="end" fontSize="10" fill="#64748b">
              {val}%
            </text>
          ))}

          {/* X labels */}
          {yearTicks.map((yr) => (
            <text
              key={`xl-${yr}`}
              x={xScale(yr * 52)}
              y={pad.top + innerH + 22}
              textAnchor="middle"
              fontSize="10"
              fill="#64748b"
            >
              {yr === 0 ? "0" : `${yr}y`}
            </text>
          ))}

          {/* Area fill — only for the first (current trajectory) series */}
          {(() => {
            const pts = mainData
              .filter((d) => d.week <= displayWeeks)
              .map((d) => ({ x: xScale(d.week), y: yScale(d.bodyLoad) }));
            if (pts.length < 2) return null;
            const lp = pts
              .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
              .join(" ");
            const areaPath = `${lp} L ${pts[pts.length - 1].x.toFixed(1)} ${(pad.top + innerH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(pad.top + innerH).toFixed(1)} Z`;
            return <path d={areaPath} fill="url(#decayArea0)" />;
          })()}

          {/* All scenario lines */}
          {series.map((s, i) => (
            <path
              key={`line-${i}`}
              d={s.linePath}
              fill="none"
              stroke={s.color}
              strokeWidth={i === 0 ? 2.5 : 2}
              strokeDasharray={s.dash === "none" ? undefined : s.dash}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={i === 0 ? 1 : 0.85}
            />
          ))}

          {/* End-of-window value labels in multi mode */}
          {multiMode &&
            series.map((s, i) => {
              const lastPt = (scenarios![i]?.data ?? [])
                .filter((d) => d.week <= displayWeeks)
                .at(-1);
              if (!lastPt) return null;
              const lx = xScale(lastPt.week);
              const ly = yScale(lastPt.bodyLoad);
              if (lx > W - pad.right - 8) return null;
              return (
                <text key={`end-${i}`} x={lx + 6} y={ly + 4} fontSize="10" fill={s.color} fontFamily="monospace">
                  {lastPt.bodyLoad}%
                </text>
              );
            })}
        </svg>
      </div>

      {/* Summary cards */}
      {multiMode ? (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {series.map((s, i) => (
            <div
              key={i}
              style={{ borderColor: `${s.color}40` }}
              className="p-4 bg-slate-700/60 rounded-xl border"
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, display: "inline-block", flexShrink: 0 }}
                />
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide leading-tight line-clamp-1">
                  {s.label.split(" ")[0]}
                </p>
              </div>
              <p style={{ color: s.color }} className="text-xl font-bold font-mono">
                {s.endLoad}%
              </p>
              <p className="text-gray-500 text-xs mt-0.5">after {displayYears}y</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="p-4 bg-slate-700/60 rounded-xl border border-teal-700/30">
            <p className="text-gray-400 text-xs font-semibold mb-1 uppercase tracking-wide">Starting Load</p>
            <p className="text-2xl font-bold text-emerald-400">{primaryData[0]?.bodyLoad ?? 0}%</p>
          </div>
          <div className="p-4 bg-slate-700/60 rounded-xl border border-teal-700/30">
            <p className="text-gray-400 text-xs font-semibold mb-1 uppercase tracking-wide">
              After {displayYears} yr{displayYears !== 1 ? "s" : ""}
            </p>
            <p className="text-2xl font-bold text-teal-400">{firstSeries.endLoad}%</p>
          </div>
        </div>
      )}

      {/* Scientific context */}
      <p className="mt-3 text-xs text-gray-500 leading-relaxed">
        <span className="font-semibold text-gray-400">Note:</span>{" "}
        PFAS elimination follows an asymptotic curve — levels drop quickly at first, then plateau at a steady-state floor.
        Compound half-lives: PFOS ~5.4 yr · PFOA ~3.5 yr · PFHxS ~8.5 yr.
        Projections assume consistent habit changes and no new major exposures.
      </p>
    </div>
  );
}
