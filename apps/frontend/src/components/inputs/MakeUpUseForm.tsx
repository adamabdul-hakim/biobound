"use client";

import { useAppStore } from "@/store/appStore";
import { useState } from "react";

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
    <div className="w-full max-w-md mx-auto space-y-4">
      <label className="block text-sm font-medium text-gray-700">Makeup Use</label>

      <div>
        <label className="block text-sm text-gray-600 mb-2 font-medium">Frequency:</label>
        <div className="grid grid-cols-2 gap-2">
          {frequencyOptions.map((option) => (
            <button
              key={option}
              onClick={() => setFrequency(option)}
              className={`py-2 px-3 border rounded-lg transition capitalize ${
                frequency === option
                  ? "bg-blue-500 text-white border-blue-500"
                  : "border-gray-300 text-gray-700 hover:border-blue-400"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-2 font-medium">
          Product types you use:
        </label>
        <div className="space-y-2">
          {productTypeOptions.map((option) => (
            <label key={option} className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={productTypes.includes(option)}
                onChange={() => toggleProductType(option)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="ml-2 text-gray-700 capitalize">{option}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Save Makeup Info
      </button>

      {makeUpUse && <p className="text-sm text-green-600">✓ Makeup info saved</p>}
    </div>
  );
}
