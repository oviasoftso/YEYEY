import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Send, CheckCircle, XCircle, ArrowRight, ArrowLeft, Loader2, FileText, ListChecks, Table2, Shuffle, ChevronLeft, ChevronRight, AlertTriangle, Clock } from "lucide-react";
import LatexText from "@/components/LatexText";
import OviVoice from "@/components/OviVoice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/AppLayout";
import OviAvatar from "@/components/OviAvatar";
import type { OviMood } from "@/components/OviAvatar";
import { store } from "@/lib/store";
import { SUBJECT_TOPICS, SUBJECT_ICONS, SUBJECTS_WITH_PAPER1, getAssessmentTime, getQuestionTime } from "@/lib/constants";
import { StudentProfile, Assessment, AssessmentQuestion } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import AccountingTable, { isAccountingTableQuestion, detectTableType } from "@/components/AccountingTable";
import MathGraph from "@/components/MathGraph";
import BearingTool from "@/components/BearingTool";
import ConstructionTool from "@/components/ConstructionTool";
import VoiceInput from "@/components/VoiceInput";

type Phase = "select" | "answering" | "submitting" | "results";
type PaperType = "paper1" | "paper2";
type AssessmentMode = "single" | "mixed";

interface MCQQuestion {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: string;
}

const normalizePaper2Questions = (value: unknown): string[] => (
  Array.isArray(value)
    ? value
        .map((q) => typeof q === "string" ? q : (q as { question?: unknown })?.question)
        .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
    : []
);

