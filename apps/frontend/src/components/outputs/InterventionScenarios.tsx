"use client";

import { Scenario } from "@/store/appStore";
import { TrendingDown } from "lucide-react";

interface InterventionScenariosProps {
  scenarios: Scenario[] | null;
}

export default function InterventionScenarios({
  scenarios,
}: InterventionScenariosProps) {
  if (!scenarios || scenarios.length === 0) {
    return (
      <div className="w-full p-6 bg-gray-50 rounded-xl text-gray-600 text-sm border border-gray-200">
        No intervention scenarios available
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="font-bold text-gray-900 mb-6 text-xl flex items-center gap-2">
        <TrendingDown className="w-5 h-5 text-emerald-600" />
        What-If Scenarios
      </h3>

      <div className="grid md:grid-cols-2 gap-4">
        {scenarios.map((scenario, idx) => (
          <div
            key={idx}
            className="p-5 border-2 border-emerald-100 rounded-xl bg-white hover:shadow-lg hover:border-emerald-400 transition-all cursor-pointer group"
          >
            <h4 className="font-bold text-gray-900 mb-2 group-hover:text-emerald-700 transition">
              {scenario.label}
            </h4>
            <p className="text-sm text-gray-600 mb-4">{scenario.description}</p>

            {/* Mini decay curve for this scenario */}
            <div className="mt-3 h-20 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border-2 border-emerald-100 relative p-2">
              {scenario.data.length > 0 && (
                <svg
                  viewBox="0 0 200 60"
                  className="w-full h-full"
                  preserveAspectRatio="none"
                >
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

            <div className="mt-3 text-xs font-semibold text-gray-700">
              <p>
                📅 Duration: {scenario.data[scenario.data.length - 1]?.week ?? 0}{" "}
                weeks
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
