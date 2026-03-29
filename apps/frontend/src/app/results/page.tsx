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
import GeminiRecommendations from "@/components/outputs/GeminiRecommendations";
import WeeklyGroceryScan from "@/components/outputs/WeeklyGroceryScan";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
    cookwareUse,
    dietHabits,
    makeUpUse,
    error,
    setError,
  } = useAppStore();

  if (reiScore === null) {
    return (
      <main style={{ background: "var(--bg)", color: "var(--text)", fontFamily: "var(--sans)" }} className="min-h-screen">
        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", padding: "120px 24px" }}>
          <p style={{ fontFamily: "var(--mono)", fontSize: 40, marginBottom: 20 }}>—</p>
          <h1 className="heading-serif" style={{ fontSize: 36, marginBottom: 16 }}>No Assessment Yet</h1>
          <p style={{ fontSize: 15, color: "var(--text2)", marginBottom: 36, lineHeight: 1.65 }}>
            Complete the assessment to discover your personalized PFAS exposure insights.
          </p>
          <Link href="/audit" className="btn-primary" style={{ textDecoration: "none", fontSize: 15 }}>
            Start the audit →
          </Link>
        </div>
      </main>
    );
  }

  const getStatus = (score: number): string => {
    if (score < 33) return "safe";
    if (score < 67) return "caution";
    return "danger";
  };

  const statusColor = reiScore < 33 ? "var(--safe)" : reiScore < 67 ? "var(--warn)" : "var(--danger)";
  const statusLabel = reiScore < 33 ? "Low Exposure" : reiScore < 67 ? "Moderate Exposure" : "High Exposure";

  return (
    <main style={{ background: "var(--bg)", color: "var(--text)", fontFamily: "var(--sans)" }} className="min-h-screen">

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 32px",
        background: "rgba(13,15,14,0.88)",
        backdropFilter: "blur(12px)",
        borderBottom: "0.5px solid var(--border)",
      }}>
        <Link href="/" style={{ fontFamily: "var(--mono)", fontSize: 15, color: "var(--accent)", letterSpacing: "0.04em", textDecoration: "none" }}>
          BIO//BOUND
        </Link>
        <Link href="/audit" style={{
          fontFamily: "var(--mono)", fontSize: 12, color: "var(--text2)",
          border: "0.5px solid var(--border2)", borderRadius: 20,
          padding: "6px 16px", textDecoration: "none",
        }}>
          ← New Audit
        </Link>
      </nav>

      <ErrorBanner error={error} onClose={() => setError(null)} />

      {/* ── HEADER ── */}
      <div style={{ paddingTop: 100, paddingBottom: 32, paddingLeft: 24, paddingRight: 24 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <p className="eyebrow" style={{ marginBottom: 10 }}>Your Forever Scale Result</p>
          <h1 className="heading-serif" style={{ fontSize: "clamp(28px,4vw,48px)", marginBottom: 8 }}>
            Your PFAS Exposure Profile
          </h1>
          <p style={{ fontSize: 14, color: "var(--text2)" }}>
            Comprehensive analysis for ZIP {zipCode}
          </p>
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px" }}>
        <div className="lg:grid lg:grid-cols-3 lg:gap-8" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* ── SCORE CARD (sticky) ── */}
          <div>
            <div style={{
              background: "var(--surface)",
              border: "0.5px solid var(--border)",
              borderRadius: 20,
              padding: "32px 28px",
              position: "sticky",
              top: 80,
            }}>
              <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20 }}>
                Body Burden Score
              </p>
              <ForeverScaleGauge score={reiScore} status={getStatus(reiScore)} />

              {/* Scale bar */}
              <div style={{ marginTop: 24 }}>
                <div style={{
                  background: "linear-gradient(to right, var(--safe), var(--warn), var(--danger))",
                  borderRadius: 6, height: 6, position: "relative", marginBottom: 8,
                }}>
                  <div style={{
                    position: "absolute", top: -20, left: `${reiScore}%`, transform: "translateX(-50%)",
                    fontFamily: "var(--mono)", fontSize: 10, color: statusColor, whiteSpace: "nowrap",
                  }}>
                    ▼ {reiScore}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: 10, color: "var(--text3)" }}>
                  <span>0 · Clean</span>
                  <span>50 · Avg</span>
                  <span>100 · Critical</span>
                </div>
              </div>

              <div style={{
                marginTop: 20, padding: "14px 16px",
                background: "var(--surface2)",
                borderRadius: 12,
                borderLeft: `3px solid ${statusColor}`,
              }}>
                <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: statusColor, marginBottom: 6, textTransform: "uppercase" }}>
                  {statusLabel}
                </p>
                <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>
                  {reiScore < 33
                    ? "Your PFAS exposure is below average. Maintain current protective habits."
                    : reiScore < 67
                      ? "Your exposure warrants attention. Review the mitigation strategies below."
                      : "High exposure detected. Prioritize the recommended interventions."}
                </p>
              </div>
            </div>
          </div>

          {/* ── OUTPUT COMPONENTS ── */}
          <div className="lg:col-span-2" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {filterWarning && <FilterWarningBanner message={filterWarning} />}

            <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 16, padding: 24 }}>
              <PfasFlagList flags={pfasFlags} />
            </div>

            <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 16, padding: 24 }}>
              <DecayChart data={decayCurve} />
            </div>

            <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 16, padding: 24 }}>
              <InterventionScenarios scenarios={interventionModel} />
            </div>

            {medWarnings && medWarnings.length > 0 && (
              <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 16, padding: 24 }}>
                <MedWarningList warnings={medWarnings} />
              </div>
            )}

            <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 16, padding: 24 }}>
              <MitigationPlanTiles plan={mitigationPlan} />
            </div>

            <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 16, padding: 24 }}>
              <GeminiRecommendations reiScore={reiScore} />
            </div>

            <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 16, padding: 24 }}>
              <WeeklyGroceryScan basePayload={{ zipCode, filterModel, cookwareUse, dietHabits, makeUpUse }} />
            </div>

            <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 16, padding: 24 }}>
              <AdvocacyLetter zipCode={zipCode} reiScore={reiScore} filterType={filterModel?.type || "unknown"} />
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer style={{ marginTop: 60, paddingTop: 28, borderTop: "0.5px solid var(--border)", textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16, lineHeight: 1.7 }}>
            BioBound is an educational tool. Estimates use EPA, EFSA and NIH population data and do not constitute medical advice.
          </p>
          <button
            onClick={() => router.push("/audit")}
            style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text2)", background: "none", border: "none", cursor: "pointer" }}
          >
            ← Run another assessment
          </button>
        </footer>
      </div>

    </main>
  );
}
