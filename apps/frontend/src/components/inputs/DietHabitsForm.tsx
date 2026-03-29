"use client";

import { useAppStore } from "@/store/appStore";
import { useEffect, useState } from "react";
import { Apple, AlertTriangle, ShieldCheck, Pill } from "lucide-react";

// PFAS-INCREASING foods (scientific basis: bioaccumulation in seafood, packaging migration, etc.)
const pfasRaisingFoods = [
  { id: "microwave-popcorn", label: "Microwave popcorn", note: "PFAS-lined bags" },
  { id: "fast-food", label: "Fast food (weekly+)", note: "Grease-resistant packaging" },
  { id: "seafood-frequent", label: "Seafood (3x/week+)", note: "Bioaccumulation in fish" },
  { id: "processed-meats", label: "Processed meats", note: "Packaging & processing" },
  { id: "canned-food", label: "Canned food (daily)", note: "Can lining migration" },
  { id: "stain-resist-packaging", label: "Pizza boxes / takeout containers", note: "PFAS-treated paperboard" },
  { id: "tap-water-unfiltered", label: "Unfiltered tap water for cooking", note: "Direct ingestion" },
];

// PFAS-REDUCING / protective foods
const pfasReducingFoods = [
  { id: "oats", label: "Oats / oatmeal", note: "Soluble fiber binds PFAS" },
  { id: "beans-lentils", label: "Beans & lentils", note: "High fiber, bile binding" },
  { id: "whole-wheat", label: "Whole grains", note: "Fiber supports clearance" },
  { id: "flax-chia", label: "Flax / chia seeds", note: "Omega-3 & fiber" },
  { id: "cruciferous", label: "Broccoli / cauliflower", note: "Detox pathways support" },
  { id: "blueberries", label: "Berries", note: "Antioxidant support" },
  { id: "psyllium", label: "Psyllium husk", note: "Strong bile-acid sequestrant" },
];

const medicationOptions = [
  "None",
  "Metformin",
  "Statins",
  "Blood pressure meds",
  "Thyroid medication",
  "Birth control",
  "Cholestyramine (bile binder)",
];

export default function DietHabitsForm() {
  const { dietHabits, setDietHabits } = useAppStore();

  const [raisingFoods, setRaisingFoods] = useState<string[]>(
    dietHabits?.foods?.filter((f) => pfasRaisingFoods.some((p) => p.id === f)) || []
  );
  const [reducingFoods, setReducingFoods] = useState<string[]>(
    dietHabits?.fiberSources || []
  );
  const [medications, setMedications] = useState<string[]>(
    dietHabits?.medications?.length ? dietHabits.medications : ["None"]
  );

  // Auto-save on any change
  useEffect(() => {
    setDietHabits({
      fiberSources: reducingFoods,
      foods: raisingFoods,
      medications,
    });
  }, [raisingFoods, reducingFoods, medications, setDietHabits]);

  const toggle = (list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setter((prev) => prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]);
  };

  const toggleMedication = (item: string) => {
    setMedications((prev) => {
      if (item === "None") return ["None"];
      const without = prev.filter((m) => m !== "None");
      const next = without.includes(item) ? without.filter((m) => m !== item) : [...without, item];
      return next.length === 0 ? ["None"] : next;
    });
  };

  return (
    <div className="w-full space-y-8">
      <label className="block text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text)" }}>
        <Apple className="w-4 h-4" style={{ color: "var(--accent)" }} />
        Diet &amp; Habits
      </label>

      {/* PFAS-raising foods */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "var(--warn)" }} />
          <label className="text-sm font-semibold" style={{ color: "var(--warn)" }}>
            Foods that increase PFAS exposure — select all you eat regularly
          </label>
        </div>
        <div className="space-y-2">
          {pfasRaisingFoods.map((food) => (
            <button
              key={food.id}
              onClick={() => toggle(raisingFoods, setRaisingFoods, food.id)}
              className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all active:scale-[.99] ${
                raisingFoods.includes(food.id) ? "btn-warn-active" : "btn-select-idle"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center"
                  style={{
                    borderColor: raisingFoods.includes(food.id) ? "var(--warn)" : "var(--border2)",
                    background: raisingFoods.includes(food.id) ? "var(--warn)" : "transparent",
                  }}
                >
                  {raisingFoods.includes(food.id) && <span style={{ color: "#0d0f0e" }} className="text-xs font-bold">✓</span>}
                </div>
                <span className="font-medium text-sm">{food.label}</span>
              </div>
              <span className="text-xs italic hidden sm:inline" style={{ color: "var(--text3)" }}>{food.note}</span>
            </button>
          ))}
        </div>
        {raisingFoods.length === 0 && (
          <p className="text-xs mt-2 pl-1" style={{ color: "var(--text3)" }}>None selected — these all raise PFAS body burden.</p>
        )}
      </div>

      {/* PFAS-reducing foods */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 flex-shrink-0" style={{ color: "var(--safe)" }} />
          <label className="text-sm font-semibold" style={{ color: "var(--safe)" }}>
            Protective foods — select all you eat regularly
          </label>
        </div>
        <div className="space-y-2">
          {pfasReducingFoods.map((food) => (
            <button
              key={food.id}
              onClick={() => toggle(reducingFoods, setReducingFoods, food.id)}
              className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all active:scale-[.99] ${
                reducingFoods.includes(food.id) ? "btn-safe-active" : "btn-select-idle"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center"
                  style={{
                    borderColor: reducingFoods.includes(food.id) ? "var(--safe)" : "var(--border2)",
                    background: reducingFoods.includes(food.id) ? "var(--safe)" : "transparent",
                  }}
                >
                  {reducingFoods.includes(food.id) && <span style={{ color: "#0d0f0e" }} className="text-xs font-bold">✓</span>}
                </div>
                <span className="font-medium text-sm">{food.label}</span>
              </div>
              <span className="text-xs italic hidden sm:inline" style={{ color: "var(--text3)" }}>{food.note}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Medications */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Pill className="w-4 h-4 flex-shrink-0" style={{ color: "var(--accent)" }} />
          <label className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Current medications — select all that apply
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {medicationOptions.map((med) => (
            <button
              key={med}
              onClick={() => toggleMedication(med)}
              className={`py-2.5 px-3 rounded-lg font-medium text-sm transition-all active:scale-95 text-left ${
                medications.includes(med) ? "btn-select-active" : "btn-select-idle"
              }`}
            >
              {med}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
