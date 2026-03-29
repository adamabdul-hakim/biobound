"use client";

import { useAppStore } from "@/store/appStore";
import { useEffect, useState } from "react";
import { Baby, AlertTriangle } from "lucide-react";

export default function HouseholdForm() {
  const { householdProfile, setHouseholdProfile } = useAppStore();

  const [hasChildren, setHasChildren] = useState<boolean>(
    householdProfile?.hasChildrenUnder5 ?? false
  );
  const [count, setCount] = useState<number>(
    householdProfile?.numberOfChildren ?? 1
  );
  const [crawls, setCrawls] = useState<boolean>(
    householdProfile?.childrenCrawlOnFloor ?? true
  );

  // Auto-save
  useEffect(() => {
    setHouseholdProfile({
      hasChildrenUnder5: hasChildren,
      numberOfChildren: hasChildren ? count : 0,
      childrenCrawlOnFloor: hasChildren ? crawls : false,
    });
  }, [hasChildren, count, crawls, setHouseholdProfile]);

  return (
    <div className="w-full space-y-6">
      <label className="block text-sm font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
        <Baby className="w-4 h-4" style={{ color: "var(--accent)" }} />
        Children in Your Household
      </label>

      <p className="text-sm leading-relaxed pl-3" style={{ color: "var(--text2)", borderLeft: "2px solid var(--border2)" }}>
        Children under 5 who crawl on floors and put hands/objects in their mouths face
        significantly higher PFAS exposure — up to 10× more dust ingestion than adults.
        This is factored into your household score.
      </p>

      {/* Yes/No */}
      <div>
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--text2)" }}>
          Do you have children under 5 years old at home?
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[true, false].map((val) => (
            <button
              key={String(val)}
              onClick={() => setHasChildren(val)}
              className={`py-3 px-4 rounded-lg font-bold transition-all active:scale-95 ${
                hasChildren === val ? "btn-select-active" : "btn-select-idle"
              }`}
            >
              {val ? "Yes" : "No"}
            </button>
          ))}
        </div>
      </div>

      {hasChildren && (
        <>
          {/* Number of children */}
          <div>
            <p className="text-sm font-semibold mb-3" style={{ color: "var(--text2)" }}>How many children under 5?</p>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`py-3 rounded-lg font-bold text-lg transition-all active:scale-95 ${
                    count === n ? "btn-select-active" : "btn-select-idle"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Crawling */}
          <div>
            <p className="text-sm font-semibold mb-3" style={{ color: "var(--text2)" }}>
              Do they crawl on floors / put things in their mouths regularly?
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[true, false].map((val) => (
                <button
                  key={String(val)}
                  onClick={() => setCrawls(val)}
                  className={`py-3 px-4 rounded-lg font-bold transition-all active:scale-95 ${
                    crawls === val ? "btn-select-active" : "btn-select-idle"
                  }`}
                >
                  {val ? "Yes" : "Not really"}
                </button>
              ))}
            </div>
          </div>

          {crawls && (
            <div className="card-warn p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--warn)" }} />
              <p className="text-xs leading-relaxed" style={{ color: "var(--warn)" }}>
                Young children who crawl and mouth objects can ingest 10× the PFAS-contaminated
                dust compared to adults. Your household score will reflect this elevated risk.
              </p>
            </div>
          )}
        </>
      )}

      {!hasChildren && (
        <p className="text-xs text-gray-500 mt-2 pl-1">
          No children under 5 — noted.
        </p>
      )}
    </div>
  );
}
