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
    <div className="w-full bg-amber-50 border-2 border-amber-300 rounded-xl p-5 flex items-start gap-4 shadow-sm">
      <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="font-bold text-amber-900 mb-1 text-lg">Water Filter Alert</h3>
        <p className="text-sm text-amber-800 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}
