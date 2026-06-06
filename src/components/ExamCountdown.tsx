/**
 * OVI Exam Countdown Widget
 * Shows days until each ZIMSEC exam with urgency colors.
 */
import { useMemo } from "react";
import { Calendar, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { store } from "@/lib/store";
import { SUBJECT_ICONS } from "@/lib/constants";

// ZIMSEC 2026 approximate exam dates
const ZIMSEC_DATES: Record<string, string> = {
  "Mathematics": "2026-10-15",
  "Mathematics A": "2026-10-15",
  "Mathematics B": "2026-10-16",
  "English Language": "2026-10-10",
  "Combined Science": "2026-10-20",
  "Physics": "2026-10-22",
  "Chemistry": "2026-10-24",
  "Biology": "2026-10-28",
  "Principles of Accounting": "2026-10-16",
  "Business Entrepreneurial Studies": "2026-10-18",
  "Geography": "2026-10-30",
  "History": "2026-11-03",
  "Literature in English": "2026-10-12",
  "Ndebele": "2026-10-08",
  "Heritage Studies": "2026-10-08",
  "Computer Science": "2026-11-05",
  "Agriculture": "2026-11-07",
  "Food Technology and Design": "2026-11-09",
  "Textiles and Design": "2026-11-09",
  "Woodwork": "2026-11-11",
  "FRS": "2026-10-14",
};

export default function ExamCountdown() {
  const profile = store.getProfile();

  const exams = useMemo(() => {
    if (!profile) return [];
    const now = new Date();
    return profile.subjects
      .map((subject) => {
        const dateStr = ZIMSEC_DATES[subject];
        if (!dateStr) return null;
        const examDate = new Date(dateStr);
        const days = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (days < 0) return null;
        return { subject, date: dateStr, days, examDate };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null)
      .sort((a, b) => a.days - b.days)
      .slice(0, 6);
  }, [profile]);

  if (exams.length === 0) return null;

  const getUrgency = (days: number) => {
    if (days <= 7) return { color: "text-red-500", bg: "bg-red-500/10 border-red-500/20", label: "URGENT" };
    if (days <= 21) return { color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", label: "Soon" };
    if (days <= 42) return { color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20", label: "" };
    return { color: "text-muted-foreground", bg: "", label: "" };
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar size={16} className="text-primary" />
          ZIMSEC 2026 Exam Countdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {exams.map((exam) => {
            const urgency = getUrgency(exam.days);
            return (
              <div
                key={exam.subject}
                className={`p-2.5 rounded-lg border ${urgency.bg || "border-border"}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">{SUBJECT_ICONS[exam.subject] || "📚"}</span>
                  <span className="text-xs font-medium text-foreground truncate">{exam.subject}</span>
                </div>
                <div className={`text-xl font-bold ${urgency.color}`}>
                  {exam.days}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {exam.days === 1 ? "day left" : "days left"}
                  {urgency.label && (
                    <Badge variant="outline" className={`ml-1 text-[9px] ${urgency.color} border-current`}>
                      {urgency.label}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
