export type PfasLevel = "none" | "low" | "moderate" | "high";
export type ItemCategory = "packaging" | "food" | "cookware" | "personal_care" | "water" | "other";

export interface ReceiptScanItem {
  item: string;
  pfas_level: PfasLevel;
  ppt_estimate: number | null;
  reason: string;
  category: ItemCategory;
}

export interface ReceiptScanResult {
  source: "gemini" | "fallback" | "no_text";
  items: ReceiptScanItem[];
  ocr_text?: string;
}

/** Color tokens for each PFAS level */
export const PFAS_LEVEL_META: Record<PfasLevel, { color: string; dotClass: string; label: string }> = {
  none:     { color: "var(--text3)",  dotClass: "",      label: "No PFAS" },
  low:      { color: "var(--safe)",   dotClass: "green", label: "Low" },
  moderate: { color: "var(--warn)",   dotClass: "amber", label: "Moderate" },
  high:     { color: "var(--danger)", dotClass: "red",   label: "High" },
};

export async function scanReceipt(
  payload: { imageBase64?: string; rawText?: string },
): Promise<ReceiptScanResult> {
  const response = await fetch("/api/scan-receipt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_base64: payload.imageBase64 ?? null,
      raw_text: payload.rawText ?? null,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const detail =
      typeof err === "object" && err !== null && "detail" in err
        ? String((err as { detail?: unknown }).detail ?? "")
        : "";
    throw new Error(detail || `Scan failed (${response.status})`);
  }

  return response.json() as Promise<ReceiptScanResult>;
}
