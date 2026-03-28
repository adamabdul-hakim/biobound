# BioBound Team A: Technical Document Plan
**Environment & Experience (The Shell)**
*Version 1.1 | March 28, 2026*

---

## 1. Project Overview

**Purpose:** Build the user-facing layer of BioBound — a web interface that ingests user inputs, routes them through a multi-module processing pipeline, and displays personalized PFAS exposure risk, mitigation plans, and advocacy tools.

**Team Responsibility:** Team A owns all UI, state management, input collection, and output display. Team B owns the three processing modules and the REI Engine. Team A calls Team B's APIs and renders the results.

**Tech Stack:**
- **Framework:** Next.js (React + TypeScript)
- **Styling:** Tailwind CSS
- **Icons:** Lucide-React
- **State Management:** Zustand
- **External Data:** EPA UCMR 5, NSF/ANSI DB, PubMed 2025

---

## 2. Full System Architecture

This is the complete data flow, from user input to rendered output:

```
╔══════════════════════════════════════════════════════════════════════╗
║                        USER BROWSER (Team A)                        ║
║                                                                      ║
║  INPUTS COLLECTED          OUTPUTS DISPLAYED                         ║
║  ─────────────────         ──────────────────────────────────────    ║
║  • Zip Code          ─┐    • REI Score → Forever Scale Gauge         ║
║  • Product Scan       │    • Filter Warning banner                   ║
║  • Cookware Use       │    • PFAS Flags (product risk tier)          ║
║  • Filter Model       │    • Decay Curve (dynamic chart)             ║
║  • Diet / Habits      │    • Intervention Model (fiber scenarios)    ║
║                       │    • Med. Warnings (drug-fiber interactions) ║
║                       │    • Mitigation Plan (tiered + zero-cost)    ║
╚═══════════════════════╪══════════════════════════════════════════════╝
                        │  HTTP API calls
                        ▼
╔══════════════════════════════════════════════════════════════════════╗
║                   TEAM B BACKEND                                     ║
║                                                                      ║
║  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ║
║  │    Module 1      │  │    Module 2      │  │    Module 3      │  ║
║  │ Hydrology        │  │ Forensic Scanner │  │ Bio-Decay        │  ║
║  │ Sentinel         │  │ CV + suffix      │  │ Simulator        │  ║
║  │ Water risk +     │  │ engine           │  │ Half-life +      │  ║
║  │ filter check     │  │                  │  │ intervention     │  ║
║  └──────────────────┘  └──────────────────┘  └──────────────────┘  ║
║            │                    │                      │            ║
║            └────────────────────┴──────────────────────┘            ║
║                                 │                                    ║
║                    ┌────────────▼──────────────┐                    ║
║                    │        REI Engine          │                    ║
║                    │   Σ(Wᵢ × Vᵢ × Fᵢ)        │                    ║
║                    │   Weighted risk score      │                    ║
║                    └────────────┬──────────────┘                    ║
║                                 │                                    ║
║                    ┌────────────▼──────────────┐                    ║
║                    │      Safety Filter         │                    ║
║                    │  Med. interactions +       │                    ║
║                    │  equity + zero-cost        │                    ║
║                    └───────────────────────────┘                    ║
║                                                                      ║
║  EXT. DATA: EPA UCMR 5 | NSF/ANSI DB | PubMed 2025                 ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 3. Inputs: What Team A Collects

Team A is responsible for collecting all five user inputs and passing them to Team B's API.

| Input | Data Type | UI Collection Method | Validation Rule |
|---|---|---|---|
| `zipCode` | `string` | Text field | Must match `/^\d{5}$/` |
| `productScan` | `string` (image or barcode) | Camera / OCR upload or barcode scan | Must return a parseable product ID |
| `AmountOfNonStickCookware` | `object` | Form: percentage ranges + years-of-use number input | Years must be `>= 0`, percentage required |
| `filterModel` | `object` | Dropdown: brand + type (maps to NSF cert lookup) | At minimum, "None" must be selectable |
| `dietHabits` | `object` | Multi-select checklist: fiber sources, food categories, current medications | At least one selection required |

**Data shape sent to Team B (single API call):**

```typescript
interface UserInputPayload {
  zipCode: string;
  productScan: string | null;      // null if user skips scan
  cookwareUse: {
    percentage: string;
    yearsOfUse: number;
  };
  filterModel: {
    brand: string;
    type: string;                  // e.g. "NSF-53", "pitcher", "none"
  };
  dietHabits: {
    fiberSources: string[];        // e.g. ["oats", "beans"]
    foods: string[];
    medications: string[];
  };
}
```

---

## 4. Processing Modules (Team B — for Team A's reference)

Team A does not build these. However, Team A must understand what each module produces so it can correctly render the outputs.

### Module 1 — Hydrology Sentinel
- **Inputs it uses:** `zipCode`, `filterModel`
- **What it does:** Looks up EPA UCMR 5 water PPT data for that zip code, then checks if the user's filter is NSF/ANSI certified
- **Outputs it produces:**
  - Contributes to → **REI Score**
  - Triggers → **Filter Warning** (if filter is not certified)

### Module 2 — Forensic Scanner
- **Inputs it uses:** `productScan`, `cookwareUse`
- **What it does:** Uses computer vision (CV) and a chemical suffix matching engine to identify PFAS-containing compounds in scanned products and cookware
- **Outputs it produces:**
  - Contributes to → **REI Score**
  - Produces → **PFAS Flags** (product risk tier: low / medium / high)

### Module 3 — Bio-Decay Simulator
- **Inputs it uses:** `dietHabits`, `filterModel`
- **What it does:** Simulates how fast PFAS leaves the body based on fiber intake, diet, and medications; calculates half-life reduction from interventions
- **Outputs it produces:**
  - Contributes to → **REI Score**
  - Produces → **Decay Curve** (data for a time-series chart)
  - Produces → **Intervention Model** (what-if fiber/diet scenarios)

### REI Engine
- **Formula:** `Σ(Wᵢ × Vᵢ × Fᵢ)` where:
  - `Wᵢ` = weight of exposure source i
  - `Vᵢ` = volume/severity of exposure from source i
  - `Fᵢ` = filtration/mitigation factor for source i
- **Output:** Single numeric **REI Score** (Relative Exposure Index) from 0–100

### Safety Filter
- **What it does:** Post-processes all outputs for medical safety (drug-fiber interactions), equity adjustments (zero-cost options prioritized for low-income results), and final mitigation plan generation
- **Outputs:** Med. Warnings, Mitigation Plan

---

## 5. Global State Schema

```typescript
interface AppState {
  // ── Inputs ──────────────────────────────────────────
  zipCode: string;
  productScan: string | null;
  cookwareUse: { brand: string; yearsOfUse: number } | null;
  filterModel: { brand: string; type: string } | null;
  dietHabits: {
    fiberSources: string[];
    foods: string[];
    medications: string[];
  } | null;

