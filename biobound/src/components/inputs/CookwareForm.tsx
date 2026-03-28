"use client";

import { useAppStore } from "@/store/appStore";
import { useState } from "react";

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
      <label className="block text-sm font-medium text-gray-700 mb-4">
        Non-Stick Cookware Use
      </label>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-2">
            Percentage of cookware that is non-stick:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {percentageOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setPercentage(opt)}
                className={`py-2 px-3 border rounded-lg transition ${
                  percentage === opt
                    ? "bg-blue-500 text-white border-blue-500"
                    : "border-gray-300 text-gray-700 hover:border-blue-400"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2">
            Years of use:
          </label>
          <input
            type="number"
            value={yearsOfUse}
            onChange={(e) => setYearsOfUse(e.target.value)}
            min="0"
            max="100"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!isValid}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          Save Cookware Info
        </button>
      </div>

      {cookwareUse && (
        <p className="text-sm text-green-600 mt-4">
          ✓ Cookware info saved: {cookwareUse.brand} non-stick for{" "}
          {cookwareUse.yearsOfUse} years
        </p>
      )}

      <p className="text-gray-500 text-sm mt-4">
        This helps assess your long-term PFAS exposure from cookware.
      </p>
    </div>
  );
}
