"use client";

import { useAppStore } from "@/store/appStore";
import { useState } from "react";
import { Apple } from "lucide-react";

const fiberSourceOptions = [
  "oats",
  "beans",
  "lentils",
  "whole wheat",
  "psyllium husk",
  "flax seeds",
];

const foodCategories = [
  "dairy",
  "meat",
  "processed foods",
  "organic produce",
  "conventional produce",
];

const medicationOptions = [
  "metformin",
  "statins",
  "blood pressure meds",
  "none",
];

export default function DietHabitsForm() {
  const { dietHabits, setDietHabits } = useAppStore();
  const [fiberSources, setFiberSources] = useState<string[]>(
    dietHabits?.fiberSources || []
  );
  const [foods, setFoods] = useState<string[]>(dietHabits?.foods || []);
  const [medications, setMedications] = useState<string[]>(
    dietHabits?.medications || []
  );

  const toggleFiber = (item: string) => {
    setFiberSources((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const toggleFood = (item: string) => {
    setFoods((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const toggleMedication = (item: string) => {
    setMedications((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const handleSave = () => {
    if (fiberSources.length > 0 || foods.length > 0) {
      setDietHabits({
        fiberSources,
        foods,
        medications,
      });
    }
  };

  const isValid = fiberSources.length > 0 || foods.length > 0;

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <label className="block text-sm font-bold text-gray-100 flex items-center gap-2">
        <Apple className="w-4 h-4 text-teal-400" />
        Diet & Medications
      </label>

      <div>
        <label className="block text-sm font-semibold text-gray-100 mb-3">
          Fiber sources you consume:
        </label>
        <div className="space-y-2">
          {fiberSourceOptions.map((option) => (
            <label key={option} className="flex items-center cursor-pointer p-2 rounded-lg hover:bg-teal-900/20 transition">
              <input
                type="checkbox"
                checked={fiberSources.includes(option)}
                onChange={() => toggleFiber(option)}
                className="w-5 h-5 rounded border-2 border-teal-700/50 text-teal-500 focus:ring-teal-400 accent-teal-500 bg-slate-600"
              />
              <span className="ml-3 text-gray-300 font-medium capitalize">{option}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-100 mb-3">
          Food categories:
        </label>
        <div className="space-y-2">
          {foodCategories.map((option) => (
            <label key={option} className="flex items-center cursor-pointer p-2 rounded-lg hover:bg-teal-900/20 transition">
              <input
                type="checkbox"
                checked={foods.includes(option)}
                onChange={() => toggleFood(option)}
                className="w-5 h-5 rounded border-2 border-teal-700/50 text-teal-500 focus:ring-teal-400 accent-teal-500 bg-slate-600"
              />
              <span className="ml-3 text-gray-300 font-medium capitalize">{option}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-100 mb-3">
          Current medications:
        </label>
        <div className="space-y-2">
          {medicationOptions.map((option) => (
            <label key={option} className="flex items-center cursor-pointer p-2 rounded-lg hover:bg-teal-900/20 transition">
              <input
                type="checkbox"
                checked={medications.includes(option)}
                onChange={() => toggleMedication(option)}
                className="w-5 h-5 rounded border-2 border-teal-700/50 text-teal-500 focus:ring-teal-400 accent-teal-500 bg-slate-600"
              />
              <span className="ml-3 text-gray-300 font-medium capitalize">{option}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={!isValid}
        className="w-full py-3 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-bold hover:from-teal-500 hover:to-emerald-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed transition-all active:scale-95"
      >
        Save Diet Info
      </button>

      {dietHabits && (
        <p className="text-sm text-emerald-300">✓ Diet info saved</p>
      )}
    </div>
  );
}
