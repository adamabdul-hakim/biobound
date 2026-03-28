"use client";

import { X, AlertTriangle } from "lucide-react";

interface ErrorBannerProps {
  error: string | null;
  onClose?: () => void;
}

export default function ErrorBanner({ error, onClose }: ErrorBannerProps) {
  if (!error) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-50 border-b border-red-200 p-4 flex items-center justify-between z-50 shadow-md">
      <div className="flex items-center gap-3 max-w-2xl">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
        <p className="text-sm text-red-800">{error}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-red-600 hover:text-red-900 flex-shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
