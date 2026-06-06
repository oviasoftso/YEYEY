/**
 * OVI Daily Challenge — 3 quick questions from weakest topics.
 * Refreshes every 24 hours. Awards XP for completion.
 */
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, CheckCircle2, XCircle, ArrowRight, Flame, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { store } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import LatexText from "@/components/LatexText";

interface ChallengeQuestion {
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  topic: string;
  subject: string;
}

type Phase = "loading" | "ready" | "answering" | "result" | "done";

export default function DailyChallenge() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<ChallengeQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const streak = store.getDailyChallengeStreak();
  const xpData = store.getXPData();
  const today = new Date().toISOString().split("T")[0];
  const alreadyDone = xpData.lastChallengeDate === today;

  // Auto-generate challenge on mount
  useEffect(() => {
    if (alreadyDone) {
      setPhase("done");
      return;
    }
    generateChallenge();
  }, []);

  const generateChallenge = async () => {
    setPhase("loading");
    try {
      const mastery = store.getMastery();
      const weakTopics = mastery
        .filter((m) => m.mastery < 60)
        .sort((a, b) => a.mastery - b.mastery)
        .slice(0, 3);

      if (weakTopics.length === 0) {
        // If no weak topics, pick random ones
        const profile = store.getProfile();
        if (profile) {
          weakTopics.push({
            subject: profile.subjects[0] || "Mathematics",
            topic: "General",
            mastery: 50,
            lastRevised: null,
            assessmentsTaken: 0,
            averageScore: 0,
          });
        }
      }

      const selected = weakTopics.slice(0, 3);
      const generated: ChallengeQuestion[] = [];

      for (const t of selected) {
        try {
          const { data } = await supabase.functions.invoke("ovi_arena_generator", {
            body: {
              subject: t.subject,
              topic: t.topic,
              paperType: "paper1",
              questionCount: 1,
            },
          });
          if (data?.questions?.[0]) {
            generated.push({
              ...data.questions[0],
              subject: t.subject,
              topic: t.topic,
            });
          }
        } catch {
          // Fallback question
          generated.push({
            question: `What is a key concept in ${t.topic}?`,
            options: { A: "Option A", B: "Option B", C: "Option C", D: "Option D" },
            correctAnswer: "A",
            topic: t.topic,
            subject: t.subject,
          });
        }
      }

      if (generated.length === 0) {
        setPhase("done");
        return;
      }

      setQuestions(generated);
      setAnswers(new Array(generated.length).fill(null));
      setPhase("ready");
    } catch {
      setPhase("done");
    }
  };

  const selectAnswer = (answer: string) => {
    if (showAnswer) return;
    setSelectedAnswer(answer);
    setShowAnswer(true);
    const newAnswers = [...answers];
    newAnswers[currentQ] = answer;
    setAnswers(newAnswers);

    if (answer === questions[currentQ].correctAnswer) {
      setScore((prev) => prev + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowAnswer(false);
    } else {
      // Challenge complete
      store.completeDailyChallenge();
      const xpEarned = 50;
      toast({
        title: "Daily Challenge Complete!",
        description: `+${xpEarned} XP earned! ${score}/${questions.length} correct.`,
      });
      setPhase("done");
    }
  };

  if (phase === "done") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap size={16} className="text-amber-500" />
            Daily Challenge
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-sm font-medium text-foreground">Challenge Complete!</p>
          {streak > 0 && (
            <Badge variant="outline" className="mt-2 gap-1">
              <Flame size={12} className="text-orange-500" />
              {streak}-day streak
            </Badge>
          )}
          <p className="text-xs text-muted-foreground mt-2">Come back tomorrow for a new challenge</p>
        </CardContent>
      </Card>
    );
  }

  if (phase === "loading") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap size={16} className="text-amber-500" />
            Daily Challenge
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Loader2 className="animate-spin mx-auto mb-2 text-primary" size={24} />
          <p className="text-sm text-muted-foreground">Generating today's challenge...</p>
        </CardContent>
      </Card>
    );
  }

  if (phase === "ready") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap size={16} className="text-amber-500" />
              Daily Challenge
            </span>
            <Badge variant="outline" className="text-xs">{currentQ + 1}/{questions.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Badge variant="secondary" className="text-xs mb-2">
              {questions[currentQ].subject} — {questions[currentQ].topic}
            </Badge>
            <LatexText className="text-sm font-medium">{questions[currentQ].question}</LatexText>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {Object.entries(questions[currentQ].options).map(([key, value]) => {
              const isCorrect = key === questions[currentQ].correctAnswer;
              const isSelected = key === selectedAnswer;
              const isWrong = isSelected && !isCorrect;

              return (
                <Button
                  key={key}
                  variant={
                    showAnswer
                      ? isCorrect
                        ? "default"
                        : isWrong
                          ? "destructive"
                          : "outline"
                      : isSelected
                        ? "default"
                        : "outline"
                  }
                  size="sm"
                  onClick={() => selectAnswer(key)}
                  disabled={showAnswer}
                  className="justify-start gap-2 h-auto py-2 text-left"
                >
                  <span className="font-bold">{key}.</span>
                  <span className="text-xs truncate">{value}</span>
                  {showAnswer && isCorrect && <CheckCircle2 size={14} className="ml-auto shrink-0" />}
                  {showAnswer && isWrong && <XCircle size={14} className="ml-auto shrink-0" />}
                </Button>
              );
            })}
          </div>

          {showAnswer && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
              <Button onClick={nextQuestion} size="sm" className="w-full gap-1.5">
                {currentQ < questions.length - 1 ? (
                  <><ArrowRight size={14} /> Next Question</>
                ) : (
                  <><CheckCircle2 size={14} /> Finish Challenge</>
                )}
              </Button>
            </motion.div>
          )}

          {streak > 0 && (
            <p className="text-xs text-center text-muted-foreground">
              <Flame size={12} className="inline text-orange-500" /> {streak}-day challenge streak
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}
