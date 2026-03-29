"use client";

import { MitigationTier } from "@/store/appStore";
import { CheckCircle, TrendingDown } from "lucide-react";

interface MitigationPlanTilesProps {
  plan: MitigationTier[] | null;
}

export default function MitigationPlanTiles({ plan }: MitigationPlanTilesProps) {
  if (!plan || plan.length === 0) {
    return (
      <div className="w-full p-6 bg-slate-800/60 rounded-xl text-gray-400 text-sm border border-teal-700/30">
        No mitigation plan available
      </div>
    );
  }

  const allActions = plan.flatMap((tier) => tier.actions);

  return (
    <div className="w-full">
      <h3 className="font-bold text-gray-100 mb-6 text-xl flex items-center gap-2">
        <TrendingDown className="w-5 h-5 text-emerald-400" />
        Your Action Plan
      </h3>

      <div className="bg-slate-800/80 border border-teal-700/30 rounded-xl p-6">
        <ul className="space-y-4">
          {allActions.map((action, idx) => (
            <li key={idx} className="flex items-start gap-3 text-sm text-gray-200">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
