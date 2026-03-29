"use client";

import { useAppStore } from "@/store/appStore";
import { AlertCircle, MapPin, Droplets, TrendingUp } from "lucide-react";

type PfasDetectedEntry = { max_ppt?: number } | number;

interface ManualLocationData {
  system_name?: string;
  contamination_site?: string;
  pfas_detected?: Record<string, PfasDetectedEntry>;
}

export default function LocationPfasDisplay() {
  const { pfasEstimate, pfasEstimateLoading, pfasEstimateError } = useAppStore();

  if (!pfasEstimate) return null;

  if (pfasEstimateLoading) {
    return (
      <div className="water-result animate-pulse" style={{ borderLeft: "3px solid var(--border2)" }}>
        <Droplets className="w-5 h-5 shrink-0" style={{ color: "var(--text3)" }} />
        <p className="text-sm" style={{ color: "var(--text2)" }}>Fetching PFAS data for your location...</p>
      </div>
    );
  }

  if (pfasEstimateError) {
    return (
      <div className="water-result animate-fade-up" style={{ borderLeft: "3px solid var(--warn)" }}>
        <AlertCircle className="w-5 h-5 shrink-0" style={{ color: "var(--warn)" }} />
        <div className="water-info">
          <strong style={{ color: "var(--warn)" }}>Data unavailable</strong><br />
          Could not fetch PFAS data for your location. Using default estimate.
        </div>
      </div>
    );
  }

  const { source, location_data, estimate, zip_code } = pfasEstimate;

  // Demo / manual location data
  if (source === "manual_demo" && location_data) {
    const manualData = location_data as ManualLocationData;
    const sysName = manualData.system_name || manualData.contamination_site || "Water System";
    const pfasData = manualData.pfas_detected || {};

    return (
      <div className="w-full animate-fade-up">
        <div className="water-result" style={{ borderLeft: "3px solid var(--warn)", alignItems: "flex-start" }}>
          <MapPin className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
          <div className="water-info" style={{ flex: 1 }}>
            <strong style={{ color: "var(--text)" }}>{sysName}</strong>
            <br />ZIP: {zip_code}
            <span className="tag-accent text-xs px-2 py-0.5 rounded-full font-semibold ml-2" style={{ display: "inline-block" }}>Demo</span>
          </div>
        </div>

        {Object.keys(pfasData).length > 0 && (
          <div className="card-info mt-2 p-3">
            <p className="eyebrow mb-2" style={{ fontSize: 9 }}>PFAS Detected (ppt)</p>
            {Object.entries(pfasData).map(([compound, data]) => (
              <div key={compound} className="flex items-center justify-between text-sm" style={{ marginBottom: 4 }}>
                <span style={{ color: "var(--text2)" }}>{compound}</span>
                <span style={{ fontFamily: "var(--mono)", color: "var(--accent)", fontWeight: 600 }}>
                  {typeof data === "number" ? data : (data.max_ppt ?? "n/a")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Gemini / heuristic estimate
  if (estimate) {
    const totalPpT = estimate.estimated_total_pfas_ppt;
    const breakdown = estimate.breakdown || {};
    const borderColor =
      estimate.confidence === "high"   ? "var(--safe)" :
      estimate.confidence === "medium" ? "var(--warn)" :
                                         "var(--border2)";
    const levelColor =
      estimate.confidence === "high"   ? "var(--safe)" :
      estimate.confidence === "medium" ? "var(--warn)" :
                                         "var(--text2)";

    return (
      <div className="w-full animate-fade-up">
        <div className="water-result" style={{ borderLeft: `3px solid ${borderColor}`, alignItems: "flex-start" }}>
          <div>
            <div className="water-level" style={{ color: levelColor }}>{totalPpT}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text3)" }}>ppt PFAS</div>
          </div>
          <div className="water-info" style={{ flex: 1 }}>
            <strong style={{ color: "var(--text)" }}>PFAS Estimate — {zip_code}</strong><br />
            Source: {source}
            <span
              className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                display: "inline-block",
                background: estimate.confidence === "high" ? "rgba(96,216,144,0.15)" : estimate.confidence === "medium" ? "rgba(240,160,48,0.15)" : "var(--surface2)",
                color: levelColor,
              }}
            >
              {estimate.confidence.toUpperCase()}
            </span>
          </div>
        </div>

        {Object.keys(breakdown).length > 0 && (
          <div className="card-info mt-2 p-3">
            <p className="eyebrow mb-2 flex items-center gap-1" style={{ fontSize: 9 }}>
              <TrendingUp className="w-3 h-3" /> Breakdown
            </p>
            {Object.entries(breakdown).map(([compound, ppt]) => (
              <div key={compound} className="flex items-center justify-between text-sm" style={{ marginBottom: 4 }}>
                <span style={{ color: "var(--text2)" }}>{compound}</span>
                <span style={{ fontFamily: "var(--mono)", color: "var(--accent)", fontWeight: 600 }}>{ppt} ppt</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}
