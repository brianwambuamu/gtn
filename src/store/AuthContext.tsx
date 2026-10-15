/* oxlint-disable react/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { backend, backendConfigured, getSession, saveSession, SESSION_KEY } from "../lib/backend";

export type StaffRole = "super_admin" | "reporter";
export type StaffUser = { id: string; email: string; role: StaffRole; display_name: string; is_active: boolean; created_at?: string };
const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const LAST_ACTIVITY_KEY = "gtn.staff-last-activity";
type AuthValue = { user: StaffUser | null; loading: boolean; error: string; configured: boolean; invitationPending: boolean; completeInvitation: (password: string) => Promise<void>; signIn: (email: string, password: string) => Promise<void>; signOut: () => Promise<void>; inviteReporter: (email: string, displayName: string) => Promise<void>; manageStaff: (action:"delete"|"deactivate"|"activate", userId:string)=>Promise<void> };
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invitationPending, setInvitationPending] = useState(false);
  useEffect(() => {
    let active = true;
    async function load() {
      const query = new URLSearchParams(window.location.search);
      const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const token = params.get("access_token");
      let session = getSession();
      const tokenHash = query.get("token_hash");
      const type = query.get("type");
      if (tokenHash && ["invite", "recovery"].includes(type || "")) {
        try {
          session = await backend.auth("verify", { token_hash: tokenHash, type });
          saveSession(session);
          setInvitationPending(true);
          window.history.replaceState(null, "", window.location.pathname);
        } catch (cause) {
          if (active) setError(cause instanceof Error ? cause.message : "The invitation link could not be verified.");
        }
      } else if (token && ["invite", "recovery"].includes(params.get("type") || "")) {
        try {
          const claims = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
          session = { access_token: token, refresh_token: params.get("refresh_token") || undefined, user: { id: claims.sub, email: claims.email } };
          saveSession(session); setInvitationPending(true); window.history.replaceState(null, "", window.location.pathname);
        } catch { /* malformed token is ignored and normal sign in remains available */ }
      }
      if (session) {
        try {
          const rows = await backend.rows<StaffUser>("staff_profiles", `select=id,email,role,display_name,is_active,created_at&id=eq.${session.user.id}&limit=1`);
          if (rows[0] && !rows[0].is_active) { saveSession(null); if (active) setError("This staff account is inactive. Contact the Super Admin."); }
          else if (active) setUser(rows[0] || null);
        } catch { saveSession(null); }
      }
      if (active) setLoading(false);
    }
    load(); return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!user || invitationPending) return;
    let timer = 0;
    let lastWrite = 0;
    const readActivity = () => Number(localStorage.getItem(LAST_ACTIVITY_KEY)) || 0;
    const expire = () => {
      window.clearTimeout(timer);
      saveSession(null);
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      setUser(null);
      setError("You were signed out after 10 minutes of inactivity. Sign in again to continue.");
    };
    const schedule = () => {
      window.clearTimeout(timer);
      const lastActivity = readActivity();
      const remaining = IDLE_TIMEOUT_MS - (Date.now() - lastActivity);
      if (remaining <= 0) expire();
      else timer = window.setTimeout(expire, remaining);
    };
    const recordActivity = () => {
      const now = Date.now();
      if (now - lastWrite >= 1000) {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
        lastWrite = now;
      }
      schedule();
    };
    if (!readActivity()) {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      lastWrite = Date.now();
    }
    schedule();
    const activityEvents: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "scroll", "touchstart", "mousemove", "focus"];
    activityEvents.forEach((name) => window.addEventListener(name, recordActivity, { passive: true }));
    const onStorage = (event: StorageEvent) => {
      if (event.key === LAST_ACTIVITY_KEY) schedule();
      if (event.key === SESSION_KEY && event.newValue === null) setUser(null);
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearTimeout(timer);
      activityEvents.forEach((name) => window.removeEventListener(name, recordActivity));
      window.removeEventListener("storage", onStorage);
    };
  }, [user, invitationPending]);
  async function signIn(email: string, password: string) {
    setError("");
    try {
      const session = await backend.auth("token?grant_type=password", { email: email.trim(), password });
      saveSession(session);
      const profiles = await backend.rows<StaffUser>("staff_profiles", `select=id,email,role,display_name,is_active,created_at&id=eq.${session.user.id}&limit=1`);
      if (!profiles[0]) { saveSession(null); throw new Error("This account has no staff role. Ask the super admin to invite you."); }
      if (!profiles[0].is_active) { saveSession(null); throw new Error("This staff account is inactive. Contact the Super Admin."); }
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      setUser(profiles[0]);
    } catch (cause) { const message = cause instanceof Error ? cause.message : "Sign in failed."; setError(message); throw new Error(message); }
  }
  async function signOut() { saveSession(null); localStorage.removeItem(LAST_ACTIVITY_KEY); setUser(null); setError(""); }
  async function completeInvitation(password: string) {
    if (password.length < 12) throw new Error("Choose a password with at least 12 characters.");
    await backend.changePassword(password);
    setInvitationPending(false);
    const session = getSession();
    const profiles = session ? await backend.rows<StaffUser>("staff_profiles", `select=id,email,role,display_name,is_active,created_at&id=eq.${session.user.id}&limit=1`) : [];
    if (profiles[0]) localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    setUser(profiles[0] || null);
  }
  async function inviteReporter(email: string, displayName: string) {
    await backend.invoke("invite-reporter", { email: email.trim(), display_name: displayName.trim() });
  }
  async function manageStaff(action:"delete"|"deactivate"|"activate", userId:string) {
    await backend.invoke("invite-reporter", { action, user_id:userId });
  }
  return <AuthContext.Provider value={{ user, loading, error, configured: backendConfigured, invitationPending, completeInvitation, signIn, signOut, inviteReporter, manageStaff }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error("useAuth must be used within an AuthProvider"); return context; }
