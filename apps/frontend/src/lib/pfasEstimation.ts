/**
 * PFAS estimation service routed through frontend API proxy.
 */

export interface LocationPfasData {
  source: "manual_demo" | "gemini" | "heuristic_fallback";
  zip_code: string;
  location_data?: Record<string, unknown>;
  estimate?: {
    estimated_total_pfas_ppt: number;
    breakdown: Record<string, number>;
    confidence: "low" | "medium" | "high";
  };
  raw_response?: string;
}

export async function estimatePfasByZip(zipCode: string): Promise<LocationPfasData> {
  const url = `/api/pfas?zip_code=${encodeURIComponent(zipCode)}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to estimate PFAS: ${response.statusText}`);
  }
  
  return response.json();
}