export const normalizeMcqQuestions = (value: unknown): MCQQuestion[] => {
  if (!Array.isArray(value)) return [];
  const letters = ["A", "B", "C", "D"] as const;

  const mapOptions = (opts: any): Record<string,string> | null => {
    if (!opts || typeof opts !== "object" || Array.isArray(opts)) return null;
    const hasUpper = Object.keys(opts).some(k => letters.includes(k as typeof letters[number]));
    if (hasUpper) {
      // Assume correct shape
      return { A: String(opts.A), B: String(opts.B), C: String(opts.C), D: String(opts.D) };
    }
    // Lowercase keys
    const mapped: Record<string,string> = {};
    for (const l of letters) {
      const val = opts[l.toLowerCase()];
      if (val) mapped[l] = String(val);
    }
    return Object.keys(mapped).length === 4 ? mapped : null;
  };

  const mapChoices = (choices: any): Record<string,string> | null => {
    if (!Array.isArray(choices) || choices.length < 4) return null;
    const mapped: Record<string,string> = {};
    for (let i=0;i<4;i++) {
      let text = String(choices[i]);
      if (/^[A-D]\.?\s*/i.test(text)) {
        text = text.replace(/^[A-D]\.?\s*/i, "");
      }
      mapped[letters[i]] = text;
    }
    return mapped;
  };

  const normalizeAnswer = (ans:any): string | null => {
    let a = String(ans).trim();
    if (/^[0-3]$/.test(a)) return letters[parseInt(a)];
    if (/^[a-d]$/i.test(a)) return a.toUpperCase();
    if (letters.includes(a as typeof letters[number])) return a as string;
    return null;
  };

  return value
    .map((q:any) => {
      if (!q?.question) return null;
      let opts = mapOptions(q.options);
      if (!opts) opts = mapChoices(q.choices || q.options);
      if (!opts) return null;
      const answer = normalizeAnswer(q.correctAnswer || q.answer || q.correct);
      if (!answer) return null;
      return { question: String(q.question), options: { A: opts.A, B: opts.B, C: opts.C, D: opts.D }, correctAnswer: answer } as MCQQuestion;
    })
    .filter((q): q is MCQQuestion => q !== null);
};
  const AssessmentPage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [phase, setPhase] = useState<Phase>("select");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [paperType, setPaperType] = useState<PaperType>("paper2");
  const [assessmentMode, setAssessmentMode] = useState<AssessmentMode>("single");

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Mixed assessment state
  const [mixedSubjects, setMixedSubjects] = useState<{ subject: string; topic: string }[]>([]);
  const [mixedQuestions, setMixedQuestions] = useState<{ subject: string; topic: string; question: string }[]>([]);
  const [mixedAnswers, setMixedAnswers] = useState<string[]>([]);

  // Paper 2 state
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);

  // Paper 1 (MCQ) state
  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([]);
  const [mcqAnswers, setMcqAnswers] = useState<string[]>([]);

  const [results, setResults] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  useEffect(() => {
    const p = store.getProfile();
    if (!p) { navigate("/"); return; }
    setProfile(p);
  }, [navigate]);

  // Timer effect
  useEffect(() => {
    if (phase === "answering" && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            toast({
              title: "⏰ Time's Up!",
              description: "Your assessment time has expired. Submitting your answers now.",
              variant: "destructive",
            });
            // Auto-submit
            submitAnswers();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [phase, timeRemaining > 0]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const getStipulatedTime = useCallback((subject: string, paper: PaperType, qCount: number = 5): number => {
    return getAssessmentTime(paper, paper === "paper1" ? 10 : qCount);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startTimer = (subject: string, paper: PaperType, qCount: number = 5) => {
    const minutes = getStipulatedTime(subject, paper, qCount);
    setTimeRemaining(minutes * 60);
  };

  if (!profile) {
    return null;
  }

  const topics = selectedSubject ? (SUBJECT_TOPICS[selectedSubject] || []) : [];
  const hasPaper1 = SUBJECTS_WITH_PAPER1.includes(selectedSubject);

  const generateQuestions = async () => {
    if (assessmentMode === "mixed") {
      return generateMixedQuestions();
    }
    setLoading(true);
    try {
      // Try OVI ARENA generator first (command word support), fall back to generate-assessment
      let data: any;
      try {
        const arenaResult = await supabase.functions.invoke("ovi_arena_generator", {
          body: { subject: selectedSubject, topic: selectedTopic, paperType, questionCount: paperType === "paper1" ? 20 : 8 },
        });
        if (arenaResult.error) throw arenaResult.error;
        data = arenaResult.data;
      } catch {
        const fallback = await supabase.functions.invoke("generate-assessment", {
          body: { subject: selectedSubject, topic: selectedTopic, paperType },
        });
        if (fallback.error) throw fallback.error;
        data = fallback.data;
      }

      if (paperType === "paper1") {
        const nextQuestions = normalizeMcqQuestions(data?.questions);
        if (nextQuestions.length === 0) throw new Error("No valid Paper 1 questions returned");
        setMcqQuestions(nextQuestions);
        setMcqAnswers(new Array(nextQuestions.length).fill(""));
        startTimer(selectedSubject, paperType, nextQuestions.length);
      } else {
        const nextQuestions = normalizePaper2Questions(data?.questions);
        if (nextQuestions.length === 0) throw new Error("No valid Paper 2 questions returned");
        setQuestions(nextQuestions);
        setAnswers(new Array(nextQuestions.length).fill(""));
        startTimer(selectedSubject, paperType, nextQuestions.length);
      }
      setCurrentQuestion(0);
      setPhase("answering");
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to generate questions. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateMixedQuestions = async () => {
    if (mixedSubjects.length < 2) {
      toast({ title: "Select at least 2 subjects", description: "A mixed assessment needs questions from multiple subjects.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-mixed-assessment", {
        body: { subjects: mixedSubjects, questionCount: mixedSubjects.length * 2 },
      });
      if (error) throw error;
      setMixedQuestions(data.questions);
      setMixedAnswers(new Array(data.questions.length).fill(""));
      setPaperType("paper2");
      setCurrentQuestion(0);
      // Mixed assessment: use per-question timing
      setTimeRemaining(getAssessmentTime("paper2", data.questions.length) * 60);
      setPhase("answering");
    } catch (e) {
      toast({ title: "Error", description: "Failed to generate mixed questions. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const submitAnswers = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (assessmentMode === "mixed") {
      return submitMixedAnswers();
    }
    setPhase("submitting");
    setLoading(true);
    try {
      const body = paperType === "paper1"
        ? { subject: selectedSubject, topic: selectedTopic, questions: mcqQuestions, answers: mcqAnswers, paperType }
        : { subject: selectedSubject, topic: selectedTopic, questions, answers, paperType };

      // Try OVI ARENA grader first (better feedback), fall back to mark-assessment
      let data, error;
      try {
        const arenaResult = await supabase.functions.invoke("ovi_arena_grader", { body });
        if (arenaResult.error) throw arenaResult.error;
        data = arenaResult.data;
        error = null;
      } catch {
        const fallback = await supabase.functions.invoke("mark-assessment", { body });
        data = fallback.data;
        error = fallback.error;
      }
      if (error) throw error;

      const assessment: Assessment = {
        id: crypto.randomUUID(),
        subject: selectedSubject,
        topic: selectedTopic,
        questions: data.results as AssessmentQuestion[],
        totalScore: data.totalScore,
        maxScore: data.maxScore,
        percentage: data.percentage,
        completedAt: new Date().toISOString(),
        strongConcepts: data.strongConcepts || [],
        weakConcepts: data.weakConcepts || [],
      };

      await store.addAssessment(assessment);
      const correctCount = assessment.questions.filter((q) => q.marksAwarded >= q.marksAllocated * 0.5).length;
      await store.batchUpdateMastery(selectedSubject, selectedTopic, assessment.questions.length, correctCount);

      // Award XP
      const xpResult = store.addXP(20, "assessment");
      if (assessment.percentage === 100) {
        store.addXP(30, "perfect_score_bonus");
        toast({ title: "Perfect Score!", description: "+50 XP (20 base + 30 bonus)!" });
      }
      if (xpResult.levelUp) {
        toast({ title: "Level Up!", description: `You reached Level ${xpResult.xpData.level}!` });
      }

      // Save wrong answers to Mistake Journal
      const wrongQuestions = assessment.questions.filter(
        (q) => q.marksAwarded < q.marksAllocated * 0.5
      );
      for (const q of wrongQuestions) {
        store.addMistake({
          subject: selectedSubject,
          topic: selectedTopic || q.topic || "General",
          question: q.question,
          studentAnswer: q.studentAnswer || "Not answered",
          correctAnswer: q.correctAnswer || "",
          explanation: q.explanation || "",
          improvementAdvice: q.improvementAdvice || "",
          assessmentId: assessment.id,
        });
      }

      // Create flashcards from questions the student got wrong
      if (wrongQuestions.length > 0) {
        const existingCards = store.getFlashcards();
        let created = 0;
        for (const q of wrongQuestions) {
          const alreadyExists = existingCards.some(
            (c) => c.subject === selectedSubject && c.front === q.question
          );
          if (!alreadyExists) {
            await store.addFlashcard({
              id: crypto.randomUUID(),
              subject: selectedSubject,
              topic: selectedTopic,
              front: q.question,
              back: `${q.correctAnswer}${q.improvementAdvice ? `\n\n📖 ${q.improvementAdvice}` : q.explanation ? `\n\n📖 ${q.explanation}` : ""}`,
              nextReview: new Date().toISOString(),
              interval: 1,
              easeFactor: 2.5,
              repetitions: 0,
            });
            created++;
          }
        }
        if (created > 0) {
          toast({ 
            title: "Flashcards Created", 
            description: `${created} flashcards from questions you got wrong.` 
          });
        }
      }

      setResults(assessment);
      setPhase("results");
    } catch (e) {
      toast({ title: "Error", description: "Failed to mark assessment. Please try again.", variant: "destructive" });
      setPhase("answering");
    } finally {
      setLoading(false);
    }
  };

  const submitMixedAnswers = async () => {
    setPhase("submitting");
    setLoading(true);
    try {
      const mixedBody = {
        subject: "Mixed Assessment",
        topic: "Multiple Subjects",
        questions: mixedQuestions.map(q => q.question),
        answers: mixedAnswers,
        paperType: "paper2",
      };

      let data, error;
      try {
        const arenaResult = await supabase.functions.invoke("ovi_arena_grader", { body: mixedBody });
        if (arenaResult.error) throw arenaResult.error;
        data = arenaResult.data;
        error = null;
      } catch {
        const fallback = await supabase.functions.invoke("mark-assessment", { body: mixedBody });
        data = fallback.data;
        error = fallback.error;
      }
      if (error) throw error;

      const assessment: Assessment = {
        id: crypto.randomUUID(),
        subject: "Mixed Assessment",
        topic: mixedSubjects.map(s => s.subject).join(", "),
        questions: data.results as AssessmentQuestion[],
        totalScore: data.totalScore,
        maxScore: data.maxScore,
        percentage: data.percentage,
        completedAt: new Date().toISOString(),
        strongConcepts: data.strongConcepts || [],
        weakConcepts: data.weakConcepts || [],
      };

      await store.addAssessment(assessment);

      // Award XP
      const xpResult = store.addXP(20, "assessment");
      if (assessment.percentage === 100) store.addXP(30, "perfect_score_bonus");
      if (xpResult.levelUp) toast({ title: "Level Up!", description: `You reached Level ${xpResult.xpData.level}!` });

      // Save wrong answers to Mistake Journal
      const wrongQs = assessment.questions.filter(
        (q) => q.marksAwarded < q.marksAllocated * 0.5
      );
      for (const q of wrongQs) {
        store.addMistake({
          subject: q.subject || "Mixed",
          topic: q.topic || "General",
          question: q.question,
          studentAnswer: q.studentAnswer || "Not answered",
          correctAnswer: q.correctAnswer || "",
          explanation: q.explanation || "",
          improvementAdvice: q.improvementAdvice || "",
          assessmentId: assessment.id,
        });
      }

      // Create flashcards from wrong answers
      if (wrongQs.length > 0) {
        const existingCards = store.getFlashcards();
        let created = 0;
        for (const q of wrongQs) {
          const alreadyExists = existingCards.some(
            (c) => c.front === q.question
          );
          if (!alreadyExists) {
            await store.addFlashcard({
              id: crypto.randomUUID(),
              subject: "Mixed Assessment",
              topic: "Multiple Subjects",
              front: q.question,
              back: `${q.correctAnswer}${q.improvementAdvice ? `\n\n📖 ${q.improvementAdvice}` : q.explanation ? `\n\n📖 ${q.explanation}` : ""}`,
              nextReview: new Date().toISOString(),
              interval: 1,
              easeFactor: 2.5,
              repetitions: 0,
            });
            created++;
          }
        }
        if (created > 0) {
          toast({ title: "Flashcards Created", description: `${created} flashcards from questions you got wrong.` });
        }
      }

      setResults(assessment);
      setPhase("results");
    } catch (e) {
      toast({ title: "Error", description: "Failed to mark assessment. Please try again.", variant: "destructive" });
      setPhase("answering");
    } finally {
      setLoading(false);
    }
  };

  const resetAssessment = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("select");
    setAssessmentMode("single");
    setSelectedSubject("");
    setSelectedTopic("");
    setPaperType("paper2");
    setQuestions([]);
    setAnswers([]);
    setMcqQuestions([]);
    setMcqAnswers([]);
    setMixedSubjects([]);
    setMixedQuestions([]);
    setMixedAnswers([]);
    setResults(null);
    setTimeRemaining(0);
  };

  const toggleMixedSubject = (subject: string) => {
    const topics = SUBJECT_TOPICS[subject] || [];
    if (!topics.length) return;
    setMixedSubjects(prev => {
      const exists = prev.find(s => s.subject === subject);
      if (exists) return prev.filter(s => s.subject !== subject);
      return [...prev, { subject, topic: topics[0] }];
    });
  };

  const updateMixedTopic = (subject: string, topic: string) => {
    setMixedSubjects(prev => prev.map(s => s.subject === subject ? { ...s, topic } : s));
  };

  const answeredCount = assessmentMode === "mixed"
    ? mixedAnswers.filter((a) => a.trim()).length
    : paperType === "paper1"
      ? mcqAnswers.filter((a) => a).length
      : answers.filter((a) => a.trim()).length;
  const totalCount = assessmentMode === "mixed"
    ? mixedQuestions.length
    : paperType === "paper1" ? mcqQuestions.length : questions.length;

  const timerWarning = timeRemaining > 0 && timeRemaining <= 300; // 5 min warning
  const timerCritical = timeRemaining > 0 && timeRemaining <= 60; // 1 min critical

  // Timer display component
  const TimerDisplay = () => {
    if (timeRemaining <= 0) return null;
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${
        timerCritical ? "bg-destructive/10 text-destructive animate-pulse" :
        timerWarning ? "bg-warning/10 text-warning" :
        "bg-muted text-muted-foreground"
      }`}>
        <Clock size={16} />
        {formatTime(timeRemaining)}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {phase === "select" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-3">
              <OviAvatar size="md" />
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">ZIMSEC Assessment</h1>
                <p className="text-muted-foreground">ZIMSEC Heritage-Based Curriculum • choose a mode, subject, and topic</p>
              </div>
            </div>

            {/* Assessment Mode Toggle */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAssessmentMode("single")}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  assessmentMode === "single"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                <FileText size={24} />
                <span className="font-semibold text-sm">Single Subject</span>
                <span className="text-xs opacity-70">One subject, one topic</span>
              </button>
              <button
                type="button"
                onClick={() => setAssessmentMode("mixed")}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  assessmentMode === "mixed"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                <Shuffle size={24} />
                <span className="font-semibold text-sm">Mixed Assessment</span>
                <span className="text-xs opacity-70">Multiple subjects & topics</span>
              </button>
            </div>

            {/* Single Subject Mode */}
            {assessmentMode === "single" && (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Subject</label>
                    <Select value={selectedSubject} onValueChange={(v) => { setSelectedSubject(v); setSelectedTopic(""); setPaperType("paper2"); }}>
                      <SelectTrigger><SelectValue placeholder="Select a subject" /></SelectTrigger>
                      <SelectContent>
                        {profile.subjects.map((s) => (
                          <SelectItem key={s} value={s}>{SUBJECT_ICONS[s]} {s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {topics.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Topic</label>
                      <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                        <SelectTrigger><SelectValue placeholder="Select a topic" /></SelectTrigger>
                        <SelectContent>
                          {topics.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Only show Paper Type if this subject has MCQ Paper 1 */}
                  {selectedSubject && hasPaper1 && (
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Paper Type</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setPaperType("paper1")}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                            paperType === "paper1"
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          <ListChecks size={24} />
                          <span className="font-semibold text-sm">Paper 1</span>
                          <span className="text-xs opacity-70">Multiple Choice (10 MCQs)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaperType("paper2")}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                            paperType === "paper2"
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          <FileText size={24} />
                          <span className="font-semibold text-sm">Paper 2</span>
                          <span className="text-xs opacity-70">Structured Questions</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Show stipulated time */}
                  {selectedSubject && selectedTopic && (
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Clock size={16} />
                        <span>
                          Total Time: <strong className="text-foreground">
                            {getStipulatedTime(selectedSubject, hasPaper1 ? paperType : "paper2")} minutes
                          </strong>
                          {" "}• {paperType === "paper1" ? "10 MCQ questions (~1 min each)" : "5 structured questions"}
                        </span>
                      </div>
                      {paperType === "paper2" && (
                        <div className="flex items-center gap-2 ml-6 text-xs">
                          <span>⏱️ Q1-Q2: <strong>2 min</strong> (easy)</span>
                          <span>• Q3: <strong>5 min</strong> (medium)</span>
                          <span>• Q4-Q5: <strong>5-8 min</strong> (hard)</span>
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    className="w-full"
                    disabled={!selectedSubject || !selectedTopic || loading}
                    onClick={generateQuestions}
                  >
                    {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                    {loading ? "Preparing questions..." : `Generate ${hasPaper1 && paperType === "paper1" ? "Multiple Choice" : "Structured"} Questions`}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Mixed Assessment Mode */}
            {assessmentMode === "mixed" && (
              <Card>
                <CardContent className="p-6 space-y-4">
                  {/* Neglected subjects warning */}
                  {(() => {
                    const mastery = store.getMastery();
                    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
                    const neglected = profile.subjects.filter((subj) => {
                      const subjectMastery = mastery.filter((t) => t.subject === subj);
                      if (subjectMastery.length === 0) return true;
                      return subjectMastery.every((t) => t.lastRevised < sevenDaysAgo);
                    });
                    if (neglected.length === 0) return null;
                    return (
                      <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-2">
                        <div className="flex items-center gap-2 text-warning text-sm font-semibold">
                          <AlertTriangle size={16} />
                          OVI recommends including these neglected subjects:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {neglected.map((subj) => {
                            const isSelected = mixedSubjects.some(s => s.subject === subj);
                            return (
                              <Badge
                                key={subj}
                                variant={isSelected ? "default" : "outline"}
                                className={`cursor-pointer ${!isSelected ? "border-warning/40 text-warning hover:bg-warning/10" : ""}`}
                                onClick={() => { if (!isSelected) toggleMixedSubject(subj); }}
                              >
                                {SUBJECT_ICONS[subj]} {subj} {!isSelected && "— tap to add"}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                  <p className="text-sm text-muted-foreground">Select subjects and topics to include in your mixed assessment (at least 2):</p>
                  <div className="space-y-3">
                    {profile.subjects.map((subj) => {
                      const isSelected = mixedSubjects.some(s => s.subject === subj);
                      const subjectTopics = SUBJECT_TOPICS[subj] || [];
                      return (
                        <div key={subj} className={`border rounded-lg p-3 transition-colors ${isSelected ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleMixedSubject(subj)}
                            />
                            <span className="font-medium text-foreground text-sm">{SUBJECT_ICONS[subj]} {subj}</span>
                            {isSelected && <Badge variant="secondary" className="text-xs ml-auto">Included</Badge>}
                          </div>
                          {isSelected && subjectTopics.length > 0 && (
                            <div className="mt-2 ml-7">
                              <Select
                                value={mixedSubjects.find(s => s.subject === subj)?.topic || ""}
                                onValueChange={(t) => updateMixedTopic(subj, t)}
                              >
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pick a topic" /></SelectTrigger>
                                <SelectContent>
                                  {subjectTopics.map(t => (
                                    <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {mixedSubjects.length >= 2 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                      <Clock size={16} />
                      <span>Total Time: <strong className="text-foreground">{getAssessmentTime("paper2", mixedSubjects.length * 2)} minutes</strong> • {mixedSubjects.length * 2} questions</span>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    disabled={mixedSubjects.length < 2 || loading}
                    onClick={generateQuestions}
                  >
                    {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Shuffle size={18} className="mr-2" />}
                    Generate Mixed Assessment ({mixedSubjects.length} subjects)
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Paper 1 - MCQ answering */}
        {phase === "answering" && paperType === "paper1" && assessmentMode === "single" && (() => {
          const q = mcqQuestions[currentQuestion];
          if (!q) return null;
          return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">
                  {SUBJECT_ICONS[selectedSubject]} {selectedSubject} — Paper 1
                </h1>
                <p className="text-sm text-muted-foreground">{selectedTopic} • Select the best answer</p>
              </div>
              <TimerDisplay />
            </div>

            <Progress value={((currentQuestion + 1) / totalCount) * 100} className="h-2" />

            {/* Question navigation pills */}
            <div className="flex flex-wrap gap-2">
              {mcqQuestions.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentQuestion(i)}
                  className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                    i === currentQuestion
                      ? "bg-primary text-primary-foreground"
                      : mcqAnswers[i]
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <Card className={`transition-all duration-300 ${mcqAnswers[currentQuestion] ? "border-primary/40 shadow-lg shadow-primary/5" : "hover:shadow-md"}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Question {currentQuestion + 1} <span className="text-muted-foreground font-normal">of {mcqQuestions.length}</span></span>
                  {mcqAnswers[currentQuestion] && <Badge variant="secondary" className="text-xs animate-float-in">Answered</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-base leading-relaxed"><LatexText>{q.question}</LatexText></div>
                <div className="grid gap-2.5">
                  {(["A", "B", "C", "D"] as const).map((letter, idx) => {
                    const selected = mcqAnswers[currentQuestion] === letter;
                    return (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => {
                          const copy = [...mcqAnswers];
                          copy[currentQuestion] = letter;
                          setMcqAnswers(copy);
                        }}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 animate-float-in ${
                          selected
                            ? "border-primary bg-primary/5 shadow-md shadow-primary/10 scale-[1.01]"
                            : "border-border/60 bg-card hover:border-primary/25 hover:bg-primary/[0.02] hover:shadow-sm"
                        }`}
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <span className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold shrink-0 transition-all duration-200 ${
                          selected
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                            : "bg-muted/70 text-muted-foreground"
                        }`}>
                          {letter}
                        </span>
                        <span className={`text-sm leading-relaxed ${selected ? "text-foreground font-medium" : "text-foreground/80"}`}>
                          <LatexText>{q.options[letter]}</LatexText>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                disabled={currentQuestion === 0}
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
              >
                <ChevronLeft size={18} className="mr-1" /> Previous
              </Button>
              {currentQuestion < mcqQuestions.length - 1 ? (
                <Button
                  className="flex-1"
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                >
                  Next <ChevronRight size={18} className="ml-1" />
                </Button>
              ) : (
                <Button className="flex-1" onClick={submitAnswers}>
                  <Send size={18} className="mr-2" /> Submit for Marking
                </Button>
              )}
            </div>
          </motion.div>
          );
        })()}

        {/* Paper 2 - Structured answering (one at a time) */}
        {phase === "answering" && paperType === "paper2" && assessmentMode === "single" && (() => {
          const q = questions[currentQuestion];
          if (!q) return null;
          const isAccounting = selectedSubject === "Principles of Accounting" && isAccountingTableQuestion(q);
          const tableType = isAccounting ? (detectTableType(q) || "journal") : null;
          const displayQ = isAccounting
            ? q.replace(/^\[TABLE\]\s*/i, "").replace(/\n\n\|[\s\S]*\|$/m, "").trim()
            : q.trim();

          return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">
                  {SUBJECT_ICONS[selectedSubject]} {selectedSubject} — Paper 2
                </h1>
                <p className="text-sm text-muted-foreground">{selectedTopic} • Answer each question</p>
              </div>
              <TimerDisplay />
            </div>

            <Progress value={((currentQuestion + 1) / totalCount) * 100} className="h-2" />

            {/* Question navigation pills */}
            <div className="flex flex-wrap gap-2">
              {questions.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentQuestion(i)}
                  className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                    i === currentQuestion
                      ? "bg-primary text-primary-foreground"
                      : answers[i]?.trim()
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <Card className={answers[currentQuestion]?.trim() ? "border-primary/30" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  Question {currentQuestion + 1}
                  <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">⏱️ {getQuestionTime(currentQuestion)} min</span>
                  {isAccounting && <span className="flex items-center gap-1 text-xs font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full"><Table2 size={12} /> Account</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <LatexText>{displayQ}</LatexText>

                {/* Math graph tools for geometry/bearing/construction questions */}
                {(() => {
                  const q = displayQ.toLowerCase();
                  const isBearing = q.includes("bearing") || q.includes("compass") || q.includes("navigation");
                  const isConstruction = q.includes("construct") || q.includes("bisector") || q.includes("perpendicular");
                  const isGraph = q.includes("plot") || q.includes("graph") || q.includes("coordinate") || q.includes("transformation") || q.includes("reflect") || q.includes("rotate");

                  if (isBearing) {
                    return (
                      <div className="border border-border rounded-xl p-3 bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-2">Bearing Diagram (click to interact)</p>
                        <BearingTool width={280} height={280} title="" />
                      </div>
                    );
                  }
                  if (isConstruction) {
                    return (
                      <div className="border border-border rounded-xl p-3 bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-2">Construction Grid</p>
                        <ConstructionTool width={350} height={350} title="" />
                      </div>
                    );
                  }
                  if (isGraph) {
                    return (
                      <div className="border border-border rounded-xl p-3 bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-2">Coordinate Grid (click to plot points)</p>
                        <MathGraph width={350} height={350} interactive title="" />
                      </div>
                    );
                  }
                  return null;
                })()}

                {isAccounting && tableType ? (
                  <div className="border border-border rounded-xl p-3 bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-2">Fill in the accounting table below:</p>
                    <AccountingTable
                      tableType={tableType}
                      onChange={(val) => {
                        const copy = [...answers];
                        copy[currentQuestion] = val;
                        setAnswers(copy);
                      }}
                    />
                  </div>
                ) : (
                  <Textarea
                    placeholder="Type your answer here... (or leave blank to see the model answer)"
                    value={answers[currentQuestion]}
                    onChange={(e) => {
                      const copy = [...answers];
                      copy[currentQuestion] = e.target.value;
                      setAnswers(copy);
                    }}
                    rows={5}
                  />
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                disabled={currentQuestion === 0}
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
              >
                <ChevronLeft size={18} className="mr-1" /> Previous
              </Button>
              {currentQuestion < questions.length - 1 ? (
                <Button
                  className="flex-1"
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                >
                  Next <ChevronRight size={18} className="ml-1" />
                </Button>
              ) : (
                <Button className="flex-1" onClick={submitAnswers}>
                  <Send size={18} className="mr-2" /> Submit for Marking
                </Button>
              )}
            </div>
          </motion.div>
          );
        })()}

        {/* Mixed Assessment - Answering (one at a time) */}
        {phase === "answering" && assessmentMode === "mixed" && (() => {
          const q = mixedQuestions[currentQuestion];
          if (!q) return null;
          return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">
                  <Shuffle size={20} className="inline mr-2" />Mixed Assessment
                </h1>
                <p className="text-sm text-muted-foreground">Questions from multiple subjects</p>
              </div>
              <TimerDisplay />
            </div>

            <Progress value={((currentQuestion + 1) / totalCount) * 100} className="h-2" />

            <div className="flex flex-wrap gap-2">
              {mixedQuestions.map((mq, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentQuestion(i)}
                  className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                    i === currentQuestion
                      ? "bg-primary text-primary-foreground"
                      : mixedAnswers[i]?.trim()
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <Card className={mixedAnswers[currentQuestion]?.trim() ? "border-primary/30" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  Question {currentQuestion + 1}
                  <Badge variant="secondary" className="text-xs">{SUBJECT_ICONS[q.subject]} {q.subject}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground font-normal">{q.topic}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <LatexText>{q.question}</LatexText>
                <Textarea
                  placeholder="Type your answer here... (or leave blank to see the model answer)"
                  value={mixedAnswers[currentQuestion]}
                  onChange={(e) => {
                    const copy = [...mixedAnswers];
                    copy[currentQuestion] = e.target.value;
                    setMixedAnswers(copy);
                  }}
                  rows={5}
                />
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                disabled={currentQuestion === 0}
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
              >
                <ChevronLeft size={18} className="mr-1" /> Previous
              </Button>
              {currentQuestion < mixedQuestions.length - 1 ? (
                <Button
                  className="flex-1"
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                >
                  Next <ChevronRight size={18} className="ml-1" />
                </Button>
              ) : (
                <Button className="flex-1" onClick={submitAnswers}>
                  <Send size={18} className="mr-2" /> Submit for Marking
                </Button>
              )}
            </div>
          </motion.div>
          );
        })()}

        {phase === "submitting" && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <OviAvatar size="lg" mood="thinking" showGlow message="Marking your answers..." />
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-muted-foreground font-medium">OVI is marking your answers...</p>
          </div>
        )}

        {phase === "results" && results && (() => {
          const pct = results.percentage;
          const oviMood: OviMood = pct >= 80 ? "celebrating" : pct >= 50 ? "encouraging" : "explaining";
          const oviMsg = pct >= 80
            ? "Outstanding performance. You've mastered this material."
            : pct >= 50
              ? "Solid effort. Focus on the areas below to push your score higher."
              : "This topic needs more work. Review the explanations below and try again.";

          return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-4">
              <OviAvatar size="lg" mood={oviMood} showGlow message={oviMsg} />
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">Assessment Results</h1>
                <p className="text-muted-foreground">
                  {assessmentMode === "mixed" 
                    ? `Mixed Assessment — ${results.topic}`
                    : `${selectedSubject} — ${selectedTopic} (${hasPaper1 && paperType === "paper1" ? "Paper 1" : "Paper 2"})`
                  }
                </p>
              </div>
            </div>

            <Card className={`border-2 overflow-hidden ${pct >= 80 ? "border-success/30 bg-success/5" : pct >= 50 ? "border-primary/30 bg-primary/5" : "border-warning/30 bg-warning/5"}`}>
              <CardContent className="p-8 text-center">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className={`text-6xl font-display font-bold mb-3 ${pct >= 80 ? "text-success" : pct >= 50 ? "text-primary" : "text-warning"}`}
                >
                  {pct}%
                </motion.div>
                <div className="text-muted-foreground text-lg">{results.totalScore} / {results.maxScore} marks</div>
                <div className="mt-4 max-w-xs mx-auto">
                  <Progress value={pct} className="h-3" />
                </div>
                {pct >= 80 && (
                  <motion.p className="mt-4 text-success font-semibold text-lg" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    Outstanding Performance!
                  </motion.p>
                )}
                {pct >= 50 && pct < 80 && (
                  <motion.p className="mt-4 text-primary font-semibold" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    Good effort — keep pushing higher!
                  </motion.p>
                )}
                {pct < 50 && (
                  <motion.p className="mt-4 text-warning font-semibold" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    Keep studying — you'll get there!
                  </motion.p>
                )}
              </CardContent>
            </Card>

            {/* Question by question results */}
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold text-foreground">Question-by-Question Review</h2>
              {results.questions.map((q, i) => {
                const passed = q.marksAwarded >= q.marksAllocated * 0.5;
                return (
                  <Card key={i} className={`overflow-hidden border ${passed ? "border-success/20" : "border-destructive/20"} hover:shadow-md transition-shadow`}>
                    <div className={`h-1 ${passed ? "bg-success/40" : "bg-destructive/40"}`} />
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        {passed
                          ? <CheckCircle className="text-success shrink-0" size={18} />
                          : <XCircle className="text-destructive shrink-0" size={18} />}
                        <span>Question {i + 1}</span>
                        <span className={`ml-auto text-sm font-semibold ${passed ? "text-success" : "text-destructive"}`}>
                          {q.marksAwarded}/{q.marksAllocated} marks
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="bg-muted/30 rounded-lg p-3">
                        <strong className="text-foreground text-xs uppercase tracking-wide">Question:</strong>
                        <LatexText>{q.question}</LatexText>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className={`rounded-lg p-3 ${q.studentAnswer === "Not answered" || !q.studentAnswer ? "bg-muted/30" : passed ? "bg-success/5" : "bg-destructive/5"}`}>
                          <strong className="text-xs uppercase tracking-wide text-muted-foreground">Your Answer:</strong>
                          <div className={`mt-1 ${q.studentAnswer === "Not answered" || !q.studentAnswer ? "text-muted-foreground italic" : "text-foreground"}`}>
                            {q.studentAnswer === "Not answered" || !q.studentAnswer ? <p>Not answered</p> : <LatexText>{q.studentAnswer}</LatexText>}
                          </div>
                        </div>
                        <div className="bg-success/5 border border-success/10 rounded-lg p-3">
                          <strong className="text-xs uppercase tracking-wide text-success">Correct Answer:</strong>
                          <LatexText className="mt-1">{q.correctAnswer}</LatexText>
                        </div>
                      </div>
                      {q.explanation && (
                        <div className="bg-muted/50 rounded-lg p-3 relative">
                          <div className="flex items-center justify-between">
                            <strong className="text-foreground text-xs uppercase tracking-wide">Explanation:</strong>
                            <OviVoice text={q.explanation.replace(/[#*_`~\[\]]/g, "").slice(0, 2000)} size="sm" />
                          </div>
                          <LatexText className="mt-1">{q.explanation}</LatexText>
                        </div>
                      )}
                      {q.improvementAdvice && (
                        <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 relative">
                          <div className="flex items-center justify-between">
                            <strong className="text-primary text-xs uppercase tracking-wide">Improvement Tip:</strong>
                            <OviVoice text={q.improvementAdvice.replace(/[#*_`~\[\]]/g, "").slice(0, 2000)} size="sm" />
                          </div>
                          <LatexText className="mt-1">{q.improvementAdvice}</LatexText>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {results.strongConcepts.length > 0 && (
                <Card className="border-success/20">
                  <CardHeader><CardTitle className="text-success text-base">Strong Concepts</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm text-foreground">
                      {results.strongConcepts.map((c, i) => <li key={i}>• {c}</li>)}
                    </ul>
                  </CardContent>
                </Card>
              )}
              {results.weakConcepts.length > 0 && (
                <Card className="border-destructive/20">
                  <CardHeader><CardTitle className="text-destructive text-base">Needs Improvement</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm text-foreground">
                      {results.weakConcepts.map((c, i) => <li key={i}>• {c}</li>)}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex gap-4">
              <Button onClick={resetAssessment} variant="outline" className="flex-1">
                New Assessment
              </Button>
              <Button onClick={() => navigate("/flashcards")} className="flex-1 gap-2">
                Review Flashcards <ArrowRight size={16} />
              </Button>
            </div>
          </motion.div>
        })()}
      </div>
    </AppLayout>
  );
};

export default AssessmentPage;
