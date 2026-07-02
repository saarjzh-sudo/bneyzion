import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * T08 app-push — Web Push subscription lifecycle.
 *
 * Bridges the browser PushManager with our `push_subscriptions` table so the
 * broadcast-notification edge function can fan out OS-level notifications to
 * the right learners (e.g. only those studying the current weekly chapter).
 *
 * The actual web-push delivery needs a VAPID key pair. The PUBLIC key is read
 * from VITE_VAPID_PUBLIC_KEY at build time; when it is absent we degrade
 * gracefully — the in-app bell (user_notifications) keeps working, and the UI
 * surfaces that OS notifications aren't wired yet rather than throwing.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export interface PushState {
  isSupported: boolean;
  vapidConfigured: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isWorking: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

export function usePushNotifications(): PushState {
  const { user } = useAuth();

  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const vapidConfigured = !!VAPID_PUBLIC_KEY;

  const [permission, setPermission] = useState<NotificationPermission>(
    isSupported ? Notification.permission : "denied"
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  // Reflect any subscription that already exists in this browser.
  useEffect(() => {
    if (!isSupported) return;
    let cancelled = false;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!cancelled) setIsSubscribed(!!sub);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isSupported, user?.id]);

  const enable = useCallback(async () => {
    if (!isSupported || !user) return;
    setIsWorking(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return;

      // Without a VAPID public key we can't create a real push subscription.
      // Permission is still recorded so the in-app bell behaves; OS push waits
      // on the credential (tracked in _DONE.md).
      if (!vapidConfigured) return;

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as BufferSource,
        });
      }

      const json = sub.toJSON();
      const { error } = await (supabase as any)
        .from("push_subscriptions")
        .upsert(
          {
            user_id: user.id,
            endpoint: json.endpoint,
            p256dh: json.keys?.p256dh ?? null,
            auth: json.keys?.auth ?? null,
            user_agent: navigator.userAgent,
          },
          { onConflict: "endpoint" }
        );
      if (error) throw error;
      setIsSubscribed(true);
    } finally {
      setIsWorking(false);
    }
  }, [isSupported, user, vapidConfigured]);

  const disable = useCallback(async () => {
    if (!isSupported) return;
    setIsWorking(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await (supabase as any).from("push_subscriptions").delete().eq("endpoint", endpoint);
      }
      setIsSubscribed(false);
    } finally {
      setIsWorking(false);
    }
  }, [isSupported]);

  return { isSupported, vapidConfigured, permission, isSubscribed, isWorking, enable, disable };
}
