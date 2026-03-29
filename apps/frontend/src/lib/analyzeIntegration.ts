import type { MitigationTier, PfasFlag, Scenario } from "@/store/appStore";

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
  } | null;
}

interface TeamBDecayPoint {
  year: number;
  level: number;
}

export interface TeamBAnalyzeResponse {
  product_name: string;
  detected_chemicals: string[];
  risk_score: number;
  confidence_interval: number;
  water_risk_score: number;
  water_effective_ppt: number;
  water_data_status: "calculated" | "no-data" | "missing-zip";
  filter_warning: string | null;
  decay_data: TeamBDecayPoint[];
  medical_warnings: string[];
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
  if (score >= 67) {
    return "high";
  }
  if (score >= 33) {
    return "medium";
  }
  return "low";
}

function mapDecayToWeeklyCurve(decayData: TeamBDecayPoint[]): Array<{ week: number; bodyLoad: number }> {
  if (decayData.length === 0) {
    return [];
  }

  const baseYear = decayData[0].year;
  return decayData.map((point) => ({
    week: (point.year - baseYear) * 52,
    bodyLoad: Math.max(0, Math.min(100, point.level)),
  }));
}

function buildInterventionScenarios(curve: Array<{ week: number; bodyLoad: number }>): Scenario[] {
  if (curve.length === 0) {
    return [];
  }

  const interventionCurve = curve.map((point, index) => {
    if (index === 0) {
      return point;
    }

    const reductionFactor = 1 - 0.2 * (index / (curve.length - 1));
    return {
      week: point.week,
      bodyLoad: Math.max(0, Math.round(point.bodyLoad * reductionFactor)),
    };
  });

  return [
    {
      label: "Current Trajectory",
      description: "Projected body burden without additional intervention.",
      data: curve,
    },
    {
      label: "With Fiber Intervention",
      description: "Estimated improved decline with fiber-based intervention.",
      data: interventionCurve,
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
): TeamAAnalyzeResult {
  const tier = getRiskTier(response.risk_score);
  const pfasFlags: PfasFlag[] = response.detected_chemicals.map((compound) => ({
    compound,
    tier,
  }));

  const decayCurve = mapDecayToWeeklyCurve(response.decay_data);

  return {
    reiScore: response.risk_score,
    filterWarning: response.filter_warning,
    pfasFlags,
    decayCurve,
    interventionModel: buildInterventionScenarios(decayCurve),
    medWarnings: response.medical_warnings,
    mitigationPlan: buildMitigationPlan(response.risk_score),
  };
}

export async function callIntegratedAnalyzeApi(payload: TeamAAnalyzeInput): Promise<TeamAAnalyzeResult> {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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

  return mapTeamBToTeamAResult(body as TeamBAnalyzeResponse);
}
