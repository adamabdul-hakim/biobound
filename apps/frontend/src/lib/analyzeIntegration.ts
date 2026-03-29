import type { HouseholdProfile, MitigationTier, PfasFlag, Scenario } from "@/store/appStore";

export interface TeamAAnalyzeInput {
  zipCode: string;
  productScan: string | null;
  cookwareUse: { brand: string; yearsOfUse: number } | null;
  filterModel: { brand: string; type: string } | null;
  dietHabits: {
    fiberSources: string[];
    foods: string[];
    medications: string[];
  } | null;
  makeUpUse: {
    frequency: "never" | "rarely" | "weekly" | "daily";
    productTypes: string[];
    shampooProducts?: string[];
  } | null;
  /** Extended lifestyle data used for frontend REI computation, NOT sent to backend */
  householdProfile?: HouseholdProfile | null;
}

interface TeamBDecayPoint {
  year: number;
  level: number;
}

export interface TeamBAnalyzeResponse {
  product_name: string;
  detected_chemicals: string[];
  risk_score: number;
  rei_formula_version: string;
  module_scores: {
    hydrology: number;
    scanner: number;
    decay: number;
    composite: number;
  };
  confidence_interval: number;
  water_risk_score: number;
  water_effective_ppt: number;
  water_data_status: "calculated" | "no-data" | "missing-zip";
  filter_warning: string | null;
  decay_data: TeamBDecayPoint[];
  medical_warnings: string[];
  safety: {
    contraindications: string[];
    recommendation_safe: boolean;
    equity_adjustments_applied: boolean;
    zero_cost_actions: string[];
  };
  meta: {
    contract_version: "v1";
    request_id: string;
  };
}

interface ApiErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    request_id?: string;
    details?: unknown;
  };
}

export interface TeamAAnalyzeResult {
  reiScore: number;
  filterWarning: string | null;
  pfasFlags: PfasFlag[];
  decayCurve: Array<{ week: number; bodyLoad: number }>;
  interventionModel: Scenario[];
  medWarnings: string[];
  mitigationPlan: MitigationTier[];
}

function getRiskTier(score: number): PfasFlag["tier"] {
  if (score >= 67) return "high";
  if (score >= 33) return "medium";
  return "low";
}

// ── Lifestyle-based REI computation ───────────────────────────────────────────
// The backend scanner score is 0 when no product is scanned (50% of its weight),
// so we compute REI fully on the frontend from all lifestyle inputs.
function computeLifestyleREI(
  payload: TeamAAnalyzeInput,
  backendWaterScore: number,
  waterDataStatus: "calculated" | "no-data" | "missing-zip" = "calculated",
): number {
  // 1. Water score (0-100) — precautionary fallback when backend has no data
  let waterScore: number;
  if (waterDataStatus === "calculated") {
    waterScore = Math.max(0, Math.min(100, backendWaterScore));
  } else {
    // Unknown water quality = elevated risk (precautionary principle)
    const hasFilter = payload.filterModel?.type && payload.filterModel.type !== "none";
    waterScore = hasFilter ? 35 : 70;
  }

  // 2. Cookware exposure score (0-100)
  let cookwareScore = 0;
  if (payload.cookwareUse) {
    const brand = payload.cookwareUse.brand.trim();
    const pct = brand.endsWith("%") ? Math.min(100, Math.max(0, parseInt(brand) || 0)) : 0;
    const years = Math.min(20, Math.max(0, payload.cookwareUse.yearsOfUse));
    // pct 0-100% → 0-60 pts;  years 0-20 → 0-40 pts
    cookwareScore = Math.round((pct / 100) * 60 + (years / 20) * 40);
  }

  // 3. Diet exposure (net of PFAS-raising minus PFAS-reducing foods) (0-100)
  let dietScore = 0;
  if (payload.dietHabits) {
    const raising = payload.dietHabits.foods.length; // each adds ~14pts (7 foods max)
    const reducing = payload.dietHabits.fiberSources.length; // each reduces ~5pts
    const meds = payload.dietHabits.medications.filter(
      (m) => m.toLowerCase() !== "none",
    ).length;
    const rawDiet = raising * 14 - reducing * 5 + meds * 3;
    dietScore = Math.max(0, Math.min(100, rawDiet));
  }

  // 4. Personal care exposure (0-100)
  let makeupScore = 0;
  if (payload.makeUpUse) {
    const freqMap: Record<string, number> = { never: 0, rarely: 18, weekly: 42, daily: 65 };
    const freqScore = freqMap[payload.makeUpUse.frequency] ?? 0;
    const productScore = Math.min(25, payload.makeUpUse.productTypes.length * 4);
    // Shampoo/hair products — dry shampoo + keratin are high-PFAS
    const highRiskHairProducts = ["Dry shampoo", "Keratin / straightening treatments", "Hair spray / styling spray"];
    const hairScore = Math.min(10, (payload.makeUpUse.shampooProducts?.filter(
      (p) => highRiskHairProducts.some((h) => h.toLowerCase().includes(p.toLowerCase().split(" ")[0]))
    ).length ?? 0) * 5);
    makeupScore = Math.min(100, freqScore + productScore + hairScore);
  }

  // 5. Household (crawling children = 10× dust ingestion) (0-100)
  let householdScore = 0;
  if (payload.householdProfile?.hasChildrenUnder5) {
    const n = Math.min(4, payload.householdProfile.numberOfChildren);
    householdScore = payload.householdProfile.childrenCrawlOnFloor
      ? Math.min(100, 65 + n * 12) // crawling: high dust ingestion (~10x adult)
      : Math.min(60, 15 + n * 10);
  }

  // Weighted composite (must sum to 1.0)
  const rei = Math.round(
    waterScore * 0.25 +
    cookwareScore * 0.20 +
    dietScore * 0.25 +
    makeupScore * 0.15 +
    householdScore * 0.15,
  );
  // Crawling infants ingest ~10x more PFAS-laden house dust: apply vulnerability multiplier
  if (payload.householdProfile?.hasChildrenUnder5 && payload.householdProfile?.childrenCrawlOnFloor) {
    return Math.min(100, Math.round(rei * 1.6));
  }
  return Math.max(0, Math.min(100, rei));
}

