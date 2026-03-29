"use client";

import { useAppStore } from "@/store/appStore";
import { AlertCircle } from "lucide-react";

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
      setFilterModel({ brand: "", type: value });
    }
  };

  const currentCertified = filterOptions.find(
    (o) => o.value === filterModel?.type
  )?.certified;

  return (
    <div className="w-full max-w-md mx-auto">
      <label className="block text-sm font-medium text-gray-700 mb-4">
        Water Filter Model
      </label>
      
      <div className="space-y-3">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className={`w-full p-4 border rounded-lg text-left transition ${
              filterModel?.type === option.value
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">{option.label}</span>
              {option.certified && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  NSF Certified
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {filterModel?.type &&
        currentCertified === false &&
        filterModel?.type !== "unknown" && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-700">
              Non-certified filters may not remove PFAS. We'll factor this into
              your score.
            </p>
          </div>
        )}

      <p className="text-gray-500 text-sm mt-4">
        NSF-53 and NSF-58 are certified for PFAS removal.
      </p>
    </div>
  );
}
