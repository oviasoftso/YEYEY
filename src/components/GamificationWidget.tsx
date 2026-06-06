/**
 * OVI Gamification Widget — XP, level, badges display.
 */
import { useState, useEffect } from "react";
import { Trophy, Star, Award, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { store } from "@/lib/store";
import { getLevelInfo, getXPProgress, type LevelInfo } from "@/lib/gamification";

export default function GamificationWidget() {
  const [xpData, setXPData] = useState(store.getXPData());
  const [levelInfo, setLevelInfo] = useState<LevelInfo>(getLevelInfo(1));
  const [progress, setProgress] = useState({ current: 0, needed: 100, percentage: 0 });
  const [showBadges, setShowBadges] = useState(false);

  useEffect(() => {
    const data = store.getXPData();
    setXPData(data);
    setLevelInfo(getLevelInfo(data.level));
    setProgress(getXPProgress(data.totalXP));
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Trophy size={16} className="text-amber-500" />
          Your Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Level display */}
        <div className="flex items-center gap-3">
          <div className="text-3xl">{levelInfo.icon}</div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                Level {xpData.level} — {levelInfo.name}
              </span>
              <span className="text-xs text-muted-foreground">{xpData.totalXP} XP</span>
            </div>
            <Progress value={progress.percentage} className="h-2 mt-1" />
            <p className="text-xs text-muted-foreground mt-1">
              {progress.current} / {progress.needed} XP to Level {xpData.level + 1}
            </p>
          </div>
        </div>

        {/* Badges */}
        {xpData.badges.length > 0 && (
          <div>
            <button
              onClick={() => setShowBadges(!showBadges)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              <Award size={12} />
              <span>{xpData.badges.length} badge{xpData.badges.length !== 1 ? "s" : ""} earned</span>
              <ChevronRight size={12} className={`ml-auto transition-transform ${showBadges ? "rotate-90" : ""}`} />
            </button>
            {showBadges && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {xpData.badges.map((badge) => (
                  <Badge key={badge.id} variant="secondary" className="text-xs gap-1" title={badge.description}>
                    {badge.icon} {badge.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {xpData.badges.length === 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Complete assessments and review flashcards to earn XP and badges!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
