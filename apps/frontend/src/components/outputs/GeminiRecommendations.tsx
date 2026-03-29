"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { fetchGeminiRecommendations, RecommendationsResult } from "@/lib/geminiRecommendations";
import { Sparkles, Loader, CheckCircle, RefreshCw } from "lucide-react";

interface GeminiRecommendationsProps {
  reiScore: number;
}

function parseCookwarePct(brand: string): number {
  if (brand.endsWith("%")) return Math.min(100, Math.max(0, parseInt(brand) || 0));
  return 0;
}

export default function GeminiRecommendations({ reiScore }: GeminiRecommendationsProps) {
  const { cookwareUse, dietHabits, makeUpUse, householdProfile, filterModel, zipCode } = useAppStore();
  const [result, setResult] = useState<RecommendationsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGeminiRecommendations({
        reiScore,
        filterType: filterModel?.type ?? null,
        cookwarePct: parseCookwarePct(cookwareUse?.brand ?? "0%"),
        cookwareYears: cookwareUse?.yearsOfUse ?? 0,
        dietRaisingCount: dietHabits?.foods.length ?? 0,
        dietReducingCount: dietHabits?.fiberSources.length ?? 0,
        hasChildren: householdProfile?.hasChildrenUnder5 ?? false,
        childrenCrawl: householdProfile?.childrenCrawlOnFloor ?? false,
        zipCode: zipCode || null,
      });
      setResult(data);
    } catch {
      setError("Could not load recommendations. Using built-in suggestions instead.");
      // Fallback to static
      const tier = reiScore >= 67 ? "high" : reiScore >= 33 ? "moderate" : "low";
      setResult({
        source: "fallback",
        tier,
        recommendations: getStaticRecs(tier),
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-load on mount
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reiScore]);

  const tierColors: Record<string, string> = {
    low: "text-emerald-400 border-emerald-700/40 bg-emerald-900/20",
    moderate: "text-amber-400 border-amber-700/40 bg-amber-900/20",
    high: "text-rose-400 border-rose-700/40 bg-rose-900/20",
  };
  const tierLabel: Record<string, string> = {
    low: "Low Risk",
    moderate: "Moderate Risk",
    high: "High Risk",
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3 mb-5">
        <h3 className="font-bold text-gray-100 text-xl flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-teal-400" />
          Personalized Recommendations
          {result?.source === "gemini" && (
            <span className="text-xs font-semibold text-teal-400 bg-teal-900/40 border border-teal-700/40 px-2 py-0.5 rounded-full">
              AI-powered
            </span>
          )}
        </h3>
        <button
          onClick={load}
          disabled={loading}
          className="p-1.5 text-gray-500 hover:text-teal-400 transition-colors disabled:opacity-40"
          title="Refresh recommendations"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <p className="text-xs text-amber-400 mb-3">{error}</p>
      )}

      {loading && !result && (
        <div className="flex items-center gap-3 p-6 bg-slate-800/60 rounded-xl border border-teal-700/30">
          <Loader className="w-5 h-5 text-teal-400 animate-spin flex-shrink-0" />
          <p className="text-sm text-gray-400">Generating personalized recommendations…</p>
        </div>
      )}

      {result && (
        <div className="bg-slate-800/80 border border-teal-700/30 rounded-xl overflow-hidden">
          <div className={`px-4 py-2 flex items-center gap-2 text-xs font-bold border-b border-slate-700/50 ${tierColors[result.tier]}`}>
            <span className="uppercase tracking-wider">{tierLabel[result.tier]} Profile</span>
          </div>
          <ul className="p-5 space-y-3">
            {result.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-gray-200">
                <CheckCircle className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function getStaticRecs(tier: string): string[] {
  const recs: Record<string, string[]> = {
    low: [
      "Use filtered water for all drinking and cooking.",
      "Maintain fiber-rich diet — oats, beans, and flaxseed support PFAS clearance.",
      "Prefer stainless steel or cast iron cookware.",
      "Check personal care products for fluorine-based (PFAS) ingredients.",
      "Regular vacuuming reduces PFAS-laden household dust.",
      "Monitor your water source with annual utility reports.",
    ],
    moderate: [
      "Upgrade to an NSF-53 or NSF-58 certified water filter — highest single-step impact.",
      "Replace non-stick cookware older than 5 years with PFAS-free options.",
      "Increase daily soluble fiber (psyllium husk, oats) to accelerate PFAS excretion.",
      "Reduce fast food and microwave popcorn — PFAS-coated packaging is a major source.",
      "Damp-mop floors frequently if young children are present.",
      "Request your water utility's latest PFAS testing disclosure.",
    ],
    high: [
      "Install an NSF-58 reverse osmosis filter — removes up to 99% of PFAS.",
      "Replace ALL non-stick cookware with PFAS-free cast iron or ceramic.",
      "Begin daily high-fiber supplementation and discuss PFAS diet with a nutritionist.",
      "Eliminate PFAS-packaged foods: fast food, microwave popcorn, treated containers.",
      "Test home dust for PFAS and increase damp-cleaning frequency.",
      "Consult your healthcare provider about PFAS biomonitoring blood tests.",
    ],
  };
  return recs[tier] ?? recs.moderate;
}
