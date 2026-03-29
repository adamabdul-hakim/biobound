"use client";

import { PfasFlag } from "@/store/appStore";
import { Zap } from "lucide-react";

interface PfasFlagListProps {
  flags: PfasFlag[] | null;
}

const tierConfig = {
  low: { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-900", badge: "bg-teal-100 text-teal-700", icon: "🟢" },
  medium: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", badge: "bg-amber-100 text-amber-700", icon: "🟡" },
  high: { bg: "bg-red-50", border: "border-red-200", text: "text-red-900", badge: "bg-red-100 text-red-700", icon: "🔴" },
};

export default function PfasFlagList({ flags }: PfasFlagListProps) {
  if (!flags || flags.length === 0) {
    return (
      <div className="w-full p-5 bg-emerald-50 border-2 border-emerald-200 rounded-xl text-emerald-800 font-semibold">
        <p className="text-sm flex items-center gap-2">
          <span className="text-lg">✅</span>
          No PFAS compounds detected in your profile
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <h3 className="font-bold text-gray-900 text-xl flex items-center gap-2">
        <Zap className="w-5 h-5 text-emerald-600" />
        Detected PFAS Compounds
      </h3>
      <div className="space-y-3">
        {flags.map((flag, idx) => {
          const config = tierConfig[flag.tier];
          return (
            <div
              key={idx}
              className={`p-4 border-2 rounded-xl ${config.bg} ${config.border} transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-bold text-lg ${config.text}`}>
                  {config.icon} {flag.compound}
                </span>
                <span
                  className={`text-xs font-bold px-3 py-1.5 rounded-full ${config.badge}`}
                >
                  {flag.tier.charAt(0).toUpperCase() + flag.tier.slice(1)} Risk
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
