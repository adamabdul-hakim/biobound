# BioBound Team A: Environment & Experience (The Shell)
**Focus:** User Interface, Geographic Risk Integration, and Policy Advocacy.

## 📅 Phase 1: Foundation (Hours 0-4)
* **Next.js Setup:** Initialize with Tailwind CSS and Lucide-React. 
* **Global State:** Set up a central store (Zustand or React Context) to manage:
    * `zipCode` (String)
    * `waterRisk` (Object: {ppt: number, status: string})
    * `scannerResults` (Object)
* **The Gauge:** Build the "Forever Scale" SVG component (0-100) with dynamic color shifting (Green to Red).

## 📅 Phase 2: The Hydrology Engine (Hours 4-12)
* **Data Ingestion:** Process the [EPA UCMR 5](https://www.epa.gov/dwucmr/fifth-unregulated-contaminant-monitoring-rule-data-finder) dataset.
* **Logic:** Create `calculateWaterScore()`.
    * **Input:** `zipCode` + `filterType`.
    * **Rule:** If `filterType` is NOT NSF-53/58 Certified, the score remains the raw EPA value for that district.
* **UI:** Build the Zip Code landing page and the "Filter Auditor" selection tool.

## 📅 Phase 3: Social Impact & UX Polish (Hours 12-24)
* **The Advocacy Tool:** Build an automated letter generator using string templates to draft emails to local representatives based on the user's specific PFAS levels.
* **The "Cheap Hacks" Library:** Design a "Low-Cost Mitigation" section featuring dust-reduction tips and budget-friendly product swaps.
* **Final Integration:** Link frontend triggers to Team B’s API endpoints and handle loading skeletons.

---

# BioBound Team B: Forensic & Biological (The Engine)
**Focus:** Computer Vision, Chemical Analysis, and Biological Modeling.

## 📅 Phase 1: The Scanner Pipeline (Hours 0-6)
* **OCR Integration:** Implement **Google Cloud Vision API** or a Tesseract-based wrapper.
* **Image Handling:** Build an API endpoint (`/process-image`) that accepts Base64 strings and returns raw strings.
* **Contextual Awareness:** Use Vision API labels to detect product "shapes" (e.g., "popcorn bag," "frying pan") to assign a baseline risk even if text is unreadable.

## 📅 Phase 2: The Suffix Engine (Hours 6-12)
* **Regex Logic:** Build `pfas_hunter.py` to identify hidden chemicals.
    * **Patterns:** `(per|poly)fluoro.*`, `sulfon.*`, `.*fluorotelomer`, `.*phosphate`, `PTFE`.
* **Trade Name Map:** Create a JSON dictionary mapping terms like *Teflon, Gore-Tex, and Scotchgard* to specific PFAS risk multipliers.
* **REI Calculation:** Implement the $REI = \sum (W \times V \times F)$ formula based on user frequency data.

## 📅 Phase 3: The Bio-Simulator (Hours 12-24)
* **Decay Math:** Implement the 8-year biological half-life formula: $C(t) = C_0 e^{-kt}$.
* **Fiber-Acceleration Logic:** Add the variable for the March 2025 Psyllium study. If `dietaryIntervention == true`, apply a 20% acceleration to the decay constant $k$.
* **Safety Logic:** Implement the "Medication Interaction Gate" to ensure health warnings are returned in the JSON response if fiber interventions are suggested.

---

## 🛰️ The API Handshake (Internal Contract)
Team B's `/analyze` endpoint MUST return this structure to Team A:

```json
{
  "product_name": "String",
  "detected_chemicals": ["List", "of", "Strings"],
  "risk_score": 0-100,
  "confidence_interval": 0.0-1.0,
  "decay_data": [
    {"year": 2026, "level": 100},
    {"year": 2030, "level": 70},
    {"year": 2034, "level": 50}
  ],
  "medical_warnings": ["String"]
}
```

## System Architecture

```mermaid
flowchart TD
    %% ── User Inputs ──────────────────────────────────────────
    ZIP[/"📍 Zip code"/]
    SCAN[/"📷 Product scan\nCamera · OCR"/]
    COOK[/"🍳 Cookware usage\nFrequency · years"/]
    FILT[/"🚰 Filter model\nBrand · type"/]
    DIET[/"🥗 Diet & habits\nFiber · foods · meds"/]

    %% ── External Data Sources ────────────────────────────────
    EPA[("🗄️ EPA UCMR 5\nWater PPT by zip")]
    NSF[("🗄️ NSF/ANSI DB\nFilter certification")]
    PUB[("🗄️ PubMed 2025\nFiber half-life data")]

    %% ── Processing Modules ───────────────────────────────────
    MOD1["⬡ Module 1 — Hydrology Sentinel\nWater risk + filter verification"]
    MOD2["⬡ Module 2 — Forensic Scanner\nComputer vision + suffix engine"]
    MOD3["⬡ Module 3 — Bio-Decay Simulator\nHalf-life + intervention modelling"]

    %% ── Core Engine ──────────────────────────────────────────
    REI["◆ REI Engine\nΣ(Wᵢ × Vᵢ × Fᵢ)"]

    %% ── Safety Layer ─────────────────────────────────────────
    SAFE["⚠ Safety & Equity Filter\nMed. interactions · zero-cost mitigations"]

    %% ── Outputs ──────────────────────────────────────────────
    OUT1[/"REI score\nRelative Exposure Index"/]
    OUT2[/"Filter warning\nFalse security alert"/]
    OUT3[/"PFAS flags\nProduct risk tier"/]
    OUT4[/"Decay curve\nDynamic reduction slope"/]
    OUT5[/"Intervention model\nWhat-if fibre scenarios"/]
    OUT6[/"Forever Scale dashboard"/]
    OUT7[/"Medication warnings\nDrug–fibre interactions"/]
    OUT8[/"Mitigation plan\nTiered + zero-cost options"/]

    %% ── User input → Modules ─────────────────────────────────
    ZIP   --> MOD1
    FILT  --> MOD1
    SCAN  --> MOD2
    COOK  --> MOD2
    DIET  --> MOD3

    %% ── External data → Modules (dashed) ────────────────────
    EPA -.->|live scrape| MOD1
    NSF -.->|cert lookup| MOD1
    PUB -.->|half-life data| MOD3

    %% ── Modules → REI Engine ─────────────────────────────────
    MOD1 --> REI
    MOD2 --> REI
    MOD3 --> REI

    %% ── REI → Safety ─────────────────────────────────────────
    REI --> SAFE

    %% ── Modules → Outputs ────────────────────────────────────
    MOD1 --> OUT1
    MOD1 --> OUT2
    MOD2 --> OUT3
    MOD3 --> OUT4
    MOD3 --> OUT5
    REI  --> OUT6
    SAFE --> OUT7
    SAFE --> OUT8

    %% ── Styles ───────────────────────────────────────────────
    classDef input    fill:#E6F1FB,stroke:#185FA5,color:#0C447C
    classDef extdata  fill:#F1EFE8,stroke:#5F5E5A,color:#444441
    classDef module   fill:#E1F5EE,stroke:#0F6E56,color:#085041
    classDef engine   fill:#EEEDFE,stroke:#534AB7,color:#3C3489
    classDef safety   fill:#FAEEDA,stroke:#854F0B,color:#633806
    classDef output   fill:#EAF3DE,stroke:#3B6D11,color:#27500A

    class ZIP,SCAN,COOK,FILT,DIET input
    class EPA,NSF,PUB extdata
    class MOD1,MOD2,MOD3 module
    class REI engine
    class SAFE safety
    class OUT1,OUT2,OUT3,OUT4,OUT5,OUT6,OUT7,OUT8 output
```