"use client";

import { useState } from "react";
import { Scenario } from "@/store/appStore";
import { TrendingDown } from "lucide-react";

interface InterventionScenariosProps {
  scenarios: Scenario[] | null;
}

export default function InterventionScenarios({
  scenarios,
}: InterventionScenariosProps) {
  // Shared year slider — same UX as the main DecayChart
  const maxDataYears = scenarios
    ? Math.max(...scenarios.flatMap((s) => s.data.map((d) => d.week / 52)), 10)
    : 10;
  const [displayYears, setDisplayYears] = useState(Math.min(10, maxDataYears));

  if (!scenarios || scenarios.length === 0) {
    return (
      <div className="w-full p-6 bg-slate-800/60 rounded-xl text-gray-400 text-sm border border-teal-700/30">
        No intervention scenarios available
      </div>
    );
  }

  const displayWeeks = displayYears * 52;

  return (
    <div className="w-full">
      {/* Header + shared slider */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h3 className="font-bold text-gray-100 text-xl flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-emerald-400" />
          What-If Scenarios
        </h3>
        <div className="flex items-center gap-3 text-sm text-gray-300">
          <span className="text-gray-400 text-xs">Simulate:</span>
          <input
            type="range"
            min={5}
            max={Math.floor(maxDataYears)}
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

      <div className="grid md:grid-cols-2 gap-4">
        {scenarios.map((scenario, idx) => {
          const filtered = scenario.data.filter((d) => d.week <= displayWeeks);
          const visibleData = filtered.length > 0 ? filtered : scenario.data.slice(0, 1);
          const endPoint = visibleData[visibleData.length - 1];
          const startLoad = scenario.data[0]?.bodyLoad ?? 0;
          const endLoad = endPoint?.bodyLoad ?? 0;
          const endYears = parseFloat(((endPoint?.week ?? 0) / 52).toFixed(1));

          return (
            <div
              key={idx}
              className="p-5 border border-teal-700/40 rounded-xl bg-slate-800/70 hover:border-teal-500/70 hover:bg-slate-700/70 transition-all cursor-pointer group"
            >
              <h4 className="font-bold text-gray-100 mb-2 group-hover:text-teal-300 transition">
                {scenario.label}
              </h4>
              <p className="text-sm text-gray-400 mb-4">{scenario.description}</p>

              {/* Mini decay curve */}
              <div className="mt-3 h-20 bg-slate-900/60 rounded-lg border border-teal-700/30 relative p-2">
                {visibleData.length > 0 && (
                  <svg
                    viewBox="0 0 200 60"
                    className="w-full h-full"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id={`mini-grad-${idx}`} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Area */}
                    <polyline
                      points={[
                        ...visibleData.map((d, i) => {
                          const x = (i / (visibleData.length - 1 || 1)) * 200;
                          const y = 60 - (d.bodyLoad / 100) * 60;
                          return `${x},${y}`;
                        }),
                        "200,60",
                        "0,60",
                      ].join(" ")}
                      fill={`url(#mini-grad-${idx})`}
                    />
                    {/* Line */}
                    <polyline
                      points={visibleData
                        .map((d, i) => {
                          const x = (i / (visibleData.length - 1 || 1)) * 200;
                          const y = 60 - (d.bodyLoad / 100) * 60;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                    />
                  </svg>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between text-xs font-semibold text-gray-400">
                <span>
                  Start: <span className="text-emerald-400">{startLoad}%</span>
                </span>
                <span>
                  End: <span className="text-teal-400">{endLoad}%</span>
                </span>
                <span>
                  📅 {endYears}yr
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
