"use client";

import InputForm from "@/components/inputs/InputForm";
import ForeverScaleGauge from "@/components/gauge/ForeverScaleGauge";
import { useAppStore } from "@/store/appStore";
import { useEffect, useState } from "react";
import { calculateWaterScore } from "@/lib/scoring";

export default function Home() {
  const { zipCode, filterModel, reiScore, currentStep } = useAppStore();
  const [previewScore, setPreviewScore] = useState<number | null>(null);

  // Update preview score when zip or filter changes (Phase 2: Task 2.3)
  useEffect(() => {
    if (zipCode && filterModel?.type && currentStep >= 2) {
      const result = calculateWaterScore(zipCode, filterModel.type);
      setPreviewScore(result.score);
    } else {
      setPreviewScore(null);
    }
  }, [zipCode, filterModel, currentStep]);

  const displayScore = reiScore ?? previewScore ?? 0;

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
                {previewScore !== null ? "Preview Score" : "REI Score"}
              </h2>
              <ForeverScaleGauge
                score={displayScore}
                status={getStatus(displayScore)}
              />
              {previewScore !== null && currentStep >= 2 && (
                <p className="text-xs text-gray-500 text-center mt-4">
                  This is a preview based on EPA water quality data and your
                  filter selection. Your final score will include other factors.
                </p>
              )}
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
