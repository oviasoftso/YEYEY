import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, RefreshCw, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/components/AppLayout";
import OviAvatar from "@/components/OviAvatar";
import { store } from "@/lib/store";
import { SUBJECT_ICONS } from "@/lib/constants";
import { StudentProfile, StudyPlanItem } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const StudyPlanPage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [plan, setPlan] = useState<StudyPlanItem[]>([]);
  const [loading, setLoading] = useState(false);

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
      const { data, error } = await supabase.functions.invoke("generate-study-plan", {
        body: {
          subjects: profile.subjects,
          mastery,
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
    } catch {
      toast({ title: "Error", description: "Failed to generate study plan.", variant: "destructive" });
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

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <OviAvatar size="md" />
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Study Plan</h1>
              <p className="text-muted-foreground text-sm">Your personalized revision schedule</p>
            </div>
          </div>
          <Button onClick={generatePlan} disabled={loading} variant="outline" className="gap-2">
            {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            Generate Plan
          </Button>
        </div>

        {plan.length === 0 ? (
          <Card className="py-16">
            <CardContent className="text-center">
              <OviAvatar size="lg" className="mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">No Study Plan Yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Generate a personalized plan based on your performance
              </p>
              <Button onClick={generatePlan} disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                Generate My Plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">
              {completed}/{plan.length} tasks completed
            </div>

            <div className="space-y-3">
              {plan.map((item) => (
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
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default StudyPlanPage;
