"use client";

import Link from "next/link";
import DemoProfiles from "@/components/inputs/DemoProfiles";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function DemoPage() {
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
          BIO//BOUND
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ThemeToggle />
          <Link href="/audit" style={{
            fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent)",
            border: "0.5px solid var(--accent)", borderRadius: 20,
            padding: "6px 16px", textDecoration: "none",
            background: "rgba(200,240,96,0.08)",
          }}>
            Start audit →
          </Link>
        </div>
      </nav>

      {/* ── HEADER ── */}
      <div style={{ paddingTop: 120, paddingBottom: 32, paddingLeft: 24, paddingRight: 24 }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }} className="animate-fade-up">
          <p className="eyebrow" style={{ marginBottom: 12 }}>Try a Demo</p>
          <h1 className="heading-serif" style={{ fontSize: "clamp(28px,4vw,42px)", marginBottom: 12 }}>
            See instant results for a<br />
            <em style={{ fontStyle: "italic", color: "var(--accent)" }}>pre-built</em> profile
          </h1>
          <p style={{ fontSize: 15, color: "var(--text2)", lineHeight: 1.7, maxWidth: 520, margin: "0 auto" }}>
            Pick a persona below — we'll run the full PFAS exposure assessment with realistic data so you can explore the results without entering your own info.
          </p>
        </div>
      </div>

      {/* ── DEMO PROFILES ── */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border)",
          borderRadius: 20,
          padding: 28,
        }}>
          <DemoProfiles />
        </div>
      </div>

    </main>
  );
}
