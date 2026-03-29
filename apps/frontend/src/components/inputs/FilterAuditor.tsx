"use client";

import { useAppStore } from "@/store/appStore";
import { AlertCircle, Droplets, CheckCircle } from "lucide-react";

interface FilterOption {
  label: string;
  value: string;
  certified: boolean;
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
      setFilterModel({
        brand: filterModel?.brand ?? "",
        type: value,
      });
    }
  };

  const handleBrandChange = (value: string) => {
    setFilterModel({
      brand: value,
      type: filterModel?.type ?? "",
    });
  };

  const handleModelChange = (value: string) => {
    setFilterModel({
      brand: filterModel?.brand ?? "",
      type: value,
    });
  };

  const isCustomModelEntry =
    !!filterModel?.type && !filterOptions.some((option) => option.value === filterModel.type);

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

      <div className="mb-6 p-4 bg-slate-800/40 rounded-lg border border-teal-700/30">
        <p className="text-sm text-gray-200 font-semibold mb-3">Model-Level Lookup (Recommended)</p>
        <p className="text-xs text-gray-400 mb-4">
          Enter the exact filter brand and model for real NSF dataset matching.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-300 mb-1">Filter Brand</label>
            <input
              value={filterModel?.brand ?? ""}
              onChange={(event) => handleBrandChange(event.target.value)}
              placeholder="e.g. SOLVENTUM PURIFICATION INC."
              className="w-full rounded-md border border-teal-700/40 bg-slate-900/60 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-300 mb-1">Filter Model</label>
            <input
              value={isCustomModelEntry ? filterModel?.type ?? "" : ""}
              onChange={(event) => handleModelChange(event.target.value)}
              placeholder="e.g. 3MRO301"
              className="w-full rounded-md border border-teal-700/40 bg-slate-900/60 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>

        <p className="mt-3 text-xs text-teal-300">
          Tip: if you use quick options above, model lookup is skipped and standard-level logic is used.
        </p>
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

      {isCustomModelEntry && (
        <div className="p-3 mb-4 bg-sky-900/30 border border-sky-700/50 rounded-lg">
          <p className="text-xs text-sky-300">
            Using model match: <strong>{filterModel?.brand || "Unknown brand"}</strong> / <strong>{filterModel?.type}</strong>
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
