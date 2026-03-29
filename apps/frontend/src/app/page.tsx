"use client";

import InputForm from "@/components/inputs/InputForm";
import ForeverScaleGauge from "@/components/gauge/ForeverScaleGauge";
import { useAppStore } from "@/store/appStore";

export default function Home() {
  const { reiScore } = useAppStore();
  const displayScore = reiScore ?? 0;

  const getStatus = (score: number): string => {
    if (score < 33) return "safe";
    if (score < 67) return "caution";
    return "danger";
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">BioBound</h1>
          <p className="text-lg text-gray-600">
            Understand your PFAS exposure and take action
          </p>
        </div>

        {/* Two-column layout: Form on left, Gauge preview on right */}
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Input form (2/3 width on large screens) */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-8">
              <InputForm />
            </div>
          </div>

          {/* Gauge preview (1/3 width on large screens) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                REI Score
              </h2>
              <ForeverScaleGauge
                score={displayScore}
                status={getStatus(displayScore)}
              />
              <p className="text-xs text-gray-500 text-center mt-4">
                Score is shown after running full backend analysis.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-600">
          <p>Phase 1 & 2: Foundation & Hydrology Engine</p>
        </div>
      </div>
    </main>
  );
}
