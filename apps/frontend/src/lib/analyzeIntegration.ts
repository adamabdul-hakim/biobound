import type { HouseholdProfile, MitigationTier, PfasFlag, Scenario } from "@/store/appStore";
import type { ReceiptScanResult } from "@/lib/receiptScan";

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
  /** Receipt scan results used for frontend REI computation, NOT sent to backend */
  receiptScanResult?: ReceiptScanResult | null;
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
// REI is now backend-derived via risk_score in mapTeamBToTeamAResult.

// ── Smooth exponential decay curve ────────────────────────────────────────────
// PFAS half-lives vary by compound. PFOS ~4-5 years, PFOA ~2-4 years.
// We use compound-class weighted average: ~3.5 year half-life baseline.
const BASELINE_HALF_LIFE_YEARS = 3.5;
const BASELINE_K = Math.LN2 / BASELINE_HALF_LIFE_YEARS; // ~0.198

// Fiber-rich diet accelerates PFAS elimination via bile acid binding (~15-25% faster)
const FIBER_DIET_K_BOOST = 1.20;
// Cholestyramine (prescription bile acid sequestrant) can speed elimination ~40-60%
const MEDICAL_K_BOOST = 1.50;
// Certified filter eliminates ongoing water ingestion — doesn't change half-life
// but prevents new accumulation (modeled as reduced steady-state, not faster k)

function generateDecayCurve(
  startLevel: number,
  k: number,
  ongoingExposureRate: number = 0,
  horizon: number = 10,
): Array<{ week: number; bodyLoad: number }> {
  // Model: C(t) = steadyState + (C0 - steadyState) * exp(-k*t)
  // steadyState = ongoingExposureRate / k  (new accumulation vs elimination balance)
  const steadyState = Math.min(startLevel * 0.8, ongoingExposureRate / k);
  const points: Array<{ week: number; bodyLoad: number }> = [];
  for (let m = 0; m <= horizon * 12; m += 6) {
    const t = m / 12;
    const level = Math.max(2, steadyState + (startLevel - steadyState) * Math.exp(-k * t));
    points.push({ week: Math.round(t * 52), bodyLoad: Math.round(level) });
  }
  return points;
}

/** Break down the REI into component scores so scenarios can selectively reduce them */
interface ComponentScores {
  water: number;
  cookware: number;
  diet: number;
  makeup: number;
  household: number;
  receipt: number;
  hasFilter: boolean;
  hasCertifiedFilter: boolean;
  hasReceipt: boolean;
  fiberCount: number;
  cookwarePct: number;
}

function computeComponentScores(payload: TeamAAnalyzeInput, backendWaterScore: number, waterDataStatus: string): ComponentScores {
  const water = waterDataStatus === "calculated"
    ? Math.max(0, Math.min(100, backendWaterScore))
    : (payload.filterModel?.type && payload.filterModel.type !== "none" ? 35 : 70);

  let cookware = 0;
  let cookwarePct = 0;
  if (payload.cookwareUse) {
    const brand = payload.cookwareUse.brand.trim();
    cookwarePct = brand.endsWith("%") ? Math.min(100, Math.max(0, parseInt(brand) || 0)) : 0;
    const years = Math.min(20, Math.max(0, payload.cookwareUse.yearsOfUse));
    cookware = Math.round((cookwarePct / 100) * 60 + (years / 20) * 40);
  }

  let diet = 0;
  let fiberCount = 0;
  if (payload.dietHabits) {
    const raising = payload.dietHabits.foods.length;
    fiberCount = payload.dietHabits.fiberSources.length;
    const meds = payload.dietHabits.medications.filter((m) => m.toLowerCase() !== "none").length;
    diet = Math.max(0, Math.min(100, raising * 10 - fiberCount * 7 + meds * 3));
  }

  let makeup = 0;
  if (payload.makeUpUse) {
    const freqMap: Record<string, number> = { never: 0, rarely: 18, weekly: 42, daily: 65 };
    const freqScore = freqMap[payload.makeUpUse.frequency] ?? 0;
    const productScore = payload.makeUpUse.frequency === "never"
      ? 0
      : Math.min(25, payload.makeUpUse.productTypes.length * 4);
    const highRiskHairProducts = ["Dry shampoo", "Keratin / straightening treatments", "Hair spray / styling spray"];
    const hairScore = Math.min(10, (payload.makeUpUse.shampooProducts?.filter(
      (p) => highRiskHairProducts.some((h) => h.toLowerCase().includes(p.toLowerCase().split(" ")[0]))
    ).length ?? 0) * 5);
    makeup = Math.min(100, freqScore + productScore + hairScore);
  }

  let household = 0;
  if (payload.householdProfile?.hasChildrenUnder5) {
    const n = Math.min(4, payload.householdProfile.numberOfChildren);
    household = payload.householdProfile.childrenCrawlOnFloor
      ? Math.min(100, 65 + n * 12) : Math.min(60, 15 + n * 10);
  }

  let receipt = 0;
  const hasReceipt = !!(payload.receiptScanResult && payload.receiptScanResult.items.length > 0);
  if (hasReceipt) {
    const levelPoints: Record<string, number> = { none: 0, low: 8, moderate: 25, high: 50 };
    let totalPts = 0;
    for (const item of payload.receiptScanResult!.items) {
      if (item.ppt_estimate != null && item.ppt_estimate > 0) {
        totalPts += Math.min(50, (item.ppt_estimate / 70) * 50);
      } else {
        totalPts += levelPoints[item.pfas_level] ?? 0;
      }
    }
    receipt = Math.min(100, Math.round(totalPts));
  }

  const filterType = payload.filterModel?.type ?? "";
  const hasFilter = !!filterType && filterType !== "none";
  const hasCertifiedFilter = filterType === "NSF-53" || filterType === "NSF-58";

  return { water, cookware, diet, makeup, household, receipt, hasFilter, hasCertifiedFilter, hasReceipt, fiberCount, cookwarePct };
}

