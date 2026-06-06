import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, Loader2, Send, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import AppLayout from "@/components/AppLayout";
import OviAvatar from "@/components/OviAvatar";
import LatexText from "@/components/LatexText";
import { store } from "@/lib/store";
import { SUBJECT_TOPICS, SUBJECT_ICONS } from "@/lib/constants";
import { StudentProfile } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Phase = "setup" | "exam" | "submitting" | "results";

const ExamSimulation = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [phase, setPhase] = useState<Phase>("setup");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(5 * 60); // 5 min
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const p = store.getProfile();
    if (!p) { navigate("/"); return; }
    setProfile(p);
  }, [navigate]);

  useEffect(() => {
    if (phase === "exam" && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            handleSubmit();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!profile) return null;

  const startExam = async () => {
    setLoading(true);
    try {
      const topics = SUBJECT_TOPICS[selectedSubject] || [];
      const { data, error } = await supabase.functions.invoke("generate-assessment", {
        body: { subject: selectedSubject, topic: topics.join(", "), questionCount: 5, examMode: true },
      });
      if (error) throw error;
      setQuestions(data.questions);
      setAnswers(new Array(data.questions.length).fill(""));
      setTimeLeft(5 * 60);
      setPhase("exam");
    } catch {
      toast({ title: "Error", description: "Failed to generate exam.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    clearInterval(timerRef.current);
    setPhase("submitting");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("mark-assessment", {
        body: { subject: selectedSubject, topic: "Exam Simulation", questions, answers },
      });
      if (error) throw error;
      setResults(data);
      setPhase("results");
    } catch {
      toast({ title: "Error", description: "Failed to mark exam.", variant: "destructive" });
      setPhase("exam");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {phase === "setup" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-3">
              <OviAvatar size="md" />
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">Exam Simulation</h1>
                <p className="text-muted-foreground text-sm">Timed mock exam resembling ZIMSEC papers</p>
              </div>
            </div>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="text-warning shrink-0 mt-0.5" size={18} />
                  <div className="text-sm">
                    <strong className="text-foreground">Exam Mode</strong>
                    <p className="text-muted-foreground">You'll have 5 minutes to complete 5 questions. The exam auto-submits when time runs out.</p>
                  </div>
                </div>

                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {profile.subjects.map((s) => (
                      <SelectItem key={s} value={s}>{SUBJECT_ICONS[s]} {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button onClick={startExam} disabled={!selectedSubject || loading} className="w-full" size="lg">
                  {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Clock size={18} className="mr-2" />}
                  Start Exam
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {phase === "exam" && (
          <div className="space-y-4">
            {/* Timer bar */}
            <div className="flex items-center justify-between bg-card border border-border rounded-xl p-4 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Clock className={`${timeLeft < 300 ? "text-destructive" : "text-primary"}`} size={18} />
                <span className={`font-display font-bold text-lg ${timeLeft < 300 ? "text-destructive" : "text-foreground"}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Question {currentQ + 1} of {questions.length}
              </div>
              <Button size="sm" variant="destructive" onClick={handleSubmit}>Submit Exam</Button>
            </div>

            <Progress value={((currentQ + 1) / questions.length) * 100} className="h-1" />

            {/* Question nav pills */}
            <div className="flex flex-wrap gap-2">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentQ(i)}
                  className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                    i === currentQ
                      ? "bg-primary text-primary-foreground"
                      : answers[i]?.trim()
                        ? "bg-success/20 text-success"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Question {currentQ + 1}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <LatexText>{questions[currentQ]}</LatexText>
                <Textarea
                  value={answers[currentQ]}
                  onChange={(e) => {
                    const copy = [...answers];
                    copy[currentQ] = e.target.value;
                    setAnswers(copy);
                  }}
                  rows={6}
                  placeholder="Write your answer..."
                />
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}>
                    Previous
                  </Button>
                  {currentQ < questions.length - 1 ? (
                    <Button onClick={() => setCurrentQ(currentQ + 1)}>
                      Next <ArrowRight size={16} className="ml-1" />
                    </Button>
                  ) : (
                    <Button onClick={handleSubmit} variant="destructive">Submit Exam</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {phase === "submitting" && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <OviAvatar size="lg" />
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-muted-foreground font-medium">OVI is marking your exam...</p>
          </div>
        )}

        {phase === "results" && results && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-3">
              <OviAvatar size="md" />
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">Exam Results</h1>
                <p className="text-muted-foreground">{selectedSubject} Mock Exam</p>
              </div>
            </div>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6 text-center">
                <div className="text-5xl font-display font-bold text-primary mb-2">{results.percentage}%</div>
                <div className="text-muted-foreground">{results.totalScore} / {results.maxScore} marks</div>
              </CardContent>
            </Card>

            <Button onClick={() => { setPhase("setup"); setSelectedSubject(""); }} className="w-full">
              Take Another Exam
            </Button>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default ExamSimulation;
