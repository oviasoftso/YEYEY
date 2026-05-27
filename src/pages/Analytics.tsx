import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Lightbulb, ArrowRight, BookOpen, Brain } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import OviAvatar from "@/components/OviAvatar";
import { store } from "@/lib/store";
import { SUBJECT_ICONS } from "@/lib/constants";
import { StudentProfile, TopicMastery, Assessment } from "@/lib/types";

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
            <h1 className="font-display text-2xl font-bold text-foreground">Learning Analytics</h1>
            <p className="text-muted-foreground text-sm">Track your progress and get personalised advice</p>
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
      </div>
    </AppLayout>
  );
};

export default AnalyticsPage;
