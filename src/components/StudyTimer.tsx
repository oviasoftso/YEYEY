/**
 * OVI FOCUS — Pomodoro Study Timer
 * 25min focus / 5min break cycles with session tracking.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, RotateCcw, Coffee, Timer, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { store } from "@/lib/store";
import { XP_REWARDS } from "@/lib/gamification";
import { toast } from "@/hooks/use-toast";
import FocusMode from "@/components/FocusMode";

const FOCUS_MINUTES = 25;
const BREAK_MINUTES = 5;

export default function StudyTimer() {
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_MINUTES * 60);
  const [running, setRunning] = useState(false);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [focusModeOpen, setFocusModeOpen] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const totalSeconds = mode === "focus" ? FOCUS_MINUTES * 60 : BREAK_MINUTES * 60;
  const progress = 1 - secondsLeft / totalSeconds;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  // Load sessions count
  useEffect(() => {
    const xpData = store.getXPData();
    const today = new Date().toISOString().split("T")[0];
    if (xpData.lastFocusDate === today) {
      setSessionsToday(xpData.focusSessionsToday);
    }
  }, []);

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
          handleTimerEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const handleTimerEnd = useCallback(() => {
    setRunning(false);

    if (mode === "focus") {
      // Award XP and log session
      store.addFocusSession({
        subject: null,
        durationMinutes: FOCUS_MINUTES,
        completedAt: new Date().toISOString(),
        xpEarned: XP_REWARDS.FOCUS_SESSION,
      });
      const result = store.addXP(XP_REWARDS.FOCUS_SESSION, "focus_session");
      setSessionsToday((prev) => prev + 1);

      toast({
        title: "Focus Session Complete!",
        description: `+${XP_REWARDS.FOCUS_SESSION} XP earned! Take a 5-minute break.`,
      });

      if (result.levelUp) {
        toast({ title: "Level Up!", description: `You reached Level ${result.xpData.level}!` });
      }

      // Switch to break
      setMode("break");
      setSecondsLeft(BREAK_MINUTES * 60);
    } else {
      toast({ title: "Break Over", description: "Ready for another focus session?" });
      setMode("focus");
      setSecondsLeft(FOCUS_MINUTES * 60);
    }
  }, [mode]);

  const toggleTimer = () => setRunning(!running);

  const reset = () => {
    setRunning(false);
    setMode("focus");
    setSecondsLeft(FOCUS_MINUTES * 60);
  };

  // SVG circle for progress ring
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Timer size={16} className="text-primary" />
            OVI FOCUS
          </span>
          <Badge variant="outline" className="text-xs">
            {sessionsToday} session{sessionsToday !== 1 ? "s" : ""} today
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {/* Circular timer */}
        <div className="relative w-44 h-44">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            {/* Background circle */}
            <circle
              cx="100" cy="100" r={radius}
              fill="none" strokeWidth="8"
              className="stroke-muted"
            />
            {/* Progress circle */}
            <circle
              cx="100" cy="100" r={radius}
              fill="none" strokeWidth="8"
              strokeLinecap="round"
              className={mode === "focus" ? "stroke-primary" : "stroke-green-500"}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          {/* Timer text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold font-mono text-foreground">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              {mode === "focus" ? "Focus Time" : "Break Time"}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button onClick={toggleTimer} size="sm" className="gap-1.5">
            {running ? <Pause size={14} /> : <Play size={14} />}
            {running ? "Pause" : "Start"}
          </Button>
          <Button onClick={reset} variant="outline" size="sm" className="gap-1.5">
            <RotateCcw size={14} />
            Reset
          </Button>
          <Button onClick={() => setFocusModeOpen(true)} variant="outline" size="sm" className="gap-1.5">
            <Maximize size={14} />
            Focus
          </Button>
        </div>

        <FocusMode isOpen={focusModeOpen} onClose={() => setFocusModeOpen(false)} />

        <p className="text-xs text-muted-foreground text-center">
          {mode === "focus" ? "25 minutes of focused study" : "5 minutes rest — you earned it"}
        </p>
      </CardContent>
    </Card>
  );
}
