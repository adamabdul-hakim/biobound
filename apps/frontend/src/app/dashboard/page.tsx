"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore, type AssessmentRecord, type UserProfile } from "@/store/authStore";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { TrendingDown, TrendingUp, User, Calendar, Activity, ChevronDown, ChevronUp } from "lucide-react";

// ── Demo profiles ─────────────────────────────────────────────────────────────
// Fabricated 8-week journeys showing realistic PFAS reduction patterns

interface DemoProfile {
  id: string;
  name: string;
  tagline: string;
  location: string;
  avatar: string; // emoji
  joinDate: string;
  bio: string;
  topActions: string[];
  assessmentHistory: AssessmentRecord[];
}

function makeRecord(
  id: string,
  daysAgo: number,
  rei: number,
  zip: string,
  level: "low" | "moderate" | "high",
  factor: string,
): AssessmentRecord {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return { id, date: d.toISOString(), reiScore: rei, zipCode: zip, riskLevel: level, topRiskFactor: factor };
}

const DEMO_PROFILES: DemoProfile[] = [
  {
    id: "demo-alex",
    name: "Alex Rivera",
    tagline: "Urban apartment dweller reducing cookware & water exposure",
    location: "Chicago, IL · ZIP 60601",
    avatar: "🧑",
    joinDate: "9 weeks ago",
    bio: "Alex lives in a high-rise with city tap water. After their first audit revealed a high score driven by older Teflon cookware and local water contamination, they replaced their pans and installed an NSF-53 filter.",
    topActions: [
      "Replaced non-stick cookware with stainless steel",
      "Installed NSF-53 under-sink filter",
      "Added 3 daily fiber sources to diet",
      "Switched to PFAS-free food storage containers",
    ],
    assessmentHistory: [
      makeRecord("a1", 63, 74, "60601", "high",     "Water source"),
      makeRecord("a2", 49, 68, "60601", "high",     "Water source"),
      makeRecord("a3", 35, 58, "60601", "moderate", "Cookware"),
      makeRecord("a4", 21, 49, "60601", "moderate", "Cookware"),
      makeRecord("a5",  7, 43, "60601", "moderate", "Diet"),
    ],
  },
  {
    id: "demo-kim-family",
    name: "The Kim Family",
    tagline: "Suburban family with two children under 5 — fast-tracking full overhaul",
    location: "Wilmington, NC · ZIP 28401",
    avatar: "👨‍👩‍👧‍👦",
    joinDate: "11 weeks ago",
    bio: "The Kims have two crawling toddlers and live near a former PFAS manufacturing site. Their first audit score was alarming. Over 10 weeks they executed a full household overhaul: filter, cookware, switching to organic baby food, and minimizing carpet dust exposure.",
    topActions: [
      "Installed whole-home reverse osmosis system",
      "Replaced all non-stick cookware systemwide",
      "Switched to PFAS-free fabric-treated furniture",
      "Started organic produce delivery subscription",
      "Consulted pediatrician about biomonitoring",
    ],
    assessmentHistory: [
      makeRecord("k1", 77, 91, "28401", "high",     "Household dust"),
      makeRecord("k2", 63, 85, "28401", "high",     "Water source"),
      makeRecord("k3", 49, 79, "28401", "high",     "Water source"),
      makeRecord("k4", 35, 68, "28401", "high",     "Household dust"),
      makeRecord("k5", 21, 56, "28401", "moderate", "Diet"),
      makeRecord("k6",  7, 44, "28401", "moderate", "Diet"),
    ],
  },
  {
    id: "demo-jordan",
    name: "Jordan Chen",
    tagline: "Daily makeup user switching to clean beauty brands",
    location: "San Francisco, CA · ZIP 94103",
    avatar: "🧑‍💼",
    joinDate: "6 weeks ago",
    bio: "Jordan wears full makeup daily and uses several hair styling products. Their audit revealed a moderate score with personal care as the primary driver. They've been methodically swapping products for EWG-verified alternatives.",
    topActions: [
      "Replaced 4 makeup products with EWG Verified™ alternatives",
      "Dropped dry shampoo, switched to water-wash routine",
      "Started skin barrier repair protocol (reduce absorption)",
      "Added weekly PFAS body burden log",
    ],
    assessmentHistory: [
      makeRecord("j1", 42, 62, "94103", "moderate", "Personal care"),
      makeRecord("j2", 28, 55, "94103", "moderate", "Personal care"),
      makeRecord("j3", 14, 48, "94103", "moderate", "Personal care"),
      makeRecord("j4",  3, 38, "94103", "low",      "Diet"),
    ],
  },
];

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ history, color = "#10b981" }: { history: AssessmentRecord[]; color?: string }) {
  if (history.length < 2) return null;
  const vals = [...history].reverse().map((r) => r.reiScore);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const W = 120;
  const H = 40;
  const pts = vals
    .map((v, i) => {
      const x = (i / (vals.length - 1)) * W;
      const y = H - ((v - min) / range) * H * 0.8 - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {vals.map((v, i) => {
        const x = (i / (vals.length - 1)) * W;
        const y = H - ((v - min) / range) * H * 0.8 - 4;
        return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />;
      })}
    </svg>
  );
}

// ── Score badge ───────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color = score < 33 ? "var(--safe)" : score < 67 ? "var(--warn)" : "var(--danger)";
  const label = score < 33 ? "Low" : score < 67 ? "Moderate" : "High";
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "3px 10px", borderRadius: 99,
        background: `${color}18`, border: `0.5px solid ${color}50`,
        color, fontSize: 11, fontFamily: "var(--mono)", fontWeight: 700,
      }}
    >
      {label}
    </span>
  );
}

