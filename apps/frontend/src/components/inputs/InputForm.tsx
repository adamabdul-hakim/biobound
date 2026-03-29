"use client";

import { useAppStore } from "@/store/appStore";
import { Loader } from "lucide-react";
import ZipCodeInput from "./ZipCodeInput";
import FilterAuditor from "./FilterAuditor";
import CookwareForm from "./CookwareForm";
import DietHabitsForm from "./DietHabitsForm";
import MakeUpUseForm from "./MakeUpUseForm";
import HouseholdForm from "./HouseholdForm";
import ReceiptScanner from "./ReceiptScanner";
import LocationPfasDisplay from "./LocationPfasDisplay";
import { callIntegratedAnalyzeApi } from "@/lib/analyzeIntegration";
import { useRouter } from "next/navigation";

const steps = [
  { title: "Location" },
  { title: "Water Filter" },
  { title: "Cookware" },
  { title: "Diet & Habits" },
  { title: "Personal Care" },
  { title: "Household" },
  { title: "Product Scan", optional: true },
];

const stepComponents = [ZipCodeInput, FilterAuditor, CookwareForm, DietHabitsForm, MakeUpUseForm, HouseholdForm, ReceiptScanner];

const stepHeadings = [
  <>Where do you get your <em style={{ fontStyle: "italic", color: "var(--accent)" }}>tap water</em>?</>,
  <>What water filter <em style={{ fontStyle: "italic", color: "var(--accent)" }}>do you use</em>?</>,
  <>How much of your cookware <em style={{ fontStyle: "italic", color: "var(--accent)" }}>is non-stick</em>?</>,
  <>Which foods do you <em style={{ fontStyle: "italic", color: "var(--accent)" }}>eat regularly</em>?</>,
  <>Your personal care <em style={{ fontStyle: "italic", color: "var(--accent)" }}>product exposure</em></>,
  <>Children in your <em style={{ fontStyle: "italic", color: "var(--accent)" }}>household</em></>,
  <>Scan your <em style={{ fontStyle: "italic", color: "var(--accent)" }}>everyday products</em></>,
];

const stepLeads = [
  "Drinking water is the most variable PFAS source — it can range from near-zero to critically contaminated depending on your location.",
  "Standard pitcher filters don't remove PFAS. NSF-53 or NSF-58 certified filters are the only effective options.",
  "Heat accelerates PFAS leaching. Scratched non-stick pans can release significant PFAS into every meal.",
  "PFAS bioaccumulates in fish, leaches from packaging, and builds up through certain everyday food habits.",
  "PFAS hides in waterproof cosmetics, dry shampoo, and hair products for smoothness and water resistance.",
  "Young children who crawl and mouth objects can ingest up to 10× more PFAS-contaminated dust than adults.",
  "Upload a grocery receipt or paste product names — we OCR the image then Gemini AI flags each item's PFAS risk.",
];

export default function InputForm() {
  const router = useRouter();
  const {
    currentStep,
    zipCode,
    filterModel,
    cookwareUse,
    dietHabits,
    makeUpUse,
    householdProfile,
    receiptScanResult,
    nextStep,
    prevStep,
    setAnalyzeResult,
    setLoading,
    isLoading,
    setError,
  } = useAppStore();

  const CurrentComponent = stepComponents[currentStep - 1] ?? ZipCodeInput;

  const canAdvance = () => {
    if (currentStep === 1) return /^\d{5}$/.test(zipCode);
    if (currentStep === 2) return filterModel?.type !== undefined;
    return true;
  };

  const canAnalyze = () =>
    /^\d{5}$/.test(zipCode) && filterModel?.type !== undefined;

  const handleNextStep = () => {
    if (canAdvance()) nextStep();
  };

  const handleAnalyze = async () => {
    if (!canAnalyze()) {
      setError("Please complete all required fields");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await callIntegratedAnalyzeApi({
        zipCode,
        productScan: null,
        cookwareUse,
        filterModel,
        dietHabits,
        makeUpUse,
        householdProfile,
        receiptScanResult,
      });
      setAnalyzeResult(result);
      router.push("/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const idx = currentStep - 1;

  return (
    <div className="w-full p-6 md:p-8">

      {/* Progress dots */}
      <div className="progress-dots">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`dot${i < idx ? " done" : i === idx ? " active" : ""}`}
          />
        ))}
      </div>

      {/* Eyebrow + serif heading + lead */}
      <p className="eyebrow" style={{ marginBottom: 12 }}>
        Step {currentStep} of {steps.length} · {steps[idx]?.title}
      </p>
      <h2 className="heading-serif" style={{ fontSize: "clamp(22px,3vw,30px)", marginBottom: 10 }}>
        {stepHeadings[idx]}
      </h2>
      <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.7, marginBottom: 28 }}>
        {stepLeads[idx]}
      </p>

      {/* Step card */}
      <div className="card-bb" style={{ marginBottom: 24 }}>
        <CurrentComponent />
        {currentStep === 1 && (
          <div className="mt-6 pt-5" style={{ borderTop: "0.5px solid var(--border)" }}>
            <LocationPfasDisplay />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="nav-buttons">
        <button
          onClick={prevStep}
          disabled={currentStep === 1 || isLoading}
          className="btn-ghost-bb"
          style={{ opacity: currentStep === 1 || isLoading ? 0.4 : 1, cursor: currentStep === 1 || isLoading ? "not-allowed" : "pointer" }}
        >
          ← Back
        </button>

        {currentStep < steps.length ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* When the next step is optional, offer a direct skip to results */}
            {steps[currentStep]?.optional && (
              <button
                onClick={handleAnalyze}
                disabled={!canAnalyze() || isLoading}
                className="btn-ghost-bb"
                style={{ opacity: !canAnalyze() || isLoading ? 0.4 : 1, cursor: !canAnalyze() || isLoading ? "not-allowed" : "pointer" }}
              >
                Skip to Results
              </button>
            )}
            <button
              onClick={handleNextStep}
              disabled={!canAdvance() || isLoading}
              className="btn-primary"
              style={{ opacity: !canAdvance() || isLoading ? 0.4 : 1, cursor: !canAdvance() || isLoading ? "not-allowed" : "pointer" }}
            >
              Next: {steps[currentStep]?.title} →
            </button>
          </div>
        ) : (
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze() || isLoading}
            className="btn-primary"
            style={{ opacity: !canAnalyze() || isLoading ? 0.4 : 1, cursor: !canAnalyze() || isLoading ? "not-allowed" : "pointer" }}
          >
            {isLoading ? (
              <><Loader className="w-4 h-4 animate-spin" /> Analyzing...</>
            ) : (
              <>View Results →</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
