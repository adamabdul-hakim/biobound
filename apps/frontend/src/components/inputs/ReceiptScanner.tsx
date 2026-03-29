"use client";

import { useState, useRef } from "react";
import { Upload, FileText, Loader, RotateCcw, AlertTriangle } from "lucide-react";
import { scanReceipt, PFAS_LEVEL_META, type ReceiptScanResult, type ReceiptScanItem } from "@/lib/receiptScan";
import { useAppStore } from "@/store/appStore";

// ── Sub-components ───────────────────────────────────────────────────────────

function FlagDot({ level }: { level: ReceiptScanItem["pfas_level"] }) {
  const meta = PFAS_LEVEL_META[level];
  const boxShadow =
    level === "high"     ? `0 0 6px var(--danger)` :
    level === "moderate" ? `0 0 6px var(--warn)` :
    level === "low"      ? undefined :
                           undefined;
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: meta.color,
        flexShrink: 0,
        boxShadow,
      }}
    />
  );
}

function PfasLevelBadge({ level }: { level: ReceiptScanItem["pfas_level"] }) {
  const meta = PFAS_LEVEL_META[level];
  const tagClass =
    level === "high"     ? "tag-danger" :
    level === "moderate" ? "tag-warn" :
    level === "low"      ? "tag-safe" :
                           "";
  return (
    <span
      className={`text-xs font-bold px-2 py-0.5 rounded-full ${tagClass}`}
      style={!tagClass ? { color: "var(--text3)", background: "var(--surface2)" } : undefined}
    >
      {meta.label}
    </span>
  );
}

function ItemRow({ item }: { item: ReceiptScanItem }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((v) => !v)}
      className="w-full text-left transition-all"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        background: "var(--surface2)",
        borderRadius: 10,
        padding: "12px 16px",
        border: "none",
        cursor: "pointer",
      }}
    >
      <FlagDot level={item.pfas_level} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{item.item}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {item.ppt_estimate !== null && item.ppt_estimate !== undefined && item.ppt_estimate > 0 && (
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text3)" }}>
                ~{item.ppt_estimate} ppt
              </span>
            )}
            <PfasLevelBadge level={item.pfas_level} />
          </div>
        </div>
        {open && (
          <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 6, lineHeight: 1.55 }}>
            {item.reason}
          </p>
        )}
      </div>
    </button>
  );
}

