"use client";

import { useEffect } from "react";
import Link from "next/link";
import InputForm from "@/components/inputs/InputForm";
import { useAppStore } from "@/store/appStore";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function AuditPage() {
  const reset = useAppStore((s) => s.reset);

  useEffect(() => { reset(); }, [reset]);

  return (
    <main style={{ background: "var(--bg)", color: "var(--text)", fontFamily: "var(--sans)" }} className="min-h-screen">

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 32px",
        background: "var(--nav-bg)",
        backdropFilter: "blur(12px)",
        borderBottom: "0.5px solid var(--border)",
      }}>
        <Link href="/" style={{ fontFamily: "var(--mono)", fontSize: 15, color: "var(--accent)", letterSpacing: "0.04em", textDecoration: "none" }}>
          SafeSource
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ThemeToggle />
          <Link href="/" style={{
            fontFamily: "var(--mono)", fontSize: 12, color: "var(--text2)",
            border: "0.5px solid var(--border2)", borderRadius: 20,
            padding: "6px 16px", textDecoration: "none",
          }}>
            ← Home
          </Link>
        </div>
      </nav>

      {/* ── HEADER ── */}
      <div style={{ paddingTop: 100, paddingBottom: 32, paddingLeft: 24, paddingRight: 24 }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <p className="eyebrow" style={{ marginBottom: 10 }}>The Forever Chemicals Audit</p>
          <h1 className="heading-serif" style={{ fontSize: "clamp(28px,4vw,42px)", marginBottom: 8 }}>
            Your PFAS exposure assessment
          </h1>
          <p style={{ fontSize: 14, color: "var(--text2)" }}>Step through the questions below — we'll generate your score.</p>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px", display: "grid", gap: 24 }}
        className="lg:grid-cols-[1fr_300px]" >

        {/* Form column */}
        <div style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border)",
          borderRadius: 20,
          overflow: "hidden",
        }}>
          <InputForm />
        </div>

        {/* Sidebar column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Info cards */}
          <div style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border)",
            borderRadius: 16,
            padding: "20px 20px",
          }}>
            <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
              What we check
            </p>
            {["Tap water quality (EPA UCMR 5)", "Cookware & kitchen habits", "Diet & grocery items", "Personal care products", "Everyday products (receipt scan)", "PFAS filter effectiveness"].map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "var(--text2)" }}>{item}</span>
              </div>
            ))}
          </div>

          <div style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border)",
            borderRadius: 16,
            padding: "20px 20px",
          }}>
            <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
              Time needed
            </p>
            <p style={{ fontFamily: "var(--mono)", fontSize: 22, color: "var(--text)" }}>3 min</p>
            <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>No account required</p>
          </div>
        </div>
      </div>

    </main>
  );
}
