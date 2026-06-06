/**
 * OVI LEARNS — Smart Daily Revision Scheduler
 * Shows what to study TODAY based on forgetting curves, exam dates, and mastery gaps.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, Clock, AlertTriangle, Calendar, ArrowRight, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { store } from "@/lib/store";
import { SUBJECT_ICONS } from "@/lib/constants";
import { daysUntilDanger } from "@/lib/fsrs";
import { Link } from "react-router-dom";

interface RevisionTask {
  subject: string;
  topic: string;
  reason: string;
  priority: "critical" | "high" | "medium";
  action: string;
  link: string;
}

export default function RevisionScheduler() {
  const navigate = useNavigate();

  const tasks = useMemo(() => {
    const result: RevisionTask[] = [];
    const mastery = store.getMastery();
    const flashcards = store.getFlashcards();
    const streak = store.getStreak();

    // 1. Flashcards in danger zone (forgetting curve)
    const dangerCards = flashcards.filter((f) => {
      const days = daysUntilDanger(f);
      return days !== null && days <= 2;
    });
    if (dangerCards.length > 0) {
      const subjects = [...new Set(dangerCards.map((c) => c.subject))];
      result.push({
        subject: subjects[0],
        topic: `${dangerCards.length} cards at risk`,
        reason: "These flashcards will be forgotten within 2 days if not reviewed",
        priority: "critical",
        action: "Review Now",
        link: "/flashcards",
      });
    }

    // 2. Topics not revised in 14+ days with low mastery
    const stale = mastery
      .filter((m) => {
        if (!m.lastRevised) return true;
        const days = Math.floor((Date.now() - new Date(m.lastRevised).getTime()) / (1000 * 60 * 60 * 24));
        return days >= 14 && m.mastery < 50;
      })
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 2);

    for (const t of stale) {
      result.push({
        subject: t.subject,
        topic: t.topic,
        reason: `${t.mastery}% mastery — needs attention before exam`,
        priority: "high",
        action: "Study",
        link: `/notes`,
      });
    }

    // 3. Weakest topics (below 30% mastery)
    const weakest = mastery
      .filter((m) => m.mastery < 30)
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 2);

    for (const t of weakest) {
      if (!result.some((r) => r.subject === t.subject && r.topic === t.topic)) {
        result.push({
          subject: t.subject,
          topic: t.topic,
          reason: `Only ${t.mastery}% mastery — foundational gap`,
          priority: "high",
          action: "Practice",
          link: `/assessment`,
        });
      }
    }

    // 4. Topics due for spaced repetition review
    const dueCards = flashcards.filter((f) => {
      if (!f.next_review) return true;
      return new Date(f.next_review) <= new Date();
    });
    if (dueCards.length >= 5) {
      const topSubject = dueCards.reduce((acc, c) => {
        acc[c.subject] = (acc[c.subject] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const subject = Object.entries(topSubject).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (subject && !result.some((r) => r.subject === subject)) {
        result.push({
          subject,
          topic: `${dueCards.length} cards due`,
          reason: "Spaced repetition schedule — review now for maximum retention",
          priority: "medium",
          action: "Review",
          link: "/flashcards",
        });
      }
    }

    // 5. Streak maintenance
    if (streak.current_streak > 0) {
      const today = new Date().toISOString().split("T")[0];
      const lastActive = streak.last_review_date?.split("T")[0];
      if (lastActive !== today) {
        result.push({
          subject: "General",
          topic: `${streak.current_streak}-day streak`,
          reason: "Complete at least one activity today to keep your streak alive",
          priority: "medium",
          action: "Study",
          link: "/flashcards",
        });
      }
    }

    return result.slice(0, 5);
  }, []);

  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain size={16} className="text-primary" />
            What to Study Today
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-sm font-medium text-foreground">All caught up!</p>
          <p className="text-xs text-muted-foreground mt-1">No urgent revision needed today</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Brain size={16} className="text-primary" />
            What to Study Today
          </span>
          <Badge variant="outline" className="text-xs">{tasks.length} tasks</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.map((task, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 p-2 rounded-lg border ${
              task.priority === "critical"
                ? "border-red-500/30 bg-red-500/5"
                : task.priority === "high"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-border bg-muted/30"
            }`}
          >
            <div className="shrink-0">
              {task.priority === "critical" ? (
                <AlertTriangle size={16} className="text-red-500" />
              ) : task.priority === "high" ? (
                <Clock size={16} className="text-amber-500" />
              ) : (
                <BookOpen size={16} className="text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{SUBJECT_ICONS[task.subject] || "📚"}</span>
                <span className="text-sm font-medium text-foreground truncate">{task.subject} — {task.topic}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{task.reason}</p>
            </div>
            <Link to={task.link}>
              <Button variant="ghost" size="sm" className="shrink-0 gap-1 text-xs">
                {task.action} <ArrowRight size={12} />
              </Button>
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
