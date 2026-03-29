"use client";

import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import { callIntegratedAnalyzeApi, computeLifestyleREI } from "@/lib/analyzeIntegration";
import type { TeamAAnalyzeInput } from "@/lib/analyzeIntegration";
import { useRouter } from "next/navigation";
import { Loader, User, Users, Baby, UserCog, ChevronDown } from "lucide-react";

interface MemberPayload {
  cookwareUse: { brand: string; yearsOfUse: number };
  dietHabits: { fiberSources: string[]; foods: string[]; medications: string[] };
  makeUpUse: { frequency: "never" | "rarely" | "weekly" | "daily"; productTypes: string[]; shampooProducts: string[] };
  householdProfile: { hasChildrenUnder5: boolean; numberOfChildren: number; childrenCrawlOnFloor: boolean };
}

interface FamilyMember {
  name: string;
  age: string;
  exposureNote: string;
  isCrawlingInfant?: boolean;
  memberPayload: MemberPayload;
}

interface DemoProfile {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  description: string;
  accentColor: string;
  waterScoreHint?: number;
  familyMembers?: FamilyMember[];
  data: {
    zipCode: string;
    filterModel: { brand: string; type: string };
    cookwareUse: { brand: string; yearsOfUse: number };
    dietHabits: { fiberSources: string[]; foods: string[]; medications: string[] };
    makeUpUse: { frequency: "never" | "rarely" | "weekly" | "daily"; productTypes: string[]; shampooProducts: string[] };
    householdProfile: { hasChildrenUnder5: boolean; numberOfChildren: number; childrenCrawlOnFloor: boolean };
  };
}

const DEMO_PROFILES: DemoProfile[] = [
  {
    id: "average-joe",
    label: "Average Joe",
    subtitle: "Mid-sized US city, moderate risk",
    icon: <User className="w-5 h-5" />,
    description: "A typical adult in a mid-sized city with standard diet and cookware.",
    accentColor: "teal",
    data: {
      zipCode: "45202",
      filterModel: { brand: "", type: "pitcher-standard" },
      cookwareUse: { brand: "50%", yearsOfUse: 5 },
      dietHabits: {
        fiberSources: ["oats", "beans"],
        foods: ["fast_food", "canned_food"],
        medications: ["none"],
      },
      makeUpUse: { frequency: "rarely", productTypes: [], shampooProducts: ["Regular shampoo"] },
      householdProfile: { hasChildrenUnder5: false, numberOfChildren: 0, childrenCrawlOnFloor: false },
    },
  },
  {
    id: "senior",
    label: "Senior 65+",
    subtitle: "High-PFAS area, elevated risk",
    icon: <UserCog className="w-5 h-5" />,
    description: "A senior living near a known contamination site with older cookware and minimal fiber intake.",
    accentColor: "amber",
    data: {
      zipCode: "45742",
      filterModel: { brand: "", type: "none" },
      cookwareUse: { brand: "100%", yearsOfUse: 15 },
      dietHabits: {
        fiberSources: [],
        foods: ["processed_meats", "canned_food", "fast_food", "microwave_popcorn"],
        medications: ["cholesterol_meds", "blood_pressure_meds"],
      },
      makeUpUse: { frequency: "never", productTypes: [], shampooProducts: [] },
      householdProfile: { hasChildrenUnder5: false, numberOfChildren: 0, childrenCrawlOnFloor: false },
    },
  },
  {
    id: "child",
    label: "5-Year-Old Child",
    subtitle: "High-PFAS area, crawling exposure",
    icon: <Baby className="w-5 h-5" />,
    description: "A young child in a contaminated area â€” simulates elevated dust ingestion from floor contact.",
    accentColor: "rose",
    data: {
      zipCode: "45742",
      filterModel: { brand: "", type: "none" },
      cookwareUse: { brand: "75%", yearsOfUse: 8 },
      dietHabits: {
        fiberSources: [],
        foods: ["fast_food", "microwave_popcorn", "stain-resist-packaging", "processed_meats"],
        medications: ["none"],
      },
      makeUpUse: { frequency: "never", productTypes: [], shampooProducts: ["Regular shampoo"] },
      householdProfile: { hasChildrenUnder5: true, numberOfChildren: 1, childrenCrawlOnFloor: true },
    },
  },
  {
    id: "family",
    label: "Family of 4",
    subtitle: "Lower-PFAS area, 2 young kids",
    icon: <Users className="w-5 h-5" />,
    description: "A family of four in a lower-PFAS city â€” balanced diet, certified filter, 2 children under 5.",
    accentColor: "emerald",
    familyMembers: [
      { name: "Parent A (Mom)", age: "34", exposureNote: "Makeup weekly, conditioner daily", riskBadge: "moderate" },
      { name: "Parent B (Dad)", age: "36", exposureNote: "No makeup use, standard diet", riskBadge: "low" },
      { name: "Child 1", age: "2", exposureNote: "Crawls on floors â€” dust ingestion", riskBadge: "high" },
      { name: "Child 2", age: "4", exposureNote: "Active play, processed snacks", riskBadge: "moderate" },
    ],
    data: {
      zipCode: "97201",
      filterModel: { brand: "", type: "NSF-53" },
      cookwareUse: { brand: "25%", yearsOfUse: 2 },
      dietHabits: {
        fiberSources: ["oats", "beans", "whole_grains", "cruciferous_veggies"],
        foods: ["fast_food"],
        medications: ["none"],
      },
      makeUpUse: { frequency: "weekly", productTypes: ["Foundation / BB cream", "Lipstick / lip gloss"], shampooProducts: ["Regular shampoo", "Conditioner"] },
      householdProfile: { hasChildrenUnder5: true, numberOfChildren: 2, childrenCrawlOnFloor: false },
    },
  },
];

