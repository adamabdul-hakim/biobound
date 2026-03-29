/**
 * authStore.ts — SafeSource client-side authentication
 *
 * DEMO APPLICATION NOTE: This uses browser localStorage for persistence.
 * Passwords are hashed with SHA-256 via the Web Crypto API before storage.
 * No credentials leave the client. This is appropriate for a portfolio demo
 * only — production services require server-side auth (e.g., OAuth, JWTs).
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AssessmentRecord {
  id: string;
  date: string; // ISO 8601
  reiScore: number;
  zipCode: string;
  riskLevel: "low" | "moderate" | "high";
  topRiskFactor?: string; // e.g. "Water source", "Cookware"
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string; // ISO 8601
  assessmentHistory: AssessmentRecord[];
}

/** Extends UserProfile with stored credential hash (never surfaced to consumers) */
interface StoredUser extends UserProfile {
  passwordHash: string;
}

interface AuthState {
  user: UserProfile | null;
  isLoggedIn: boolean;
  authError: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  saveAssessment: (record: Omit<AssessmentRecord, "id" | "date">) => void;
  clearAuthError: () => void;
}

// ── Crypto helpers ────────────────────────────────────────────────────────────

async function hashPassword(password: string, email: string): Promise<string> {
  // Domain-scoped: include lowercase email so the same password produces
  // different hashes on different accounts.
  const message = `${password}::${email.toLowerCase()}::safesource-v1`;
  const encoded = new TextEncoder().encode(message);
  const hashBuf = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── LocalStorage user registry ─────────────────────────────────────────────

function getStoredUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem("safesource-users");
    if (!raw) return [];
    return JSON.parse(raw) as StoredUser[];
  } catch {
    return [];
  }
}

function setStoredUsers(users: StoredUser[]): void {
  localStorage.setItem("safesource-users", JSON.stringify(users));
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoggedIn: false,
      authError: null,

      login: async (email, password) => {
        const users = getStoredUsers();
        const found = users.find(
          (u) => u.email.toLowerCase() === email.toLowerCase().trim(),
        );
        if (!found) {
          set({ authError: "No account found with that email." });
          return false;
        }
        const hash = await hashPassword(password, found.email);
        if (hash !== found.passwordHash) {
          set({ authError: "Incorrect password." });
          return false;
        }
        // Never surface passwordHash to state consumers
        const { passwordHash: _pw, ...profile } = found;
        set({ user: profile, isLoggedIn: true, authError: null });
        return true;
      },

      register: async (name, email, password) => {
        const normalised = email.toLowerCase().trim();
        const users = getStoredUsers();
        if (users.find((u) => u.email === normalised)) {
          set({ authError: "An account with that email already exists." });
          return false;
        }
        const hash = await hashPassword(password, normalised);
        const newUser: StoredUser = {
          id: crypto.randomUUID(),
          name: name.trim(),
          email: normalised,
          createdAt: new Date().toISOString(),
          assessmentHistory: [],
          passwordHash: hash,
        };
        setStoredUsers([...users, newUser]);
        const { passwordHash: _pw, ...profile } = newUser;
        set({ user: profile, isLoggedIn: true, authError: null });
        return true;
      },

      logout: () => set({ user: null, isLoggedIn: false, authError: null }),

      saveAssessment: (record) =>
        set((s) => {
          if (!s.user) return s;
          const newRecord: AssessmentRecord = {
            ...record,
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
          };
          const updated: UserProfile = {
            ...s.user,
            // Keep at most 50 records, most recent first
            assessmentHistory: [newRecord, ...s.user.assessmentHistory].slice(0, 50),
          };
          // Sync back into the user registry so history survives logout+login
          const users = getStoredUsers();
          const idx = users.findIndex((u) => u.id === s.user!.id);
          if (idx >= 0) {
            users[idx] = { ...users[idx], assessmentHistory: updated.assessmentHistory };
            setStoredUsers(users);
          }
          return { user: updated };
        }),

      clearAuthError: () => set({ authError: null }),
    }),
    {
      // Only persist session tokens — never the overall user registry (that lives separately)
      name: "safesource-auth-session",
      partialize: (s) => ({ user: s.user, isLoggedIn: s.isLoggedIn }),
    },
  ),
);
