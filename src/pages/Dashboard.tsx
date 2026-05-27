import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen, Brain, MessageCircle, BarChart3, AlertTriangle, TrendingUp,
  ArrowRight, Library, FolderOpen, GraduationCap, Globe, Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import AppLayout from "@/components/AppLayout";
import OviAvatar from "@/components/OviAvatar";
import type { OviMood } from "@/components/OviAvatar";
import { store } from "@/lib/store";
import { SUBJECT_TOPICS } from "@/lib/constants";
import { getSubjectsForCurriculum } from "@/lib/subjects";
import { useCurriculum } from "@/lib/curriculum";
import { StudentProfile, TopicMastery } from "@/lib/types";

const curriculumIcons = { ZIMSEC: GraduationCap } as const;

const getGreeting = (name: string, assessmentCount: number): { message: string; mood: OviMood } => {
  const hour = new Date().getHours();
  if (assessmentCount === 0) {
    return { message: `Ready to begin, ${name}? Let's go.`, mood: "greeting" };
  }
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

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const staleTopics = mastery.filter((m) => m.lastRevised < sevenDaysAgo);

  // Subjects filtered by active curriculum
  const curriculumSubjects = getSubjectsForCurriculum(curriculum);

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

  const CurriculumIcon = curriculumIcons[curriculum];

  return (
    <AppLayout>
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
                <p className="text-sm">OVI keeps your weakest topics on rotation so nothing slips through the cracks before exams.</p>
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

      <div className="p-6 max-w-6xl mx-auto space-y-8">
        {/* Greeting + curriculum context bar */}
        <motion.div
          className="flex flex-col sm:flex-row items-start sm:items-center gap-6 glass academic-shadow border border-border rounded-2xl p-6 overflow-hidden relative"
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

        {/* Quick stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: TrendingUp, value: `${overallMastery}%`, label: "Overall Mastery" },
            { icon: BookOpen, value: curriculumSubjects.length, label: `${curriculum} Subjects` },
            { icon: Brain, value: store.getFlashcards().length, label: "Flashcards" },
            { icon: BarChart3, value: totalAssessments, label: "Assessments" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
              <Card className="academic-shadow hover:-translate-y-0.5 transition-transform">
                <CardContent className="p-4 text-center">
                  <stat.icon className="mx-auto text-primary mb-2" size={22} strokeWidth={1.5} />
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{stat.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {staleTopics.length > 0 && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="border-warning/30 bg-warning/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-warning mb-2">
                  <AlertTriangle size={18} strokeWidth={1.5} />
                  <span className="font-semibold text-sm">Topics needing attention</span>
                </div>
                <div className="space-y-2">
                  {staleTopics.slice(0, 4).map((t) => {
                    const daysSince = Math.floor((Date.now() - new Date(t.lastRevised).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={`${t.subject}-${t.topic}`} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{t.subject} — {t.topic}</span>
                        <span className="text-muted-foreground text-xs">{daysSince}d ago</span>
                      </div>
                    );
                  })}
                </div>
                <Link to="/assessment">
                  <Button size="sm" variant="outline" className="mt-3 gap-1 text-warning border-warning/30 hover:bg-warning/10">
                    Revise Now <ArrowRight size={14} strokeWidth={1.5} />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Quick actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/assessment">
            <Button className="w-full h-14 text-base gap-2" size="lg">
              <BookOpen size={20} strokeWidth={1.5} /> Start Assessment
            </Button>
          </Link>
          <Link to="/flashcards">
            <Button variant="outline" className="w-full h-14 text-base gap-2" size="lg">
              <Brain size={20} strokeWidth={1.5} /> Review Flashcards
            </Button>
          </Link>
          {profile.stream === "arts" && (
            <Link to="/study-guides">
              <Button variant="outline" className="w-full h-14 text-base gap-2" size="lg">
                <Library size={20} strokeWidth={1.5} /> Set Book Guides
              </Button>
            </Link>
          )}
          <Link to="/chat">
            <Button variant="outline" className="w-full h-14 text-base gap-2" size="lg">
              <MessageCircle size={20} strokeWidth={1.5} /> Chat with OVI
            </Button>
          </Link>
        </div>

        {/* Subject grid — filtered by active curriculum */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">Your Subjects</h2>
              <p className="text-xs text-muted-foreground mt-0.5 font-semibold uppercase tracking-wider">
                Filtered by {meta.fullLabel}
              </p>
            </div>
          </div>
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
                  transition={{ delay: 0.04 * i }}
                >
                  <Card className="academic-shadow hover:-translate-y-0.5 transition-transform h-full">
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
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