// ── Smooth exponential decay curve ────────────────────────────────────────────
// Backend only returns 3 data points (years 0, 4, 8). We generate smooth
// yearly data for 10 years using C(t) = C0 * exp(-k*t).
const DEFAULT_K = 0.231; // half-life ~3 years (general PFAS average)
const INTERVENTION_K = DEFAULT_K * 1.5;  // 50% faster with dietary intervention
const FULL_INTERVENTION_K = DEFAULT_K * 2.0; // 100% faster with full lifestyle overhaul

function generateDecayCurve(startLevel: number, k: number, horizon = 10): Array<{ week: number; bodyLoad: number }> {
  const points: Array<{ week: number; bodyLoad: number }> = [];
  for (let m = 0; m <= horizon * 12; m += 6) {
    // every 6 months
    const t = m / 12;
    const level = Math.max(5, startLevel * Math.exp(-k * t));
    points.push({ week: Math.round(t * 52), bodyLoad: Math.round(level) });
  }
  return points;
}

function buildInterventionScenarios(startLevel: number): Scenario[] {
  return [
    {
      label: "Current Trajectory",
      description: "Projected body burden without changing habits.",
      data: generateDecayCurve(startLevel, DEFAULT_K),
    },
    {
      label: "Dietary Intervention",
      description: "Estimated decline with increased fiber intake and filter upgrade.",
      data: generateDecayCurve(startLevel, INTERVENTION_K),
    },
    {
      label: "Full Lifestyle Overhaul",
      description: "Maximum reduction: certified filter, PFAS-free cookware, clean diet.",
      data: generateDecayCurve(startLevel, FULL_INTERVENTION_K),
    },
  ];
}

function buildMitigationPlan(riskScore: number): MitigationTier[] {
  const severeRisk = riskScore >= 67;

  return [
    {
      tier: 1,
      description: "Immediate low/no-cost actions to reduce exposure.",
      cost: "Free",
      actions: [
        "Use filtered water for drinking and cooking whenever possible",
        "Prefer stainless steel, ceramic, or cast iron cookware",
        "Limit packaged foods known to use grease-resistant liners",
      ],
    },
    {
      tier: 2,
      description: "Low-cost upgrades that improve PFAS risk control.",
      cost: "$50-$100",
      actions: [
        "Upgrade to an NSF-53 or NSF-58 certified filter",
        "Replace damaged non-stick cookware with PFAS-free alternatives",
        "Increase soluble fiber intake gradually with medical guidance",
      ],
    },
    {
      tier: 3,
      description: severeRisk
        ? "High-priority long-term actions for elevated risk profiles."
        : "Long-term resilience actions to maintain low exposure.",
      cost: "$200-$500",
      actions: [
        "Install under-sink or whole-home PFAS-capable filtration",
        "Review household products for fluorinated treatments",
        "Discuss biomonitoring and exposure plans with a clinician",
      ],
    },
  ];
}

export function mapTeamBToTeamAResult(
  response: TeamBAnalyzeResponse,
  payload: TeamAAnalyzeInput,
): TeamAAnalyzeResult {
  // Use the lifestyle-based REI instead of the backend's scanner-dominated score
  const reiScore = computeLifestyleREI(payload, response.water_risk_score, response.water_data_status);

  const tier = getRiskTier(reiScore);
  const pfasFlags: PfasFlag[] = response.detected_chemicals.length > 0
    ? response.detected_chemicals.map((compound) => ({ compound, tier }))
    : [
        { compound: "General PFAS Exposure", tier },
      ];

  const decayCurve = generateDecayCurve(reiScore, DEFAULT_K);

  return {
    reiScore,
    filterWarning: response.filter_warning,
    pfasFlags,
    decayCurve,
    interventionModel: buildInterventionScenarios(reiScore),
    medWarnings: response.medical_warnings,
    mitigationPlan: buildMitigationPlan(reiScore),
  };
}

export async function callIntegratedAnalyzeApi(payload: TeamAAnalyzeInput): Promise<TeamAAnalyzeResult> {
  // Strip frontend-only fields before sending to backend
  const { householdProfile: _hp, ...backendPayload } = payload;

  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(backendPayload),
  });

  const body = (await response.json()) as TeamBAnalyzeResponse | ApiErrorEnvelope;

  if (!response.ok) {
    const errorEnvelope = body as ApiErrorEnvelope;
    const message = errorEnvelope.error?.message ?? "Analysis failed";
    const requestId = errorEnvelope.error?.request_id;
    const code = errorEnvelope.error?.code;
    const withCode = code ? `[${code}] ${message}` : message;
    const withRequestId = requestId ? `${withCode} (request_id: ${requestId})` : withCode;
    throw new Error(withRequestId);
  }

  return mapTeamBToTeamAResult(body as TeamBAnalyzeResponse, payload);
}
