import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen, Brain, MessageCircle, BarChart3, AlertTriangle, TrendingUp,
  ArrowRight, Library, FolderOpen, GraduationCap, FileText, Zap,
  Calendar, Trophy, Target, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import AppLayout from "@/components/AppLayout";
import OviAvatar from "@/components/OviAvatar";
import type { OviMood } from "@/components/OviAvatar";
import StudyTimer from "@/components/StudyTimer";
import DailyChallenge from "@/components/DailyChallenge";
import GamificationWidget from "@/components/GamificationWidget";
import StudyHeatmap from "@/components/StudyHeatmap";
import RevisionScheduler from "@/components/RevisionScheduler";
import Leaderboard from "@/components/Leaderboard";
import ExamCountdown from "@/components/ExamCountdown";
import ProgressReport from "@/components/ProgressReport";
import TopicPriority from "@/components/TopicPriority";
import { store } from "@/lib/store";
import { SUBJECT_TOPICS } from "@/lib/constants";
import { getSubjectsForCurriculum } from "@/lib/subjects";
import { useCurriculum } from "@/lib/curriculum";
import { StudentProfile, TopicMastery } from "@/lib/types";

const curriculumIcons = { ZIMSEC: GraduationCap } as const;

const getGreeting = (name: string, assessmentCount: number): { message: string; mood: OviMood } => {
  const hour = new Date().getHours();
  if (assessmentCount === 0) return { message: `Ready to begin, ${name}? Let's go.`, mood: "greeting" };
  if (hour < 12) return { message: `Good morning, ${name}.`, mood: "greeting" };
  if (hour < 17) return { message: `Hey ${name} — perfect time to revise.`, mood: "encouraging" };
  return { message: `Evening ${name}. A focused session before bed?`, mood: "encouraging" };
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { curriculum, meta } = useCurriculum();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [mastery, setMastery] = useState<TopicMastery[]>([]);
  const [oviMood, setOviMood] = useState<OviMood>("greeting");
  const [oviMessage, setOviMessage] = useState("");
  const [showNeglectAlert, setShowNeglectAlert] = useState(false);
  const [neglectedSubjects, setNeglectedSubjects] = useState<string[]>([]);

  useEffect(() => {
    const p = store.getProfile();
    if (!p) { navigate("/"); return; }
    setProfile(p);
    setMastery(store.getMastery());

    const assessments = store.getAssessments();
    const { message, mood } = getGreeting(p.name, assessments.length);
    setOviMood(mood);
    setOviMessage(message);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const m = store.getMastery();
    const neglected = p.subjects.filter((subj) => {
      const subjectMastery = m.filter((t) => t.subject === subj);
      if (subjectMastery.length === 0) return true;
      return subjectMastery.every((t) => t.lastRevised < sevenDaysAgo);
    });

    const criticalSubjects = p.subjects.filter((subj) => {
      const subjectMastery = m.filter((t) => t.subject === subj);
      if (subjectMastery.length === 0) return assessments.length > 2;
      const avgMastery = subjectMastery.reduce((s, t) => s + t.mastery, 0) / subjectMastery.length;
      return subjectMastery.every((t) => t.lastRevised < fourteenDaysAgo) && avgMastery < 50;
    });

    if (criticalSubjects.length > 0 && assessments.length > 0) {
      setNeglectedSubjects(criticalSubjects);
      setOviMood("encouraging");
      setOviMessage(`${p.name}, let's get back on track together.`);
      setShowNeglectAlert(true);
    } else if (neglected.length > 0 && assessments.length > 0) {
      setNeglectedSubjects(neglected);
      setShowNeglectAlert(true);
    }

    const timer = setTimeout(() => setOviMood("idle"), 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  if (!profile) return null;

  const overallMastery = mastery.length > 0
    ? Math.round(mastery.reduce((s, m) => s + m.mastery, 0) / mastery.length)
    : 0;

  const assessments = store.getAssessments();
  const totalAssessments = assessments.length;
  const curriculumSubjects = getSubjectsForCurriculum(curriculum);
  const CurriculumIcon = curriculumIcons[curriculum];

  const subjectMastery = curriculumSubjects.map((subjDef) => {
    const topicEntries = mastery.filter((m) => m.subject === subjDef.name);
    const avg = topicEntries.length > 0
      ? Math.round(topicEntries.reduce((s, m) => s + m.mastery, 0) / topicEntries.length)
      : 0;
    return {
      subject: subjDef.name,
      mastery: avg,
      topicCount: SUBJECT_TOPICS[subjDef.name]?.length || 0,
      syllabi: subjDef.syllabi[curriculum] || [],
    };
  });

  return (
    <AppLayout>
      {/* Neglect Alert */}
      <AlertDialog open={showNeglectAlert} onOpenChange={setShowNeglectAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle size={20} strokeWidth={1.5} /> OVI needs your attention
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>OVI detected {neglectedSubjects.length === 1 ? "a subject" : "subjects"} that need urgent attention:</p>
                <div className="space-y-2">
                  {neglectedSubjects.map((subj) => {
                    const subjectMastery = mastery.filter(t => t.subject === subj);
                    const avg = subjectMastery.length > 0
                      ? Math.round(subjectMastery.reduce((s, t) => s + t.mastery, 0) / subjectMastery.length)
                      : 0;
                    return (
                      <div key={subj} className="flex items-center justify-between p-2 rounded-lg bg-warning/10 border border-warning/20">
                        <div className="flex items-center gap-2">
                          <BookOpen size={14} strokeWidth={1.5} className="text-foreground/70" />
                          <span className="font-semibold text-foreground">{subj}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{avg}% mastery</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogAction onClick={() => { setShowNeglectAlert(false); navigate("/assessment"); }}>
              Revise Now
            </AlertDialogAction>
            <AlertDialogAction
              className="border border-border bg-background text-foreground hover:bg-muted"
              onClick={() => setShowNeglectAlert(false)}
            >
              Later
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* ── Greeting Bar ── */}
        <motion.div
          className="flex flex-col sm:flex-row items-start sm:items-center gap-5 elevated-card border border-border rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <OviAvatar size="lg" mood={oviMood} message={oviMessage} showGlow />
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
              <CurriculumIcon size={12} strokeWidth={1.5} />
              {meta.fullLabel}
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Welcome back, {profile.name}.
            </h1>
            <p className="text-muted-foreground mt-1">
              {totalAssessments === 0
                ? "Your Learning Hub is ready. Pick a subject below to begin."
                : `${totalAssessments} assessment${totalAssessments > 1 ? "s" : ""} completed. Keep up the momentum.`}
            </p>
          </div>
        </motion.div>

        {/* ── Quick Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: TrendingUp, value: `${overallMastery}%`, label: "Overall Mastery", color: "text-primary" },
            { icon: BookOpen, value: curriculumSubjects.length, label: `${curriculum} Subjects`, color: "text-blue-500" },
            { icon: Brain, value: store.getFlashcards().length, label: "Flashcards", color: "text-violet-500" },
            { icon: BarChart3, value: totalAssessments, label: "Assessments", color: "text-amber-500" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
              <Card className="elevated-card">
                <CardContent className="p-4 text-center">
                  <stat.icon className={`mx-auto ${stat.color} mb-2`} size={22} strokeWidth={1.5} />
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{stat.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ── Main Tabbed Dashboard ── */}
        <Tabs defaultValue="today" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="today" className="gap-1.5 text-xs">
              <Zap size={14} /> Today
            </TabsTrigger>
            <TabsTrigger value="study" className="gap-1.5 text-xs">
              <Brain size={14} /> Study
            </TabsTrigger>
            <TabsTrigger value="progress" className="gap-1.5 text-xs">
              <Trophy size={14} /> Progress
            </TabsTrigger>
            <TabsTrigger value="subjects" className="gap-1.5 text-xs">
              <BookOpen size={14} /> Subjects
            </TabsTrigger>
          </TabsList>

          {/* ── TODAY Tab ── */}
          <TabsContent value="today" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <GamificationWidget />
              <StudyTimer />
              <DailyChallenge />
            </div>
            <ExamCountdown />
            <RevisionScheduler />
          </TabsContent>

          {/* ── STUDY Tab ── */}
          <TabsContent value="study" className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Link to="/assessment">
                <Button className="w-full h-14 text-sm gap-2 " size="lg">
                  <BookOpen size={18} strokeWidth={1.5} /> Start Assessment
                </Button>
              </Link>
              <Link to="/flashcards">
                <Button variant="outline" className="w-full h-14 text-sm gap-2 " size="lg">
                  <Brain size={18} strokeWidth={1.5} /> Review Flashcards
                </Button>
              </Link>
              <Link to="/chat">
                <Button variant="outline" className="w-full h-14 text-sm gap-2 " size="lg">
                  <MessageCircle size={18} strokeWidth={1.5} /> Chat with OVI
                </Button>
              </Link>
              <Link to="/notes">
                <Button variant="outline" className="w-full h-14 text-sm gap-2 " size="lg">
                  <FileText size={18} strokeWidth={1.5} /> Revision Notes
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Link to="/exam-simulation">
                <Button variant="ghost" className="w-full h-12 text-xs gap-2 border border-border">
                  <Clock size={16} /> Exam Simulation
                </Button>
              </Link>
              <Link to="/past-papers">
                <Button variant="ghost" className="w-full h-12 text-xs gap-2 border border-border">
                  <FileText size={16} /> Past Papers
                </Button>
              </Link>
              <Link to="/voice">
                <Button variant="ghost" className="w-full h-12 text-xs gap-2 border border-border">
                  <MessageCircle size={16} /> OVI Voice
                </Button>
              </Link>
              <Link to="/mistake-journal">
                <Button variant="ghost" className="w-full h-12 text-xs gap-2 border border-border">
                  <Target size={16} /> Mistake Journal
                </Button>
              </Link>
            </div>
          </TabsContent>

          {/* ── PROGRESS Tab ── */}
          <TabsContent value="progress" className="space-y-4">
            <TopicPriority />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <StudyHeatmap />
              <Leaderboard />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ProgressReport />
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar size={16} className="text-primary" />
                    Study Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { tip: "Review flashcards daily for maximum retention", icon: Brain },
                    { tip: "Complete the Daily Challenge every morning", icon: Zap },
                    { tip: "Use the Focus Timer for distraction-free study", icon: Clock },
                    { tip: "Check your Mistake Journal before assessments", icon: Target },
                  ].map(({ tip, icon: Icon }) => (
                    <div key={tip} className="flex items-start gap-2.5 p-2 rounded-lg bg-muted/30">
                      <Icon size={14} className="text-primary mt-0.5 shrink-0" />
                      <span className="text-sm text-foreground">{tip}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── SUBJECTS Tab ── */}
          <TabsContent value="subjects" className="space-y-4">
            {subjectMastery.length === 0 ? (
              <Card className="academic-shadow">
                <CardContent className="p-8 text-center text-muted-foreground">
                  No subjects available for {meta.label} yet. Switch curriculum from the sidebar.
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjectMastery.map(({ subject, mastery: m, topicCount, syllabi }, i) => (
                  <motion.div
                    key={subject}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 * i }}
                  >
                    <Card className="elevated-card h-full">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <BookOpen size={16} strokeWidth={1.5} className="text-primary" />
                          {subject}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{topicCount} topics</span>
                          <span className="font-semibold text-foreground">{m}%</span>
                        </div>
                        <Progress value={m} className="h-2" />
                        {syllabi.length > 0 && (
                          <div className="pt-2 border-t border-border space-y-1">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                              Syllabus folders
                            </div>
                            {syllabi.map((s) => (
                              <div key={s} className="flex items-center gap-2 text-xs text-foreground/80">
                                <FolderOpen size={12} strokeWidth={1.5} className="text-muted-foreground" />
                                {s}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