  // ── API Outputs ──────────────────────────────────────
  reiScore: number | null;           // 0–100, drives the Forever Scale gauge
  filterWarning: string | null;      // Message shown if filter is not certified
  pfasFlags: PfasFlag[] | null;      // Array of flagged compounds with risk tier
  decayCurve: DecayPoint[] | null;   // Time-series data for chart
  interventionModel: Scenario[] | null;
  medWarnings: string[] | null;
  mitigationPlan: MitigationTier[] | null;

  // ── UI State ─────────────────────────────────────────
  isLoading: boolean;
  error: string | null;
  currentStep: number;               // 1–5, tracks multi-step input form
}
```

---

## 6. Phase 1 — Foundation (Hours 0–4)

### Goals
Stand up the project with zero business logic. Just infrastructure, routing, and the core gauge component.

### Tasks

**Task 1.1 — Project Initialization**
- `npx create-next-app@latest biobound --typescript`
- Install: `tailwindcss`, `lucide-react`, `zustand`
- Configure Tailwind
- Create folder structure:

```
/src
  /components
    /gauge         ← Forever Scale
    /inputs        ← all 5 input collection components
    /outputs       ← all 7 output display components
    /ui            ← skeleton, error banner, toast
  /store           ← Zustand
  /lib
    /scoring       ← calculateWaterScore()
    /templates     ← advocacy letter strings
  /pages           ← Next.js routes
  /data            ← static JSON: EPA, mitigation tips, reps
```

**Task 1.2 — Zustand Store**
- Create `/src/store/appStore.ts`
- Initialize all fields from Section 5 to their default null/empty values
- Export `useAppStore()` hook

**Task 1.3 — Forever Scale Gauge**

The primary visual output. An SVG semi-circle speedometer displaying the REI Score.

| Property | Spec |
|---|---|
| Shape | SVG arc, 180° semi-circle |
| Range | 0–100 |
| Color at 0 | Green `#22c55e` |
| Color at 50 | Yellow `#eab308` |
| Color at 100 | Red `#ef4444` |
| Needle animation | Sweeps from 0 → final score over 800ms on mount |
| Sub-label | Displays `reiScore` number and status string |

