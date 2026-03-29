"use client";

import { useAppStore } from "@/store/appStore";
import { useEffect, useState } from "react";
import { Sparkles, Wind } from "lucide-react";

const frequencyOptions = ["never", "rarely", "weekly", "daily"] as const;

const makeupProductOptions = [
  "Foundation / BB cream",
  "Mascara",
  "Lipstick / lip gloss",
  "Eyeliner",
  "Setting spray",
  "Waterproof products",
  "Pressed powder",
  "Blush / bronzer",
];

const shampooProductOptions = [
  "Regular shampoo",
  "Conditioner",
  "Dry shampoo",
  "Hair spray / styling spray",
  "Leave-in treatments",
  "Keratin / straightening treatments",
  "None / bar shampoo only",
];

export default function MakeUpUseForm() {
  const { makeUpUse, setMakeUpUse } = useAppStore();

  const [frequency, setFrequency] = useState<(typeof frequencyOptions)[number]>(
    makeUpUse?.frequency ?? "never"
  );
  const [productTypes, setProductTypes] = useState<string[]>(
    makeUpUse?.productTypes ?? []
  );
  const [shampooProducts, setShampooProducts] = useState<string[]>(
    (makeUpUse as any)?.shampooProducts ?? []
  );

  // Auto-save whenever anything changes
  useEffect(() => {
    setMakeUpUse({ frequency, productTypes, ...(({ shampooProducts } as any)) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frequency, productTypes, shampooProducts]);

  const toggle = (list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setter((prev) => prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]);
  };

  return (
    <div className="w-full space-y-8">
      {/* ── Makeup Section ───────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-bold text-gray-100 mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-400" />
          Makeup Use
        </label>

        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-300 mb-3">How often do you use makeup?</p>
          <div className="grid grid-cols-2 gap-3">
            {frequencyOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setFrequency(opt)}
                className={`py-3 px-3 border-2 rounded-lg transition-all font-bold capitalize active:scale-95 text-sm ${
                  frequency === opt
                    ? "bg-teal-600 text-white border-teal-500 shadow-md shadow-teal-500/20"
                    : "border-teal-700/30 text-gray-300 hover:border-teal-600 hover:bg-teal-900/30"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {frequency !== "never" && (
          <div>
            <p className="text-sm font-semibold text-gray-300 mb-3">Which products do you use?</p>
            <div className="grid grid-cols-2 gap-2">
              {makeupProductOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => toggle(productTypes, setProductTypes, opt)}
                  className={`py-2.5 px-3 border-2 rounded-lg font-medium text-sm transition-all active:scale-95 text-left ${
                    productTypes.includes(opt)
                      ? "border-teal-500 bg-teal-900/40 text-teal-200"
                      : "border-slate-600/50 text-gray-400 hover:border-teal-700/50 hover:bg-teal-900/10"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Shampoo & Hair Care Section ───────────────────────────── */}
      <div>
        <label className="block text-sm font-bold text-gray-100 mb-4 flex items-center gap-2">
          <Wind className="w-4 h-4 text-teal-400" />
          Shampoo & Hair Care
        </label>
        <p className="text-sm text-gray-400 mb-3 leading-relaxed">
          Many shampoos and hair products contain PFAS for smoothness and water resistance — select all you use.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {shampooProductOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => toggle(shampooProducts, setShampooProducts, opt)}
              className={`py-2.5 px-3 border-2 rounded-lg font-medium text-sm transition-all active:scale-95 text-left ${
                shampooProducts.includes(opt)
                  ? "border-teal-500 bg-teal-900/40 text-teal-200"
                  : "border-slate-600/50 text-gray-400 hover:border-teal-700/50 hover:bg-teal-900/10"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