// ── Trend arrow ───────────────────────────────────────────────────────────────

function TrendBadge({ history }: { history: AssessmentRecord[] }) {
  if (history.length < 2) return null;
  const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const delta = sorted[sorted.length - 1].reiScore - sorted[0].reiScore;
  const improving = delta < 0;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontSize: 12, fontFamily: "var(--mono)",
        color: improving ? "var(--safe)" : "var(--danger)",
      }}
    >
      {improving ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
      {improving ? "" : "+"}
      {delta} pts
    </span>
  );
}

// ── Assessment history list ───────────────────────────────────────────────────

function HistoryCard({ record }: { record: AssessmentRecord }) {
  const d = new Date(record.date);
  const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px",
        background: "var(--surface2)", borderRadius: 10,
        border: "0.5px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Calendar size={14} color="var(--text3)" />
        <div>
          <p style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>{dateStr}</p>
          {record.topRiskFactor && (
            <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
              Top factor: {record.topRiskFactor}
            </p>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <ScoreBadge score={record.reiScore} />
        <span
          style={{
            fontFamily: "var(--mono)", fontSize: 18, fontWeight: 700,
            color: record.riskLevel === "low" ? "var(--safe)" : record.riskLevel === "moderate" ? "var(--warn)" : "var(--danger)",
          }}
        >
          {record.reiScore}
        </span>
      </div>
    </div>
  );
}

// ── Demo profile card ─────────────────────────────────────────────────────────

function DemoProfileCard({ profile }: { profile: DemoProfile }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...profile.assessmentHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latest = sorted[0];
  const sparkHistory = [...profile.assessmentHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const improving = sparkHistory.length >= 2 &&
    sparkHistory[sparkHistory.length - 1].reiScore < sparkHistory[0].reiScore;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border2)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ padding: "20px 24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div
            style={{
              width: 48, height: 48, borderRadius: 12,
              background: "var(--surface2)", border: "0.5px solid var(--border2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, flexShrink: 0,
            }}
          >
            {profile.avatar}
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>
              {profile.name}
            </p>
            <p style={{ fontSize: 11, color: "var(--text2)", marginBottom: 4, fontFamily: "var(--mono)" }}>
              {profile.location}
            </p>
            <p style={{ fontSize: 12, color: "var(--text3)" }}>{profile.tagline}</p>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 28, fontWeight: 700,
            color: latest.riskLevel === "low" ? "var(--safe)" : latest.riskLevel === "moderate" ? "var(--warn)" : "var(--danger)" }}>
            {latest.reiScore}
          </div>
          <TrendBadge history={profile.assessmentHistory} />
        </div>
      </div>

      {/* Sparkline strip */}
      <div
        style={{
          margin: "0 24px 16px",
          padding: "12px 16px",
          background: "var(--surface2)", borderRadius: 10,
          border: "0.5px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <div>
          <p style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text3)", marginBottom: 4, letterSpacing: "0.06em" }}>
            REI TREND · {profile.assessmentHistory.length} ASSESSMENTS
          </p>
          <Sparkline
            history={sparkHistory}
            color={improving ? "#60d890" : "#f59e0b"}
          />
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text3)", marginBottom: 4 }}>JOINED</p>
          <p style={{ fontSize: 12, color: "var(--text2)" }}>{profile.joinDate}</p>
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded((x) => !x)}
        style={{
          width: "100%", padding: "12px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--surface2)", border: "none",
          borderTop: "0.5px solid var(--border)",
          cursor: "pointer", color: "var(--text2)", fontSize: 12,
          fontFamily: "var(--mono)",
        }}
      >
        <span>View full journey</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: "20px 24px", borderTop: "0.5px solid var(--border)" }}>
          <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16, lineHeight: 1.65 }}>
            {profile.bio}
          </p>

          <p style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text3)", marginBottom: 10, letterSpacing: "0.06em" }}>
            KEY ACTIONS TAKEN
          </p>
          <ul style={{ marginBottom: 20, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {profile.topActions.map((action, i) => (
              <li key={i} style={{ fontSize: 13, color: "var(--text2)", display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: "var(--accent)", marginTop: 2, flexShrink: 0 }}>✓</span>
                {action}
              </li>
            ))}
          </ul>

          <p style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text3)", marginBottom: 10, letterSpacing: "0.06em" }}>
            ASSESSMENT HISTORY
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sorted.map((r) => (
              <HistoryCard key={r.id} record={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Personal dashboard (logged-in view) ───────────────────────────────────────

function PersonalDashboard({ user }: { user: UserProfile }) {
  const { logout } = useAuthStore();
  const router = useRouter();
  const sorted = [...user.assessmentHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latest = sorted[0];
  const sparkHistory = [...user.assessmentHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 60px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
        <div>
          <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text3)", letterSpacing: "0.06em", marginBottom: 4 }}>
            YOUR PFAS JOURNEY
          </p>
          <h1 className="heading-serif" style={{ fontSize: 32 }}>
            Hello, {user.name.split(" ")[0]}
          </h1>
        </div>
        <button
          onClick={() => { logout(); router.push("/"); }}
          style={{
            fontFamily: "var(--mono)", fontSize: 11, color: "var(--text3)",
            background: "transparent", border: "0.5px solid var(--border2)",
            borderRadius: 8, padding: "6px 12px", cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>

      {/* Summary tiles */}
      {user.assessmentHistory.length === 0 ? (
        <div
          style={{
            padding: "40px 32px", textAlign: "center",
            background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 16,
            marginBottom: 32,
          }}
        >
          <Activity size={32} color="var(--text3)" style={{ margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>No assessments yet</h2>
          <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 20, maxWidth: 380, margin: "0 auto 20px" }}>
            Complete your first audit to start tracking your personal PFAS exposure journey.
          </p>
          <Link
            href="/audit"
            style={{
              display: "inline-block",
              padding: "10px 24px",
              background: "var(--accent)", color: "#0d0f0e",
              borderRadius: 10, fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Start audit →
          </Link>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
            {/* Latest score */}
            <div
              style={{
                padding: "20px 20px",
                background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 14,
              }}
            >
              <p style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text3)", marginBottom: 8, letterSpacing: "0.06em" }}>
                LATEST REI
              </p>
              <p
                style={{
                  fontFamily: "var(--mono)", fontSize: 34, fontWeight: 700, lineHeight: 1,
                  color: latest.riskLevel === "low" ? "var(--safe)" : latest.riskLevel === "moderate" ? "var(--warn)" : "var(--danger)",
                }}
              >
                {latest.reiScore}
              </p>
              <div style={{ marginTop: 6 }}><ScoreBadge score={latest.reiScore} /></div>
            </div>

            {/* Assessments count */}
            <div
              style={{
                padding: "20px 20px",
                background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 14,
              }}
            >
              <p style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text3)", marginBottom: 8, letterSpacing: "0.06em" }}>
                ASSESSMENTS
              </p>
              <p style={{ fontFamily: "var(--mono)", fontSize: 34, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
                {user.assessmentHistory.length}
              </p>
              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>tracked sessions</p>
            </div>

            {/* Trend */}
            <div
              style={{
                padding: "20px 20px",
                background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 14,
              }}
            >
              <p style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text3)", marginBottom: 8, letterSpacing: "0.06em" }}>
                TREND
              </p>
              {sparkHistory.length >= 2 ? (
                <>
                  <Sparkline history={sparkHistory} color={sparkHistory[sparkHistory.length - 1].reiScore < sparkHistory[0].reiScore ? "#60d890" : "#f59e0b"} />
                  <div style={{ marginTop: 4 }}><TrendBadge history={user.assessmentHistory} /></div>
                </>
              ) : (
                <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 8 }}>Complete 2+ audits to see trend</p>
              )}
            </div>
          </div>

          {/* History */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text3)", letterSpacing: "0.06em", marginBottom: 12 }}>
              ASSESSMENT HISTORY
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sorted.map((r) => (
                <HistoryCard key={r.id} record={r} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* CTA */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px",
          background: "rgba(200,240,96,0.06)", border: "0.5px solid rgba(200,240,96,0.2)",
          borderRadius: 14,
        }}
      >
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Ready for your next assessment?</p>
          <p style={{ fontSize: 12, color: "var(--text2)" }}>Track changes as you adopt new habits.</p>
        </div>
        <Link
          href="/audit"
          style={{
            padding: "10px 20px",
            background: "var(--accent)", color: "#0d0f0e",
            borderRadius: 10, fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700,
            textDecoration: "none", whiteSpace: "nowrap",
          }}
        >
          New audit →
        </Link>
      </div>
    </div>
  );
}

// ── Guest CTA ─────────────────────────────────────────────────────────────────

function GuestCTA() {
  return (
    <div
      style={{
        maxWidth: 480, margin: "0 auto 56px",
        padding: "36px 32px", textAlign: "center",
        background: "var(--surface)", border: "0.5px solid var(--border2)", borderRadius: 20,
      }}
    >
      <User size={32} color="var(--text3)" style={{ margin: "0 auto 16px" }} />
      <h2 style={{ fontSize: 22, marginBottom: 10 }}>Track your progress</h2>
      <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 28, lineHeight: 1.65 }}>
        Create a free account to save your assessments, track your REI score over time,
        and monitor real reduction progress week by week.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <Link
          href="/login"
          style={{
            padding: "11px 24px",
            background: "var(--accent)", color: "#0d0f0e",
            borderRadius: 10, fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Create account →
        </Link>
        <Link
          href="/login"
          style={{
            padding: "11px 24px",
            background: "transparent", color: "var(--text2)",
            border: "0.5px solid var(--border2)",
            borderRadius: 10, fontFamily: "var(--mono)", fontSize: 13,
            textDecoration: "none",
          }}
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isLoggedIn } = useAuthStore();

  // Hydration guard — authStore uses localStorage which only runs client-side
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <main style={{ background: "var(--bg)", color: "var(--text)", fontFamily: "var(--sans)" }} className="min-h-screen">
        <div style={{ paddingTop: 100 }} />
      </main>
    );
  }

  return (
    <main
      style={{ background: "var(--bg)", color: "var(--text)", fontFamily: "var(--sans)" }}
      className="min-h-screen"
    >
      {/* Nav */}
      <nav
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 32px",
          background: "var(--nav-bg)",
          backdropFilter: "blur(12px)",
          borderBottom: "0.5px solid var(--border)",
        }}
      >
        <Link href="/" style={{ fontFamily: "var(--mono)", fontSize: 15, color: "var(--accent)", letterSpacing: "0.04em", textDecoration: "none" }}>
          BIO//BOUND
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ThemeToggle />
          {isLoggedIn && user ? (
            <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text2)" }}>
              {user.name}
            </span>
          ) : (
            <Link href="/login" style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text2)", textDecoration: "none" }}>
              Sign in
            </Link>
          )}
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

      <div style={{ paddingTop: 96 }}>
        {/* Page header */}
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 32px" }}>
          <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text3)", letterSpacing: "0.06em", marginBottom: 8 }}>
            DASHBOARD
          </p>
          <h1 className="heading-serif" style={{ fontSize: "clamp(30px, 5vw, 44px)", marginBottom: 12 }}>
            Progress & Profiles
          </h1>
          <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.65, maxWidth: 520 }}>
            PFAS reduction is a multi-month journey. Track your score over time, celebrate wins,
            and learn from others who've made meaningful changes.
          </p>
        </div>

        {/* Personal section */}
        {isLoggedIn && user ? (
          <PersonalDashboard user={user} />
        ) : (
          <>
            <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>
              <GuestCTA />
            </div>
          </>
        )}

        {/* Demo profiles section */}
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 80px" }}>
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text3)", letterSpacing: "0.06em", marginBottom: 6 }}>
              FEATURED JOURNEYS
            </p>
            <h2 style={{ fontSize: 22, marginBottom: 6 }}>What real reduction looks like</h2>
            <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.65 }}>
              These demo profiles illustrate what consistent action looks like over 6–11 weeks.
              Scores reflect real-world PFAS elimination timelines — not rapid overnight fixes.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {DEMO_PROFILES.map((profile) => (
              <DemoProfileCard key={profile.id} profile={profile} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
