import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, BookOpen, BarChart3, AlertTriangle, Plus, Search, Loader2,
  GraduationCap, TrendingUp, TrendingDown, Shield, FileText, Calendar,
  ClipboardList, Megaphone, Zap, CheckCircle2, Clock,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import OviAvatar from "@/components/OviAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { store } from "@/lib/store";
import { SUBJECT_TOPICS, SUBJECT_ICONS } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// ─── Interfaces ────────────────────────────────────────

interface Classroom {
  id: string;
  name: string;
  subjectIds: string[];
  studentCount: number;
  avgMastery: number;
  createdAt: string;
}

interface ClassroomStudent {
  id: string;
  name: string;
  email: string;
  stream: string;
  avgMastery: number;
  assessmentsTaken: number;
  lastActive: string;
  weakTopics: string[];
}

interface AtRiskStudent {
  id: string;
  name: string;
  riskScore: number;
  reasons: string[];
  weakSubjects: string[];
}

// ─── Helper ────────────────────────────────────────────

const getRiskColor = (score: number) => {
  if (score >= 70) return "text-red-600 dark:text-red-400 bg-red-500/10";
  if (score >= 40) return "text-amber-600 dark:text-amber-400 bg-amber-500/10";
  return "text-green-600 dark:text-green-400 bg-green-500/10";
};

const getRiskLabel = (score: number) => {
  if (score >= 70) return "Critical";
  if (score >= 40) return "At Risk";
  return "Safe";
};

// ─── Assignment Components ─────────────────────────────

