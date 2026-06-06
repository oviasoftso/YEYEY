/**
 * OVI COMPETE — Anonymous Peer Leaderboard
 * Shows top students by XP, streak, and assessment scores.
 * Names are anonymized for privacy.
 */
import { useState, useEffect } from "react";
import { Trophy, Flame, Target, Medal, Crown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { store } from "@/lib/store";
import { getLevelInfo } from "@/lib/gamification";

interface LeaderboardEntry {
  rank: number;
  name: string;
  xp: number;
  level: number;
  streak: number;
  avgScore: number;
  isCurrentUser: boolean;
}

// Generate anonymous leaderboard from local data + simulated peers
function generateLeaderboard(): { byXP: LeaderboardEntry[]; byStreak: LeaderboardEntry[]; byScore: LeaderboardEntry[] } {
  const profile = store.getProfile();
  const xpData = store.getXPData();
  const streak = store.getStreak();
  const assessments = store.getAssessments();
  const avgScore = assessments.length > 0
    ? Math.round(assessments.reduce((s, a) => s + a.percentage, 0) / assessments.length)
    : 0;

  const currentUser: LeaderboardEntry = {
    rank: 0,
    name: profile?.name || "You",
    xp: xpData.totalXP,
    level: xpData.level,
    streak: streak.current_streak,
    avgScore,
    isCurrentUser: true,
  };

  // Simulated peer data (in production, this comes from Supabase)
  const peers: LeaderboardEntry[] = [
    { rank: 0, name: "Student Alpha", xp: 2500, level: 12, streak: 15, avgScore: 78, isCurrentUser: false },
    { rank: 0, name: "Student Bravo", xp: 1800, level: 10, streak: 8, avgScore: 72, isCurrentUser: false },
    { rank: 0, name: "Student Charlie", xp: 1200, level: 8, streak: 5, avgScore: 65, isCurrentUser: false },
    { rank: 0, name: "Student Delta", xp: 800, level: 6, streak: 3, avgScore: 58, isCurrentUser: false },
    { rank: 0, name: "Student Echo", xp: 400, level: 4, streak: 1, avgScore: 50, isCurrentUser: false },
  ];

  const all = [...peers, currentUser];

  const byXP = [...all].sort((a, b) => b.xp - a.xp).map((e, i) => ({ ...e, rank: i + 1 }));
  const byStreak = [...all].sort((a, b) => b.streak - a.streak).map((e, i) => ({ ...e, rank: i + 1 }));
  const byScore = [...all].sort((a, b) => b.avgScore - a.avgScore).map((e, i) => ({ ...e, rank: i + 1 }));

  return { byXP, byStreak, byScore };
}

const RANK_ICONS = ["🥇", "🥈", "🥉"];

export default function Leaderboard() {
  const [data, setData] = useState(generateLeaderboard());

  const renderEntry = (entry: LeaderboardEntry, metric: string) => (
    <div
      key={entry.name}
      className={`flex items-center gap-3 p-2 rounded-lg ${
        entry.isCurrentUser ? "bg-primary/5 border border-primary/20" : ""
      }`}
    >
      <div className="w-6 text-center font-bold text-sm">
        {entry.rank <= 3 ? RANK_ICONS[entry.rank - 1] : entry.rank}
      </div>
      <div className="flex-1">
        <span className={`text-sm ${entry.isCurrentUser ? "font-semibold text-primary" : "text-foreground"}`}>
          {entry.isCurrentUser ? "You" : entry.name}
        </span>
        <span className="text-xs text-muted-foreground ml-2">Lv.{entry.level}</span>
      </div>
      <Badge variant={entry.isCurrentUser ? "default" : "secondary"} className="text-xs">
        {metric === "xp" && `${entry.xp} XP`}
        {metric === "streak" && `${entry.streak} days`}
        {metric === "score" && `${entry.avgScore}%`}
      </Badge>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Trophy size={16} className="text-amber-500" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="xp">
          <TabsList className="grid grid-cols-3 w-full mb-3">
            <TabsTrigger value="xp" className="text-xs gap-1"><Crown size={12} /> XP</TabsTrigger>
            <TabsTrigger value="streak" className="text-xs gap-1"><Flame size={12} /> Streak</TabsTrigger>
            <TabsTrigger value="score" className="text-xs gap-1"><Target size={12} /> Score</TabsTrigger>
          </TabsList>

          <TabsContent value="xp" className="space-y-1.5 mt-0">
            {data.byXP.slice(0, 6).map((e) => renderEntry(e, "xp"))}
          </TabsContent>
          <TabsContent value="streak" className="space-y-1.5 mt-0">
            {data.byStreak.slice(0, 6).map((e) => renderEntry(e, "streak"))}
          </TabsContent>
          <TabsContent value="score" className="space-y-1.5 mt-0">
            {data.byScore.slice(0, 6).map((e) => renderEntry(e, "score"))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
