import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlayerTrack {
  id: string;
  title: string;
  audioUrl: string;
  rabbiName?: string;
  seriesTitle?: string;
  duration?: number | null;
  thumbnailUrl?: string | null;
}

interface PlayerContextType {
  currentTrack: PlayerTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  queue: PlayerTrack[];
  playbackRate: number;
  play: (track: PlayerTrack) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  skipForward: () => void;
  skipBackward: () => void;
  setPlaybackRate: (rate: number) => void;
  addToQueue: (track: PlayerTrack) => void;
  removeFromQueue: (id: string) => void;
  playNext: () => void;
  close: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// Save progress to DB (debounced externally)
async function saveProgress(trackId: string, seconds: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: existing } = await supabase
    .from("user_history")
    .select("id")
    .eq("user_id", user.id)
    .eq("lesson_id", trackId)
    .maybeSingle();
  if (existing) {
    await supabase.from("user_history").update({
      progress_seconds: Math.floor(seconds),
      watched_at: new Date().toISOString(),
    }).eq("id", existing.id);
  } else {
    await supabase.from("user_history").insert({
      user_id: user.id,
      lesson_id: trackId,
      progress_seconds: Math.floor(seconds),
    });
  }
}

// Load saved progress for a lesson
async function loadProgress(trackId: string): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { data } = await supabase
    .from("user_history")
    .select("progress_seconds")
    .eq("user_id", user.id)
    .eq("lesson_id", trackId)
    .maybeSingle();
  return data?.progress_seconds || 0;
}

export const PlayerProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTrackRef = useRef<PlayerTrack | null>(null);

  // Keep ref in sync
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);

  // Auto-save progress every 10 seconds while playing
  useEffect(() => {
    saveTimerRef.current = setInterval(() => {
      const audio = audioRef.current;
      const track = currentTrackRef.current;
      if (audio && track && !audio.paused && audio.currentTime > 0) {
        saveProgress(track.id, audio.currentTime);
      }
    }, 10000);
    return () => { if (saveTimerRef.current) clearInterval(saveTimerRef.current); };
  }, []);

  // Create a persistent audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      // Save completed state
      const track = currentTrackRef.current;
      if (track) {
        saveProgress(track.id, audio.duration || 0).then(() => {
          // Mark as completed
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
              supabase.from("user_history")
                .update({ completed: true })
                .eq("user_id", user.id)
                .eq("lesson_id", track.id)
                .then(() => {});
            }
          });
        });
      }
      setIsPlaying(false);
      setQueue(prev => {
        if (prev.length > 0) {
          const [next, ...rest] = prev;
          setTimeout(() => playTrack(next), 0);
          return rest;
        }
        return prev;
      });
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => {
      setIsPlaying(false);
      // Save on pause
      const track = currentTrackRef.current;
      if (track && audio.currentTime > 0) {
        saveProgress(track.id, audio.currentTime);
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.pause();
      audio.src = "";
    };
  }, []);

  const playTrack = useCallback(async (track: PlayerTrack) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // If same track, just resume
    if (currentTrackRef.current?.id === track.id && audio.src) {
      audio.play();
      return;
    }

    audio.src = track.audioUrl;
    setCurrentTrack(track);
    setCurrentTime(0);

    // Load saved position and seek to it after metadata loads
    const savedPos = await loadProgress(track.id);
    if (savedPos > 0) {
      const onCanPlay = () => {
        // Don't resume if near the end (within 10 seconds)
        if (savedPos < (audio.duration || Infinity) - 10) {
          audio.currentTime = savedPos;
          setCurrentTime(savedPos);
        }
        audio.removeEventListener("canplay", onCanPlay);
      };
      audio.addEventListener("canplay", onCanPlay);
    }
    audio.play();
  }, []);

  const play = useCallback((track: PlayerTrack) => {
    playTrack(track);
  }, [playTrack]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }, [currentTrack]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const skipForward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(audio.currentTime + 15, audio.duration || 0);
  }, []);

  const skipBackward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(audio.currentTime - 15, 0);
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = rate;
    setPlaybackRateState(rate);
  }, []);

  const addToQueue = useCallback((track: PlayerTrack) => {
    setQueue(prev => {
      if (prev.some(t => t.id === track.id)) return prev;
      return [...prev, track];
    });
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(t => t.id !== id));
  }, []);

  const playNext = useCallback(() => {
    if (queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    playTrack(next);
  }, [queue, playTrack]);

  const close = useCallback(() => {
    const audio = audioRef.current;
    const track = currentTrackRef.current;
    // Save progress before closing
    if (audio && track && audio.currentTime > 0) {
      saveProgress(track.id, audio.currentTime);
    }
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  return (
    <PlayerContext.Provider value={{
      currentTrack, isPlaying, currentTime, duration, queue, playbackRate,
      play, togglePlay, seek, skipForward, skipBackward, setPlaybackRate,
      addToQueue, removeFromQueue, playNext, close
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used within PlayerProvider");
  return context;
};
