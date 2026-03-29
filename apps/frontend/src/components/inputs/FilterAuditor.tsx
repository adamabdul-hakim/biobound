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
      <label className="block text-sm md:text-base font-bold text-gray-100 mb-4 flex items-center gap-2">
        <Droplets className="w-5 h-5 text-teal-400" />
        What Water Filter Do You Use?
      </label>
      
      <div className="space-y-2 mb-6">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className={`w-full p-4 md:p-5 border-2 rounded-lg text-left transition-all active:scale-95 ${
              filterModel?.type === option.value
                ? "border-teal-500 bg-teal-900/40 shadow-md shadow-teal-500/20 backdrop-blur-sm"
                : "border-teal-700/30 hover:border-teal-600 hover:bg-teal-900/20"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all ${
                  filterModel?.type === option.value
                    ? "border-teal-400 bg-teal-500"
                    : "border-teal-700/50"
                }`} />
                <div className="text-left">
                  <p className="font-semibold text-gray-100 text-sm md:text-base">{option.label}</p>
                </div>
              </div>
              {option.certified && (
                <span className="text-xs bg-emerald-900/60 text-emerald-300 px-2 md:px-3 py-1 rounded-full font-bold flex items-center gap-1 border border-emerald-700/50 flex-shrink-0">
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
          <div className="p-4 bg-amber-900/30 border-2 border-amber-700/50 rounded-lg flex items-start gap-3 mb-4 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-300 font-medium">
              Standard filters don&apos;t remove PFAS. Consider upgrading to <strong>NSF-53</strong> or <strong>NSF-58</strong>.
            </p>
          </div>
        )}

      <div className="p-3 md:p-4 bg-teal-900/30 rounded-lg border border-teal-700/30">
        <p className="text-gray-400 text-xs md:text-sm leading-relaxed">
          <strong className="text-teal-300">NSF-53 & NSF-58</strong> are the only certified filters for PFAS removal. Standard pitcher filters provide minimal protection.
        </p>
      </div>
    </div>
  );
}
