"use client";

import { useAppStore } from "@/store/appStore";
import { Camera, FileText, CheckCircle } from "lucide-react";
import { useState } from "react";

export default function ProductScanner() {
  const { productScan, setProductScan } = useAppStore();
  const [method, setMethod] = useState<"text" | "upload" | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProductScan(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTextInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setProductScan(e.target.value);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <label className="block text-sm font-bold text-gray-100 mb-4">
        Product Ingredients (Optional)
      </label>

      {method === null ? (
        <div className="space-y-3">
          <button
            onClick={() => setMethod("upload")}
            className="w-full p-5 border-2 border-teal-700/30 rounded-xl hover:border-teal-600 hover:bg-teal-900/20 transition-all active:scale-95 text-left group"
          >
            <Camera className="w-5 h-5 inline mr-2 text-teal-400 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-gray-100">Upload Product Image</span>
            <p className="text-sm text-gray-400 mt-1 ml-7">Scan product label for OCR analysis</p>
          </button>
          <button
            onClick={() => setMethod("text")}
            className="w-full p-5 border-2 border-teal-700/30 rounded-xl hover:border-teal-600 hover:bg-teal-900/20 transition-all active:scale-95 text-left group"
          >
            <FileText className="w-5 h-5 inline mr-2 text-teal-400 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-gray-100">Enter Product Name</span>
            <p className="text-sm text-gray-400 mt-1 ml-7">Manually search product database</p>
          </button>
        </div>
      ) : method === "upload" ? (
        <div className="border-2 border-dashed border-teal-700/50 rounded-xl p-8 text-center bg-teal-900/20 backdrop-blur-sm">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full cursor-pointer"
          />
          <Camera className="w-8 h-8 mx-auto mb-2 text-teal-400" />
          <p className="text-sm text-gray-100 font-semibold mb-2">
            Upload a product image for analysis
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Supports JPG, PNG, WebP
          </p>
          {productScan && (
            <p className="text-sm text-emerald-300 font-bold flex items-center gap-1 justify-center mb-4">
              <CheckCircle className="w-4 h-4" />
              Image uploaded
            </p>
          )}
          <button
            onClick={() => setMethod(null)}
            className="text-sm text-teal-400 hover:text-teal-300 font-semibold transition"
          >
            Change method
          </button>
        </div>
      ) : (
        <div>
          <textarea
            value={productScan || ""}
            onChange={handleTextInput}
            placeholder="e.g., Teflon non-stick pan, Nordic Ware bakeware"
            className="w-full px-4 py-3 border-2 border-teal-700/30 bg-slate-600 text-gray-100 placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-600 transition resize-none"
            rows={4}
          />
          {productScan && (
            <p className="text-sm text-emerald-300 font-bold mt-2 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Product name entered
            </p>
          )}
          <button
            onClick={() => setMethod(null)}
            className="text-sm text-teal-400 hover:text-teal-300 font-semibold mt-3 transition"
          >
            Change method
          </button>
        </div>
      )}

      <p className="text-gray-600 text-sm mt-4 leading-relaxed">
        PFAS is commonly found in waterproof and non-stick products. We&apos;ll cross-reference with known contamination sources.
      </p>
    </div>
  );
}
