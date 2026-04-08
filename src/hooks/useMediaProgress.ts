import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Tracks and restores playback progress for native <video> and <audio> elements.
 * Returns a ref callback to attach to the media element.
 */
export function useMediaProgress(lessonId: string | undefined | null) {
  const { user } = useAuth();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const restoredRef = useRef(false);

  // Save progress to user_history
  const saveProgress = useCallback(async (seconds: number, completed = false) => {
    if (!user || !lessonId || seconds <= 0) return;
    const { data: existing } = await supabase
      .from("user_history")
      .select("id")
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId)
      .maybeSingle();
    const payload: any = {
      progress_seconds: Math.floor(seconds),
      watched_at: new Date().toISOString(),
    };
    if (completed) payload.completed = true;
    if (existing) {
      await supabase.from("user_history").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("user_history").insert({
        user_id: user.id,
        lesson_id: lessonId,
        ...payload,
      });
    }
  }, [user, lessonId]);

  // Restore saved position when media loads
  const restoreProgress = useCallback(async (el: HTMLVideoElement | HTMLAudioElement) => {
    if (!user || !lessonId || restoredRef.current) return;
    restoredRef.current = true;
    const { data } = await supabase
      .from("user_history")
      .select("progress_seconds, completed")
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId)
      .maybeSingle();
    if (data?.progress_seconds && data.progress_seconds > 0 && !data?.completed) {
      // Wait for enough data
      const trySeek = () => {
        if (el.duration && data.progress_seconds! < el.duration - 10) {
          el.currentTime = data.progress_seconds!;
        }
      };
      if (el.readyState >= 1) {
        trySeek();
      } else {
        el.addEventListener("loadedmetadata", trySeek, { once: true });
      }
    }
  }, [user, lessonId]);

  // Ref callback to attach to media element
  const setMediaRef = useCallback((el: HTMLVideoElement | HTMLAudioElement | null) => {
    // Cleanup previous
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRef.current = el;
    restoredRef.current = false;

    if (!el) return;

    // Restore position
    restoreProgress(el);

    // Auto-save every 10s while playing
    timerRef.current = setInterval(() => {
      if (el && !el.paused && el.currentTime > 0) {
        saveProgress(el.currentTime);
      }
    }, 10000);

    // Save on pause
    const onPause = () => {
      if (el.currentTime > 0) saveProgress(el.currentTime);
    };
    // Save on ended
    const onEnded = () => {
      saveProgress(el.duration || el.currentTime, true);
    };

    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);

    // Store cleanup refs
    (el as any).__progressCleanup = () => {
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
  }, [saveProgress, restoreProgress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      const el = mediaRef.current;
      if (el && (el as any).__progressCleanup) {
        (el as any).__progressCleanup();
      }
    };
  }, []);

  return setMediaRef;
}
