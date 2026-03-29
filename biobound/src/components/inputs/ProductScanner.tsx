"use client";

import { useAppStore } from "@/store/appStore";
import { Camera } from "lucide-react";
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
      <label className="block text-sm font-medium text-gray-700 mb-4">
        Product Scan (Optional)
      </label>

      {method === null ? (
        <div className="space-y-2">
          <button
            onClick={() => setMethod("upload")}
            className="w-full p-4 border border-gray-300 rounded-lg hover:border-blue-500 transition text-left"
          >
            <Camera className="w-5 h-5 inline mr-2" />
            <span className="font-medium">Upload Product Image</span>
          </button>
          <button
            onClick={() => setMethod("text")}
            className="w-full p-4 border border-gray-300 rounded-lg hover:border-blue-500 transition text-left"
          >
            <span className="font-medium">Enter Product Name</span>
          </button>
        </div>
      ) : method === "upload" ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full"
          />
          <p className="text-sm text-gray-500 mt-2">
            Upload a product image for OCR analysis
          </p>
          <button
            onClick={() => setMethod(null)}
            className="text-sm text-blue-600 mt-2 hover:underline"
          >
            Change method
          </button>
        </div>
      ) : (
        <div>
          <textarea
            value={productScan || ""}
            onChange={handleTextInput}
            placeholder="e.g., Teflon non-stick pan"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
          <button
            onClick={() => setMethod(null)}
            className="text-sm text-blue-600 mt-2 hover:underline"
          >
            Change method
          </button>
        </div>
      )}

      <p className="text-gray-500 text-sm mt-4">
        This step is optional. Your analysis will continue without it.
      </p>
    </div>
  );
}
