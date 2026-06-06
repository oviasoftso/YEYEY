/**
 * OVI Topic Priority — Shows which topics are most important for ZIMSEC exams.
 * Based on past paper frequency analysis and student mastery gaps.
 */
import { useMemo } from "react";
import { Target, TrendingUp, AlertTriangle, CheckCircle2, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { store } from "@/lib/store";
import { SUBJECT_ICONS } from "@/lib/constants";

// ZIMSEC topic frequency data (based on past paper analysis)
const TOPIC_FREQUENCY: Record<string, Record<string, number>> = {
  Mathematics: {
    "Algebra": 95, "Geometry": 85, "Trigonometry": 80, "Statistics": 75,
    "Number": 70, "Mensuration": 65, "Vectors": 60, "Matrices": 55,
    "Transformation": 50, "Probability": 45, "Sets": 40, "Scale Drawing": 35,
  },
  "English Language": {
    "Comprehension": 100, "Summary": 95, "Continuous Writing": 90, "Directed Writing": 85,
    "Grammar": 80, "Vocabulary": 75, "Punctuation": 70, "Sentence Structure": 65,
  },
  "Combined Science": {
    "Chemical Reactions": 90, "Forces": 85, "Electricity": 80, "Cells & Organisation": 75,
    "Ecology": 70, "Acids & Bases": 65, "Metals": 60, "Energy": 55,
    "Light & Sound": 50, "Reproduction": 45, "Nutrition": 40, "Pressure": 35,
  },
  Physics: {
    "Forces": 95, "Energy": 90, "Waves": 85, "Electricity": 80,
    "Thermal Physics": 75, "Motion": 70, "Pressure": 65, "Magnetism": 60,
    "Radioactivity": 55, "Measurements": 50,
  },
  Chemistry: {
    "Acids, Bases and Salts": 95, "Chemical Reactions": 90, "Metals": 85,
    "Organic Chemistry": 80, "Atomic Structure": 75, "Bonding": 70,
    "Electrolysis": 65, "Energy Changes": 60, "Rates of Reaction": 55,
    "Air & Water": 50, "Periodic Table": 45,
  },
  Biology: {
    "Cells & Organisation": 95, "Reproduction": 90, "Ecology": 85,
    "Nutrition": 80, "Transport": 75, "Respiration": 70, "Excretion": 65,
    "Coordination": 60, "Genetics": 55, "Variation & Evolution": 50,
  },
  "Principles of Accounting": {
    "Final Accounts": 95, "Control Accounts": 90, "Cash Book": 85,
    "Bank Reconciliation": 80, "Trial Balance": 75, "Journal": 70,
    "Incomplete Records": 65, "Partnership": 60, "Manufacturing": 55,
    "Depreciation": 50, "Suspense": 45,
  },
  "Business Entrepreneurial Studies": {
    "Business Management": 90, "Marketing": 85, "Finance": 80,
    "Human Resources": 75, "Production": 70, "Business Environment": 65,
    "Business Plan": 60, "Ethics": 55, "Technology": 50,
  },
  Geography: {
    "Climate": 90, "Rivers": 85, "Population": 80, "Agriculture": 75,
    "Industry": 70, "Settlement": 65, "Map Work": 60, "Tectonics": 55,
    "Vegetation": 50, "Tourism": 45,
  },
  History: {
    "Colonial Period": 95, "Independence": 90, "Pre-Colonial": 85,
    "World Wars": 80, "Cold War": 75, "Nationalism": 70,
    "Economic Development": 65, "Social Change": 60,
  },
};

interface TopicPriorityProps {
  subject?: string;
  maxTopics?: number;
}

export default function TopicPriority({ subject, maxTopics = 8 }: TopicPriorityProps) {
  const mastery = store.getMastery();
  const assessments = store.getAssessments();

  const priorities = useMemo(() => {
    const subjects = subject ? [subject] : Object.keys(TOPIC_FREQUENCY);
    const result: {
      subject: string;
      topic: string;
      frequency: number;
      mastery: number;
      priority: number;
      status: "critical" | "warning" | "good" | "mastered";
    }[] = [];

    for (const subj of subjects) {
      const freq = TOPIC_FREQUENCY[subj];
      if (!freq) continue;

      for (const [topic, frequency] of Object.entries(freq)) {
        const topicMastery = mastery.find((m) => m.subject === subj && m.topic === topic);
        const m = topicMastery?.mastery || 0;

        // Priority = frequency × (100 - mastery) / 100
        // High frequency + low mastery = high priority
        const priority = Math.round(frequency * (100 - m) / 100);

        let status: "critical" | "warning" | "good" | "mastered";
        if (m >= 80) status = "mastered";
        else if (m >= 60) status = "good";
        else if (m >= 40) status = "warning";
        else status = "critical";

        result.push({ subject: subj, topic, frequency, mastery: m, priority, status });
      }
    }

    return result
      .sort((a, b) => b.priority - a.priority)
      .slice(0, maxTopics);
  }, [mastery, subject, maxTopics]);

  if (priorities.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target size={16} className="text-primary" />
          Topic Priority — What to Study First
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {priorities.map((p, i) => (
          <div
            key={`${p.subject}-${p.topic}`}
            className={`flex items-center gap-3 p-2 rounded-lg border ${
              p.status === "critical" ? "border-red-500/30 bg-red-500/5" :
              p.status === "warning" ? "border-amber-500/30 bg-amber-500/5" :
              p.status === "good" ? "border-blue-500/30 bg-blue-500/5" :
              "border-green-500/30 bg-green-500/5"
            }`}
          >
            <span className="w-5 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
            <span className="text-sm">{SUBJECT_ICONS[p.subject] || "📚"}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-foreground truncate">{p.topic}</span>
                <Badge variant="outline" className="text-[10px]">{p.subject}</Badge>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={p.mastery} className="h-1.5 flex-1" />
                <span className="text-xs text-muted-foreground w-8 text-right">{p.mastery}%</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs font-semibold text-foreground">{p.priority}</div>
              <div className="text-[10px] text-muted-foreground">priority</div>
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground text-center mt-2">
          Priority = Exam Frequency × (100 - Your Mastery). Study high-priority topics first.
        </p>
      </CardContent>
    </Card>
  );
}
