/**
 * OVI Study Groups — Peer collaboration: create/join groups, share flashcards, group challenges.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, Plus, Search, Trophy, Brain, BookOpen, Crown, Star, Loader2,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import OviAvatar from "@/components/OviAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { store } from "@/lib/store";
import { SUBJECT_ICONS } from "@/lib/constants";
import { getLevelInfo } from "@/lib/gamification";
import { StudentProfile } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

interface StudyGroup {
  id: string;
  name: string;
  subject: string;
  members: { name: string; xp: number; level: number; streak: number }[];
  createdBy: string;
  createdAt: string;
  inviteCode: string;
}

export default function StudyGroups() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    const p = store.getProfile();
    if (!p) { navigate("/"); return; }
    setProfile(p);

    // Load demo groups
    setGroups([
      {
        id: "group-1",
        name: "Physics Masters",
        subject: "Physics",
        members: [
          { name: "Tendai M.", xp: 3200, level: 14, streak: 12 },
          { name: "Rudo K.", xp: 2800, level: 12, streak: 8 },
          { name: "Blessing N.", xp: 1500, level: 9, streak: 5 },
        ],
        createdBy: "Tendai M.",
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        inviteCode: "PHY2026",
      },
      {
        id: "group-2",
        name: "Math Warriors",
        subject: "Mathematics",
        members: [
          { name: "Takudzwa R.", xp: 4500, level: 18, streak: 21 },
          { name: "Chiedza M.", xp: 3800, level: 15, streak: 14 },
          { name: "Farai D.", xp: 2100, level: 11, streak: 7 },
          { name: "Netsai P.", xp: 1200, level: 8, streak: 3 },
        ],
        createdBy: "Takudzwa R.",
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        inviteCode: "MATH26",
      },
      {
        id: "group-3",
        name: "Chemistry Squad",
        subject: "Chemistry",
        members: [
          { name: "Anesu D.", xp: 8500, level: 28, streak: 45 },
          { name: "Tatenda S.", xp: 2400, level: 11, streak: 9 },
        ],
        createdBy: "Anesu D.",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        inviteCode: "CHEM26",
      },
    ]);
  }, [navigate]);

  if (!profile) return null;

  const xpData = store.getXPData();

  const myGroups = groups.filter((g) =>
    g.members.some((m) => m.name.includes(profile.name.split(" ")[0]))
  );

  const otherGroups = groups.filter((g) =>
    !g.members.some((m) => m.name.includes(profile.name.split(" ")[0]))
  );

  const joinGroup = () => {
    if (!joinCode) return;
    const group = groups.find((g) => g.inviteCode === joinCode.toUpperCase());
    if (group) {
      group.members.push({ name: profile.name, xp: xpData.totalXP, level: xpData.level, streak: store.getStreak().current_streak });
      setGroups([...groups]);
      setJoinCode("");
      toast({ title: "Joined!", description: `You joined ${group.name}.` });
    } else {
      toast({ title: "Invalid Code", description: "Check the invite code and try again.", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <OviAvatar size="md" />
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Study Groups</h1>
              <p className="text-muted-foreground text-sm">Learn together, compete, and grow</p>
            </div>
          </div>
        </div>

        {/* Join by code */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Input
              placeholder="Enter invite code (e.g. PHY2026)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="flex-1"
            />
            <Button onClick={joinGroup} disabled={!joinCode} className="gap-1.5">
              <Users size={14} /> Join Group
            </Button>
          </CardContent>
        </Card>

        <Tabs defaultValue="my-groups">
          <TabsList className="grid grid-cols-2 w-full max-w-xs">
            <TabsTrigger value="my-groups" className="gap-1 text-xs">
              <Users size={14} /> My Groups ({myGroups.length})
            </TabsTrigger>
            <TabsTrigger value="discover" className="gap-1 text-xs">
              <Search size={14} /> Discover ({otherGroups.length})
            </TabsTrigger>
          </TabsList>

          {/* My Groups */}
          <TabsContent value="my-groups" className="space-y-3 mt-4">
            {myGroups.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center">
                  <Users size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-display text-lg font-semibold mb-2">No Groups Yet</h3>
                  <p className="text-muted-foreground text-sm">Join a group using an invite code or discover groups below.</p>
                </CardContent>
              </Card>
            ) : (
              myGroups.map((group) => <GroupCard key={group.id} group={group} currentUserName={profile.name} />)
            )}
          </TabsContent>

          {/* Discover */}
          <TabsContent value="discover" className="space-y-3 mt-4">
            {otherGroups.map((group) => (
              <Card key={group.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{SUBJECT_ICONS[group.subject] || "📚"}</span>
                        <span className="font-medium text-foreground">{group.name}</span>
                        <Badge variant="outline" className="text-xs">{group.subject}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {group.members.length} members · Created by {group.createdBy}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setJoinCode(group.inviteCode);
                        joinGroup();
                      }}
                      className="gap-1.5"
                    >
                      <Plus size={14} /> Join
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function GroupCard({ group, currentUserName }: { group: StudyGroup; currentUserName: string }) {
  const sorted = [...group.members].sort((a, b) => b.xp - a.xp);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="text-lg">{SUBJECT_ICONS[group.subject] || "📚"}</span>
            {group.name}
          </span>
          <Badge variant="outline" className="text-xs">Code: {group.inviteCode}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Leaderboard */}
        <div className="space-y-1.5">
          {sorted.map((member, i) => {
            const isMe = member.name.includes(currentUserName.split(" ")[0]);
            const levelInfo = getLevelInfo(member.level);
            return (
              <div
                key={member.name}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  isMe ? "bg-primary/5 border border-primary/20" : ""
                }`}
              >
                <span className="w-5 text-center text-sm">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <span className={`text-sm ${isMe ? "font-semibold text-primary" : "text-foreground"}`}>
                    {member.name} {isMe && "(You)"}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">{levelInfo.icon} Lv.{member.level}</span>
                </div>
                <Badge variant={isMe ? "default" : "secondary"} className="text-xs">
                  {member.xp} XP
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {member.streak}d streak
                </Badge>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
          <span>{group.members.length} members</span>
          <span>Total XP: {group.members.reduce((s, m) => s + m.xp, 0).toLocaleString()}</span>
          <span>Avg Level: {Math.round(group.members.reduce((s, m) => s + m.level, 0) / group.members.length)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
