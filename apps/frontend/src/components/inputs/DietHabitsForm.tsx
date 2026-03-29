"use client";

import { useAppStore } from "@/store/appStore";
import { useState } from "react";

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
    <div className="w-full max-w-md mx-auto space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Diet & Habits
      </label>

      <div>
        <label className="block text-sm text-gray-600 mb-2 font-medium">
          Fiber sources you consume:
        </label>
        <div className="space-y-2">
          {fiberSourceOptions.map((option) => (
            <label key={option} className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={fiberSources.includes(option)}
                onChange={() => toggleFiber(option)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="ml-2 text-gray-700 capitalize">{option}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-2 font-medium">
          Food categories:
        </label>
        <div className="space-y-2">
          {foodCategories.map((option) => (
            <label key={option} className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={foods.includes(option)}
                onChange={() => toggleFood(option)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="ml-2 text-gray-700 capitalize">{option}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-2 font-medium">
          Current medications:
        </label>
        <div className="space-y-2">
          {medicationOptions.map((option) => (
            <label key={option} className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={medications.includes(option)}
                onChange={() => toggleMedication(option)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="ml-2 text-gray-700 capitalize">{option}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={!isValid}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
      >
        Save Diet Info
      </button>

      {dietHabits && (
        <p className="text-sm text-green-600">✓ Diet info saved</p>
      )}
    </div>
  );
}
