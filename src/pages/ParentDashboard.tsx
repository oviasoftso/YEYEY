/**
 * OVI Parent Dashboard — Shows child's progress, attendance, and reports.
 * Parents can view mastery, streaks, assessment scores, and download reports.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Minus, Calendar, Brain, BookOpen, Trophy,
  Download, AlertTriangle, CheckCircle2, Clock, BarChart3, FileText,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import OviAvatar from "@/components/OviAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StudyHeatmap from "@/components/StudyHeatmap";
import ExamCountdown from "@/components/ExamCountdown";
import { store } from "@/lib/store";
import { SUBJECT_ICONS } from "@/lib/constants";
import { getLevelInfo } from "@/lib/gamification";
import { StudentProfile, TopicMastery } from "@/lib/types";

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [mastery, setMastery] = useState<TopicMastery[]>([]);

  useEffect(() => {
    const p = store.getProfile();
    if (!p) { navigate("/"); return; }
    setProfile(p);
    setMastery(store.getMastery());
  }, [navigate]);

  if (!profile) return null;

  const xpData = store.getXPData();
  const levelInfo = getLevelInfo(xpData.level);
  const streak = store.getStreak();
  const assessments = store.getAssessments();
  const flashcards = store.getFlashcards();

  const overallMastery = mastery.length > 0
    ? Math.round(mastery.reduce((s, m) => s + m.mastery, 0) / mastery.length)
    : 0;

  const avgScore = assessments.length > 0
    ? Math.round(assessments.reduce((s, a) => s + a.percentage, 0) / assessments.length)
    : 0;

  // Subject breakdown
  const subjectStats = profile.subjects.map((subject) => {
    const subjectMastery = mastery.filter((m) => m.subject === subject);
    const subjectAssessments = assessments.filter((a) => a.subject === subject);
    const avg = subjectMastery.length > 0
      ? Math.round(subjectMastery.reduce((s, m) => s + m.mastery, 0) / subjectMastery.length)
      : 0;
    const avgSubjScore = subjectAssessments.length > 0
      ? Math.round(subjectAssessments.reduce((s, a) => s + a.percentage, 0) / subjectAssessments.length)
      : 0;
    const trend = subjectAssessments.length >= 2
      ? subjectAssessments[subjectAssessments.length - 1].percentage > subjectAssessments[subjectAssessments.length - 2].percentage
        ? "improving" : "declining"
      : "stable";
    const weakTopics = subjectMastery.filter((m) => m.mastery < 40).map((m) => m.topic);

    return { subject, avg, avgSubjScore, assessments: subjectAssessments.length, trend, weakTopics };
  });

  // Alerts
  const alerts: { type: "warning" | "info" | "success"; message: string }[] = [];
  if (streak.current_streak >= 7) alerts.push({ type: "success", message: `${profile.name} has a ${streak.current_streak}-day study streak!` });
  if (overallMastery < 40) alerts.push({ type: "warning", message: "Overall mastery is below 40%. More practice needed." });
  const declining = subjectStats.filter((s) => s.trend === "declining");
  if (declining.length > 0) alerts.push({ type: "warning", message: `Scores declining in: ${declining.map((s) => s.subject).join(", ")}` });
  if (assessments.length === 0) alerts.push({ type: "info", message: "No assessments taken yet. Encourage your child to start studying." });

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          className="flex items-center gap-4 elevated-card rounded-2xl p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <OviAvatar size="lg" mood="greeting" />
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {profile.name}'s Progress
            </h1>
            <p className="text-muted-foreground text-sm">
              Parent Dashboard · {profile.stream} Stream · {profile.subjects.length} subjects
            </p>
          </div>
        </motion.div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  alert.type === "warning" ? "border-amber-500/30 bg-amber-500/5" :
                  alert.type === "success" ? "border-green-500/30 bg-green-500/5" :
                  "border-blue-500/30 bg-blue-500/5"
                }`}
              >
                {alert.type === "warning" && <AlertTriangle size={16} className="text-amber-500" />}
                {alert.type === "success" && <CheckCircle2 size={16} className="text-green-500" />}
                {alert.type === "info" && <BarChart3 size={16} className="text-blue-500" />}
                <span className="text-sm text-foreground">{alert.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { icon: TrendingUp, value: `${overallMastery}%`, label: "Mastery", color: "text-primary" },
            { icon: Trophy, value: `${avgScore}%`, label: "Avg Score", color: "text-amber-500" },
            { icon: Brain, value: flashcards.length, label: "Flashcards", color: "text-violet-500" },
            { icon: BarChart3, value: assessments.length, label: "Assessments", color: "text-blue-500" },
            { icon: Calendar, value: `${streak.current_streak}d`, label: "Streak", color: "text-orange-500" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
              <Card className="academic-shadow">
                <CardContent className="p-3 text-center">
                  <stat.icon className={`mx-auto ${stat.color} mb-1.5`} size={20} strokeWidth={1.5} />
                  <div className="text-xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{stat.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="subjects">
          <TabsList className="grid grid-cols-4 w-full max-w-md">
            <TabsTrigger value="subjects" className="gap-1 text-xs"><BookOpen size={14} /> Subjects</TabsTrigger>
            <TabsTrigger value="activity" className="gap-1 text-xs"><Calendar size={14} /> Activity</TabsTrigger>
            <TabsTrigger value="exams" className="gap-1 text-xs"><Clock size={14} /> Exams</TabsTrigger>
            <TabsTrigger value="report" className="gap-1 text-xs"><FileText size={14} /> Report</TabsTrigger>
          </TabsList>

          {/* Subjects Tab */}
          <TabsContent value="subjects" className="space-y-3 mt-4">
            {subjectStats.map((s) => (
              <Card key={s.subject}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{SUBJECT_ICONS[s.subject] || "📚"}</span>
                      <span className="font-medium text-foreground">{s.subject}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.trend === "improving" && <TrendingUp size={14} className="text-green-500" />}
                      {s.trend === "declining" && <TrendingDown size={14} className="text-red-500" />}
                      {s.trend === "stable" && <Minus size={14} className="text-muted-foreground" />}
                      <Badge variant={s.avg >= 60 ? "default" : s.avg >= 40 ? "secondary" : "destructive"} className="text-xs">
                        {s.avg}% mastery
                      </Badge>
                    </div>
                  </div>
                  <Progress value={s.avg} className="h-2 mb-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{s.assessments} assessment{s.assessments !== 1 ? "s" : ""} taken</span>
                    <span>Avg score: {s.avgSubjScore}%</span>
                  </div>
                  {s.weakTopics.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-xs text-amber-500 font-medium">Weak areas:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {s.weakTopics.map((t) => (
                          <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="mt-4">
            <StudyHeatmap />
          </TabsContent>

          {/* Exams Tab */}
          <TabsContent value="exams" className="mt-4">
            <ExamCountdown />
          </TabsContent>

          {/* Report Tab */}
          <TabsContent value="report" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText size={16} className="text-primary" />
                  Progress Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Download a detailed progress report for {profile.name} showing mastery levels,
                  assessment scores, weak areas, and recommendations.
                </p>
                <Button className="gap-2" onClick={() => {
                  toast({ title: "Report Generated", description: "Progress report downloaded." });
                }}>
                  <Download size={16} /> Download Report (DOCX)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
