import { useEffect } from "react";
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
  useEffect(() => {
    const supported = Boolean(
      publicKey && backendConfigured && window.isSecureContext &&
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window,
    );
    if (!supported) return;

    let disposed = false;
    let interactionHandled = false;
    let askedThisSession = false;

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
            void registerDevice().catch((error) => console.warn("Could not enable GTN push notifications", error));
          }
        }).catch((error) => {
          console.warn("Could not request GTN notification permission", error);
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
      void registerDevice().catch((error) => console.warn("Could not enable GTN push notifications", error));
    }

    window.addEventListener("keydown", onInteraction, true);
    window.addEventListener("click", onInteraction, true);

    return () => {
      disposed = true;
      removeInteractionListeners();
    };
  }, []);

  return null;
}
