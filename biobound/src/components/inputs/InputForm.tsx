"use client";

import { useAppStore } from "@/store/appStore";
import { ChevronLeft, ChevronRight, Loader } from "lucide-react";
import ZipCodeInput from "./ZipCodeInput";
import FilterAuditor from "./FilterAuditor";
import ProductScanner from "./ProductScanner";
import CookwareForm from "./CookwareForm";
import DietHabitsForm from "./DietHabitsForm";
import { calculateWaterScore } from "@/lib/scoring";
import { useRouter } from "next/navigation";
import { useState } from "react";

const steps = [
  { title: "Zip Code", component: ZipCodeInput },
  { title: "Water Filter", component: FilterAuditor },
  { title: "Product Scan", component: ProductScanner },
  { title: "Cookware Use", component: CookwareForm },
  { title: "Diet & Habits", component: DietHabitsForm },
];

// Mock API call — replace with actual Team B endpoint
async function callAnalysisAPI(payload: any) {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Mock response data
  return {
    reiScore: Math.round(Math.random() * 100),
    filterWarning:
      payload.filterModel.type === "none"
        ? "Your filter is not NSF certified for PFAS removal. Consider upgrading to an NSF-53 or NSF-58 filter."
        : null,
    pfasFlags: [
      {
        compound: "PFOA",
        tier: (Math.random() > 0.5 ? "high" : "medium") as "low" | "medium" | "high",
      },
      {
        compound: "PFOS",
        tier: (Math.random() > 0.5 ? "high" : "medium") as "low" | "medium" | "high",
      },
    ] as any,
    decayCurve: Array.from({ length: 13 }, (_, i) => ({
      week: i * 4,
      bodyLoad: Math.max(0, 100 - i * 8 + Math.random() * 10),
    })),
    interventionModel: [
      {
        label: "Current Trajectory",
        description: "Without dietary changes or interventions",
        data: Array.from({ length: 13 }, (_, i) => ({
          week: i * 4,
          bodyLoad: Math.max(0, 100 - i * 6),
        })),
      },
      {
        label: "With Fiber Intervention",
        description: "Adding 15g daily soluble fiber",
        data: Array.from({ length: 13 }, (_, i) => ({
          week: i * 4,
          bodyLoad: Math.max(0, 100 - i * 9),
        })),
      },
    ],
    medWarnings: [
      "If taking metformin, consult your doctor before increasing fiber intake significantly.",
    ],
    mitigationPlan: [
      {
        tier: 1 as 1 | 2 | 3,
        description: "Zero-cost actions you can start today",
        cost: "Free",
        actions: [
          "Use filtered water for drinking and cooking",
          "Switch to glass or ceramic cookware",
          "Avoid microwave popcorn and processed foods in PFAS-lined packaging",
        ],
      },
      {
        tier: 2 as 1 | 2 | 3,
        description: "Low-cost improvements ($20-$100)",
        cost: "$50-$100",
        actions: [
          "Install an NSF-53 certified pitcher filter",
          "Buy cast iron or stainless steel cookware",
          "Add high-fiber foods to your diet",
        ],
      },
      {
        tier: 3 as 1 | 2 | 3,
        description: "Long-term high-impact solutions",
        cost: "$200-$500",
        actions: [
          "Install a whole-house carbon water filter",
          "Consider professional air filtration (HEPA)",
          "Work with a nutritionist on PFAS-reducing diet",
        ],
      },
    ],
  };
}

export default function InputForm() {
  const router = useRouter();
  const {
    currentStep,
    zipCode,
    filterModel,
    productScan,
    cookwareUse,
    dietHabits,
    nextStep,
    prevStep,
    setAnalyzeResult,
    setLoading,
    isLoading,
    setError,
  } = useAppStore();

  const CurrentComponent = steps[currentStep - 1]?.component || ZipCodeInput;

  const canAdvance = () => {
    if (currentStep === 1) return /^\d{5}$/.test(zipCode);
    if (currentStep === 2) return filterModel?.type !== undefined;
    return true;
  };

  const canAnalyze = () => {
    return (
      /^\d{5}$/.test(zipCode) &&
      filterModel?.type !== undefined &&
      cookwareUse !== null &&
      dietHabits !== null
    );
  };

  const handleNextStep = () => {
    if (canAdvance()) {
      nextStep();
    }
  };

  const handleAnalyze = async () => {
    if (!canAnalyze()) {
      setError("Please complete all required fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        zipCode,
        productScan,
        cookwareUse,
        filterModel,
        dietHabits,
      };

      const result = await callAnalysisAPI(payload);
      setAnalyzeResult(result);

      // Navigate to results page
      router.push("/results");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Analysis failed. Please try again."
      );
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className={`text-xs font-medium ${
                idx + 1 <= currentStep ? "text-blue-600" : "text-gray-400"
              }`}
            >
              Step {idx + 1}
            </div>
          ))}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step title */}
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        {steps[currentStep - 1]?.title}
      </h2>

      {/* Current step component */}
      <div className="mb-8">
        <CurrentComponent />
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={prevStep}
          disabled={currentStep === 1 || isLoading}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <div className="text-sm text-gray-600">
          {currentStep} of {steps.length}
        </div>

        {currentStep < steps.length ? (
          <button
            onClick={handleNextStep}
            disabled={!canAdvance() || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze() || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <ChevronRight className="w-4 h-4" />
                View Results
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
