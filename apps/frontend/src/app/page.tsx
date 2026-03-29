"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import ThemeToggle from "@/components/ui/ThemeToggle";

const stats = [
  { num: "97%",  desc: "of Americans have detectable PFAS blood levels" },
  { num: "12K+", desc: "distinct PFAS compounds in everyday products" },
  { num: "5 yrs", desc: "half-life of PFOS. It stays in your body for decades" },
  { num: "Act", desc: "SafeSource helps you fight back with a personalized action plan" },
];

const steps = [
  { n: "01", title: "Location", body: "We map your tap water against the EPA UCMR 5 database — contamination varies wildly by ZIP code." },
  { n: "02", title: "Kitchen & Products", body: "Cookware, personal care products, and everyday staples are the other major exposure vectors we measure." },
  { n: "03", title: "Your Score", body: "We calculate your REI (Relative Exposure Index) and show you exactly where your burden is coming from." },
];

export default function LandingPage() {
  const { isLoggedIn, user } = useAuthStore();

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
        <span style={{ fontFamily: "var(--mono)", fontSize: 15, color: "var(--accent)", letterSpacing: "0.04em" }}>
          SafeSource
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/demo" style={{
            fontFamily: "var(--mono)", fontSize: 12, color: "var(--text2)",
            textDecoration: "none",
          }}>
            Demo
          </Link>
          {isLoggedIn ? (
            <Link href="/dashboard" style={{
              fontFamily: "var(--mono)", fontSize: 12, color: "var(--text2)",
              textDecoration: "none",
            }}>
              {user?.name.split(" ")[0] ?? "Dashboard"}
            </Link>
          ) : (
            <Link href="/login" style={{
              fontFamily: "var(--mono)", fontSize: 12, color: "var(--text2)",
              textDecoration: "none",
            }}>
              Sign in
            </Link>
          )}
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

      {/* ── HERO ── */}
      <section style={{ paddingTop: 140, paddingBottom: 80, paddingLeft: 24, paddingRight: 24 }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }} className="animate-fade-up">
          <p className="eyebrow" style={{ marginBottom: 16 }}>The Forever Chemicals Audit</p>
          <h1 className="heading-serif" style={{ fontSize: "clamp(38px,6vw,58px)", marginBottom: 24 }}>
            Your body has been<br />
            <em style={{ fontStyle: "italic", color: "var(--accent)" }}>accumulating</em> PFAS<br />
            your whole life.
          </h1>
          <p style={{ fontSize: 17, color: "var(--text2)", lineHeight: 1.75, maxWidth: 560, marginBottom: 40 }}>
            97% of Americans have detectable PFAS in their blood. These &quot;forever chemicals&quot; don&apos;t leave —
            they build up over decades, linking to cancer, hormone disruption, and liver disease.
            SafeSource finds your biggest sources in under 3 minutes.
          </p>
          <Link href="/audit" className="btn-primary" style={{ fontSize: 16, padding: "18px 36px", borderRadius: 12, textDecoration: "none" }}>
            Start my audit →
          </Link>
          <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 14 }}>
            Educational use only · Not a medical diagnostic
          </p>
        </div>
      </section>

      {/* ── STATS GRID ── */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {stats.map((s) => (
            <div key={s.num} className="card-bb">
              <p style={{ fontFamily: "var(--mono)", fontSize: 30, fontWeight: 500, color: "var(--accent)" }}>{s.num}</p>
              <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 6, lineHeight: 1.55 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "0 24px 100px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <p className="eyebrow" style={{ marginBottom: 20 }}>How it works</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {steps.map((s) => (
              <div key={s.n} style={{
                display: "flex", gap: 24, padding: "24px 0",
                borderBottom: "0.5px solid var(--border)",
              }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text3)", paddingTop: 3, minWidth: 24 }}>{s.n}</span>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", marginBottom: 6 }}>{s.title}</p>
                  <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{ padding: "0 24px 120px" }}>
        <div style={{
          maxWidth: 680, margin: "0 auto",
          background: "var(--surface)",
          border: "0.5px solid rgba(200,240,96,0.25)",
          borderRadius: 20, padding: "48px 36px",
          textAlign: "center",
        }}>
          <p className="heading-serif" style={{ fontSize: "clamp(26px,4vw,38px)", marginBottom: 16 }}>
            Ready to know your number?
          </p>
          <p style={{ fontSize: 15, color: "var(--text2)", marginBottom: 32, lineHeight: 1.65 }}>
            Takes 3 minutes. No account required. 100% private.
          </p>
          <Link href="/audit" className="btn-primary" style={{ fontSize: 16, padding: "18px 40px", borderRadius: 12, textDecoration: "none" }}>
            Run my PFAS audit →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: "0.5px solid var(--border)",
        padding: "24px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 12,
      }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--accent)" }}>SafeSource</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text3)" }}>
          Powered by EPA UCMR 5 data · Science-backed · Private
        </span>
      </footer>

    </main>
  );
}
