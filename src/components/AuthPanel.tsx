import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../store/AuthContext";
export default function AuthPanel() {
  const { signIn, error, configured, invitationPending, completeInvitation } = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false); const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setMessage(""); try { if (invitationPending) { await completeInvitation(password); setMessage("Password saved. You can sign in with your work email and new password."); } else await signIn(email, password); } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Authentication failed."); } finally { setBusy(false); } }
  return <section className="auth" aria-label="Staff sign in"><h2>{invitationPending ? "Set your reporter password" : "Staff sign in"}</h2>
    {!configured && <p className="flash">Supabase is not connected yet. Add the project URL and anon key to the deployment environment.</p>}
    <form className="form" onSubmit={submit}>{!invitationPending && <label><span>Work email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></label>}<label><span>{invitationPending ? "New password (12+ characters)" : "Password"}</span><span className="password-field"><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={invitationPending ? "new-password" : "current-password"} minLength={invitationPending ? 12 : undefined} required /><button className="password-field__toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{showPassword ? <><path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.2A11 11 0 0 1 12 5c5 0 9 5 9 7a9.7 9.7 0 0 1-2.2 3.2M6.2 6.2C3.9 7.7 3 10 3 12c0 2 4 7 9 7 1.1 0 2.1-.2 3-.6"/></> : <><path d="M2.5 12s3.4-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.4 6.5-9.5 6.5S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.7"/></>}</svg></button></span></label>
      {(error || message) && <p className="flash">{message || error}</p>}<button className="btn" type="submit" disabled={busy || !configured}>{busy ? "Please wait…" : invitationPending ? "Set password" : "Sign in"}</button>
      {!invitationPending && <p className="auth__note">Reporter accounts are created by a super admin. Invitations include a secure link for setting your password.</p>}</form>
  </section>;
}