function ResultsPanel({ result, onReset }: { result: ReceiptScanResult; onReset: () => void }) {
  const counts = { high: 0, moderate: 0, low: 0, none: 0 };
  for (const item of result.items) counts[item.pfas_level]++;

  const sortOrder: Record<string, number> = { high: 0, moderate: 1, low: 2, none: 3 };
  const sorted = [...result.items].sort(
    (a, b) => sortOrder[a.pfas_level] - sortOrder[b.pfas_level],
  );

  return (
    <div className="w-full animate-fade-up">
      {/* Summary bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div>
          <p className="eyebrow" style={{ marginBottom: 4, fontSize: 9 }}>
            Scan complete · {result.source === "gemini" ? "Gemini AI" : "Keyword match"}
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            {counts.high > 0 && (
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--danger)" }}>
                {counts.high} high
              </span>
            )}
            {counts.moderate > 0 && (
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--warn)" }}>
                {counts.moderate} moderate
              </span>
            )}
            {counts.low > 0 && (
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--safe)" }}>
                {counts.low} low
              </span>
            )}
            {counts.none > 0 && (
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text3)" }}>
                {counts.none} clean
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onReset}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: "var(--text2)",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Re-scan
        </button>
      </div>

      {result.items.length === 0 ? (
        <div className="card-info p-4 text-center">
          <p style={{ fontSize: 13, color: "var(--text2)" }}>
            No recognizable products found. Try pasting cleaner receipt text.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {sorted.map((item, i) => (
            <ItemRow key={i} item={item} />
          ))}
        </div>
      )}

      <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 12, fontStyle: "italic" }}>
        Tap any item to see why it was flagged. ppt = parts-per-trillion estimated exposure per serving.
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Mode = null | "upload" | "text";

export default function ReceiptScanner() {
  const [mode, setMode] = useState<Mode>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReceiptScanResult | null>(null);
  const [textInput, setTextInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const setReceiptScanResult = useAppStore((s) => s.setReceiptScanResult);

  const reset = () => {
    setMode(null);
    setLoading(false);
    setError(null);
    setResult(null);
    setTextInput("");
    setReceiptScanResult(null);
  };

  const runScan = async (payload: { imageBase64?: string; rawText?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await scanReceipt(payload);
      setResult(res);
      setReceiptScanResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      runScan({ imageBase64: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  // ── Result view ──
  if (result) return <ResultsPanel result={result} onReset={reset} />;

  // ── Loading ──
  if (loading) {
    return (
      <div className="w-full text-center py-10">
        <Loader className="w-6 h-6 animate-spin mx-auto mb-3" style={{ color: "var(--accent)" }} />
        <p className="eyebrow" style={{ fontSize: 10 }}>Scanning with OCR + Gemini AI</p>
        <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
          Extracting items and estimating PFAS levels…
        </p>
      </div>
    );
  }

  // ── Method selection or upload mode ──
  if (mode === null || mode === "upload") {
    return (
      <div className="w-full space-y-3">
        {/* Hidden file input — always in DOM so the picker can open */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        {/* Upload image */}
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            width: "100%",
            border: "1.5px dashed var(--border2)",
            borderRadius: 14,
            padding: "28px 20px",
            textAlign: "center",
            cursor: "pointer",
            background: "transparent",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(200,240,96,0.03)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border2)";
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
          <p style={{ fontSize: 14, color: "var(--text2)" }}>
            Tap to scan your last grocery receipt
          </p>
          <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
            Upload image — <span style={{ color: "var(--accent)" }}>OCR auto-extracts items</span>
          </p>
        </button>

        {error && (
          <div className="card-warn p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--warn)" }} />
            <p style={{ fontSize: 12, color: "var(--warn)" }}>{error}</p>
          </div>
        )}

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: "0.5px", background: "var(--border)" }} />
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text3)" }}>or</span>
          <div style={{ flex: 1, height: "0.5px", background: "var(--border)" }} />
        </div>

        {/* Paste text */}
        <button
          onClick={() => setMode("text")}
          className="btn-ghost-bb w-full"
          style={{ justifyContent: "center", gap: 8 }}
        >
          <FileText className="w-4 h-4" />
          Paste receipt text
        </button>

        <p style={{ fontSize: 11, color: "var(--text3)", textAlign: "center", marginTop: 4 }}>
          We OCR the image, then Gemini analyzes each item for PFAS.
        </p>
      </div>
    );
  }

  // ── Text paste mode ──
  if (mode === "text") {
    return (
      <div className="w-full space-y-3">
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder={"Paste receipt text here, e.g.:\nMicrowave Popcorn   $2.99\nSalmon Fillet        $8.49\nOreo Cookies         $3.50"}
          rows={7}
          style={{
            width: "100%",
            padding: "14px 16px",
            background: "var(--surface2)",
            border: "0.5px solid var(--border2)",
            borderRadius: 12,
            fontFamily: "var(--mono)",
            fontSize: 12,
            color: "var(--text)",
            lineHeight: 1.6,
            outline: "none",
            resize: "vertical",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border2)"; }}
        />
        {error && (
          <div className="card-warn p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--warn)" }} />
            <p style={{ fontSize: 12, color: "var(--warn)" }}>{error}</p>
          </div>
        )}
        <div className="nav-buttons" style={{ marginTop: 8 }}>
          <button onClick={() => { setMode(null); setError(null); }} className="btn-ghost-bb">
            ← Back
          </button>
          <button
            onClick={() => runScan({ rawText: textInput })}
            disabled={!textInput.trim()}
            className="btn-primary"
            style={{ opacity: !textInput.trim() ? 0.4 : 1, cursor: !textInput.trim() ? "not-allowed" : "pointer" }}
          >
            <Upload className="w-4 h-4" />
            Analyze for PFAS →
          </button>
        </div>
      </div>
    );
  }

  return null;
}
