"use client";

export function LoadingSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="h-40 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg animate-pulse" />
      <div className="h-20 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg animate-pulse" />
      <div className="h-32 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg animate-pulse" />
    </div>
  );
}

export function GaugeSkeleton() {
  return (
    <div className="w-40 h-40 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg animate-pulse mx-auto" />
  );
}

export function ChartSkeleton() {
  return (
    <div className="w-full h-64 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg animate-pulse" />
  );
}

export function CardSkeleton() {
  return (
    <div className="p-6 bg-white border border-gray-300 rounded-lg">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4 animate-pulse" />
      <div className="h-4 bg-gray-200 rounded w-full mb-2 animate-pulse" />
      <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse" />
    </div>
  );
}
