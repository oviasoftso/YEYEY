import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import OviAvatar from "@/components/OviAvatar";
import { STREAMS, getSubjectsForStream, SUBJECT_ICONS } from "@/lib/constants";
import { Stream, LocalLanguage, StudentProfile } from "@/lib/types";
import { store } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [stream, setStream] = useState<Stream | null>(null);
  const [localLang] = useState<LocalLanguage>("Ndebele"); // single option — Waterfalls

  // Steps: 0=name, 1=stream, 2=subjects preview
  const steps = ["name", "stream", "subjects"] as const;
  const totalSteps = steps.length;
  const currentStepType = steps[step];

  const canNext = () => {
    switch (currentStepType) {
      case "name": return name.trim().length >= 2;
      case "stream": return !!stream;
      case "subjects": return true;
      default: return false;
    }
  };

  const getAllSubjects = () => stream ? getSubjectsForStream(stream) : [];

  const handleFinish = async () => {
    if (!stream) return;

    const subjects = getAllSubjects();

    const profile: StudentProfile = {
      id: crypto.randomUUID(),
      name: name.trim(),
      stream,
      localLanguage: localLang,
      practicalSubject: null,
      subjects,
      createdAt: new Date().toISOString(),
    };
    store.setProfile(profile);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from("profiles").update({
          display_name: name.trim(),
          stream,
          local_language: localLang,
          practical_subject: null,
          subjects,
        }).eq("user_id", session.user.id);
      }
    } catch {
      // Silently continue — localStorage is the fallback
    }

    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStepType === "name" && (
              <div className="space-y-6">
                <div className="flex justify-center"><OviAvatar size="lg" /></div>
                <div className="text-center">
                  <h2 className="font-display text-2xl font-bold text-foreground">Welcome to OVIA Prep</h2>
                  <p className="text-muted-foreground mt-2">I'm OVI, your revision companion. What's your name?</p>
                </div>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="text-center text-lg h-12"
                  autoFocus
                />
              </div>
            )}

            {currentStepType === "stream" && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="font-display text-2xl font-bold text-foreground">Hi {name}.</h2>
                  <p className="text-muted-foreground mt-2">Which stream are you in?</p>
                </div>
                <div className="space-y-3">
                  {STREAMS.map((s) => (
                    <Card
                      key={s.value}
                      className={`p-4 cursor-pointer transition-all ${
                        stream === s.value ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                      onClick={() => setStream(s.value)}
                    >
                      <h3 className="font-semibold text-foreground">{s.label}</h3>
                      <p className="text-sm text-muted-foreground">{s.description}</p>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {currentStepType === "subjects" && stream && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="font-display text-2xl font-bold text-foreground">Your Subjects</h2>
                  <p className="text-muted-foreground mt-2">Locked to the {STREAMS.find((s) => s.value === stream)?.label} stream.</p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {getAllSubjects().map((subj) => (
                    <div key={subj} className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3">
                      <span className="text-xl">{SUBJECT_ICONS[subj] || "📘"}</span>
                      <span className="font-medium text-foreground">{subj}</span>
                      <Check size={16} className="ml-auto text-success" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-8">
          <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 0}>
            <ArrowLeft size={16} className="mr-1" /> Back
          </Button>
          {step < totalSteps - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
              Next <ArrowRight size={16} className="ml-1" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={!canNext()} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              Start Revising <ArrowRight size={16} className="ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
