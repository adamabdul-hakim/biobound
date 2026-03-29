"use client";

import { useAppStore } from "@/store/appStore";
import { Loader } from "lucide-react";
import ZipCodeInput from "./ZipCodeInput";
import FilterAuditor from "./FilterAuditor";
import ProductScanner from "./ProductScanner";
import CookwareForm from "./CookwareForm";
import DietHabitsForm from "./DietHabitsForm";
import MakeUpUseForm from "./MakeUpUseForm";
import { callIntegratedAnalyzeApi } from "@/lib/analyzeIntegration";
import { useRouter } from "next/navigation";

const steps = [
  { title: "Zip Code", component: ZipCodeInput },
  { title: "Water Filter", component: FilterAuditor },
  { title: "Product Scan", component: ProductScanner },
  { title: "Cookware Use", component: CookwareForm },
  { title: "Diet & Habits", component: DietHabitsForm },
  { title: "Makeup Use", component: MakeUpUseForm },
];

export default function InputForm() {
  const router = useRouter();
  const {
    currentStep,
    zipCode,
    filterModel,
    productScan,
    cookwareUse,
    dietHabits,
    makeUpUse,
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
    if (currentStep === 2) return (filterModel?.type ?? "").trim().length > 0;
    if (currentStep === 3) return true; // Product scan is optional
    if (currentStep === 4) return cookwareUse !== null;
    if (currentStep === 5) return dietHabits !== null;
    if (currentStep === 6) return makeUpUse !== null;
    return true;
  };

  const canAnalyze = () => {
    return (
      /^\d{5}$/.test(zipCode) &&
      (filterModel?.type ?? "").trim().length > 0 &&
      cookwareUse !== null &&
      dietHabits !== null &&
      makeUpUse !== null
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
        makeUpUse,
      };

      const result = await callIntegratedAnalyzeApi(payload);
      setAnalyzeResult(result);

      // Navigate to results page
      router.push("/results");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Analysis failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Mobile-First Progress Section */}
      <div className="mb-8">
        {/* Progress Header with percentage */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-1">
              Assessment Progress
            </h3>
            <p className="text-xs text-gray-500">Step {currentStep} of {steps.length}</p>
          </div>
          <div className="text-2xl font-bold text-teal-400">
            {Math.round((currentStep / steps.length) * 100)}%
          </div>
        </div>
        
        {/* Enhanced Progress Bar */}
        <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden border border-teal-700/20">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-teal-500 to-emerald-500 shadow-lg shadow-teal-500/50"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>

        {/* Compact Step Badges */}
        <div className="grid grid-cols-6 gap-1.5 mt-4">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="relative group"
              title={step.title}
            >
              <div
                className={`w-full aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  idx + 1 === currentStep
                    ? "bg-teal-500 text-white ring-2 ring-teal-300 scale-110 shadow-lg shadow-teal-500/50"
                    : idx + 1 < currentStep
                      ? "bg-emerald-600/80 text-white"
                      : "bg-slate-700/70 text-gray-400"
                }`}
              >
                {idx + 1 === currentStep ? "◉" : idx + 1 < currentStep ? "✓" : idx + 1}
              </div>
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none mb-1 bg-slate-800 px-2 py-1 rounded">
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Title with Description */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent mb-2">
          {steps[currentStep - 1]?.title}
        </h2>
        <p className="text-gray-400 text-sm md:text-base">
          {currentStep === 1 && "Where are you located? We'll check local water quality data."}
          {currentStep === 2 && "What type of water filter do you use?"}
          {currentStep === 3 && "Optional: Scan a product to check ingredients"}
          {currentStep === 4 && "How much of your cookware is non-stick coated?"}
          {currentStep === 5 && "Which foods do you eat regularly & any medications?"}
          {currentStep === 6 && "How frequently do you use makeup products?"}
        </p>
      </div>

      {/* Current Step Component - Improved spacing */}
      <div className="mb-10 p-6 md:p-8 bg-slate-700/50 rounded-xl border border-teal-700/30 backdrop-blur-sm">
        <CurrentComponent />
      </div>

      {/* Enhanced Navigation - Mobile Optimized */}
      <div className="flex flex-col-reverse md:flex-row items-stretch md:items-center justify-between gap-3 pt-6 border-t border-teal-700/30">
        <button
          onClick={prevStep}
          disabled={currentStep === 1 || isLoading}
          className="md:flex-1 group flex items-center justify-center gap-2 px-4 md:px-5 py-3 md:py-4 border-2 border-teal-700/50 text-gray-300 rounded-xl font-semibold hover:border-teal-600 hover:bg-teal-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
        >
          <span>← Back</span>
        </button>

        {currentStep < steps.length ? (
          <button
            onClick={handleNextStep}
            disabled={!canAdvance() || isLoading}
            className="md:flex-1 group flex items-center justify-center gap-2 px-6 md:px-5 py-3 md:py-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-teal-500 hover:to-emerald-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 active:scale-95"
          >
            <span>Continue →</span>
          </button>
        ) : (
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze() || isLoading}
            className="md:flex-1 group flex items-center justify-center gap-2 px-6 md:px-5 py-3 md:py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-teal-400 hover:to-emerald-400 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 active:scale-95"
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <span>View Results</span>
                <span>→</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
