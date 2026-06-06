import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Lightbulb, ArrowRight, BookOpen, Brain, GraduationCap, Clock, TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import OviAvatar from "@/components/OviAvatar";
import { store } from "@/lib/store";
import { SUBJECT_ICONS } from "@/lib/constants";
import { StudentProfile, TopicMastery, Assessment } from "@/lib/types";

const GRADE_THRESHOLDS = [[80,"A","text-success"],[70,"B","text-primary"],[60,"C","text-accent"],[50,"D","text-warning"],[40,"E","text-orange-500"],[0,"U","text-destructive"]] as const;
const getPredictedGrade = (avg: number) => { for (const [t,g] of GRADE_THRESHOLDS) if (avg >= t) return g; return "U"; };
const getGradeColor = (grade: string) => { for (const [,g,c] of GRADE_THRESHOLDS) if (g === grade) return c; return "text-destructive"; };

type ForgetStatus = "fresh" | "at-risk" | "critical";
const getForgettingStatus = (lastRevised: string): ForgetStatus => {
  const d = Math.floor((Date.now() - new Date(lastRevised).getTime()) / 864e5);
  return d > 14 ? "critical" : d >= 7 ? "at-risk" : "fresh";
};
const FORGET_BADGE: Record<ForgetStatus, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  "at-risk": "bg-warning/15 text-warning border-warning/30",
  fresh: "bg-success/15 text-success border-success/30",
};
const FORGET_LABEL: Record<ForgetStatus, string> = { critical: "Critical", "at-risk": "At Risk", fresh: "Fresh" };

const getTimeToMastery = (m: number) => m >= 70 ? 0 : Math.ceil((70 - m) / 5);

const getStudyTrend = (a: Assessment[]): "improving" | "declining" | "stable" => {
  if (a.length < 3) return "stable";
  const avg = (a[a.length-2].percentage + a[a.length-1].percentage) / 2;
  return avg > a[a.length-3].percentage + 5 ? "improving" : avg < a[a.length-3].percentage - 5 ? "declining" : "stable";
};

const getAdvice = (mastery: TopicMastery[], assessments: Assessment[]): string[] => {
  const advice: string[] = [];

  // Weak topics advice
  const weakTopics = mastery.filter((m) => m.mastery < 50).sort((a, b) => a.mastery - b.mastery);
  weakTopics.slice(0, 3).forEach((t) => {
    advice.push(`📚 Polish your knowledge on **${t.topic}** in ${t.subject} — you're at ${t.mastery}%. Try a focused assessment or review flashcards.`);
  });

  // Neglected topics
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const neglected = mastery.filter((m) => m.lastRevised < sevenDaysAgo);
  if (neglected.length > 0) {
    advice.push(`⏰ You haven't revised **${neglected[0].topic}** (${neglected[0].subject}) in over a week. Revisit it before you forget!`);
  }

  // Declining performance
  if (assessments.length >= 3) {
    const last3 = assessments.slice(-3);
    if (last3[2].percentage < last3[0].percentage - 10) {
      advice.push(`📉 Your recent scores show a dip. Take a break, then come back refreshed — quality over quantity!`);
    }
  }

  // Subjects with no attempts
  const profile = store.getProfile();
  if (profile) {
    const attempted = new Set(mastery.map((m) => m.subject));
    const untouched = profile.subjects.filter((s) => !attempted.has(s));
    untouched.slice(0, 2).forEach((s) => {
      advice.push(`🆕 You haven't started on **${s}** yet. Begin with an assessment to track your progress!`);
    });
  }

  // Positive reinforcement
  const strongTopics = mastery.filter((m) => m.mastery >= 80);
  if (strongTopics.length > 0) {
    advice.push(`🌟 Great job on **${strongTopics[0].topic}** (${strongTopics[0].subject}) — ${strongTopics[0].mastery}% mastery! Keep it up!`);
  }

  if (advice.length === 0) {
    advice.push("🚀 Start your first assessment to get personalised study advice from OVI!");
  }

  return advice;
};

