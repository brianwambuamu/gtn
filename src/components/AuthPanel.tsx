import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../store/AuthContext";
export default function AuthPanel() {
  const { signIn, error, configured, invitationPending, completeInvitation } = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setMessage(""); try { if (invitationPending) { await completeInvitation(password); setMessage("Password saved. You can sign in with your work email and new password."); } else await signIn(email, password); } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Authentication failed."); } finally { setBusy(false); } }
  return <section className="auth" aria-label="Staff sign in"><h2>{invitationPending ? "Set your reporter password" : "Staff sign in"}</h2>
    {!configured && <p className="flash">Supabase is not connected yet. Add the project URL and anon key to the deployment environment.</p>}
    <form className="form" onSubmit={submit}>{!invitationPending && <label><span>Work email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></label>}<label><span>{invitationPending ? "New password (12+ characters)" : "Password"}</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={invitationPending ? "new-password" : "current-password"} minLength={invitationPending ? 12 : undefined} required /></label>
      {(error || message) && <p className="flash">{message || error}</p>}<button className="btn" type="submit" disabled={busy || !configured}>{busy ? "Please wait…" : invitationPending ? "Set password" : "Sign in"}</button>
      {!invitationPending && <p className="auth__note">Reporter accounts are created by a super admin. Invitations include a secure link for setting your password.</p>}</form>
  </section>;
}
