export interface RecommendationsResult {
  source: "gemini" | "fallback";
  tier: "low" | "moderate" | "high";
  recommendations: string[];
}

export interface RecommendationsInput {
  reiScore: number;
  filterType: string | null;
  cookwarePct: number;
  cookwareYears: number;
  dietRaisingCount: number;
  dietReducingCount: number;
  hasChildren: boolean;
  childrenCrawl: boolean;
  zipCode?: string | null;
}

export async function fetchGeminiRecommendations(
  input: RecommendationsInput,
): Promise<RecommendationsResult> {
  const response = await fetch("/api/recommendations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rei_score: input.reiScore,
      filter_type: input.filterType,
      cookware_pct: input.cookwarePct,
      cookware_years: input.cookwareYears,
      diet_raising_count: input.dietRaisingCount,
      diet_reducing_count: input.dietReducingCount,
      has_children: input.hasChildren,
      children_crawl: input.childrenCrawl,
      zip_code: input.zipCode ?? null,
    }),
  });

  if (!response.ok) {
    throw new Error(`Recommendations request failed: ${response.status}`);
  }

  return response.json() as Promise<RecommendationsResult>;
}
