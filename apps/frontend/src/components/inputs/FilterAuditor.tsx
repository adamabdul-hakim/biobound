"use client";

import { useAppStore } from "@/store/appStore";
import { AlertCircle, Droplets, CheckCircle } from "lucide-react";

interface FilterOption {
  label: string;
  value: string;
  certified: boolean;
  icon?: React.ReactNode;
}

const filterOptions: FilterOption[] = [
  { label: "No filter", value: "none", certified: false },
  { label: "Standard pitcher", value: "pitcher-standard", certified: false },
  { label: "NSF-53 Certified", value: "NSF-53", certified: true },
  { label: "NSF-58 Reverse Osmosis", value: "NSF-58", certified: true },
  { label: "Unknown", value: "unknown", certified: false },
];

export default function FilterAuditor() {
  const { filterModel, setFilterModel } = useAppStore();

  const handleSelect = (value: string) => {
    const option = filterOptions.find((o) => o.value === value);
    if (option) {
      setFilterModel({ brand: "", type: value });
    }
  };

  const currentCertified = filterOptions.find(
    (o) => o.value === filterModel?.type
  )?.certified;

  return (
    <div className="w-full">
      <label className="block text-sm md:text-base font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text)" }}>
        <Droplets className="w-5 h-5" style={{ color: "var(--accent)" }} />
        What Water Filter Do You Use?
      </label>
      
      <div className="space-y-2 mb-6">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className={`w-full p-4 md:p-5 rounded-lg text-left transition-all active:scale-95 ${
              filterModel?.type === option.value
                ? "btn-select-active"
                : "btn-select-idle"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div
                  className="w-5 h-5 rounded-full flex-shrink-0 transition-all"
                  style={{
                    border: filterModel?.type === option.value ? "2px solid #0d0f0e" : "2px solid var(--border2)",
                    background: filterModel?.type === option.value ? "#0d0f0e" : "transparent",
                  }}
                />
                <div className="text-left">
                  <p className="font-semibold text-sm md:text-base">{option.label}</p>
                </div>
              </div>
              {option.certified && (
                <span className="tag-safe text-xs px-2 md:px-3 py-1 rounded-full font-bold flex items-center gap-1 flex-shrink-0">
                  <CheckCircle className="w-3 h-3" />
                  <span className="hidden sm:inline">PFAS OK</span>
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {filterModel?.type &&
        currentCertified === false &&
        filterModel?.type !== "unknown" && (
          <div className="card-warn p-4 flex items-start gap-3 mb-4 animate-in fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--warn)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--warn)" }}>
              Standard filters don’t remove PFAS. Consider upgrading to <strong>NSF-53</strong> or <strong>NSF-58</strong>.
            </p>
          </div>
        )}

      <div className="card-info p-3 md:p-4">
        <p className="text-xs md:text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
          <strong style={{ color: "var(--safe)" }}>NSF-53 &amp; NSF-58</strong> are the only certified filters for PFAS removal. Standard pitcher filters provide minimal protection.
        </p>
      </div>
    </div>
  );
}
