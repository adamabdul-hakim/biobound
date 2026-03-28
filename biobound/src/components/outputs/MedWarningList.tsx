"use client";

import { AlertTriangle } from "lucide-react";

interface MedWarningListProps {
  warnings: string[] | null;
}

export default function MedWarningList({ warnings }: MedWarningListProps) {
  if (!warnings || warnings.length === 0) {
    return (
      <div className="w-full p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
        <p className="font-medium">✓ No medication interactions detected</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-yellow-600" />
        Medication & Supplement Warnings
      </h3>

      <div className="space-y-3">
        {warnings.map((warning, idx) => (
          <div
            key={idx}
            className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
          >
            <p className="text-sm text-yellow-800 leading-relaxed">{warning}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        <p className="font-medium mb-1">Consult Your Doctor</p>
        <p>
          Always discuss PFAS mitigation strategies and dietary interventions
          with your healthcare provider, especially if taking medications.
        </p>
      </div>
    </div>
  );
}
