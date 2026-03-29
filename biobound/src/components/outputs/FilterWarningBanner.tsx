"use client";

import { AlertTriangle } from "lucide-react";

interface FilterWarningBannerProps {
  message: string | null;
}

export default function FilterWarningBanner({
  message,
}: FilterWarningBannerProps) {
  if (!message) return null;

  return (
    <div className="w-full bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="font-semibold text-red-900 mb-1">Filter Warning</h3>
        <p className="text-sm text-red-800">{message}</p>
      </div>
    </div>
  );
}
