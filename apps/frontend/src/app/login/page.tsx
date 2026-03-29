"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";

type Tab = "signin" | "register";

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get("redirect") ?? "/dashboard";

  const { login, register, isLoggedIn, authError, clearAuthError } = useAuthStore();

  const [tab, setTab] = useState<Tab>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect immediately
  useEffect(() => {
    if (isLoggedIn) router.replace(redirect);
  }, [isLoggedIn, redirect, router]);

  // Clear store error when user switches tabs or starts typing
  useEffect(() => {
    clearAuthError();
    setLocalError(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, email, password, name]);

  const errorMsg = localError ?? authError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (!validateEmail(email)) {
      setLocalError("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }

    if (tab === "register") {
      if (!name.trim()) {
        setLocalError("Please enter your name.");
        return;
      }
      if (password !== confirm) {
        setLocalError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);
    try {
      const ok =
        tab === "signin"
          ? await login(email, password)
          : await register(name, email, password);

      if (ok) router.push(redirect);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{ background: "var(--bg)", color: "var(--text)", fontFamily: "var(--sans)" }}
      className="min-h-screen flex flex-col items-center justify-center px-4 py-20"
    >
      {/* Back link */}
      <div style={{ width: "100%", maxWidth: 440 }} className="mb-6">
        <Link
          href="/"
          style={{
            fontFamily: "var(--mono)", fontSize: 12, color: "var(--text2)",
            textDecoration: "none",
          }}
        >
          ← BIO//BOUND
        </Link>
      </div>

      {/* Card */}
      <div
        style={{
          width: "100%", maxWidth: 440,
          background: "var(--surface)",
          border: "0.5px solid var(--border2)",
          borderRadius: 20,
          padding: "36px 36px 40px",
        }}
      >
        {/* Heading */}
        <h1
          className="heading-serif"
          style={{ fontSize: 28, marginBottom: 6, lineHeight: 1.2 }}
        >
          {tab === "signin" ? "Welcome back" : "Create your profile"}
        </h1>
        <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 28 }}>
          {tab === "signin"
            ? "Sign in to track your PFAS reduction journey."
            : "Save assessments and monitor your progress over time."}
        </p>

        {/* Tabs */}
        <div
          style={{
            display: "flex", gap: 4, marginBottom: 28,
            background: "var(--surface2)", borderRadius: 10, padding: 4,
          }}
        >
          {(["signin", "register"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: "8px 0",
                borderRadius: 7, border: "none", cursor: "pointer",
                fontFamily: "var(--mono)", fontSize: 12,
                background: tab === t ? "var(--accent)" : "transparent",
                color: tab === t ? "#0d0f0e" : "var(--text2)",
                fontWeight: tab === t ? 700 : 400,
                transition: "all 0.15s",
              }}
            >
              {t === "signin" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div
            role="alert"
            style={{
              background: "rgba(255,92,58,0.12)", border: "0.5px solid rgba(255,92,58,0.4)",
              borderRadius: 9, padding: "10px 14px", marginBottom: 20,
              fontSize: 13, color: "#ff8a70",
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {tab === "register" && (
            <Field label="Full Name">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Rivera"
                autoComplete="name"
                required
                style={inputStyle}
              />
            </Field>
          )}

          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              style={inputStyle}
            />
          </Field>

          <Field label="Password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tab === "register" ? "Min 8 characters" : "••••••••"}
              autoComplete={tab === "signin" ? "current-password" : "new-password"}
              required
              style={inputStyle}
            />
          </Field>

          {tab === "register" && (
            <Field label="Confirm Password">
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                style={inputStyle}
              />
            </Field>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              width: "100%", padding: "13px 0",
              background: loading ? "rgba(200,240,96,0.4)" : "var(--accent)",
              color: "#0d0f0e", border: "none", borderRadius: 10,
              fontFamily: "var(--mono)", fontSize: 14, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "opacity 0.15s",
            }}
          >
            {loading
              ? "Please wait…"
              : tab === "signin"
              ? "Sign In →"
              : "Create Account →"}
          </button>
        </form>

        {/* Footer note */}
        <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 24, lineHeight: 1.6, textAlign: "center" }}>
          Your data lives only in this browser.{" "}
          <span style={{ color: "var(--text2)" }}>No servers, no tracking.</span>
        </p>
      </div>

      {/* Demo link */}
      <p style={{ marginTop: 24, fontSize: 13, color: "var(--text2)" }}>
        Just exploring?{" "}
        <Link href="/demo" style={{ color: "var(--accent)", textDecoration: "none" }}>
          Try a demo profile →
        </Link>
      </p>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--text2)", letterSpacing: "0.04em" }}>
        {label.toUpperCase()}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  background: "var(--surface2)",
  border: "0.5px solid var(--border2)",
  borderRadius: 9,
  color: "var(--text)",
  fontFamily: "var(--sans)",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};
