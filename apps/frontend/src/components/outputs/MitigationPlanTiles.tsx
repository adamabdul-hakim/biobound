"use client";

import { MitigationTier } from "@/store/appStore";
import { CheckCircle, Zap, Sparkles } from "lucide-react";

interface MitigationPlanTilesProps {
  plan: MitigationTier[] | null;
}

const tierIcons = {
  1: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", label: "Zero-Cost" },
  2: { icon: Zap, color: "text-blue-600", bg: "bg-blue-50", label: "Low-Cost" },
  3: { icon: Sparkles, color: "text-purple-600", bg: "bg-purple-50", label: "High Impact" },
};

export default function MitigationPlanTiles({ plan }: MitigationPlanTilesProps) {
  if (!plan || plan.length === 0) {
    return (
      <div className="w-full p-6 bg-gray-50 rounded-xl text-gray-600 text-sm border border-gray-200">
        No mitigation plan available
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="font-bold text-gray-900 mb-8 text-xl">Your Mitigation Plan</h3>

      <div className="grid md:grid-cols-3 gap-6">
        {plan.map((tier) => {
          const tierConfig = tierIcons[tier.tier as 1 | 2 | 3];
          const Icon = tierConfig?.icon || CheckCircle;

          return (
            <div
              key={tier.tier}
              className={`p-6 rounded-xl border-2 transition-all hover:shadow-lg ${
                tierConfig?.bg || "bg-gray-50"
              } ${
                tier.tier === 1
                  ? "border-green-200 hover:border-green-400"
                  : tier.tier === 2
                    ? "border-blue-200 hover:border-blue-400"
                    : "border-purple-200 hover:border-purple-400"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <Icon className={`w-6 h-6 ${tierConfig?.color}`} />
                <div>
                  <p className="text-xs text-gray-600 uppercase font-bold tracking-wide">
                    Tier {tier.tier}
                  </p>
                  <p className="font-bold text-gray-900">
                    {tierConfig?.label}
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-4">{tier.description}</p>

              <p className="text-xs font-bold text-gray-700 mb-4 inline-block px-3 py-1 bg-white rounded-full border border-gray-200">
                {tier.cost}
              </p>

              <ul className="space-y-2">
                {tier.actions.map((action, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-gray-700"
                  >
                    <span className="text-green-600 font-bold flex-shrink-0 mt-0.5">
                      •
                    </span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          <strong>Tip:</strong> Start with Tier 1 actions for immediate impact,
          then progress to Tier 2 and 3 as your budget allows.
        </p>
      </div>
    </div>
  );
}
