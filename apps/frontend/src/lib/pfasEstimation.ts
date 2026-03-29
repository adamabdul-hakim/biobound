/**
 * PFAS estimation service that calls the backend /estimate/pfas endpoint
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  const url = `${API_BASE}/estimate/pfas?zip_code=${encodeURIComponent(zipCode)}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to estimate PFAS: ${response.statusText}`);
  }
  
  return response.json();
}
