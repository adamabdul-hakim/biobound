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
      <div className="w-full p-4 bg-gray-50 rounded-lg text-gray-600 text-sm">
        No intervention scenarios available
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <TrendingDown className="w-5 h-5 text-green-600" />
        What-If Scenarios
      </h3>

      <div className="grid md:grid-cols-2 gap-4">
        {scenarios.map((scenario, idx) => (
          <div
            key={idx}
            className="p-4 border border-gray-300 rounded-lg bg-white hover:shadow-md transition"
          >
            <h4 className="font-semibold text-gray-900 mb-2">
              {scenario.label}
            </h4>
            <p className="text-sm text-gray-600 mb-3">{scenario.description}</p>

            {/* Mini decay curve for this scenario */}
            <div className="mt-3 h-20 bg-gray-50 rounded border border-gray-200 relative p-2">
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
                    stroke="#3b82f6"
                    strokeWidth="2"
                  />
                </svg>
              )}
            </div>

            <div className="mt-3 text-xs text-gray-600">
              <p>
                Duration: {scenario.data[scenario.data.length - 1]?.week ?? 0}{" "}
                weeks
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
