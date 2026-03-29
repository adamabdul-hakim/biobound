"use client";

import { AlertTriangle } from "lucide-react";

interface MedWarningListProps {
  warnings: string[] | null;
}

export default function MedWarningList({ warnings }: MedWarningListProps) {
  if (!warnings || warnings.length === 0) {
    return (
      <div className="w-full p-5 bg-emerald-50 border-2 border-emerald-200 rounded-xl text-emerald-800 text-sm font-semibold">
        <p className="flex items-center gap-2">
          <span className="text-lg">✅</span>
          No medication interactions detected
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="font-bold text-gray-900 mb-6 text-xl flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-600" />
        Medication & Supplement Warnings
      </h3>

      <div className="space-y-4">
        {warnings.map((warning, idx) => (
          <div
            key={idx}
            className="p-5 bg-amber-50 border-2 border-amber-200 rounded-xl shadow-sm"
          >
            <p className="text-sm text-amber-900 font-medium leading-relaxed">⚠️ {warning}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 p-5 bg-blue-50 border-2 border-blue-200 rounded-xl text-sm text-blue-900">
        <p className="font-bold mb-2">🏥 Consult Your Healthcare Provider</p>
        <p className="leading-relaxed">
          Always discuss PFAS mitigation strategies and dietary changes with your doctor, especially if you take medications or have pre-existing conditions.
        </p>
      </div>
    </div>
  );
}
