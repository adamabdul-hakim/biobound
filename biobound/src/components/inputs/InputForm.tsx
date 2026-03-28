"use client";

import { useAppStore } from "@/store/appStore";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ZipCodeInput from "./ZipCodeInput";
import FilterAuditor from "./FilterAuditor";
import ProductScanner from "./ProductScanner";
import CookwareForm from "./CookwareForm";
import DietHabitsForm from "./DietHabitsForm";
import { calculateWaterScore } from "@/lib/scoring";

const steps = [
  { title: "Zip Code", component: ZipCodeInput },
  { title: "Water Filter", component: FilterAuditor },
  { title: "Product Scan", component: ProductScanner },
  { title: "Cookware Use", component: CookwareForm },
  { title: "Diet & Habits", component: DietHabitsForm },
];

export default function InputForm() {
  const {
    currentStep,
    zipCode,
    filterModel,
    nextStep,
    prevStep,
    setReiScore,
  } = useAppStore();

  const CurrentComponent = steps[currentStep - 1]?.component || ZipCodeInput;

  const canAdvance = () => {
    if (currentStep === 1) return /^\d{5}$/.test(zipCode);
    if (currentStep === 2) return filterModel?.type !== undefined;
    return true;
  };

  const handleNextStep = () => {
    // After step 2, calculate preview score
    if (currentStep === 2 && zipCode && filterModel?.type) {
      const result = calculateWaterScore(zipCode, filterModel.type);
      // Store as preview (we'll use interim state to track this)
      // For now, just advance
    }
    if (canAdvance()) {
      nextStep();
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
          disabled={currentStep === 1}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <div className="text-sm text-gray-600">
          {currentStep} of {steps.length}
        </div>

        <button
          onClick={handleNextStep}
          disabled={!canAdvance()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          {currentStep === steps.length ? "Complete" : "Next"}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
