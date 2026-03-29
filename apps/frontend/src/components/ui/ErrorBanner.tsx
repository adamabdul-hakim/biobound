"use client";

import { X, AlertTriangle } from "lucide-react";

interface ErrorBannerProps {
  error: string | null;
  onClose?: () => void;
}

export default function ErrorBanner({ error, onClose }: ErrorBannerProps) {
  if (!error) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-50 border-b-2 border-red-300 p-5 flex items-center justify-between z-50 shadow-lg">
      <div className="flex items-center gap-3 max-w-2xl">
        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 animate-pulse" />
        <p className="text-sm font-semibold text-red-800">{error}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-red-600 hover:text-red-800 flex-shrink-0 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