function CreateAssignmentForm({ classroomId, onCreated }: { classroomId: string; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [paperType, setPaperType] = useState("paper1");
  const [questionCount, setQuestionCount] = useState(10);
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const topics = subject ? (SUBJECT_TOPICS[subject] || []) : [];

  const handleCreate = async () => {
    if (!title || !subject || !topic) return;
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke("ovi_classroom", {
        body: {
          action: "create_assignment",
          classroomId,
          title,
          subject,
          topic,
          paperType,
          questionCount,
          dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
      if (error) throw error;
      toast({ title: "Assignment Created", description: `${title} assigned to class.` });
      onCreated();
    } catch {
      toast({ title: "Error", description: "Failed to create assignment.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 3 Quiz" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Subject</Label>
          <Select value={subject} onValueChange={(v) => { setSubject(v); setTopic(""); }}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {Object.keys(SUBJECT_TOPICS).map((s) => (
                <SelectItem key={s} value={s}>{SUBJECT_ICONS[s]} {s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Topic</Label>
          <Select value={topic} onValueChange={setTopic} disabled={!subject}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {topics.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Paper Type</Label>
          <Select value={paperType} onValueChange={setPaperType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="paper1">Paper 1 (MCQ)</SelectItem>
              <SelectItem value="paper2">Paper 2 (Structured)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Questions</Label>
          <Input type="number" value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} min={1} max={40} />
        </div>
        <div>
          <Label>Due Date</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>
      <Button onClick={handleCreate} disabled={saving || !title || !subject || !topic} className="w-full">
        {saving ? <Loader2 className="animate-spin mr-2" size={14} /> : null}
        Create Assignment
      </Button>
    </div>
  );
}

function AssignmentList({ classroomId }: { classroomId: string }) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssignments();
  }, [classroomId]);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("ovi_classroom", {
        body: { action: "list_assignments", classroomId },
      });
      setAssignments(data?.assignments || []);
    } catch { /* empty */ }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={24} /></div>;

  if (assignments.length === 0) {
    return (
      <Card className="py-8">
        <CardContent className="text-center">
          <FileText size={32} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No assignments yet. Create one to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {assignments.map((a: any) => (
        <Card key={a.id}>
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{a.title || `${a.subject} — ${a.topic}`}</p>
              <p className="text-xs text-muted-foreground">
                {SUBJECT_ICONS[a.subject]} {a.subject} · {a.paperType?.toUpperCase()} · {a.questionCount}Q
              </p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-xs">{a.submissionCount || 0} submissions</Badge>
              {a.dueDate && (
                <p className="text-xs text-muted-foreground mt-1">
                  Due: {new Date(a.dueDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CreateExerciseForm({ classroomId, onCreated }: { classroomId: string; onCreated: () => void }) {
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(10);
  const [saving, setSaving] = useState(false);

  const topics = subject ? (SUBJECT_TOPICS[subject] || []) : [];

  const handleCreate = async () => {
    if (!subject || !topic) return;
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke("ovi_classroom", {
        body: {
          action: "create_exercise",
          classroomId,
          subject,
          topic,
          questionCount,
          timeLimitMinutes: timeLimit,
        },
      });
      if (error) throw error;
      toast({ title: "Exercise Started", description: `${questionCount} questions on ${topic}. Students can begin.` });
      onCreated();
    } catch {
      toast({ title: "Error", description: "Failed to start exercise.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Subject</Label>
          <Select value={subject} onValueChange={(v) => { setSubject(v); setTopic(""); }}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {Object.keys(SUBJECT_TOPICS).map((s) => (
                <SelectItem key={s} value={s}>{SUBJECT_ICONS[s]} {s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Topic</Label>
          <Select value={topic} onValueChange={setTopic} disabled={!subject}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {topics.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Questions</Label>
          <Input type="number" value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} min={1} max={40} />
        </div>
        <div>
          <Label>Time Limit (min)</Label>
          <Input type="number" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} min={1} max={60} />
        </div>
      </div>
      <Button onClick={handleCreate} disabled={saving || !subject || !topic} className="w-full">
        {saving ? <Loader2 className="animate-spin mr-2" size={14} /> : null}
        Start Exercise
      </Button>
    </div>
  );
}

function ExerciseList({ classroomId }: { classroomId: string }) {
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExercises();
  }, [classroomId]);

  const loadExercises = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("ovi_classroom", {
        body: { action: "list_exercises", classroomId },
      });
      setExercises(data?.exercises || []);
    } catch { /* empty */ }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={24} /></div>;

  if (exercises.length === 0) {
    return (
      <Card className="py-8">
        <CardContent className="text-center">
          <BookOpen size={32} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No exercises yet. Start one for your class.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {exercises.map((e: any) => (
        <Card key={e.id}>
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{SUBJECT_ICONS[e.subject]} {e.subject} — {e.topic}</p>
              <p className="text-xs text-muted-foreground">{e.questionCount} questions · {e.timeLimitMinutes} min</p>
            </div>
            <Badge variant={e.status === "active" ? "default" : "secondary"} className="text-xs">
              {e.status}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PostAnnouncementForm({ classroomId, onPosted }: { classroomId: string; onPosted: () => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const handlePost = async () => {
    if (!title || !content) return;
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke("ovi_classroom", {
        body: { action: "post_announcement", classroomId, title, content },
      });
      if (error) throw error;
      toast({ title: "Announcement Posted", description: `Sent to all students.` });
      onPosted();
    } catch {
      toast({ title: "Error", description: "Failed to post announcement.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Homework Reminder" />
      </div>
      <div>
        <Label>Message</Label>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your announcement..." rows={4} />
      </div>
      <Button onClick={handlePost} disabled={saving || !title || !content} className="w-full">
        {saving ? <Loader2 className="animate-spin mr-2" size={14} /> : null}
        Post Announcement
      </Button>
    </div>
  );
}

function AnnouncementList({ classroomId }: { classroomId: string }) {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnnouncements();
  }, [classroomId]);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("ovi_classroom", {
        body: { action: "list_announcements", classroomId },
      });
      setAnnouncements(data?.announcements || []);
    } catch { /* empty */ }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={24} /></div>;

  if (announcements.length === 0) {
    return (
      <Card className="py-8">
        <CardContent className="text-center">
          <Calendar size={32} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {announcements.map((a: any) => (
        <Card key={a.id}>
          <CardContent className="p-3">
            <p className="text-sm font-medium text-foreground">{a.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{a.content}</p>
            <p className="text-[10px] text-muted-foreground mt-2">
              {new Date(a.createdAt).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function GradebookView({ students }: { students: ClassroomStudent[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp size={16} className="text-primary" />
          Class Gradebook
        </CardTitle>
      </CardHeader>
      <CardContent>
        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No students in this class yet.</p>
        ) : (
          <div className="space-y-2">
            {students.sort((a, b) => b.avgMastery - a.avgMastery).map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg border">
                <span className="w-6 text-center text-sm font-bold text-muted-foreground">{i + 1}</span>
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">{s.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{s.stream}</span>
                </div>
                <Progress value={s.avgMastery} className="w-24 h-2" />
                <span className="text-sm font-semibold w-10 text-right">{s.avgMastery}%</span>
                <Badge variant="outline" className="text-xs">{s.assessmentsTaken} tests</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Component ─────────────────────────────────────────

export default function TeacherCommandCentre() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [students, setStudents] = useState<ClassroomStudent[]>([]);
  const [atRisk, setAtRisk] = useState<AtRiskStudent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewClass, setShowNewClass] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassSubjects, setNewClassSubjects] = useState<string[]>([]);

  useEffect(() => {
    loadClassrooms();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadClassStudents(selectedClass);
    }
  }, [selectedClass]);

  const loadClassrooms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ovi_classroom", {
        body: { action: "list_classrooms" },
      });
      if (error) throw error;
      setClassrooms(data.classrooms || []);
      if (data.classrooms?.length > 0) {
        setSelectedClass(data.classrooms[0].id);
      }
    } catch {
      // Fallback: try direct query
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from("teacher_classrooms")
            .select("*")
            .eq("teacher_id", user.id);
          if (data) {
            setClassrooms(data.map(c => ({
              id: c.id,
              name: c.name,
              subjectIds: c.subject_ids || [],
              studentCount: (c.student_ids || []).length,
              avgMastery: 0,
              createdAt: c.created_at,
            })));
          }
        }
      } catch { /* empty */ }
    } finally {
      setLoading(false);
    }
  };

  const loadClassStudents = async (classId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("ovi_classroom", {
        body: { action: "class_students", classroomId: classId },
      });
      if (error) throw error;
      setStudents(data.students || []);
      setAtRisk(data.atRisk || []);
    } catch {
      setStudents([]);
      setAtRisk([]);
    }
  };

  const createClassroom = async () => {
    if (!newClassName.trim()) return;
    try {
      const { data, error } = await supabase.functions.invoke("ovi_classroom", {
        body: {
          action: "create_classroom",
          name: newClassName,
          subjectIds: newClassSubjects,
        },
      });
      if (error) throw error;
      toast({ title: "Classroom Created", description: `${newClassName} is ready.` });
      setShowNewClass(false);
      setNewClassName("");
      setNewClassSubjects([]);
      loadClassrooms();
    } catch {
      toast({ title: "Error", description: "Failed to create classroom.", variant: "destructive" });
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Class-level analytics
  const classAvgMastery = students.length > 0
    ? Math.round(students.reduce((sum, s) => sum + s.avgMastery, 0) / students.length)
    : 0;

  const activeStudents = students.filter(
    (s) => s.lastActive && Date.now() - new Date(s.lastActive).getTime() < 7 * 24 * 60 * 60 * 1000
  ).length;

  // Aggregate weak topics across class
  const weakTopicCounts: Record<string, number> = {};
  students.forEach((s) => {
    s.weakTopics?.forEach((t) => {
      weakTopicCounts[t] = (weakTopicCounts[t] || 0) + 1;
    });
  });
  const topWeakTopics = Object.entries(weakTopicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <OviAvatar size="md" />
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">OVI CLASSROOM</h1>
              <p className="text-muted-foreground text-sm">Teacher Command Centre</p>
            </div>
          </div>
          <Dialog open={showNewClass} onOpenChange={setShowNewClass}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus size={16} /> New Classroom
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Classroom</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Classroom Name</Label>
                  <Input
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="e.g. Form 4 Science A"
                  />
                </div>
                <div>
                  <Label>Subjects (select multiple)</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.keys(SUBJECT_TOPICS).map((s) => (
                      <Badge
                        key={s}
                        variant={newClassSubjects.includes(s) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          setNewClassSubjects((prev) =>
                            prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                          );
                        }}
                      >
                        {SUBJECT_ICONS[s] || "📚"} {s}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button onClick={createClassroom} className="w-full">
                  Create Classroom
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Classroom Selector */}
        {classrooms.length > 0 && (
          <div className="flex items-center gap-4">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select classroom" />
              </SelectTrigger>
              <SelectContent>
                {classrooms.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.studentCount} students)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : classrooms.length === 0 ? (
          <Card className="py-20">
            <CardContent className="text-center">
              <GraduationCap size={48} className="text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold mb-2">No Classrooms Yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Create your first classroom to start tracking student progress.
              </p>
              <Button onClick={() => setShowNewClass(true)}>
                <Plus size={16} className="mr-2" /> Create Classroom
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="roster" className="space-y-4">
            <TabsList className="grid grid-cols-7 w-full">
              <TabsTrigger value="roster" className="gap-1 text-xs">
                <Users size={12} /> Roster
              </TabsTrigger>
              <TabsTrigger value="assignments" className="gap-1 text-xs">
                <FileText size={12} /> Assignments
              </TabsTrigger>
              <TabsTrigger value="exercises" className="gap-1 text-xs">
                <BookOpen size={12} /> Exercises
              </TabsTrigger>
              <TabsTrigger value="announcements" className="gap-1 text-xs">
                <Calendar size={12} /> Announcements
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1 text-xs">
                <BarChart3 size={12} /> Analytics
              </TabsTrigger>
              <TabsTrigger value="sentinel" className="gap-1 text-xs">
                <AlertTriangle size={12} /> Sentinel
              </TabsTrigger>
              <TabsTrigger value="gradebook" className="gap-1 text-xs">
                <TrendingUp size={12} /> Gradebook
              </TabsTrigger>
            </TabsList>

            {/* ── Roster Tab ── */}
            <TabsContent value="roster" className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Badge variant="outline">{filteredStudents.length} students</Badge>
              </div>

              <div className="grid gap-3">
                {filteredStudents.map((student) => (
                  <Card key={student.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{student.name}</span>
                          <Badge variant="outline" className="text-xs">{student.stream}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{student.email}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Mastery</span>
                          <Progress value={student.avgMastery} className="w-20 h-2" />
                          <span className="text-sm font-semibold">{student.avgMastery}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {student.assessmentsTaken} assessments taken
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* ── Class Analytics Tab ── */}
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-foreground">{students.length}</div>
                    <p className="text-xs text-muted-foreground">Total Students</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-foreground">{classAvgMastery}%</div>
                    <p className="text-xs text-muted-foreground">Class Avg Mastery</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-foreground">{activeStudents}</div>
                    <p className="text-xs text-muted-foreground">Active (7d)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-foreground">{atRisk.length}</div>
                    <p className="text-xs text-muted-foreground">At-Risk Students</p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Weak Topics */}
              {topWeakTopics.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingDown size={16} className="text-red-500" />
                      Class-Wide Weak Topics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {topWeakTopics.map(([topic, count]) => (
                        <div key={topic} className="flex items-center gap-3">
                          <span className="text-sm flex-1">{topic}</span>
                          <Badge variant="outline" className="text-xs">
                            {count} student{count !== 1 ? "s" : ""} struggling
                          </Badge>
                          <Progress
                            value={(count / students.length) * 100}
                            className="w-24 h-2"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Performance Distribution */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 size={16} className="text-primary" />
                    Performance Tiers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { label: "Excellent (80%+)", min: 80, color: "bg-green-500" },
                      { label: "Good (50-79%)", min: 50, color: "bg-blue-500" },
                      { label: "Needs Work (<50%)", min: 0, color: "bg-amber-500" },
                    ].map((tier) => {
                      const count = students.filter(
                        (s) =>
                          s.avgMastery >= tier.min &&
                          (tier.min === 80 ? true : s.avgMastery < (tier.min === 50 ? 80 : 50))
                      ).length;
                      return (
                        <div key={tier.label} className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${tier.color}`} />
                          <span className="text-sm flex-1">{tier.label}</span>
                          <span className="text-sm font-semibold">{count}</span>
                          <Progress
                            value={students.length > 0 ? (count / students.length) * 100 : 0}
                            className="w-24 h-2"
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Early Warning Sentinel Tab ── */}
            <TabsContent value="sentinel" className="space-y-4">
              {atRisk.length === 0 ? (
                <Card className="py-12">
                  <CardContent className="text-center">
                    <Shield size={48} className="text-green-500 mx-auto mb-4" />
                    <h3 className="font-display text-lg font-semibold mb-2">All Clear</h3>
                    <p className="text-muted-foreground text-sm">
                      No at-risk students detected in this classroom.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {atRisk.map((student) => (
                    <Card key={student.id} className="border-l-4 border-l-red-500/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{student.name}</span>
                              <Badge className={`${getRiskColor(student.riskScore)} border-0 text-xs`}>
                                {getRiskLabel(student.riskScore)} — {student.riskScore}%
                              </Badge>
                            </div>
                            <div className="mt-2 space-y-1">
                              {student.reasons.map((r, i) => (
                                <p key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <AlertTriangle size={10} className="text-amber-500 shrink-0" />
                                  {r}
                                </p>
                              ))}
                            </div>
                            {student.weakSubjects.length > 0 && (
                              <div className="flex gap-1.5 mt-2">
                                {student.weakSubjects.map((s) => (
                                  <Badge key={s} variant="outline" className="text-xs">
                                    {SUBJECT_ICONS[s] || "📚"} {s}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Assignments Tab ── */}
            <TabsContent value="assignments" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Assignments</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5">
                      <Plus size={14} /> Create Assignment
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Assignment</DialogTitle>
                    </DialogHeader>
                    <CreateAssignmentForm classroomId={selectedClass} onCreated={() => {}} />
                  </DialogContent>
                </Dialog>
              </div>
              <AssignmentList classroomId={selectedClass} />
            </TabsContent>

            {/* ── Exercises Tab ── */}
            <TabsContent value="exercises" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">In-Class Exercises</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5">
                      <Plus size={14} /> Start Exercise
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Start In-Class Exercise</DialogTitle>
                    </DialogHeader>
                    <CreateExerciseForm classroomId={selectedClass} onCreated={() => {}} />
                  </DialogContent>
                </Dialog>
              </div>
              <ExerciseList classroomId={selectedClass} />
            </TabsContent>

            {/* ── Announcements Tab ── */}
            <TabsContent value="announcements" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Announcements</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5">
                      <Plus size={14} /> Post Announcement
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Post Announcement</DialogTitle>
                    </DialogHeader>
                    <PostAnnouncementForm classroomId={selectedClass} onPosted={() => {}} />
                  </DialogContent>
                </Dialog>
              </div>
              <AnnouncementList classroomId={selectedClass} />
            </TabsContent>

            {/* ── Gradebook Tab ── */}
            <TabsContent value="gradebook" className="space-y-4">
              <GradebookView students={students} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