```typescript
interface ForeverScaleProps {
  score: number;       // 0–100
  status: string;      // "safe" | "caution" | "danger"
}
```

### Acceptance Criteria
- [ ] App runs on `localhost:3000`
- [ ] Zustand store initializes without TypeScript errors
- [ ] Gauge renders green at 0, yellow at 50, red at 100
- [ ] Needle animation works on mount

---

## 7. Phase 2 — The Hydrology Engine (Hours 4–12)

### Goals
Build the input collection flow and the local scoring fallback. Wire Module 1's output to the gauge.

### Tasks

**Task 2.1 — Multi-Step Input Form**

Collect all 5 inputs across a stepped UI (one input category per step):

| Step | Input Collected | Component |
|---|---|---|
| 1 | Zip Code | `ZipCodeInput` |
| 2 | Filter Model | `FilterAuditor` |
| 3 | Product Scan | `ProductScanner` |
| 4 | Cookware Use | `CookwareForm` |
| 5 | Diet / Habits | `DietHabitsForm` |

Progress bar at top shows step `currentStep / 5`. Each step validates before advancing.

**Task 2.2 — Filter Auditor (Step 2)**

| Option Label | Internal Value | NSF Certified? |
|---|---|---|
| No filter | `"none"` | No |
| Standard pitcher | `"pitcher-standard"` | No |
| NSF-53 Certified | `"NSF-53"` | ✅ Yes |
| NSF-58 Reverse Osmosis | `"NSF-58"` | ✅ Yes |
| Unknown | `"unknown"` | No |

If not certified → pre-emptively show a soft warning: *"Non-certified filters may not remove PFAS. We'll factor this into your score."*

**Task 2.3 — `calculateWaterScore()` (Local Fallback)**

This runs client-side using the EPA UCMR 5 dataset only (Module 1 output), for cases where the full API hasn't returned yet.

```typescript
function calculateWaterScore(zipCode: string, filterType: string): ScoreResult

// Rule: if filterType NOT in ["NSF-53", "NSF-58"], no ppt reduction applied
// Score = normalize(totalPpt, 0, 70) → clamped to 0–100
```

> **Note:** This is a temporary preview score. The final REI Score comes from Team B's REI Engine.

**Task 2.4 — EPA Data Processing**
- Process raw UCMR 5 CSV into `/src/data/epa-ucmr5.json`
- Key by zip code
- Handle missing zips with `"no-data"` status — never return 0 silently

### Acceptance Criteria
- [ ] User can progress through all 5 input steps
- [ ] Validation blocks advancement on bad input
- [ ] Filter Auditor updates `filterModel` in store
- [ ] Local score previews on the gauge after Step 1 + Step 2 complete

---

## 8. Phase 3 — Social Impact & UX Polish (Hours 12–24)

### 8.1 — All 7 Output Components

Team A must build a display component for each output produced by Team B:

| Output | Component | Description |
|---|---|---|
| REI Score | `ForeverScaleGauge` | Already built in Phase 1. Driven by `reiScore` from store. |
| Filter Warning | `FilterWarningBanner` | Red alert banner. Shown when `filterWarning !== null`. Text from API. |
| PFAS Flags | `PfasFlagList` | List of flagged compounds. Each shows compound name + risk tier badge (Low / Med / High). |
| Decay Curve | `DecayChart` | Line chart (Recharts or Chart.js). X-axis = time (weeks), Y-axis = PFAS body load %. |
| Intervention Model | `InterventionScenarios` | Side-by-side cards showing "What if I add fiber?" vs "Current trajectory." |
| Med. Warnings | `MedWarningList` | Yellow warning cards. One per drug-fiber interaction flagged by Safety Filter. |
| Mitigation Plan | `MitigationPlanTiles` | Tiered cards: Tier 1 (zero-cost), Tier 2 (low-cost ~$30), Tier 3 (investment). |

### 8.2 — Advocacy Letter Generator

**Route:** `/advocate`

**Template:**

```
Subject: PFAS Contamination Concerns — ZIP [zipCode]

Dear [Representative Name],

I am a constituent in ZIP [zipCode]. EPA data shows my water supply 
contains PFAS at a level that gives me a Relative Exposure Index of 
[reiScore]/100. My filter ([filterModel.type]) [is / is not] NSF certified.

I am requesting [action based on reiScore tier].

[User Name]
[User Email]
```

