"use client";

import { useState } from "react";
import { Sun, Moon } from "lucide-react";

function applyTheme(theme: "dark" | "light") {
  if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  try {
    localStorage.setItem("safesource-theme", theme);
  } catch {}
}

export function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") {
      return "dark";
    }
    const stored = localStorage.getItem("safesource-theme");
    const initialTheme = stored === "light" ? "light" : "dark";
    applyTheme(initialTheme);
    return initialTheme;
  });

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  return { theme, toggle };
}

interface ThemeToggleProps {
  style?: React.CSSProperties;
}

export default function ThemeToggle({ style }: ThemeToggleProps) {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        background: "transparent",
        border: "0.5px solid var(--border2)",
        borderRadius: 8,
        padding: "5px 8px",
        cursor: "pointer",
        color: "var(--text2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "color 0.15s, border-color 0.15s",
        ...style,
      }}
    >
      {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
