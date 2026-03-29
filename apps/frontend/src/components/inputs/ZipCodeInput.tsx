"use client";

import { useAppStore } from "@/store/appStore";
import { useState, useEffect } from "react";
import { CheckCircle } from "lucide-react";
import { estimatePfasByZip } from "@/lib/pfasEstimation";

const DEMO_ZIPS = [
  { zip: "45895", label: "45895 · OH ⚠", title: "Wapakoneta, OH — near 3M plant" },
  { zip: "26101", label: "26101 · WV 🔴", title: "Parkersburg, WV — historic DuPont site" },
  { zip: "97201", label: "97201 · OR ✓", title: "Portland, OR — municipal filtration" },
  { zip: "45202", label: "45202 · OH ~", title: "Cincinnati, OH — Ohio River basin" },
];

export default function ZipCodeInput() {
  const { zipCode, setZipCode, setPfasEstimate, setPfasEstimateLoading, setPfasEstimateError } = useAppStore();
  const [error, setError] = useState("");

  useEffect(() => {
    const isValid = /^\d{5}$/.test(zipCode);
    if (isValid) {
      setPfasEstimateLoading(true);
      setPfasEstimateError(null);
      estimatePfasByZip(zipCode)
        .then((data) => { setPfasEstimate(data); setPfasEstimateLoading(false); })
        .catch((err) => { console.error("Failed to estimate PFAS:", err); setPfasEstimateError(err.message); setPfasEstimateLoading(false); });
    } else {
      setPfasEstimate(null);
      setPfasEstimateError(null);
    }
  }, [zipCode, setPfasEstimate, setPfasEstimateLoading, setPfasEstimateError]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setZipCode(value);
    setError(value && !/^\d{5}$/.test(value) ? "Must be a 5-digit zip code" : "");
  };

  const isValid = /^\d{5}$/.test(zipCode);

  return (
    <div className="w-full">
      {/* ZIP input */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <input
            type="text"
            value={zipCode}
            onChange={handleChange}
            maxLength={5}
            placeholder="00000"
            style={{
              width: "100%",
              padding: "14px 18px",
              background: "var(--surface2)",
              border: `0.5px solid ${isValid ? "var(--accent)" : error ? "var(--danger)" : "var(--border2)"}`,
              borderRadius: 10,
              fontFamily: "var(--mono)",
              fontSize: 22,
              color: "var(--text)",
              letterSpacing: "0.15em",
              outline: "none",
              textAlign: "center",
              transition: "border-color 0.2s",
            }}
          />
          {isValid && (
            <CheckCircle
              className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5"
              style={{ color: "var(--safe)" }}
            />
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm mb-3" style={{ color: "var(--danger)" }}>⚠ {error}</p>
      )}
      {isValid && (
        <p className="text-sm mb-3 animate-fade-up" style={{ color: "var(--safe)" }}>✓ ZIP code confirmed</p>
      )}

      {/* Demo zip presets */}
      <div style={{ marginTop: 12 }}>
        <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 8 }}>Try these real-world examples:</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {DEMO_ZIPS.map(({ zip, label, title }) => (
            <button
              key={zip}
              onClick={() => setZipCode(zip)}
              title={title}
              className="btn-ghost-bb"
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                padding: "6px 12px",
                borderColor: zipCode === zip ? "var(--accent)" : undefined,
                color: zipCode === zip ? "var(--accent)" : undefined,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm leading-relaxed mt-4 pl-3" style={{ color: "var(--text3)", borderLeft: "2px solid var(--border2)" }}>
        We check EPA water quality databases & UCMR5 data for your region to estimate PFAS exposure from drinking water.
      </p>
    </div>
  );
}
