"use client";

import { useAppStore } from "@/store/appStore";
import { useState } from "react";

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
    <div className="w-full max-w-md mx-auto">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        ZIP Code
      </label>
      <input
        type="text"
        value={zipCode}
        onChange={handleChange}
        maxLength={5}
        placeholder="10001"
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
          isValid
            ? "border-gray-300 focus:ring-green-500"
            : "border-red-500 focus:ring-red-500"
        }`}
      />
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      <p className="text-gray-500 text-sm mt-2">
        We&apos;ll check EPA water quality data for your area.
      </p>
    </div>
  );
}
