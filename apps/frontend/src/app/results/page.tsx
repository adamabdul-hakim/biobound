"use client";

import { useAppStore } from "@/store/appStore";
import ForeverScaleGauge from "@/components/gauge/ForeverScaleGauge";
import FilterWarningBanner from "@/components/outputs/FilterWarningBanner";
import PfasFlagList from "@/components/outputs/PfasFlagList";
import DecayChart from "@/components/outputs/DecayChart";
import InterventionScenarios from "@/components/outputs/InterventionScenarios";
import MedWarningList from "@/components/outputs/MedWarningList";
import MitigationPlanTiles from "@/components/outputs/MitigationPlanTiles";
import AdvocacyLetter from "@/components/outputs/AdvocacyLetter";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function ResultsPage() {
  const router = useRouter();
  const {
    reiScore,
    filterWarning,
    pfasFlags,
    decayCurve,
    interventionModel,
    medWarnings,
    mitigationPlan,
    zipCode,
    filterModel,
    error,
    setError,
  } = useAppStore();

  if (reiScore === null) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900">
        <div className="max-w-2xl mx-auto text-center py-20 px-4">
          <div className="mb-6 text-6xl">🏥</div>
          <h1 className="text-4xl font-bold text-gray-100 mb-4">
            No Assessment Yet
          </h1>
          <p className="text-gray-400 mb-8 text-lg">
            Complete the assessment form to discover your personalized PFAS exposure insights
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-teal-600 hover:to-emerald-600 transition-all duration-200 active:scale-95"
          >
            Start Assessment
          </button>
        </div>
      </main>
    );
  }

  const getStatus = (score: number): string => {
    if (score < 33) return "safe";
    if (score < 67) return "caution";
    return "danger";
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900">
      <ErrorBanner error={error} onClose={() => setError(null)} />

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 mb-6 font-semibold transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            New Assessment
          </button>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-teal-300 via-emerald-300 to-teal-200 bg-clip-text text-transparent mb-3">
            Your PFAS Exposure Profile
          </h1>
          <p className="text-lg text-gray-400">
            Comprehensive analysis for ZIP {zipCode}
          </p>
        </div>

        {/* Primary Score Card + Output Components Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {/* Sticky Score Card */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 sticky top-8 border border-teal-700/30">
              <h2 className="text-lg font-bold text-gray-100 mb-6">
                Your REI Score
              </h2>
              <ForeverScaleGauge
                score={reiScore}
                status={getStatus(reiScore)}
              />
              <div className="mt-8 p-4 bg-gradient-to-br from-teal-900/40 to-emerald-900/40 rounded-xl text-sm text-gray-200 border border-teal-700/40">
                <p className="font-bold mb-2 text-teal-300">What This Means:</p>
                <p className="leading-relaxed">
                  {reiScore < 33
                    ? "✓ Your PFAS level is favorable. Maintain current protective measures and monitor ongoing exposure sources."
                    : reiScore < 67
                      ? "⚠ Your exposure warrants attention. Review mitigation strategies to reduce PFAS intake."
                      : "⚠ High exposure detected. Prioritize the recommended interventions to reduce PFAS burden."}
                </p>
              </div>
            </div>
          </div>

          {/* Output Components */}
          <div className="lg:col-span-2 space-y-8">
            {/* Filter Warning */}
            {filterWarning && (
              <FilterWarningBanner message={filterWarning} />
            )}

            {/* PFAS Flags */}
            <section>
              <PfasFlagList flags={pfasFlags} />
            </section>

            {/* Decay Chart */}
            <section>
              <DecayChart data={decayCurve} />
            </section>

            {/* Intervention Scenarios */}
            <section>
              <InterventionScenarios scenarios={interventionModel} />
            </section>

            {/* Med Warnings */}
            <section>
              <MedWarningList warnings={medWarnings} />
            </section>

            {/* Mitigation Plan */}
            <section>
              <MitigationPlanTiles plan={mitigationPlan} />
            </section>

            {/* Advocacy Letter */}
            <section className="bg-slate-800/80 backdrop-blur-xl rounded-2xl p-8 border border-teal-700/30 shadow-2xl">
              <AdvocacyLetter
                zipCode={zipCode}
                reiScore={reiScore}
                filterType={filterModel?.type || "unknown"}
              />
            </section>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 border-t border-teal-700/30 pt-12 text-center text-sm text-gray-400">
          <p className="mb-4">
            This assessment is science-backed using EPA data. For health concerns, consult your healthcare provider.
          </p>
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 px-6 py-2 text-teal-400 hover:text-teal-300 font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Start New Assessment
          </button>
        </footer>
      </div>
    </main>
  );
}
