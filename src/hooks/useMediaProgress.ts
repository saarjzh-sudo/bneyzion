import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  saveLocalPosition,
  loadLocalPosition,
  clearLocalPosition,
  RESUME_END_THRESHOLD_SECONDS,
} from "@/contexts/PlayerContext";

/**
 * Tracks and restores playback progress for native <video> and <audio> elements.
 *
 * Unified position mechanism (lessonId -> seconds), shared with the floating player:
 * - localStorage always (works for anonymous users, and feeds the floating-player handoff)
 * - user_history (progress_seconds) for logged-in users
 * Saves every ~5s while playing, and on pause / ended / detach / unmount.
 * Restores from max(localStorage, DB); if fewer than RESUME_END_THRESHOLD_SECONDS
 * remain until the end — starts from the beginning.
 *
 * Returns:
 * - mediaRef: ref callback to attach to the media element
 * - flushPosition: save the current position immediately (optionally pausing the element).
 *   Call it right before handing playback off to the floating player, so the floating
 *   player resumes from the exact same point.
 */
export function useMediaProgress(lessonId: string | undefined | null) {
  const { user } = useAuth();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const restoredRef = useRef(false);

  // New lesson = fresh restore
  useEffect(() => {
    restoredRef.current = false;
  }, [lessonId]);

  // Save progress to user_history (logged-in users only)
  const saveDbProgress = useCallback(async (seconds: number, completed = false) => {
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

  // Save position to the unified mechanism: localStorage always + DB for logged-in
  const savePosition = useCallback((el: HTMLVideoElement | HTMLAudioElement, completed = false) => {
    if (!lessonId || el.currentTime <= 0) return;
    if (completed) {
      clearLocalPosition(lessonId);
    } else {
      saveLocalPosition(lessonId, el.currentTime, el.duration || 0);
    }
    saveDbProgress(completed ? (el.duration || el.currentTime) : el.currentTime, completed);
  }, [lessonId, saveDbProgress]);

  // Restore saved position when media loads: max(localStorage, DB)
  const restoreProgress = useCallback(async (el: HTMLVideoElement | HTMLAudioElement) => {
    if (!lessonId || restoredRef.current) return;
    restoredRef.current = true;
    const localPos = loadLocalPosition(lessonId);
    let dbPos = 0;
    if (user) {
      const { data } = await supabase
        .from("user_history")
        .select("progress_seconds, completed")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .maybeSingle();
      if (data?.progress_seconds && data.progress_seconds > 0 && !data?.completed) {
        dbPos = data.progress_seconds;
      }
    } else {
      // Auth may not be ready yet — allow a DB upgrade once the user arrives
      restoredRef.current = false;
    }
    const savedPos = Math.max(localPos, dbPos);
    if (savedPos <= 0) return;
    // Wait for enough data; never yank an element that already started playing
    const trySeek = () => {
      if (
        el.duration &&
        savedPos < el.duration - RESUME_END_THRESHOLD_SECONDS &&
        el.currentTime < 1
      ) {
        el.currentTime = savedPos;
      }
    };
    if (el.readyState >= 1) {
      trySeek();
    } else {
      el.addEventListener("loadedmetadata", trySeek, { once: true });
    }
  }, [user, lessonId]);

  // Save the current position immediately (e.g. before handing off to the floating player)
  const flushPosition = useCallback((opts?: { pause?: boolean }) => {
    const el = mediaRef.current;
    if (!el) return;
    if (!el.ended) savePosition(el);
    if (opts?.pause && !el.paused) el.pause();
  }, [savePosition]);

  // Keep a stable ref to the latest flush for unmount cleanup
  const flushRef = useRef(flushPosition);
  useEffect(() => { flushRef.current = flushPosition; });

  // Ref callback to attach to media element
  const setMediaRef = useCallback((el: HTMLVideoElement | HTMLAudioElement | null) => {
    // Flush + cleanup previous element
    const prev = mediaRef.current;
    if (prev && prev !== el) {
      if (!prev.ended) savePosition(prev);
      if ((prev as any).__progressCleanup) {
        (prev as any).__progressCleanup();
      }
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRef.current = el;

    if (!el) return;

    // Restore position (only before playback started)
    if (el.currentTime < 1) restoreProgress(el);

    // Auto-save every ~5s while playing: localStorage every tick, DB every other tick
    let tick = 0;
    timerRef.current = setInterval(() => {
      if (el && !el.paused && el.currentTime > 0 && lessonId) {
        saveLocalPosition(lessonId, el.currentTime, el.duration || 0);
        tick += 1;
        if (tick % 2 === 0) saveDbProgress(el.currentTime);
      }
    }, 5000);

    // Save on pause
    const onPause = () => {
      if (!el.ended) savePosition(el);
    };
    // Save on ended (marks completed + clears the local position)
    const onEnded = () => {
      savePosition(el, true);
    };

    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);

    // Store cleanup refs
    (el as any).__progressCleanup = () => {
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
  }, [lessonId, savePosition, saveDbProgress, restoreProgress]);

  // Cleanup on unmount — save the last position (popup close / page leave)
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      const el = mediaRef.current;
      if (el) {
        flushRef.current();
        if ((el as any).__progressCleanup) {
          (el as any).__progressCleanup();
        }
      }
    };
  }, []);

  return { mediaRef: setMediaRef, flushPosition };
}
