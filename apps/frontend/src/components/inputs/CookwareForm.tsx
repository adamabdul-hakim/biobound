"use client";

import { useAppStore } from "@/store/appStore";
import { useState } from "react";
import { Flame, CheckCircle } from "lucide-react";

const percentageOptions = [
  "0%",
  "10%",
  "25%",
  "50%",
  "75%",
  "100%",
];

export default function CookwareForm() {
  const { cookwareUse, setCookwareUse } = useAppStore();
  const [percentage, setPercentage] = useState<string>(
    cookwareUse?.brand || ""
  );
  const [yearsOfUse, setYearsOfUse] = useState<string>(
    cookwareUse?.yearsOfUse?.toString() || "0"
  );

  const handleSave = () => {
    if (percentage) {
      setCookwareUse({
        brand: percentage,
        yearsOfUse: Math.max(0, parseInt(yearsOfUse, 10) || 0),
      });
    }
  };

  const isValid = percentage && parseInt(yearsOfUse, 10) >= 0;

  return (
    <div className="w-full max-w-md mx-auto">
      <label className="block text-sm font-bold text-gray-100 mb-4 flex items-center gap-2">
        <Flame className="w-4 h-4 text-teal-400" />
        Non-Stick Cookware Use
      </label>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-100 mb-3">
            Percentage of cookware that is non-stick:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {percentageOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setPercentage(opt)}
                className={`py-3 px-3 border-2 rounded-lg font-bold transition-all active:scale-95 ${
                  percentage === opt
                    ? "bg-teal-600 text-white border-teal-500"
                    : "border-teal-700/30 text-gray-300 hover:border-teal-600 hover:bg-teal-900/30"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-100 mb-3">
            Years of use:
          </label>
          <input
            type="number"
            value={yearsOfUse}
            onChange={(e) => setYearsOfUse(e.target.value)}
            min="0"
            max="100"
            className="w-full px-4 py-3 border-2 border-teal-700/30 bg-slate-600 text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-500 transition"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!isValid}
          className="w-full py-3 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-bold hover:from-teal-500 hover:to-emerald-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          Save Cookware Info
        </button>
      </div>

      {cookwareUse && (
        <p className="text-sm text-emerald-300 mt-4 p-3 bg-emerald-900/30 rounded-lg border border-emerald-700/50 font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          ✓ Saved: {cookwareUse.brand} for {cookwareUse.yearsOfUse} years
        </p>
      )}

      <p className="text-gray-400 text-sm mt-4 leading-relaxed">
        Non-stick cookware containing PFOA contributes to long-term PFAS exposure.
      </p>
    </div>
  );
}