- Representative lookup: civic API or static JSON keyed by zip
- User fills name + email (2 fields only)
- Buttons: "Copy to Clipboard" and "Open in Mail App" (`mailto:`)
- App never sends email directly

### 8.3 — Low-Cost Mitigation Library

**Location:** `/src/data/mitigation-tips.json`

| Category | Icon | Badge |
|---|---|---|
| Dust Reduction | `Wind` (Lucide) | Quick Win |
| Cookware Swaps | `Utensils` (Lucide) | High Impact |
| Budget Water Filters | `Droplets` (Lucide) | High Impact |
| Kids & Pets | `Heart` (Lucide) | Quick Win |
| Diet & Fiber | `Leaf` (Lucide) | High Impact |

### 8.4 — Team B API Integration

**Expected API contract (to be confirmed with Team B):**

| Endpoint | Method | Input | Returns |
|---|---|---|---|
| `/api/analyze` | `POST` | Full `UserInputPayload` | All 7 outputs in one response |

**Single-call pattern:** Team A sends one `POST /api/analyze` with the complete payload after Step 5. Team B returns all outputs in a single response object. This avoids race conditions between modules.

**Expected response shape:**

```typescript
interface AnalyzeResponse {
  reiScore: number;
  filterWarning: string | null;
  pfasFlags: PfasFlag[];
  decayCurve: DecayPoint[];
  interventionModel: Scenario[];
  medWarnings: string[];
  mitigationPlan: MitigationTier[];
}
```

**Loading skeleton requirement:** Every output component shows a `animate-pulse` Tailwind skeleton while `isLoading === true`. Skeletons must match the real component's height and layout.

**Error handling:**

```typescript
try {
  const result = await fetch('/api/analyze', { method: 'POST', body: payload })
  // write result to store
} catch (err) {
  store.setError("Analysis failed. Please try again.")
  // show ErrorBanner, never a blank screen
}
```

---

## 9. Component Inventory

| Component | Path | Phase | Store Fields Used |
|---|---|---|---|
| `ForeverScaleGauge` | `/components/gauge/` | 1 | `reiScore` |
| `ZipCodeInput` | `/components/inputs/` | 2 | `zipCode` |
| `FilterAuditor` | `/components/inputs/` | 2 | `filterModel` |
| `ProductScanner` | `/components/inputs/` | 2 | `productScan` |
| `CookwareForm` | `/components/inputs/` | 2 | `cookwareUse` |
| `DietHabitsForm` | `/components/inputs/` | 2 | `dietHabits` |
| `FilterWarningBanner` | `/components/outputs/` | 3 | `filterWarning` |
| `PfasFlagList` | `/components/outputs/` | 3 | `pfasFlags` |
| `DecayChart` | `/components/outputs/` | 3 | `decayCurve` |
| `InterventionScenarios` | `/components/outputs/` | 3 | `interventionModel` |
| `MedWarningList` | `/components/outputs/` | 3 | `medWarnings` |
| `MitigationPlanTiles` | `/components/outputs/` | 3 | `mitigationPlan` |
| `AdvocacyLetter` | `/components/advocate/` | 3 | `zipCode`, `reiScore`, `filterModel` |
| `LoadingSkeleton` | `/components/ui/` | 3 | `isLoading` |
| `ErrorBanner` | `/components/ui/` | 3 | `error` |

---

## 10. Open Questions & Blockers

| # | Question | Blocks | Priority |
|---|---|---|---|
| 1 | Is `/api/analyze` a single combined endpoint or one per module? | Phase 3 integration | 🔴 High |
| 2 | What authentication method does Team B's API use? | All API calls | 🔴 High |
| 3 | What are the exact weight values for Wᵢ in the REI formula? | Score accuracy | 🔴 High |
| 4 | What is the confirmed ppt ceiling for score normalization? | `calculateWaterScore()` | 🔴 High |
| 5 | Who builds the representative lookup for the advocacy tool? | Advocacy letter | 🟡 Medium |
| 6 | Does Team B's Safety Filter return mitigation plan content as text strings, or does Team A write the copy? | `MitigationPlanTiles` | 🟡 Medium |
| 7 | What chart library is preferred for the Decay Curve? | `DecayChart` | 🟢 Low |

---

## 11. Definition of Done

A phase is complete when all of the following are true:

- All tasks in that phase are implemented and committed
- `npm run build` passes with zero TypeScript errors
- All components render on mobile (375px) and desktop (1280px)
- All acceptance criteria checkboxes are checked
- The API contract for that phase has been verbally confirmed with Team B
- No output component renders a blank screen on error or while loading
