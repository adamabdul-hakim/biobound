"use client";

import { useAppStore } from "@/store/appStore";
import { useState } from "react";
import { MapPin, CheckCircle } from "lucide-react";

export default function ZipCodeInput() {
  const { zipCode, setZipCode } = useAppStore();
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setZipCode(value);
    if (value && !/^\d{5}$/.test(value)) {
      setError("Must be a 5-digit zip code");
    } else {
      setError("");
    }
  };

  const isValid = /^\d{5}$/.test(zipCode);

  return (
    <div className="w-full">
      <label className="block text-sm md:text-base font-bold text-gray-100 mb-4 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-teal-400" />
        Enter Your ZIP Code
      </label>
      
      <div className="relative mb-4">
        <input
          type="text"
          value={zipCode}
          onChange={handleChange}
          maxLength={5}
          placeholder="00000"
          className={`w-full px-6 py-4 md:py-5 border-2 rounded-xl focus:outline-none transition-all font-bold text-2xl md:text-3xl tracking-widest text-center bg-slate-600 text-gray-100 placeholder-gray-600 ${
            isValid
              ? "border-teal-500 focus:ring-2 focus:ring-teal-400 shadow-lg shadow-teal-500/20"
              : error
                ? "border-red-500 focus:ring-2 focus:ring-red-400"
                : "border-teal-700/50 focus:ring-2 focus:ring-teal-400"
          }`}
        />
        {isValid && (
          <CheckCircle className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-teal-400 animate-pulse" />
        )}
      </div>
      
      {error && (
        <p className="text-red-400 text-sm md:text-base mb-3 font-semibold flex items-center gap-2">
          ⚠️ {error}
        </p>
      )}
      
      {isValid && (
        <p className="text-emerald-300 text-sm md:text-base mb-3 font-semibold flex items-center gap-2 animate-in fade-in">
          ✓ ZIP code verified!
        </p>
      )}
      
      <p className="text-gray-400 text-sm leading-relaxed border-l-2 border-teal-600 pl-3">
        We check EPA water quality databases & UCMR5 data for your region to estimate PFAS exposure from drinking water.
      </p>
    </div>
  );
}
