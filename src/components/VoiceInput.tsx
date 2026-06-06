/**
 * OVI Voice Input — Speak answers instead of typing.
 * Uses Web Speech API for speech-to-text.
 * Works on Chrome, Edge, Safari (mobile).
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceInputProps {
  onResult: (text: string) => void;
  language?: string;
  className?: string;
}

export default function VoiceInput({ onResult, language = "en-ZW", className = "" }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        onResult(finalTranscript);
      }
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
  }, [language, onResult]);

  const toggle = useCallback(() => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch {
        // Already started
      }
    }
  }, [listening]);

  if (!supported) return null;

  return (
    <Button
      variant={listening ? "default" : "outline"}
      size="sm"
      onClick={toggle}
      className={`gap-1.5 ${className}`}
    >
      {listening ? (
        <>
          <Mic size={14} className="animate-pulse" />
          Listening...
        </>
      ) : (
        <>
          <MicOff size={14} />
          Speak Answer
        </>
      )}
    </Button>
  );
}
