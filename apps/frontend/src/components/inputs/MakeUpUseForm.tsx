"use client";

import { useAppStore } from "@/store/appStore";
import { useState } from "react";
import { Sparkles, CheckCircle } from "lucide-react";

const frequencyOptions = ["never", "rarely", "weekly", "daily"] as const;

const productTypeOptions = [
  "foundation",
  "mascara",
  "lipstick",
  "eyeliner",
  "setting spray",
  "waterproof products",
];

export default function MakeUpUseForm() {
  const { makeUpUse, setMakeUpUse } = useAppStore();
  const [frequency, setFrequency] = useState<(typeof frequencyOptions)[number]>(
    makeUpUse?.frequency ?? "never",
  );
  const [productTypes, setProductTypes] = useState<string[]>(
    makeUpUse?.productTypes ?? [],
  );

  const toggleProductType = (productType: string) => {
    setProductTypes((prev) =>
      prev.includes(productType)
        ? prev.filter((item) => item !== productType)
        : [...prev, productType],
    );
  };

  const handleSave = () => {
    setMakeUpUse({ frequency, productTypes });
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <label className="block text-sm font-bold text-gray-100 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-teal-400" />
        Makeup Use
      </label>

      <div>
        <label className="block text-sm font-semibold text-gray-100 mb-3">
          How often do you use makeup?
        </label>
        <div className="grid grid-cols-2 gap-3">
          {frequencyOptions.map((option) => (
            <button
              key={option}
              onClick={() => setFrequency(option)}
              className={`py-3 px-3 border-2 rounded-lg transition-all font-bold capitalize active:scale-95 ${
                frequency === option
                  ? "bg-teal-600 text-white border-teal-500"
                  : "border-teal-700/30 text-gray-300 hover:border-teal-600 hover:bg-teal-900/30"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-100 mb-3">
          Product types you use:
        </label>
        <div className="space-y-2">
          {productTypeOptions.map((option) => (
            <label key={option} className="flex items-center cursor-pointer p-2 rounded-lg hover:bg-teal-900/20 transition">
              <input
                type="checkbox"
                checked={productTypes.includes(option)}
                onChange={() => toggleProductType(option)}
                className="w-5 h-5 rounded border-2 border-teal-700/50 text-teal-500 focus:ring-teal-400 accent-teal-500 bg-slate-600"
              />
              <span className="ml-3 text-gray-300 font-medium capitalize">{option}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full py-3 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-bold hover:from-teal-500 hover:to-emerald-500 transition-all active:scale-95"
      >
        Save Makeup Info
      </button>

      {makeUpUse && (
        <p className="text-sm text-emerald-300 p-3 bg-emerald-900/30 rounded-lg border border-emerald-700/50 font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          ✓ Makeup info saved
        </p>
      )}
    </div>
  );
}
