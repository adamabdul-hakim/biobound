import epaData from "@/data/epa-ucmr5.json";

export interface ScoreResult {
  score: number;
  ppt: number;
  status: string;
}

interface EpaEntry {
  totalPpt: number | null;
  status: string;
}

/**
 * Calculate water quality score based on EPA UCMR 5 data
 * Rule: If filterType is NOT NSF-53 or NSF-58, use raw EPA ppt value
 * Otherwise, assume 80% reduction
 * Normalize to 0-100 scale with ceiling of 70 ppt
 */
export function calculateWaterScore(
  zipCode: string,
  filterType: string
): ScoreResult {
  // Look up EPA data for zip code
  const epaEntry = (epaData as Record<string, EpaEntry>)[zipCode];

  if (!epaEntry || epaEntry.status === "no-data" || epaEntry.totalPpt === null) {
    return {
      score: 25, // neutral score for unknown data
      ppt: 0,
      status: "unknown",
    };
  }

  let effectivePpt = epaEntry.totalPpt;

  // Apply filter reduction if NSF certified
  const isCertified = filterType === "NSF-53" || filterType === "NSF-58";
  if (isCertified) {
    effectivePpt = effectivePpt * 0.2; // 80% reduction
  }

  // Normalize to 0-100 scale (ceiling: 70 ppt)
  const score = Math.min(100, (effectivePpt / 70) * 100);

  return {
    score: Math.round(score),
    ppt: effectivePpt,
    status: "calculated",
  };
}
