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

// ── State & Actions ──────────────────────────────────────────────────────────

interface AppState {
  // Inputs
  zipCode: string;
  productScan: string | null;
  cookwareUse: { brand: string; yearsOfUse: number } | null;
  filterModel: { brand: string; type: string } | null;
  dietHabits: { fiberSources: string[]; foods: string[]; medications: string[] } | null;

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
  cookwareUse: null,
  filterModel: null,
  dietHabits: null,

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

  // Bulk output setter — called once after /api/analyze responds
  setAnalyzeResult: (result) => set({ ...result }),

  // UI setters
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setCurrentStep: (step) => set({ currentStep: step }),
  nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 5) })),
  prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) })),
  setReiScore: (score) => set({ reiScore: score }),
}));