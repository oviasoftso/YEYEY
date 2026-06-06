import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, RefreshCw, CheckCircle2, Circle, Calendar, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/AppLayout";
import OviAvatar from "@/components/OviAvatar";
import { store } from "@/lib/store";
import { SUBJECT_ICONS } from "@/lib/constants";
import { StudentProfile, StudyPlanItem } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// ZIMSEC 2026 approximate exam dates (Term 3)
const ZIMSEC_DATES: Record<string, string> = {
  "Mathematics": "2026-10-15",
  "English Language": "2026-10-10",
  "Combined Science": "2026-10-20",
  "Physics": "2026-10-22",
  "Chemistry": "2026-10-24",
  "Biology": "2026-10-28",
  "Accounting": "2026-10-16",
  "Business Studies": "2026-10-18",
  "Geography": "2026-10-30",
  "History": "2026-11-03",
  "Literature in English": "2026-10-12",
  "Shona": "2026-10-08",
  "Ndebele": "2026-10-08",
  "Computer Science": "2026-11-05",
  "Agriculture": "2026-11-07",
};

function getExamCountdown(subject: string): { days: number; label: string; urgency: "critical" | "warning" | "normal" } | null {
  const examDate = ZIMSEC_DATES[subject];
  if (!examDate) return null;
  const days = Math.ceil((new Date(examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { days: 0, label: "Past", urgency: "normal" };
  if (days <= 14) return { days, label: `${days}d left`, urgency: "critical" };
  if (days <= 42) return { days, label: `${days}d left`, urgency: "warning" };
  return { days, label: `${days}d left`, urgency: "normal" };
}

type PaceProfile = "fast" | "steady" | "intensive";

const StudyPlanPage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [plan, setPlan] = useState<StudyPlanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [rationale, setRationale] = useState<string>("");
  const [estimatedHours, setEstimatedHours] = useState<number>(0);
  const [paceProfile, setPaceProfile] = useState<PaceProfile>("steady");

  useEffect(() => {
    const p = store.getProfile();
    if (!p) { navigate("/"); return; }
    setProfile(p);
    setPlan(store.getStudyPlan());
  }, [navigate]);

  if (!profile) return null;

  const generatePlan = async () => {
    setLoading(true);
    try {
      const mastery = store.getMastery();
      const { data, error } = await supabase.functions.invoke("ovi_compass_planner", {
        body: {
          subjects: profile.subjects,
          mastery,
          assessments: store.getAssessments().slice(-10),
          zimsecDates: ZIMSEC_DATES,
        },
      });
      if (error) throw error;

      const items: StudyPlanItem[] = (data.plan || []).map((p: any) => ({
        id: crypto.randomUUID(),
        subject: p.subject,
        topic: p.topic,
        activity: p.activity,
        completed: false,
        scheduledFor: p.scheduledFor || new Date().toISOString(),
      }));
      store.setStudyPlan(items);
      setPlan(items);
      setRationale(data.rationale || "");
      setEstimatedHours(data.estimatedHours || 0);
      setPaceProfile(data.paceProfile || "steady");

      toast({ title: "Plan Generated!", description: `${items.length} tasks for this week. ${data.paceProfile === "intensive" ? "Intensive mode activated!" : ""}` });
    } catch {
      // Fallback to old function
      try {
        const { data, error } = await supabase.functions.invoke("generate-study-plan", {
          body: {
            subjects: profile.subjects,
            mastery: store.getMastery(),
            assessments: store.getAssessments().slice(-10),
          },
        });
        if (error) throw error;
        const items: StudyPlanItem[] = (data.plan || []).map((p: any) => ({
          id: crypto.randomUUID(),
          subject: p.subject,
          topic: p.topic,
          activity: p.activity,
          completed: false,
          scheduledFor: p.scheduledFor || new Date().toISOString(),
        }));
        store.setStudyPlan(items);
        setPlan(items);
        toast({ title: "Plan Generated!", description: `${items.length} tasks for this week.` });
      } catch {
        toast({ title: "Error", description: "Failed to generate study plan.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (id: string) => {
    const updated = plan.map((p) => p.id === id ? { ...p, completed: !p.completed } : p);
    store.setStudyPlan(updated);
    setPlan(updated);
  };

  const completed = plan.filter((p) => p.completed).length;

  // Group plan by day
  const groupedByDay = plan.reduce<Record<string, StudyPlanItem[]>>((acc, item) => {
    const day = new Date(item.scheduledFor).toLocaleDateString("en-GB", { weekday: "long", month: "short", day: "numeric" });
    (acc[day] ??= []).push(item);
    return acc;
  }, {});

  // Exam countdown for student's subjects
  const examCountdowns = profile.subjects
    .map(s => ({ subject: s, ...getExamCountdown(s) }))
    .filter((e): e is NonNullable<typeof e> => e !== null && e.days > 0)
    .sort((a, b) => a.days - b.days);

  const paceLabels: Record<PaceProfile, { label: string; color: string; description: string }> = {
    fast: { label: "Fast Track", color: "bg-green-500/10 text-green-600 dark:text-green-400", description: "Quick sessions, high frequency" },
    steady: { label: "Steady", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400", description: "Balanced pace, sustainable" },
    intensive: { label: "Intensive", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400", description: "Deep sessions, focused effort" },
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <OviAvatar size="md" />
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">OVI COMPASS</h1>
              <p className="text-muted-foreground text-sm">Your adaptive study plan engine</p>
            </div>
          </div>
          <Button onClick={generatePlan} disabled={loading} variant="outline" className="gap-2">
            {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            Generate Plan
          </Button>
        </div>

        {/* Exam Countdown */}
        {examCountdowns.length > 0 && (
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar size={16} className="text-primary" />
                ZIMSEC Exam Countdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {examCountdowns.slice(0, 6).map((e) => (
                  <Badge
                    key={e.subject}
                    variant="outline"
                    className={
                      e.urgency === "critical" ? "border-red-500/40 text-red-600 dark:text-red-400 bg-red-500/5" :
                      e.urgency === "warning" ? "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5" :
                      "border-border"
                    }
                  >
                    {SUBJECT_ICONS[e.subject] || "📚"} {e.subject}: {e.label}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plan metadata */}
        {plan.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-foreground">{completed}/{plan.length}</div>
                <p className="text-xs text-muted-foreground">Tasks Done</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-foreground">{estimatedHours || "~"}h</div>
                <p className="text-xs text-muted-foreground">Study Hours</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <Badge className={`${paceLabels[paceProfile].color} border-0 text-sm`}>
                  {paceLabels[paceProfile].label}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">{paceLabels[paceProfile].description}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Rationale */}
        {rationale && (
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <TrendingUp size={16} className="text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">{rationale}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {plan.length === 0 ? (
          <Card className="py-16">
            <CardContent className="text-center">
              <OviAvatar size="lg" className="mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">No Study Plan Yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Generate a personalised plan based on your mastery data, ZIMSEC exam weights, and upcoming tests.
              </p>
              <Button onClick={generatePlan} disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                Generate My Plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedByDay).map(([day, items]) => (
              <div key={day}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                  <Clock size={14} />
                  {day}
                </h3>
                <div className="space-y-2">
                  {items.map((item) => (
                    <Card
                      key={item.id}
                      className={`cursor-pointer transition-all ${item.completed ? "opacity-60" : ""}`}
                      onClick={() => toggleItem(item.id)}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        {item.completed
                          ? <CheckCircle2 className="text-success shrink-0" size={22} />
                          : <Circle className="text-muted-foreground shrink-0" size={22} />}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span>{SUBJECT_ICONS[item.subject]}</span>
                            <span className={`font-medium ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {item.subject} — {item.topic}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">{item.activity}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default StudyPlanPage;
