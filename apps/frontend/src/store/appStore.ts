import { create } from "zustand";

// ── Types ────────────────────────────────────────────────────────────────────

export interface PfasFlag {
  compound: string;
  tier: "low" | "medium" | "high";
}

export interface DecayPoint {
  week: number;
  bodyLoad: number; // % of PFAS body load remaining
}

export interface Scenario {
  label: string;
  description: string;
  data: DecayPoint[];
}

export interface MitigationTier {
  tier: 1 | 2 | 3;
  description: string;
  cost: string;
  actions: string[];
}

export interface MakeUpUse {
  frequency: "never" | "rarely" | "weekly" | "daily";
  productTypes: string[];
  shampooProducts?: string[];
}

export interface HouseholdProfile {
  hasChildrenUnder5: boolean;
  numberOfChildren: number;
  childrenCrawlOnFloor: boolean;
}

export interface LocationPfasEstimate {
  source: "manual_demo" | "gemini" | "heuristic_fallback";
  zip_code: string;
  location_data?: Record<string, unknown>;
  estimate?: {
    estimated_total_pfas_ppt: number;
    breakdown: Record<string, number>;
    confidence: "low" | "medium" | "high";
  };
  raw_response?: string;
}

// ── State & Actions ──────────────────────────────────────────────────────────

interface AppState {
  // Inputs
  zipCode: string;
  productScan: string | null;
  cookwareUse: { brand: string; yearsOfUse: number } | null;
  filterModel: { brand: string; type: string } | null;
  dietHabits: { fiberSources: string[]; foods: string[]; medications: string[] } | null;
  makeUpUse: MakeUpUse | null;
  householdProfile: HouseholdProfile | null;

  // PFAS Estimation
  pfasEstimate: LocationPfasEstimate | null;
  pfasEstimateLoading: boolean;
  pfasEstimateError: string | null;

  // API Outputs
  reiScore: number | null;
  filterWarning: string | null;
  pfasFlags: PfasFlag[] | null;
  decayCurve: DecayPoint[] | null;
  interventionModel: Scenario[] | null;
  medWarnings: string[] | null;
  mitigationPlan: MitigationTier[] | null;

  // UI State
  isLoading: boolean;
  error: string | null;
  currentStep: number; // 1–5

  // Actions — Inputs
  setZipCode: (zip: string) => void;
  setProductScan: (scan: string | null) => void;
  setCookwareUse: (cookware: { brand: string; yearsOfUse: number }) => void;
  setFilterModel: (filter: { brand: string; type: string }) => void;
  setDietHabits: (habits: { fiberSources: string[]; foods: string[]; medications: string[] }) => void;
  setMakeUpUse: (use: MakeUpUse) => void;
  setHouseholdProfile: (profile: HouseholdProfile) => void;

  // Actions — PFAS Estimation
  setPfasEstimate: (estimate: LocationPfasEstimate | null) => void;
  setPfasEstimateLoading: (loading: boolean) => void;
  setPfasEstimateError: (error: string | null) => void;

  // Actions — Outputs
  setAnalyzeResult: (result: {
    reiScore: number;
    filterWarning: string | null;
    pfasFlags: PfasFlag[];
    decayCurve: DecayPoint[];
    interventionModel: Scenario[];
    medWarnings: string[];
    mitigationPlan: MitigationTier[];
  }) => void;

  // Actions — UI
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setReiScore: (score: number | null) => void;
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>((set) => ({
  // Inputs — defaults
  zipCode: "",
  productScan: null,
  cookwareUse: { brand: "0%", yearsOfUse: 0 },
  filterModel: null,
  dietHabits: { fiberSources: [], foods: [], medications: ["None"] },
  makeUpUse: { frequency: "never", productTypes: [], shampooProducts: [] },
  householdProfile: { hasChildrenUnder5: false, numberOfChildren: 0, childrenCrawlOnFloor: false },

  // PFAS Estimation — defaults
  pfasEstimate: null,
  pfasEstimateLoading: false,
  pfasEstimateError: null,

  // Outputs — defaults
  reiScore: null,
  filterWarning: null,
  pfasFlags: null,
  decayCurve: null,
  interventionModel: null,
  medWarnings: null,
  mitigationPlan: null,

  // UI — defaults
  isLoading: false,
  error: null,
  currentStep: 1,

  // Input setters
  setZipCode: (zip) => set({ zipCode: zip }),
  setProductScan: (scan) => set({ productScan: scan }),
  setCookwareUse: (cookware) => set({ cookwareUse: cookware }),
  setFilterModel: (filter) => set({ filterModel: filter }),
  setDietHabits: (habits) => set({ dietHabits: habits }),
  setMakeUpUse: (use) => set({ makeUpUse: use }),
  setHouseholdProfile: (profile) => set({ householdProfile: profile }),

  // PFAS Estimation setters
  setPfasEstimate: (estimate) => set({ pfasEstimate: estimate }),
  setPfasEstimateLoading: (loading) => set({ pfasEstimateLoading: loading }),
  setPfasEstimateError: (error) => set({ pfasEstimateError: error }),

  // Bulk output setter — called once after /api/analyze responds
  setAnalyzeResult: (result) => set({ ...result }),

  // UI setters
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setCurrentStep: (step) => set({ currentStep: step }),
  nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 6) })),
  prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) })),
  setReiScore: (score) => set({ reiScore: score }),
}));