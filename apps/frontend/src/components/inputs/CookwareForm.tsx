"use client";

import { useAppStore } from "@/store/appStore";
import { useState, useEffect } from "react";
import { Flame } from "lucide-react";

const percentageOptions = ["0%", "10%", "25%", "50%", "75%", "100%"];
const yearOptions = [0, 1, 2, 3, 5, 7, 10, 15, 20];

export default function CookwareForm() {
  const { cookwareUse, setCookwareUse } = useAppStore();
  const [percentage, setPercentage] = useState<string>(cookwareUse?.brand || "0%");
  const [yearsOfUse, setYearsOfUse] = useState<number>(cookwareUse?.yearsOfUse ?? 0);

  // Auto-save on any change
  useEffect(() => {
    setCookwareUse({ brand: percentage, yearsOfUse });
  }, [percentage, yearsOfUse, setCookwareUse]);

  return (
    <div className="w-full space-y-6">
      <label className="block text-sm font-bold text-gray-100 flex items-center gap-2">
        <Flame className="w-4 h-4 text-teal-400" />
        Non-Stick Cookware Use
      </label>

      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-3">
          What percentage of your cookware is non-stick coated?
        </label>
        <div className="grid grid-cols-3 gap-2">
          {percentageOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => setPercentage(opt)}
              className={`py-3 px-3 border-2 rounded-lg font-bold transition-all active:scale-95 text-sm ${
                percentage === opt
                  ? "bg-teal-600 text-white border-teal-500 shadow-md shadow-teal-500/20"
                  : "border-teal-700/30 text-gray-300 hover:border-teal-600 hover:bg-teal-900/30"
              }`}
            >
              {opt === "0%" ? "None" : opt}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-3">
          How many years have you used non-stick cookware?
        </label>
        <div className="grid grid-cols-3 gap-2">
          {yearOptions.map((y) => (
            <button
              key={y}
              onClick={() => setYearsOfUse(y)}
              className={`py-3 px-3 border-2 rounded-lg font-bold transition-all active:scale-95 text-sm ${
                yearsOfUse === y
                  ? "bg-teal-600 text-white border-teal-500 shadow-md shadow-teal-500/20"
                  : "border-teal-700/30 text-gray-300 hover:border-teal-600 hover:bg-teal-900/30"
              }`}
            >
              {y === 0 ? "Never" : `${y}y`}
            </button>
          ))}
        </div>
      </div>

      <p className="text-gray-500 text-xs leading-relaxed border-l-2 border-teal-700 pl-3">
        Scratched & older non-stick pans release more PFAS. Even 0% non-stick is a valid answer if you use stainless, cast iron, or ceramic.
      </p>
    </div>
  );
}
