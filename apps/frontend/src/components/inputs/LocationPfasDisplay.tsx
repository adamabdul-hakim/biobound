"use client";

import { useAppStore } from "@/store/appStore";
import { AlertCircle, MapPin, Droplets, TrendingUp } from "lucide-react";

export default function LocationPfasDisplay() {
  const { pfasEstimate, pfasEstimateLoading, pfasEstimateError } = useAppStore();

  if (!pfasEstimate) {
    return null;
  }

  if (pfasEstimateLoading) {
    return (
      <div className="w-full animate-pulse">
        <div className="p-4 md:p-5 bg-slate-700/50 rounded-lg border border-teal-700/30">
          <p className="text-sm text-gray-300">Fetching PFAS data for your location...</p>
        </div>
      </div>
    );
  }

  if (pfasEstimateError) {
    return (
      <div className="w-full">
        <div className="p-4 md:p-5 bg-amber-900/30 border-2 border-amber-700/50 rounded-lg flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300 font-medium">
            Could not fetch PFAS data for your location. Using default estimate.
          </p>
        </div>
      </div>
    );
  }

  const { source, location_data, estimate, zip_code } = pfasEstimate;

  // Display demo location data
  if (source === "manual_demo" && location_data) {
    const sysName = (location_data as any).system_name || (location_data as any).contamination_site || "Water System";
    const pfasData = (location_data as any).pfas_detected || {};

    return (
      <div className="w-full">
        <div className="p-4 md:p-5 bg-teal-900/40 border-2 border-teal-700/50 rounded-lg animate-in fade-in">
          <div className="flex items-start gap-3 mb-4">
            <MapPin className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-teal-300 text-sm md:text-base">{sysName}</h3>
              <p className="text-xs md:text-sm text-gray-400 mt-1">ZIP: {zip_code}</p>
            </div>
            <span className="text-xs bg-teal-700/50 text-teal-200 px-2 py-1 rounded-full font-semibold flex-shrink-0">
              Demo Data
            </span>
          </div>

          {Object.keys(pfasData).length > 0 && (
            <div className="space-y-2 mt-4 pt-4 border-t border-teal-700/30">
              <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">PFAS Detected (ppt)</p>
              {Object.entries(pfasData).map(([compound, data]: any) => (
                <div key={compound} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{compound}</span>
                  <span className="font-bold text-teal-300">{data.max_ppt ?? data}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Display Gemini or heuristic estimate
  if (estimate) {
    const totalPpT = estimate.estimated_total_pfas_ppt;
    const breakdown = estimate.breakdown || {};
    const confidenceColor = 
      estimate.confidence === "high" ? "bg-emerald-900/40 border-emerald-700/50" :
      estimate.confidence === "medium" ? "bg-amber-900/40 border-amber-700/50" :
      "bg-slate-700/40 border-slate-600/50";

    return (
      <div className="w-full">
        <div className={`p-4 md:p-5 border-2 rounded-lg animate-in fade-in ${confidenceColor}`}>
          <div className="flex items-start gap-3 mb-4">
            <Droplets className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-gray-100 text-sm md:text-base">PFAS Estimate for {zip_code}</h3>
              <p className="text-xs md:text-sm text-gray-400 mt-1">Source: {source}</p>
            </div>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${
              estimate.confidence === "high" ? "bg-emerald-900/60 text-emerald-300" :
              estimate.confidence === "medium" ? "bg-amber-900/60 text-amber-300" :
              "bg-slate-700/60 text-gray-300"
            }`}>
              {estimate.confidence.toUpperCase()}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl md:text-4xl font-bold text-teal-300">{totalPpT}</span>
            <span className="text-sm text-gray-400">ppt Total PFAS</span>
          </div>

          {Object.keys(breakdown).length > 0 && (
            <div className="space-y-2 pt-4 border-t border-gray-600/30">
              <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-3 h-3" />
                Breakdown
              </p>
              {Object.entries(breakdown).map(([compound, ppt]) => (
                <div key={compound} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{compound}</span>
                  <span className="font-semibold text-teal-300">{ppt} ppt</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