const AnalyticsPage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [mastery, setMastery] = useState<TopicMastery[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  useEffect(() => {
    const p = store.getProfile();
    if (!p) { navigate("/"); return; }
    setProfile(p);
    setMastery(store.getMastery());
    setAssessments(store.getAssessments());
  }, [navigate]);

  if (!profile) return null;

  const subjectData = profile.subjects.map((s) => {
    const entries = mastery.filter((m) => m.subject === s);
    const avg = entries.length > 0
      ? Math.round(entries.reduce((sum, m) => sum + m.mastery, 0) / entries.length)
      : 0;
    return { subject: s.length > 12 ? s.slice(0, 12) + "…" : s, mastery: avg };
  });

  const progressData = assessments.map((a, i) => ({
    name: `#${i + 1}`,
    score: a.percentage,
  }));

  const avgScore = assessments.length > 0
    ? Math.round(assessments.reduce((s, a) => s + a.percentage, 0) / assessments.length)
    : 0;

  const advice = getAdvice(mastery, assessments);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const neglectedTopics = mastery.filter((m) => m.lastRevised < sevenDaysAgo);

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <OviAvatar size="md" />
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">OVI INSIGHT</h1>
            <p className="text-muted-foreground text-sm">Predictive analytics engine for your ZIMSEC success</p>
          </div>
        </div>

        {/* OVI's Advice Section */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="text-primary" size={20} />
              OVI's Study Advice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {advice.map((tip, i) => (
              <p key={i} className="text-sm text-foreground leading-relaxed">
                {tip.replace(/\*\*(.*?)\*\*/g, (_, match) => match)}
              </p>
            ))}
            <div className="flex gap-2 pt-2">
              <Link to="/assessment">
                <Button size="sm" className="gap-1"><BookOpen size={14} /> Take Assessment</Button>
              </Link>
              <Link to="/flashcards">
                <Button size="sm" variant="outline" className="gap-1"><Brain size={14} /> Review Flashcards</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Neglected topics warning */}
        {neglectedTopics.length > 0 && (
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-warning mb-2">
                <AlertTriangle size={18} />
                <span className="font-semibold text-sm">Topics You're Neglecting</span>
              </div>
              <div className="space-y-2">
                {neglectedTopics.slice(0, 5).map((t) => {
                  const daysSince = Math.floor((Date.now() - new Date(t.lastRevised).getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={`${t.subject}-${t.topic}`} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{SUBJECT_ICONS[t.subject]} {t.subject} — {t.topic}</span>
                      <span className="text-muted-foreground">{daysSince} days ago</span>
                    </div>
                  );
                })}
              </div>
              <Link to="/assessment">
                <Button size="sm" variant="outline" className="mt-3 gap-1">
                  Revise Now <ArrowRight size={14} />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card><CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">{avgScore}%</div>
            <div className="text-sm text-muted-foreground">Average Score</div>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-foreground">{assessments.length}</div>
            <div className="text-sm text-muted-foreground">Assessments Done</div>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-accent">{mastery.length}</div>
            <div className="text-sm text-muted-foreground">Topics Studied</div>
          </CardContent></Card>
        </div>

        {/* Subject Mastery Chart */}
        <Card>
          <CardHeader><CardTitle>Subject Mastery</CardTitle></CardHeader>
          <CardContent>
            {subjectData.some((d) => d.mastery > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subjectData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="subject" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip />
                  <Bar dataKey="mastery" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">Complete assessments to see mastery data</p>
            )}
          </CardContent>
        </Card>

        {/* Progress Over Time */}
        {progressData.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Assessment Scores Over Time</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ fill: "hsl(var(--accent))" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Topic mastery list */}
        {mastery.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Topic Mastery Details</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mastery.map((m) => (
                  <div key={`${m.subject}-${m.topic}`} className="flex items-center gap-3">
                    <span className="text-lg">{SUBJECT_ICONS[m.subject]}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground font-medium">{m.topic}</span>
                        <span className={`font-semibold ${m.mastery >= 70 ? "text-success" : m.mastery >= 40 ? "text-warning" : "text-destructive"}`}>
                          {m.mastery}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full">
                        <div
                          className={`h-2 rounded-full transition-all ${m.mastery >= 70 ? "bg-success" : m.mastery >= 40 ? "bg-warning" : "bg-destructive"}`}
                          style={{ width: `${m.mastery}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══════════ OVI INSIGHT — Predictive Sections ═══════════ */}

        {/* 1. Predicted Grade */}
        {mastery.length > 0 && (() => {
          const overallAvg = Math.round(mastery.reduce((s, m) => s + m.mastery, 0) / mastery.length);
          const grade = getPredictedGrade(overallAvg);
          const barColor = overallAvg >= 70 ? "bg-success" : overallAvg >= 40 ? "bg-warning" : "bg-destructive";
          return (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <GraduationCap className="text-primary" size={20} /> Predicted ZIMSEC Grade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className={`text-6xl font-bold ${getGradeColor(grade)}`}>{grade}</div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-2">
                      Based on average mastery of <span className="font-semibold text-foreground">{overallAvg}%</span> across all topics.
                    </p>
                    <div className="h-3 bg-muted rounded-full">
                      <div className={`h-3 rounded-full transition-all ${barColor}`} style={{ width: `${overallAvg}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>U</span><span>E</span><span>D</span><span>C</span><span>B</span><span>A</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* 2. Forgetting Curve */}
        {mastery.length > 0 && (() => {
          const now = Date.now();
          const categorized = mastery.map((m) => {
            const daysSince = Math.floor((now - new Date(m.lastRevised).getTime()) / 864e5);
            return { ...m, daysSince, status: getForgettingStatus(m.lastRevised) };
          }).sort((a, b) => b.daysSince - a.daysSince);

          const critical = categorized.filter((c) => c.status === "critical");
          const atRisk = categorized.filter((c) => c.status === "at-risk");
          const fresh = categorized.filter((c) => c.status === "fresh");
          return (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="text-accent" size={20} />
                  Forgetting Curve
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Topics at risk of being forgotten based on when you last revised them
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 rounded-lg bg-destructive/10">
                    <div className="text-2xl font-bold text-destructive">{critical.length}</div>
                    <div className="text-xs text-muted-foreground">Critical (&gt;14 days)</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-warning/10">
                    <div className="text-2xl font-bold text-warning">{atRisk.length}</div>
                    <div className="text-xs text-muted-foreground">At Risk (7-14 days)</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-success/10">
                    <div className="text-2xl font-bold text-success">{fresh.length}</div>
                    <div className="text-xs text-muted-foreground">Fresh (&lt;7 days)</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {[...critical.slice(0, 5), ...atRisk.slice(0, 3)].map((t) => (
                    <div key={`${t.subject}-${t.topic}-forget`} className="flex items-center justify-between text-sm">
                      <span className="text-foreground truncate mr-2">{SUBJECT_ICONS[t.subject]} {t.topic}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-muted-foreground text-xs">{t.daysSince}d ago</span>
                        <Badge className={FORGET_BADGE[t.status]}>{FORGET_LABEL[t.status]}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <Link to="/flashcards" className="block mt-3">
                  <Button size="sm" variant="outline" className="gap-1">
                    <Brain size={14} /> Review Before You Forget
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })()}

        {/* 3. Topic Gap Analysis */}
        {mastery.length > 0 && (() => {
          const gaps = mastery.filter((m) => m.mastery < 50).sort((a, b) => a.mastery - b.mastery);
          if (gaps.length === 0) return null;
          return (
            <Card className="border-warning/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="text-warning" size={20} />
                  Topic Gap Analysis
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {gaps.length} topic{gaps.length !== 1 ? "s" : ""} below 50% mastery — your priority gaps
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {gaps.slice(0, 6).map((g) => {
                    const progressToTarget = Math.round((g.mastery / 50) * 100);
                    return (
                      <div key={`${g.subject}-${g.topic}-gap`}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-foreground font-medium truncate mr-2">
                            {SUBJECT_ICONS[g.subject]} {g.topic}
                            <span className="text-muted-foreground font-normal ml-1">({g.subject})</span>
                          </span>
                          <span className="text-destructive font-semibold shrink-0">{g.mastery}%</span>
                        </div>
                        <Progress value={progressToTarget} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {50 - g.mastery}% away from 50% target
                        </p>
                      </div>
                    );
                  })}
                </div>
                <Link to="/assessment" className="block mt-3">
                  <Button size="sm" className="gap-1">
                    <BookOpen size={14} /> Close Your Gaps
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })()}

        {/* 4. Time to Mastery */}
        {mastery.length > 0 && (() => {
          const weakTopics = mastery.filter((m) => m.mastery < 70).sort((a, b) => a.mastery - b.mastery);
          if (weakTopics.length === 0) return null;
          return (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="text-primary" size={20} />
                  Time to Mastery
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Estimated study sessions needed to reach 70% (30 min/session, ~5% improvement each)
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {weakTopics.slice(0, 6).map((t) => {
                    const sessions = getTimeToMastery(t.mastery);
                    const hours = (sessions * 30) / 60;
                    return (
                      <div key={`${t.subject}-${t.topic}-ttm`} className="flex items-center justify-between text-sm">
                        <div className="flex-1 min-w-0 mr-2">
                          <span className="text-foreground font-medium">{SUBJECT_ICONS[t.subject]} {t.topic}</span>
                          <span className="text-muted-foreground ml-1">({t.mastery}%)</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-muted-foreground">{hours.toFixed(1)}h</span>
                          <Badge variant="secondary" className="text-xs">
                            {sessions} session{sessions !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* 5. Study Efficiency */}
        {assessments.length >= 3 && (() => {
          const trend = getStudyTrend(assessments);
          const TrendIcon = trend === "improving" ? TrendingUp : trend === "declining" ? TrendingDown : Minus;
          const trendColor = trend === "improving" ? "text-success" : trend === "declining" ? "text-destructive" : "text-muted-foreground";
          const trendLabel = trend === "improving" ? "Improving" : trend === "declining" ? "Declining" : "Stable";
          const ratio = mastery.length > 0 ? (assessments.length / mastery.length).toFixed(1) : "0";
          const recentAvg = Math.round(assessments.slice(-5).reduce((s, a) => s + a.percentage, 0) / Math.min(assessments.length, 5));
          return (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="text-accent" size={20} /> Study Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendIcon className={trendColor} size={18} />
                      <span className={`text-lg font-bold ${trendColor}`}>{trendLabel}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">Score Trend</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-lg font-bold text-foreground">{ratio}</div>
                    <div className="text-xs text-muted-foreground">Assessments / Topic</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-lg font-bold text-primary">{recentAvg}%</div>
                    <div className="text-xs text-muted-foreground">Last 5 Avg Score</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </AppLayout>
  );
};

export default AnalyticsPage;
