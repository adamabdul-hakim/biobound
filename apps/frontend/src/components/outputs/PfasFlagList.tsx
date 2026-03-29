"use client";

import { PfasFlag } from "@/store/appStore";
import { Zap } from "lucide-react";

interface PfasFlagListProps {
  flags: PfasFlag[] | null;
}

const tierConfig = {
  low: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", badge: "bg-blue-100 text-blue-700" },
  medium: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", badge: "bg-yellow-100 text-yellow-700" },
  high: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", badge: "bg-red-100 text-red-700" },
};

export default function PfasFlagList({ flags }: PfasFlagListProps) {
  if (!flags || flags.length === 0) {
    return (
      <div className="w-full p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
        <p className="text-sm font-medium">✓ No PFAS compounds detected</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
        <Zap className="w-5 h-5 text-orange-500" />
        Detected PFAS Compounds
      </h3>
      <div className="space-y-2">
        {flags.map((flag, idx) => {
          const config = tierConfig[flag.tier];
          return (
            <div
              key={idx}
              className={`p-3 border rounded-lg ${config.bg} ${config.border}`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-medium ${config.text}`}>
                  {flag.compound}
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded ${config.badge}`}
                >
                  {flag.tier.charAt(0).toUpperCase() + flag.tier.slice(1)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
