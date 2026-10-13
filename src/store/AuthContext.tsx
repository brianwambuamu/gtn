/* oxlint-disable react/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { backend, backendConfigured, getSession, saveSession } from "../lib/backend";

export type StaffRole = "super_admin" | "reporter";
export type StaffUser = { id: string; email: string; role: StaffRole; display_name: string };
type AuthValue = { user: StaffUser | null; loading: boolean; error: string; configured: boolean; invitationPending: boolean; completeInvitation: (password: string) => Promise<void>; signIn: (email: string, password: string) => Promise<void>; signOut: () => Promise<void>; inviteReporter: (email: string, displayName: string) => Promise<void> };
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invitationPending, setInvitationPending] = useState(false);
  useEffect(() => {
    let active = true;
    async function load() {
      const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const token = params.get("access_token");
      let session = getSession();
      if (token && ["invite", "recovery"].includes(params.get("type") || "")) {
        try {
          const claims = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
          session = { access_token: token, refresh_token: params.get("refresh_token") || undefined, user: { id: claims.sub, email: claims.email } };
          saveSession(session); setInvitationPending(true); window.history.replaceState(null, "", window.location.pathname);
        } catch { /* malformed token is ignored and normal sign in remains available */ }
      }
      if (session) {
        try {
          const rows = await backend.rows<StaffUser>("staff_profiles", "select=id,email,role,display_name&limit=1");
          if (active) setUser(rows[0] || null);
        } catch { saveSession(null); }
      }
      if (active) setLoading(false);
    }
    load(); return () => { active = false; };
  }, []);
  async function signIn(email: string, password: string) {
    setError("");
    try {
      const session = await backend.auth("token?grant_type=password", { email: email.trim(), password });
      saveSession(session);
      const profiles = await backend.rows<StaffUser>("staff_profiles", `select=id,email,role,display_name&id=eq.${session.user.id}&limit=1`);
      if (!profiles[0]) { saveSession(null); throw new Error("This account has no staff role. Ask the super admin to invite you."); }
      setUser(profiles[0]);
    } catch (cause) { const message = cause instanceof Error ? cause.message : "Sign in failed."; setError(message); throw new Error(message); }
  }
  async function signOut() { saveSession(null); setUser(null); }
  async function completeInvitation(password: string) {
    if (password.length < 12) throw new Error("Choose a password with at least 12 characters.");
    await backend.changePassword(password);
    setInvitationPending(false);
    const profiles = await backend.rows<StaffUser>("staff_profiles", "select=id,email,role,display_name&limit=1");
    setUser(profiles[0] || null);
  }
  async function inviteReporter(email: string, displayName: string) {
    await backend.invoke("invite-reporter", { email: email.trim(), display_name: displayName.trim() });
  }
  return <AuthContext.Provider value={{ user, loading, error, configured: backendConfigured, invitationPending, completeInvitation, signIn, signOut, inviteReporter }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error("useAuth must be used within an AuthProvider"); return context; }
