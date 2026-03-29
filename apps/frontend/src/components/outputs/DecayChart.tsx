"use client";

import { DecayPoint } from "@/store/appStore";

interface DecayChartProps {
  data: DecayPoint[] | null;
}

export default function DecayChart({ data }: DecayChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-64 bg-gray-50 border-2 border-gray-200 rounded-xl flex items-center justify-center">
        <p className="text-gray-600 font-semibold">No decay data available</p>
      </div>
    );
  }

  const maxWeek = Math.max(...data.map((d) => d.week), 52);
  const padding = 40;
  const chartWidth = 500;
  const chartHeight = 300;

  const xScale = (week: number) => padding + (week / maxWeek) * (chartWidth - 2 * padding);
  const yScale = (load: number) => chartHeight - padding - (load / 100) * (chartHeight - 2 * padding);

  const points = data.map((d) => ({
    x: xScale(d.week),
    y: yScale(d.bodyLoad),
    week: d.week,
    load: d.bodyLoad,
  }));

  const pathData = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <div className="w-full">
      <h3 className="font-bold text-gray-900 mb-6 text-xl">PFAS Body Load Decay</h3>
      <div className="bg-gradient-to-br from-white to-emerald-50 border-2 border-emerald-100 rounded-xl p-6 overflow-x-auto shadow-sm">
        <svg
          width={chartWidth + 40}
          height={chartHeight}
          viewBox={`0 0 ${chartWidth + 40} ${chartHeight}`}
          className="mx-auto"
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((val) => (
            <line
              key={`h-${val}`}
              x1={padding}
              y1={yScale(val)}
              x2={chartWidth - padding}
              y2={yScale(val)}
              stroke="#e5e7eb"
              strokeDasharray="4"
              strokeWidth="1"
            />
          ))}

          {/* Axes */}
          <line
            x1={padding}
            y1={chartHeight - padding}
            x2={chartWidth - padding}
            y2={chartHeight - padding}
            stroke="#374151"
            strokeWidth="2"
          />
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={chartHeight - padding}
            stroke="#374151"
            strokeWidth="2"
          />

          {/* Y-axis labels */}
          {[0, 25, 50, 75, 100].map((val) => (
            <text
              key={`label-y-${val}`}
              x={padding - 10}
              y={yScale(val) + 4}
              textAnchor="end"
              fontSize="12"
              fill="#6b7280"
            >
              {val}%
            </text>
          ))}

          {/* X-axis labels */}
          {[0, 13, 26, 39, 52].map((week) => (
            <text
              key={`label-x-${week}`}
              x={xScale(week)}
              y={chartHeight - 15}
              textAnchor="middle"
              fontSize="12"
              fill="#6b7280"
            >
              {week}w
            </text>
          ))}

          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {points.map((p, i) => (
            <circle
              key={`point-${i}`}
              cx={p.x}
              cy={p.y}
              r="4"
              fill="#10b981"
              stroke="white"
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
          <p className="text-gray-700 font-semibold text-xs mb-1">Current Load</p>
          <p className="text-2xl font-bold text-emerald-700">
            {data[0]?.bodyLoad ?? 0}%
          </p>
        </div>
        <div className="p-4 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl border border-teal-200">
          <p className="text-gray-700 font-semibold text-xs mb-1">After {maxWeek}w</p>
          <p className="text-2xl font-bold text-teal-700">
            {data[data.length - 1]?.bodyLoad ?? 0}%
          </p>
        </div>
      </div>
    </div>
  );
}
