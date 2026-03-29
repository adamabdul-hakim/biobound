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
      <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            No Results Available
          </h1>
          <p className="text-gray-600 mb-6">
            Please complete the assessment form first.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Back to Assessment
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
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
      <ErrorBanner error={error} onClose={() => setError(null)} />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Assessment
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Your PFAS Exposure Results
          </h1>
          <p className="text-lg text-gray-600">
            Personalized analysis for ZIP {zipCode}
          </p>
        </div>

        {/* Primary Score Card */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Your REI Score
              </h2>
              <ForeverScaleGauge
                score={reiScore}
                status={getStatus(reiScore)}
              />
              <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
                <p className="font-medium mb-2">What This Means:</p>
                <p>
                  {reiScore < 33
                    ? "Your PFAS exposure is relatively low, but continued monitoring is recommended."
                    : reiScore < 67
                      ? "Your PFAS exposure is moderate. Review the mitigation strategies below."
                      : "Your PFAS exposure is high. Take immediate action using the recommended strategies."}
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
            <section className="bg-white border border-gray-300 rounded-lg p-6">
              <AdvocacyLetter
                zipCode={zipCode}
                reiScore={reiScore}
                filterType={filterModel?.type || "unknown"}
              />
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-600 border-t pt-8">
          <p>
            This assessment is based on current EPA data and your inputs. For
            medical concerns, consult your healthcare provider.
          </p>
        </div>
      </div>
    </main>
  );
}
