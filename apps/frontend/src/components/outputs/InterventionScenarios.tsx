"use client";

import { Scenario } from "@/store/appStore";
import { TrendingDown } from "lucide-react";

interface InterventionScenariosProps {
  scenarios: Scenario[] | null;
}

function weeksToYearsLabel(weeks: number): string {
  const years = weeks / 52;
  if (years < 1) return `${Math.round(weeks)}w`;
  return `${parseFloat(years.toFixed(1))}yr`;
}

export default function InterventionScenarios({
  scenarios,
}: InterventionScenariosProps) {
  if (!scenarios || scenarios.length === 0) {
    return (
      <div className="w-full p-6 bg-slate-800/60 rounded-xl text-gray-400 text-sm border border-teal-700/30">
        No intervention scenarios available
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="font-bold text-gray-100 mb-6 text-xl flex items-center gap-2">
        <TrendingDown className="w-5 h-5 text-emerald-400" />
        What-If Scenarios
      </h3>

      <div className="grid md:grid-cols-2 gap-4">
        {scenarios.map((scenario, idx) => (
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
              {scenario.data.length > 0 && (
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
                      ...scenario.data.map((d, i) => {
                        const x = (i / (scenario.data.length - 1 || 1)) * 200;
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
                    points={scenario.data
                      .map((d, i) => {
                        const x = (i / (scenario.data.length - 1 || 1)) * 200;
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
                Start: <span className="text-emerald-400">{scenario.data[0]?.bodyLoad ?? 0}%</span>
              </span>
              <span>
                End: <span className="text-teal-400">{scenario.data[scenario.data.length - 1]?.bodyLoad ?? 0}%</span>
              </span>
              <span>
                📅 {weeksToYearsLabel(scenario.data[scenario.data.length - 1]?.week ?? 0)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
