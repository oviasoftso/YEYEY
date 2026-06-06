/**
 * OVI Focus Mode — Distraction-free study with ambient sounds.
 * Fullscreen overlay with timer, ambient audio, and minimal UI.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Volume2, VolumeX, Play, Pause, SkipForward,
  CloudRain, Waves, Wind, Flame, TreePine, Coffee,
  Maximize, Minimize,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { store } from "@/lib/store";
import { XP_REWARDS } from "@/lib/gamification";

interface AmbientSound {
  id: string;
  name: string;
  icon: React.ElementType;
  // Using free sound URLs from freesound.org or similar
  url: string;
}

const AMBIENT_SOUNDS: AmbientSound[] = [
  { id: "rain", name: "Rain", icon: CloudRain, url: "" },
  { id: "waves", name: "Waves", icon: Waves, url: "" },
  { id: "wind", name: "Wind", icon: Wind, url: "" },
  { id: "fire", name: "Fireplace", icon: Flame, url: "" },
  { id: "forest", name: "Forest", icon: TreePine, url: "" },
  { id: "cafe", name: "Cafe", icon: Coffee, url: "" },
];

interface FocusModeProps {
  isOpen: boolean;
  onClose: () => void;
  subject?: string;
}

export default function FocusMode({ isOpen, onClose, subject }: FocusModeProps) {
  const [minutes, setMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [selectedSound, setSelectedSound] = useState<string | null>(null);
  const [volume, setVolume] = useState(50);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const totalSeconds = minutes * 60;
  const progress = 1 - secondsLeft / totalSeconds;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  // Timer countdown
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          handleSessionEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  // Ambient sound (using Web Audio API for generated sounds)
  useEffect(() => {
    if (!selectedSound || muted) {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      return;
    }

    // Create ambient sound using Web Audio API
    const ctx = new AudioContext();
    const gainNode = ctx.createGain();
    gainNode.gain.value = (volume / 100) * 0.3;
    gainNode.connect(ctx.destination);

    let source: AudioBufferSourceNode | null = null;

    const createNoise = (type: string) => {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        switch (type) {
          case "rain":
            data[i] = (Math.random() * 2 - 1) * 0.3 * (Math.sin(i / 100) * 0.5 + 0.5);
            break;
          case "waves":
            data[i] = (Math.random() * 2 - 1) * 0.2 * Math.sin(i / (ctx.sampleRate * 0.5));
            break;
          case "wind":
            data[i] = (Math.random() * 2 - 1) * 0.15 * (Math.sin(i / 500) * 0.7 + 0.3);
            break;
          case "fire":
            data[i] = (Math.random() * 2 - 1) * 0.25 * (Math.random() > 0.99 ? 2 : 0.5);
            break;
          case "forest":
            data[i] = (Math.random() * 2 - 1) * 0.1 * (Math.sin(i / 200) * 0.5 + 0.5) + Math.sin(i / 1000) * 0.05;
            break;
          case "cafe":
            data[i] = (Math.random() * 2 - 1) * 0.12 + Math.sin(i / 300) * 0.03;
            break;
          default:
            data[i] = (Math.random() * 2 - 1) * 0.1;
        }
      }

      source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gainNode);
      source.start();
    };

    createNoise(selectedSound);

    return () => {
      if (source) { try { source.stop(); } catch { /* ok */ } }
      ctx.close();
    };
  }, [selectedSound, volume, muted]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleSessionEnd = useCallback(() => {
    setRunning(false);
    setSessionsCompleted((prev) => prev + 1);
    store.addFocusSession({
      subject: subject || null,
      durationMinutes: minutes,
      completedAt: new Date().toISOString(),
      xpEarned: XP_REWARDS.FOCUS_SESSION,
    });
    store.addXP(XP_REWARDS.FOCUS_SESSION, "focus_session");
    // Reset timer
    setSecondsLeft(minutes * 60);
  }, [minutes, subject]);

  const reset = () => {
    setRunning(false);
    setSecondsLeft(minutes * 60);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/95 backdrop-blur-lg flex flex-col"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs">
              {sessionsCompleted} session{sessionsCompleted !== 1 ? "s" : ""} today
            </Badge>
            {subject && <Badge variant="secondary" className="text-xs">{subject}</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4">
          {/* Timer circle */}
          <div className="relative w-64 h-64 sm:w-80 sm:h-80">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="85" fill="none" strokeWidth="6" className="stroke-muted" />
              <circle
                cx="100" cy="100" r="85" fill="none" strokeWidth="6"
                strokeLinecap="round"
                className="stroke-primary"
                strokeDasharray={2 * Math.PI * 85}
                strokeDashoffset={2 * Math.PI * 85 * (1 - progress)}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl sm:text-6xl font-bold font-mono text-foreground">
                {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
              </span>
              <span className="text-sm text-muted-foreground mt-2">
                {running ? "Focusing..." : "Ready"}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={reset} size="lg">
              Reset
            </Button>
            <Button onClick={() => setRunning(!running)} size="lg" className="px-8">
              {running ? <><Pause size={18} className="mr-2" /> Pause</> : <><Play size={18} className="mr-2" /> Start</>}
            </Button>
          </div>

          {/* Time selector */}
          <div className="flex items-center gap-3">
            {[15, 25, 45, 60].map((m) => (
              <Button
                key={m}
                variant={minutes === m ? "default" : "outline"}
                size="sm"
                onClick={() => { setMinutes(m); setSecondsLeft(m * 60); setRunning(false); }}
              >
                {m}min
              </Button>
            ))}
          </div>

          {/* Ambient sounds */}
          <div className="w-full max-w-md space-y-3">
            <p className="text-xs text-muted-foreground text-center uppercase tracking-wide">Ambient Sounds</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {AMBIENT_SOUNDS.map((sound) => {
                const Icon = sound.icon;
                const isActive = selectedSound === sound.id;
                return (
                  <Button
                    key={sound.id}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className="flex flex-col gap-1 h-auto py-2"
                    onClick={() => setSelectedSound(isActive ? null : sound.id)}
                  >
                    <Icon size={16} />
                    <span className="text-[10px]">{sound.name}</span>
                  </Button>
                );
              })}
            </div>

            {/* Volume */}
            {selectedSound && (
              <div className="flex items-center gap-3 justify-center">
                <Button variant="ghost" size="sm" onClick={() => setMuted(!muted)}>
                  {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </Button>
                <Slider
                  value={[volume]}
                  onValueChange={([v]) => { setVolume(v); setMuted(false); }}
                  max={100}
                  className="w-40"
                />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
