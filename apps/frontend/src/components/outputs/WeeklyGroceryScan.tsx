"use client";

import { useState } from "react";
import { ShoppingCart, Camera, FileText, CheckCircle, Loader, AlertCircle, X } from "lucide-react";

interface ScanResult {
  productName: string;
  chemicals: string[];
  riskScore: number;
  warnings: string[];
}

interface WeeklyGroceryScanProps {
  basePayload: {
    zipCode: string;
    filterModel: { brand: string; type: string } | null;
    cookwareUse: { brand: string; yearsOfUse: number } | null;
    dietHabits: { fiberSources: string[]; foods: string[]; medications: string[] } | null;
    makeUpUse: { frequency: "never" | "rarely" | "weekly" | "daily"; productTypes: string[] } | null;
  };
}

export default function WeeklyGroceryScan({ basePayload }: WeeklyGroceryScanProps) {
  const [expanded, setExpanded] = useState(true);
  const [mode, setMode] = useState<"idle" | "text" | "upload">("idle");
  const [input, setInput] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImageData(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!input.trim() && !imageData) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        ...basePayload,
        productScan: input.trim() || null,
        ...(imageData ? { image_base64: imageData } : {}),
      };

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Scan failed");
      }

      setResult({
        productName: data.product_name || input.trim() || "Scanned product",
        chemicals: data.detected_chemicals ?? [],
        riskScore: data.module_scores?.scanner ?? 0,
        warnings: data.medical_warnings ?? [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed. Try a different product name.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMode("idle");
    setInput("");
    setImageData(null);
    setResult(null);
    setError(null);
  };

  const riskLabel = (score: number) =>
    score >= 67 ? { label: "High PFAS Risk", color: "text-rose-400 bg-rose-900/30 border-rose-700/40" }
    : score >= 33 ? { label: "Moderate PFAS Risk", color: "text-amber-400 bg-amber-900/30 border-amber-700/40" }
    : { label: "Low PFAS Risk", color: "text-emerald-400 bg-emerald-900/30 border-emerald-700/40" };

  return (
    <div className="w-full bg-slate-800/80 backdrop-blur-xl border border-teal-600/40 rounded-2xl shadow-2xl p-6">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 group mb-1"
      >
        <h3 className="font-bold text-gray-100 text-xl flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-teal-400" />
          Weekly Product Scan
          <span className="text-xs font-medium text-teal-300 bg-teal-900/50 border border-teal-700/40 px-2 py-0.5 rounded-full">New</span>
        </h3>
        <span className="text-xs text-teal-400 bg-teal-900/40 border border-teal-700/40 px-3 py-1 rounded-full font-semibold group-hover:bg-teal-900/60 transition flex-shrink-0">
          {expanded ? "Hide ▲" : "Scan a Product ▼"}
        </span>
      </button>
      <p className="text-sm text-gray-400 mb-4 leading-relaxed">
        Check any grocery item, cookware, or personal care product for PFAS risk — do this weekly as part of your action plan.
      </p>

      {expanded && (
        <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-4">
          {mode === "idle" && !result && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode("text")}
                className="p-4 border border-teal-700/40 rounded-lg hover:border-teal-500 hover:bg-teal-900/20 transition text-left"
              >
                <FileText className="w-4 h-4 text-teal-400 mb-2" />
                <p className="font-semibold text-gray-100 text-sm">Enter product name</p>
                <p className="text-xs text-gray-500 mt-1">e.g., "Teflon skillet"</p>
              </button>
              <button
                onClick={() => setMode("upload")}
                className="p-4 border border-teal-700/40 rounded-lg hover:border-teal-500 hover:bg-teal-900/20 transition text-left"
              >
                <Camera className="w-4 h-4 text-teal-400 mb-2" />
                <p className="font-semibold text-gray-100 text-sm">Upload product image</p>
                <p className="text-xs text-gray-500 mt-1">Scan ingredient label</p>
              </button>
            </div>
          )}

          {mode === "text" && !result && (
            <div className="space-y-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
                placeholder="Product name or ingredient (e.g., non-stick pan, canned tuna...)"
                className="w-full px-4 py-3 bg-slate-700/60 border border-teal-700/40 text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleScan}
                  disabled={!input.trim() || loading}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg transition flex items-center justify-center gap-2"
                >
                  {loading ? <Loader className="w-4 h-4 animate-spin" /> : null}
                  {loading ? "Scanning..." : "Check for PFAS"}
                </button>
                <button onClick={reset} className="px-3 py-2.5 border border-slate-600 text-gray-400 hover:text-gray-200 rounded-lg transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {mode === "upload" && !result && (
            <div className="space-y-3">
              <div className="border-2 border-dashed border-teal-700/40 rounded-lg p-6 text-center bg-slate-900/40">
                <Camera className="w-8 h-8 mx-auto mb-2 text-teal-500 opacity-60" />
                <input type="file" accept="image/*" onChange={handleFile} className="w-full cursor-pointer text-sm text-gray-400" />
                {imageData && (
                  <p className="text-sm text-emerald-400 font-semibold mt-2 flex items-center gap-1 justify-center">
                    <CheckCircle className="w-4 h-4" /> Image ready
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleScan}
                  disabled={!imageData || loading}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg transition flex items-center justify-center gap-2"
                >
                  {loading ? <Loader className="w-4 h-4 animate-spin" /> : null}
                  {loading ? "Analyzing..." : "Analyze Image"}
                </button>
                <button onClick={reset} className="px-3 py-2.5 border border-slate-600 text-gray-400 hover:text-gray-200 rounded-lg transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-red-900/20 border border-red-700/40 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-bold text-gray-100">{result.productName}</p>
                <button onClick={reset} className="text-xs text-teal-400 hover:text-teal-300 font-semibold transition">
                  Scan another →
                </button>
              </div>

              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${riskLabel(result.riskScore).color}`}>
                {riskLabel(result.riskScore).label}
              </div>

              {result.chemicals.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Detected substances</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.chemicals.map((c, i) => (
                      <span key={i} className="text-xs bg-rose-900/30 border border-rose-700/40 text-rose-300 px-2 py-1 rounded-full font-semibold">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-emerald-400">No known PFAS compounds detected in this product.</p>
              )}

              {result.warnings.length > 0 && (
                <div className="p-3 bg-amber-900/20 border border-amber-700/40 rounded-lg">
                  {result.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-300">{w}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
