/**
 * OVI Study Heatmap — GitHub-style contribution grid.
 * Shows study activity over 52 weeks with green intensity levels.
 */
import { useMemo } from "react";
import { Flame, Calendar, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { store } from "@/lib/store";

const LEVELS = ["", "bg-emerald-200 dark:bg-emerald-900", "bg-emerald-400 dark:bg-emerald-700", "bg-emerald-600 dark:bg-emerald-500", "bg-emerald-800 dark:bg-emerald-300"];
const DAYS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getIntensity(count: number): number {
  if (count === 0) return 0;
  if (count <= 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

export default function StudyHeatmap() {
  const { grid, streak, longestStreak, totalDays, monthLabels } = useMemo(() => {
    const assessments = store.getAssessments();
    const flashcards = store.getFlashcards();
    const focusSessions = store.getFocusSessions();
    const streakData = store.getStreak();

    // Build activity map: date -> count
    const activityMap = new Map<string, number>();

    assessments.forEach((a) => {
      const date = a.completedAt.split("T")[0];
      activityMap.set(date, (activityMap.get(date) || 0) + 1);
    });

    flashcards.forEach((f) => {
      if (f.last_review) {
        const date = f.last_review.split("T")[0];
        activityMap.set(date, (activityMap.get(date) || 0) + 1);
      }
    });

    focusSessions.forEach((s) => {
      const date = s.completedAt.split("T")[0];
      activityMap.set(date, (activityMap.get(date) || 0) + 1);
    });

    // Build 52-week grid (weeks as columns, days as rows)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)); // Monday

    const weeks: { date: Date; count: number; intensity: number }[][] = [];
    const labels: { month: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    for (let w = 51; w >= 0; w--) {
      const weekStart = new Date(startOfWeek);
      weekStart.setDate(startOfWeek.getDate() - w * 7);
      const week: { date: Date; count: number; intensity: number }[] = [];

      for (let d = 0; d < 7; d++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + d);
        const dateStr = date.toISOString().split("T")[0];
        const count = activityMap.get(dateStr) || 0;
        week.push({ date, count, intensity: getIntensity(count) });

        // Track month labels
        if (d === 0 && date.getMonth() !== lastMonth) {
          lastMonth = date.getMonth();
          labels.push({ month: MONTHS[lastMonth], weekIndex: 51 - w });
        }
      }
      weeks.push(week);
    }

    // Count total active days
    const uniqueDays = new Set([
      ...assessments.map((a) => a.completedAt.split("T")[0]),
      ...flashcards.filter((f) => f.last_review).map((f) => f.last_review!.split("T")[0]),
      ...focusSessions.map((s) => s.completedAt.split("T")[0]),
    ]);

    return {
      grid: weeks,
      streak: streakData.current_streak,
      longestStreak: streakData.longest_streak,
      totalDays: uniqueDays.size,
      monthLabels: labels,
    };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar size={16} className="text-primary" />
            Study Activity
          </span>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs gap-1">
              <Flame size={10} className="text-orange-500" />
              {streak} day streak
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Heatmap grid */}
        <div className="overflow-x-auto">
          <div className="inline-flex gap-0.5">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 mr-1">
              {DAYS.map((d, i) => (
                <div key={i} className="h-3 w-6 text-[9px] text-muted-foreground flex items-center">
                  {d}
                </div>
              ))}
            </div>

            {/* Grid */}
            {grid.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className={`h-3 w-3 rounded-sm ${LEVELS[day.intensity]} border border-background/20`}
                    title={`${day.date.toLocaleDateString()}: ${day.count} activities`}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Month labels */}
          <div className="flex ml-7 mt-1">
            {monthLabels.map((l, i) => (
              <span
                key={i}
                className="text-[9px] text-muted-foreground"
                style={{ position: "relative", left: `${l.weekIndex * 13.5}px` }}
              >
                {l.month}
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <TrendingUp size={12} />
            {totalDays} study days
          </span>
          <span className="flex items-center gap-1">
            <Flame size={12} className="text-orange-500" />
            {streak} current streak
          </span>
          <span>Best: {longestStreak} days</span>
        </div>
      </CardContent>
    </Card>
  );
}
