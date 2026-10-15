import { useEffect, useState } from "react";
import { backend, backendConfigured } from "../lib/backend";

const publicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY as string | undefined;

function applicationServerKey(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes.buffer;
}

function BellIcon() {
  return <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function PushNotifications() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const available = Boolean(publicKey && backendConfigured && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && window.isSecureContext);
    setSupported(available);
    if (!available) return;
    setPermission(Notification.permission);
    let active = true;
    navigator.serviceWorker.register("/sw.js").then((registration) => registration.pushManager.getSubscription()).then(async (subscription) => {
      if (active) setEnabled(Boolean(subscription));
      if (subscription) await manageSubscription("subscribe", subscription);
    }).catch((error) => console.warn("Push notification setup unavailable", error));
    return () => { active = false; };
  }, []);

  if (!supported) return null;

  async function manageSubscription(action: "subscribe" | "unsubscribe", subscription: PushSubscription) {
    await backend.invoke("manage-push-subscription", { action, subscription: action === "subscribe" ? subscription.toJSON() : undefined, endpoint: subscription.endpoint });
  }

  async function toggle() {
    setBusy(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await manageSubscription("unsubscribe", subscription);
        await subscription.unsubscribe();
        setEnabled(false);
        setMessage("News alerts turned off on this device.");
      } else {
        const nextPermission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
        setPermission(nextPermission);
        if (nextPermission !== "granted") {
          setMessage(nextPermission === "denied" ? "Alerts are blocked. Change this site's notification permission in your browser settings." : "Allow notifications to receive news and live event alerts.");
          return;
        }
        subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(publicKey!) });
        await manageSubscription("subscribe", subscription);
        setEnabled(true);
        setMessage("News and live event alerts are enabled on this device.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update notification settings.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="push-alerts">
    <button type="button" className={`site-header__push${enabled ? " is-enabled" : ""}`} onClick={toggle} disabled={busy} aria-pressed={enabled} aria-label={enabled ? "Turn off news alerts" : "Enable news alerts"} title={enabled ? "News alerts enabled" : "Enable news alerts"}><BellIcon /><span className="push-alerts__label">{busy ? "…" : enabled ? "Alerts on" : "Alerts"}</span></button>
    {message && <span className="push-alerts__message" role="status">{message}</span>}
    {permission === "denied" && <span className="sr-only">Notifications are blocked in browser settings.</span>}
  </div>;
}
