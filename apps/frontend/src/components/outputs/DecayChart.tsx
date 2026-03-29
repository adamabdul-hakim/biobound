"use client";

import { useState } from "react";
import { DecayPoint } from "@/store/appStore";

interface DecayChartProps {
  data: DecayPoint[] | null;
}

export default function DecayChart({ data }: DecayChartProps) {
  const maxWeek = data && data.length > 0 ? Math.max(...data.map((d) => d.week), 260) : 260;
  const maxYears = parseFloat((maxWeek / 52).toFixed(1));
  const [displayYears, setDisplayYears] = useState(Math.min(Math.max(5, maxYears), 10));

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-64 bg-slate-800/60 border border-teal-700/30 rounded-xl flex items-center justify-center">
        <p className="text-gray-400 font-semibold">No decay data available</p>
      </div>
    );
  }

  const displayWeeks = displayYears * 52;
  const filteredData = data.filter((d) => d.week <= displayWeeks);

  const pad = { top: 20, right: 24, bottom: 40, left: 48 };
  const W = 520;
  const H = 260;
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const xScale = (week: number) => pad.left + (week / displayWeeks) * innerW;
  const yScale = (load: number) => pad.top + innerH - (load / 100) * innerH;

  const points = filteredData.map((d) => ({
    x: xScale(d.week),
    y: yScale(d.bodyLoad),
    load: d.bodyLoad,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x} ${pad.top + innerH} L ${points[0].x} ${pad.top + innerH} Z`
      : "";

  // Year tick marks spaced sensibly
  const tickStep = displayYears <= 1 ? 0.25 : displayYears <= 3 ? 0.5 : 1;
  const yearTicks: number[] = [];
  for (let y = 0; y <= displayYears + 0.001; y += tickStep) {
    yearTicks.push(parseFloat(y.toFixed(2)));
  }

  return (
    <div className="w-full">
      {/* Header + slider */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className="font-bold text-gray-100 text-xl">PFAS Body Load Over Time</h3>
        <div className="flex items-center gap-3 text-sm text-gray-300">
          <span className="text-gray-400">Simulate:</span>
          <input
            type="range"
            min={5}
            max={maxYears}
            step={0.5}
            value={displayYears}
            onChange={(e) => setDisplayYears(parseFloat(e.target.value))}
            className="w-28 accent-teal-400"
          />
          <span className="text-teal-400 font-bold w-20 text-right">
            {displayYears} yr{displayYears !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-slate-800/80 border border-teal-700/30 rounded-xl p-3 overflow-x-auto">
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto w-full"
        >
          <defs>
            <linearGradient id="decayArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Horizontal grid */}
          {[0, 25, 50, 75, 100].map((val) => (
            <line
              key={`hg-${val}`}
              x1={pad.left}
              y1={yScale(val)}
              x2={W - pad.right}
              y2={yScale(val)}
              stroke="#334155"
              strokeDasharray="4 3"
              strokeWidth="1"
            />
          ))}

          {/* Axes */}
          <line x1={pad.left} y1={pad.top + innerH} x2={W - pad.right} y2={pad.top + innerH} stroke="#475569" strokeWidth="1.5" />
          <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + innerH} stroke="#475569" strokeWidth="1.5" />

          {/* Y labels */}
          {[0, 25, 50, 75, 100].map((val) => (
            <text key={`yl-${val}`} x={pad.left - 6} y={yScale(val) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
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
              fontSize="11"
              fill="#94a3b8"
            >
              {yr === 0 ? "0" : `${yr}y`}
            </text>
          ))}

          {/* Area */}
          {areaPath && <path d={areaPath} fill="url(#decayArea)" />}

          {/* Line */}
          <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Dots — only when few points */}
          {points.length <= 24 &&
            points.map((p, i) => (
              <circle key={`dot-${i}`} cx={p.x} cy={p.y} r="3.5" fill="#10b981" stroke="#0f172a" strokeWidth="1.5" />
            ))}
        </svg>
      </div>

      {/* Summary cards */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="p-4 bg-slate-700/60 rounded-xl border border-teal-700/30">
          <p className="text-gray-400 text-xs font-semibold mb-1 uppercase tracking-wide">Starting Load</p>
          <p className="text-2xl font-bold text-emerald-400">{data[0]?.bodyLoad ?? 0}%</p>
        </div>
        <div className="p-4 bg-slate-700/60 rounded-xl border border-teal-700/30">
          <p className="text-gray-400 text-xs font-semibold mb-1 uppercase tracking-wide">
            After {displayYears} yr{displayYears !== 1 ? "s" : ""}
          </p>
          <p className="text-2xl font-bold text-teal-400">
            {filteredData[filteredData.length - 1]?.bodyLoad ?? 0}%
          </p>
        </div>
      </div>
    </div>
  );
}
