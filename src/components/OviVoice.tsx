/**
 * OVI VOICE — Text-to-Speech button component
 * Uses browser's Web Speech API for zero-cost TTS.
 */
import { useState, useCallback } from "react";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OviVoiceProps {
  text: string;
  language?: string;
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
}

export default function OviVoice({ text, language = "en-US", className, size = "icon" }: OviVoiceProps) {
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback(() => {
    if (!("speechSynthesis" in window)) return;

    // Stop if already speaking
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text.slice(0, 3000));
    utterance.lang = language;
    utterance.rate = 0.9; // Slightly slower for educational content
    utterance.pitch = 1.0;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [text, language, speaking]);

  if (!("speechSynthesis" in window)) return null;

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={speak}
      className={className}
      title={speaking ? "Stop speaking" : "Read aloud"}
    >
      {speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
    </Button>
  );
}