function weightedREI(scores: ComponentScores): number {
  if (scores.hasReceipt) {
    return Math.round(
      scores.water * 0.20 + scores.cookware * 0.15 + scores.diet * 0.20 +
      scores.makeup * 0.10 + scores.household * 0.15 + scores.receipt * 0.20,
    );
  }
  return Math.round(
    scores.water * 0.25 + scores.cookware * 0.20 + scores.diet * 0.25 +
    scores.makeup * 0.15 + scores.household * 0.15,
  );
}

function buildInterventionScenarios(
  reiScore: number,
  scores: ComponentScores,
): Scenario[] {
  // Ongoing exposure rate models continuous PFAS ingestion from unremoved sources.
  // Water and cookware are the biggest ongoing sources; diet/products contribute less.
  const ongoingBase = (scores.water * 0.4 + scores.cookware * 0.3 + scores.diet * 0.2 + scores.makeup * 0.1) / 100 * reiScore * 0.3;

  // ── Scenario 1: Current trajectory (no changes) ──
  const currentCurve = generateDecayCurve(reiScore, BASELINE_K, ongoingBase);

  // ── Scenario 2: Filter + diet intervention ──
  // Model: install NSF-53 filter (water score drops 80%) + add fiber (diet score improves)
  const s2 = { ...scores };
  if (!scores.hasCertifiedFilter) {
    s2.water = Math.round(scores.water * 0.20); // NSF-53 removes ~80% PFAS from water
  }
  // Adding 3 fiber sources if user has fewer
  const fiberBoost = Math.max(0, 3 - scores.fiberCount);
  s2.diet = Math.max(0, scores.diet - fiberBoost * 5);
  const rei2 = weightedREI(s2);
  const ongoing2 = (s2.water * 0.4 + s2.cookware * 0.3 + s2.diet * 0.2 + s2.makeup * 0.1) / 100 * rei2 * 0.3;
  // Fiber diet gives ~20% faster elimination
  const k2 = BASELINE_K * FIBER_DIET_K_BOOST;
  const filterCurve = generateDecayCurve(reiScore, k2, ongoing2);

  // Build a specific description based on what changes
  const filterActions: string[] = [];
  if (!scores.hasCertifiedFilter) filterActions.push("NSF-53/58 certified filter");
  if (fiberBoost > 0) filterActions.push(`+${fiberBoost} daily fiber sources`);
  if (filterActions.length === 0) filterActions.push("increased fiber intake");
  const filterDesc = `Modeled: ${filterActions.join(", ")}. Projected REI drops from ${reiScore} → ${rei2}.`;

  // ── Scenario 3: Full lifestyle overhaul ──
  // Model: certified filter + replace all non-stick cookware + clean diet + reduce products
  const s3 = { ...scores };
  s3.water = Math.round(scores.water * 0.20);
  s3.cookware = scores.cookwarePct > 0 ? Math.round(scores.cookware * 0.10) : scores.cookware; // replace non-stick
  s3.diet = Math.max(0, Math.round(scores.diet * 0.30)); // major diet cleanup
  s3.makeup = Math.round(scores.makeup * 0.40); // switch to PFAS-free products
  if (scores.hasReceipt) {
    s3.receipt = Math.round(scores.receipt * 0.30); // replace high-PFAS grocery items
  }
  const rei3 = weightedREI(s3);
  const ongoing3 = (s3.water * 0.4 + s3.cookware * 0.3 + s3.diet * 0.2 + s3.makeup * 0.1) / 100 * rei3 * 0.3;
  const k3 = BASELINE_K * FIBER_DIET_K_BOOST; // still biological half-life, just less ongoing exposure
  const fullCurve = generateDecayCurve(reiScore, k3, ongoing3);

  const overhaulParts: string[] = [];
  if (!scores.hasCertifiedFilter) overhaulParts.push("certified filter");
  if (scores.cookwarePct > 0) overhaulParts.push("PFAS-free cookware");
  overhaulParts.push("clean diet");
  if (scores.makeup > 20) overhaulParts.push("PFAS-free personal care");
  const overhaulDesc = `Modeled: ${overhaulParts.join(", ")}. Projected REI drops from ${reiScore} → ${rei3}.`;

  // ── Scenario 4: Medical intervention (if high risk) ──
  // Only show for elevated scores — bile acid sequestrant therapy
  const scenarios: Scenario[] = [
    {
      label: "Current Trajectory",
      description: `No changes to current habits. Body burden declines at natural PFAS half-life (~${BASELINE_HALF_LIFE_YEARS} years), but ongoing exposure sustains levels.`,
      data: currentCurve,
    },
    {
      label: "Filter + Diet Intervention",
      description: filterDesc,
      data: filterCurve,
    },
    {
      label: "Full Lifestyle Overhaul",
      description: overhaulDesc,
      data: fullCurve,
    },
  ];

  if (reiScore >= 55) {
    // Medical intervention on top of full overhaul
    const rei4 = rei3;
    const ongoing4 = ongoing3 * 0.5; // medical treatment + full overhaul cuts ongoing exposure further
    const k4 = BASELINE_K * MEDICAL_K_BOOST; // cholestyramine speeds elimination ~50%
    const medCurve = generateDecayCurve(reiScore, k4, ongoing4);

    scenarios.push({
      label: "Medical + Overhaul",
      description: `Full overhaul plus clinical bile acid sequestrant therapy. Projected REI → ${rei4}. Discuss with your physician — this is the fastest evidence-based reduction path.`,
      data: medCurve,
    });
  }

  return scenarios;
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
  // Backend is the source of truth for final REI and baseline decay projection.
  const reiScore = response.risk_score;
  const scores = computeComponentScores(payload, response.water_risk_score, response.water_data_status);

  const tier = getRiskTier(reiScore);
  const pfasFlags: PfasFlag[] = response.detected_chemicals.length > 0
    ? response.detected_chemicals.map((compound) => ({ compound, tier }))
    : [
        { compound: "General PFAS Exposure", tier },
      ];

  const decayCurve = response.decay_data.map((point) => ({
    week: point.year * 52,
    bodyLoad: point.level,
  }));

  const interventionModel = buildInterventionScenarios(reiScore, scores).map(
    (scenario, index) => {
      if (index !== 0) {
        return scenario;
      }
      return {
        ...scenario,
        description: "Backend-provided baseline trajectory from /analyze.",
        data: decayCurve,
      };
    },
  );

  return {
    reiScore,
    filterWarning: response.filter_warning,
    pfasFlags,
    decayCurve,
    interventionModel,
    medWarnings: response.medical_warnings,
    mitigationPlan: buildMitigationPlan(reiScore),
  };
}

export async function callIntegratedAnalyzeApi(payload: TeamAAnalyzeInput): Promise<TeamAAnalyzeResult> {
  // Strip frontend-only fields before sending to backend
  const backendPayload = {
    zipCode: payload.zipCode,
    productScan: payload.productScan,
    cookwareUse: payload.cookwareUse,
    filterModel: payload.filterModel,
    dietHabits: payload.dietHabits,
    makeUpUse: payload.makeUpUse,
  };

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
