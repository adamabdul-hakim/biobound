"use client";

import { useAppStore } from "@/store/appStore";
import { useState, useEffect } from "react";

const cookwareTypes = [
  { value: "none",       icon: "🥗", name: "None / no non-stick", risk: "No PFAS",       riskClass: "risk-low" },
  { value: "10%",        icon: "🍳", name: "Minimal (~10%)",       risk: "Low exposure",  riskClass: "risk-low" },
  { value: "25%",        icon: "🫕", name: "Some (~25%)",          risk: "Low–moderate",  riskClass: "risk-med" },
  { value: "50%",        icon: "🍲", name: "Half (~50%)",          risk: "Moderate",      riskClass: "risk-med" },
  { value: "75%",        icon: "🍳", name: "Most (~75%)",          risk: "High exposure", riskClass: "risk-high" },
  { value: "100%",       icon: "⚠️", name: "All non-stick",        risk: "Very high",     riskClass: "risk-high" },
];

const yearOptions = [0, 1, 2, 3, 5, 7, 10, 15, 20];

export default function CookwareForm() {
  const { cookwareUse, setCookwareUse } = useAppStore();
  const [percentage, setPercentage] = useState<string>(cookwareUse?.brand || "none");
  const [yearsOfUse, setYearsOfUse] = useState<number>(cookwareUse?.yearsOfUse ?? 0);

  useEffect(() => {
    setCookwareUse({ brand: percentage, yearsOfUse });
  }, [percentage, yearsOfUse, setCookwareUse]);

  return (
    <div className="w-full space-y-6">

      {/* Cookware type grid */}
      <div>
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--text2)" }}>
          What percentage of your cookware is non-stick coated?
        </p>
        <div className="cookware-grid">
          {cookwareTypes.map((opt) => (
            <div
              key={opt.value}
              className={`cookware-card${percentage === opt.value ? " selected" : ""}`}
              onClick={() => setPercentage(opt.value)}
            >
              <div className="cookware-icon">{opt.icon}</div>
              <div className="cookware-name">{opt.name}</div>
              <div className={`cookware-risk ${opt.riskClass}`}>{opt.risk}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Years of use */}
      <div>
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--text2)" }}>
          How many years have you used non-stick cookware?
        </p>
        <div className="grid grid-cols-3 gap-2">
          {yearOptions.map((y) => (
            <button
              key={y}
              onClick={() => setYearsOfUse(y)}
              className={`py-3 px-3 rounded-lg font-bold transition-all active:scale-95 text-sm ${
                yearsOfUse === y ? "btn-select-active" : "btn-select-idle"
              }`}
            >
              {y === 0 ? "Never" : `${y}y`}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs leading-relaxed pl-3" style={{ color: "var(--text3)", borderLeft: "2px solid var(--border2)" }}>
        Scratched & older non-stick pans release more PFAS. Cast iron, stainless, or ceramic are the safest alternatives.
      </p>
    </div>
  );
}
