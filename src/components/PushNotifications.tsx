import { useEffect, useState } from "react";
import { backend, backendConfigured } from "../lib/backend";

const publicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY as string | undefined;
const permissionPromptKey = "gtn-notification-permission-requested-v2";

function applicationServerKey(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes.buffer;
}

export default function PushNotifications() {
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const isAppleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isInstalled = window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const unsupportedReason = !publicKey
      ? "GTN notifications are not configured for this deployment yet. Add VITE_WEB_PUSH_PUBLIC_KEY in Vercel and redeploy."
      : !backendConfigured
        ? "GTN notifications are unavailable because the Supabase connection is not configured."
        : !window.isSecureContext
          ? "GTN notifications require the secure HTTPS website."
          : isAppleMobile && !isInstalled
            ? "On iPhone or iPad, add GTN to your Home Screen and open the installed app to enable notifications."
            : !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)
              ? "This browser does not support GTN push notifications. Try an up-to-date browser."
              : "";

    let disposed = false;
    let interactionHandled = false;
    let askedThisSession = false;

    function onUnavailableInteraction(event: Event) {
      if (!event.isTrusted || interactionHandled || disposed) return;
      interactionHandled = true;
      removeInteractionListeners();
      setNotice(unsupportedReason);
    }

    if (unsupportedReason) {
      window.addEventListener("keydown", onUnavailableInteraction, true);
      window.addEventListener("click", onUnavailableInteraction, true);
      return () => {
        disposed = true;
        removeInteractionListeners();
      };
    }

    async function registerDevice() {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey(publicKey!),
        });
      }
      await backend.invoke("manage-push-subscription", {
        action: "subscribe",
        subscription: subscription.toJSON(),
        endpoint: subscription.endpoint,
      });
    }

    void navigator.serviceWorker.register("/sw.js").then(async (registration) => {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await backend.invoke("manage-push-subscription", {
          action: "subscribe",
          subscription: subscription.toJSON(),
          endpoint: subscription.endpoint,
        });
      }
    }).catch((error) => console.warn("GTN push setup unavailable", error));

    function removeInteractionListeners() {
      window.removeEventListener("keydown", onInteraction, true);
      window.removeEventListener("click", onInteraction, true);
    }

    function onInteraction(event: Event) {
      if (!event.isTrusted || interactionHandled || disposed) return;

      if (Notification.permission === "denied") {
        interactionHandled = true;
        removeInteractionListeners();
        setNotice("Notifications are blocked for GTN in this browser. Allow them in the site’s browser settings.");
        return;
      }

      if (Notification.permission === "default") {
        let wasPrompted = askedThisSession;
        try {
          wasPrompted ||= window.localStorage.getItem(permissionPromptKey) === "yes";
        } catch {
          // Session state still limits retries if browser storage is unavailable.
        }
        if (wasPrompted) {
          interactionHandled = true;
          removeInteractionListeners();
          setNotice("GTN’s notification prompt was already dismissed. Allow notifications for this site in your browser settings.");
          return;
        }

        askedThisSession = true;
        interactionHandled = true;
        removeInteractionListeners();
        // Call directly from the trusted interaction so the browser can show its permission prompt.
        void Notification.requestPermission().then((permission) => {
          try {
            // Save only after the browser has actually answered the permission request.
            window.localStorage.setItem(permissionPromptKey, "yes");
          } catch {
            // The in-memory flag still ensures that this page asks only once.
          }
          if (permission === "granted" && !disposed) {
            void registerDevice().catch((error) => {
              console.warn("Could not enable GTN push notifications", error);
              if (!disposed) setNotice("Permission was granted, but GTN could not register this device. Check your connection and try again.");
            });
          } else if (permission === "denied" && !disposed) {
            setNotice("Notifications are blocked for GTN. You can allow them in this site’s browser settings.");
          } else if (!disposed) {
            setNotice("Notifications are still off. You can enable them in this site’s browser settings.");
          }
        }).catch((error) => {
          console.warn("Could not request GTN notification permission", error);
          if (!disposed) setNotice("Your browser could not open the GTN notification prompt. Check this site’s notification settings.");
          if (!disposed) {
            askedThisSession = false;
            interactionHandled = false;
            window.addEventListener("keydown", onInteraction, true);
            window.addEventListener("click", onInteraction, true);
          }
        });
        return;
      }

      interactionHandled = true;
      removeInteractionListeners();
      void registerDevice().catch((error) => {
        console.warn("Could not enable GTN push notifications", error);
        if (!disposed) setNotice("GTN could not register this device for notifications. Check your connection and try again.");
      });
    }

    window.addEventListener("keydown", onInteraction, true);
    window.addEventListener("click", onInteraction, true);

    return () => {
      disposed = true;
      removeInteractionListeners();
    };
  }, []);

  return notice ? <div className="push-alerts__notice" role="status">
    <span>{notice}</span>
    <button type="button" onClick={() => setNotice("")} aria-label="Dismiss notification message">×</button>
  </div> : null;
}