const accentStyles: Record<string, { card: string; btn: string; badge: string; risk: Record<string, string> }> = {
  teal:    { card: "border-teal-500/50 hover:border-teal-400",    btn: "bg-teal-600 hover:bg-teal-500",    badge: "bg-teal-900/60 text-teal-300 border-teal-700/50", risk: { low: "bg-emerald-900/60 text-emerald-300", moderate: "bg-amber-900/60 text-amber-300", high: "bg-rose-900/60 text-rose-300" } },
  amber:   { card: "border-amber-500/50 hover:border-amber-400",  btn: "bg-amber-600 hover:bg-amber-500",  badge: "bg-amber-900/60 text-amber-300 border-amber-700/50", risk: { low: "bg-emerald-900/60 text-emerald-300", moderate: "bg-amber-900/60 text-amber-300", high: "bg-rose-900/60 text-rose-300" } },
  rose:    { card: "border-rose-500/50 hover:border-rose-400",    btn: "bg-rose-600 hover:bg-rose-500",    badge: "bg-rose-900/60 text-rose-300 border-rose-700/50", risk: { low: "bg-emerald-900/60 text-emerald-300", moderate: "bg-amber-900/60 text-amber-300", high: "bg-rose-900/60 text-rose-300" } },
  emerald: { card: "border-emerald-500/50 hover:border-emerald-400", btn: "bg-emerald-600 hover:bg-emerald-500", badge: "bg-emerald-900/60 text-emerald-300 border-emerald-700/50", risk: { low: "bg-emerald-900/60 text-emerald-300", moderate: "bg-amber-900/60 text-amber-300", high: "bg-rose-900/60 text-rose-300" } },
};

export default function DemoProfiles() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const {
    setZipCode,
    setFilterModel,
    setCookwareUse,
    setDietHabits,
    setMakeUpUse,
    setHouseholdProfile,
    setAnalyzeResult,
    setCurrentStep,
    setError,
  } = useAppStore();

  const handleSelect = async (profile: DemoProfile) => {
    if (loading) return;
    setLoading(profile.id);

    const { data } = profile;

    // Populate store
    setZipCode(data.zipCode);
    setFilterModel(data.filterModel);
    setCookwareUse(data.cookwareUse);
    setDietHabits(data.dietHabits);
    setMakeUpUse(data.makeUpUse);
    setHouseholdProfile(data.householdProfile);
    setCurrentStep(1);

    try {
      const result = await callIntegratedAnalyzeApi({
        zipCode: data.zipCode,
        productScan: null,
        cookwareUse: data.cookwareUse,
        filterModel: data.filterModel,
        dietHabits: data.dietHabits,
        makeUpUse: data.makeUpUse,
        householdProfile: data.householdProfile,
      });
      setAnalyzeResult(result);
      router.push("/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo analysis failed. Try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-5 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Try a Demo</p>
        <h3 className="text-lg font-bold text-gray-300">See instant results for a pre-built profile</h3>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {DEMO_PROFILES.map((profile) => {
          const styles = accentStyles[profile.accentColor];
          const isLoading = loading === profile.id;
          const isExpanded = expanded === profile.id;

          return (
            <div key={profile.id} className={`bg-slate-800/70 border rounded-xl transition-all duration-200 ${styles.card}`}>
              {/* Profile card header */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg border flex-shrink-0 ${styles.badge}`}>
                    {profile.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-gray-100 text-sm">{profile.label}</p>
                      {isLoading && <Loader className="w-3.5 h-3.5 text-gray-400 animate-spin flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{profile.subtitle}</p>
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2">{profile.description}</p>
                  </div>
                </div>

                {/* Family members toggle */}
                {profile.familyMembers && (
                  <button
                    onClick={() => setExpanded(isExpanded ? null : profile.id)}
                    className="mt-3 w-full flex items-center justify-between text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                  >
                    <span>See {profile.familyMembers.length} family members</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>
                )}

                {/* Expanded family members */}
                {isExpanded && profile.familyMembers && (
                  <div className="mt-3 space-y-2 border-t border-slate-700/50 pt-3">
                    {profile.familyMembers.map((member, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-900/40 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-xs font-semibold text-gray-200">{member.name} <span className="text-gray-500 font-normal">Â· age {member.age}</span></p>
                          <p className="text-[11px] text-gray-500 mt-0.5">{member.exposureNote}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${styles.risk[member.riskBadge]}`}>
                          {member.riskBadge}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Run button */}
                <button
                  onClick={() => handleSelect(profile)}
                  disabled={loading !== null}
                  className={`mt-3 w-full py-2 rounded-lg text-white text-sm font-bold transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed ${styles.btn}`}
                >
                  {isLoading ? "Running..." : "Run Assessment â†’"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
