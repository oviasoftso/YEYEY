import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, Users, BarChart3, Ban, CheckCircle, Loader2, Search, RefreshCw,
  Settings, GraduationCap, Database, Upload, Download, FileText, UserPlus,
  UserMinus, TrendingUp, Activity, PieChart
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import OviAvatar from "@/components/OviAvatar";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import mammoth from "mammoth";

// Admin access is enforced server-side via the is_admin() RPC and the user_roles table.

interface Student {
  id: string;
  email: string;
  displayName: string;
  stream: string;
  subjects: string[];
  assessmentCount: number;
  avgScore: number;
  avgMastery: number;
  isBlocked: boolean;
  createdAt: string;
  lastSignIn: string | null;
}

interface Stats {
  totalStudents: number;
  activeStudents: number;
  totalAssessments: number;
  blockedStudents: number;
  avgMastery: number;
}

const ZIMSEC_MODULES = [
  "Mathematics A", "Mathematics B", "English Language", "Ndebele", "Heritage Studies",
  "Combined Science", "Physics", "Chemistry", "Biology", "FRS",
  "Business Entrepreneurial Skills", "Principles of Accounting",
];

const AdminPage = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);
  const [studentQuota, setStudentQuota] = useState(150);
  const [enabledModules, setEnabledModules] = useState<Set<string>>(new Set(ZIMSEC_MODULES));
  const [importedNames, setImportedNames] = useState<string[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { checkAdmin(); }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }
    const { data: isAdminFlag, error } = await supabase.rpc("is_admin");
    if (error || !isAdminFlag) {
      navigate("/dashboard");
      return;
    }
    setIsAdmin(true);
    await Promise.all([fetchStudents(), fetchStats()]);
    setLoading(false);
  };

  const fetchStudents = async () => {
    const { data, error } = await supabase.functions.invoke("admin", { body: { action: "students" } });
    if (error) { toast({ title: "Error loading students", variant: "destructive" }); return; }
    setStudents(data?.students || []);
  };

  const fetchStats = async () => {
    const { data } = await supabase.functions.invoke("admin", { body: { action: "stats" } });
    if (data) setStats(data);
  };

  const toggleBlock = async (userId: string, block: boolean) => {
    setToggling(userId);
    const { error } = await supabase.functions.invoke("admin", { body: { action: "block", userId, block } });
    if (error) {
      toast({ title: "Failed to update", variant: "destructive" });
    } else {
      toast({ title: block ? "Student blocked" : "Student unblocked" });
      setStudents(prev => prev.map(s => s.id === userId ? { ...s, isBlocked: block } : s));
      if (stats) setStats({ ...stats, blockedStudents: stats.blockedStudents + (block ? 1 : -1) });
    }
    setToggling(null);
  };

  const refresh = async () => {
    setLoading(true);
    await Promise.all([fetchStudents(), fetchStats()]);
    setLoading(false);
  };

  const toggleModule = (mod: string) => {
    setEnabledModules(prev => {
      const next = new Set(prev);
      if (next.has(mod)) next.delete(mod); else next.add(mod);
      return next;
    });
    toast({ title: `${enabledModules.has(mod) ? "Disabled" : "Enabled"}: ${mod}` });
  };

  // === DOCX Import: Parse student names from uploaded DOCX ===
  const handleDocxImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;

      // Parse names: one per line, skip empty lines and headers
      const names = text
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 1 && !line.toLowerCase().includes("name") && !line.toLowerCase().includes("student") && !line.startsWith("#") && !line.startsWith("—"));

      setImportedNames(names);
      toast({ title: `📄 Imported ${names.length} names`, description: `From: ${file.name}` });
    } catch {
      toast({ title: "Import failed", description: "Could not read the DOCX file.", variant: "destructive" });
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Cross-check imported names against registered students
  const crossCheckNames = () => {
    const registered = students.map(s => s.displayName.toLowerCase());
    const matched: string[] = [];
    const unregistered: string[] = [];

    for (const name of importedNames) {
      if (registered.includes(name.toLowerCase())) {
        matched.push(name);
      } else {
        unregistered.push(name);
      }
    }
    return { matched, unregistered };
  };

  // Block students NOT on the imported class list
  const blockUnlisted = async () => {
    const importedLower = importedNames.map(n => n.toLowerCase());
    const toBlock = students.filter(s => !s.isBlocked && !importedLower.includes(s.displayName.toLowerCase()));

    for (const s of toBlock) {
      await toggleBlock(s.id, true);
    }
    toast({ title: `Blocked ${toBlock.length} unlisted students` });
  };

  // Unblock students ON the imported class list
  const unblockListed = async () => {
    const importedLower = importedNames.map(n => n.toLowerCase());
    const toUnblock = students.filter(s => s.isBlocked && importedLower.includes(s.displayName.toLowerCase()));

    for (const s of toUnblock) {
      await toggleBlock(s.id, false);
    }
    toast({ title: `Unblocked ${toUnblock.length} listed students` });
  };

  // === DOCX Export: Download student registry as DOCX ===
  const exportStudentsDOCX = async () => {
    try {
      const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
      const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

      const headerRow = new TableRow({
        children: ["Name", "Stream", "Avg Score", "Mastery", "Status"].map(h =>
          new TableCell({
            borders: cellBorders,
            width: { size: 1872, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20, font: "Calibri" })] })],
          })
        ),
      });

      const dataRows = filtered.map(s =>
        new TableRow({
          children: [
            s.displayName,
            s.stream,
            `${s.avgScore}%`,
            `${s.avgMastery}%`,
            s.isBlocked ? "BLOCKED" : "Active",
          ].map(val =>
            new TableCell({
              borders: cellBorders,
              width: { size: 1872, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: val, size: 20, font: "Calibri" })] })],
            })
          ),
        })
      );

      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun({ text: "OVIA PREP — Student Registry", bold: true, size: 32, font: "Calibri" })],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [new TextRun({ text: `Exported: ${new Date().toLocaleDateString()} | Total: ${filtered.length} students`, italics: true, size: 20, color: "666666", font: "Calibri" })],
              spacing: { after: 300 },
            }),
            new Table({
              width: { size: 9360, type: WidthType.DXA },
              columnWidths: [1872, 1872, 1872, 1872, 1872],
              rows: [headerRow, ...dataRows],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "\n© OVIA PREP O-LEVEL — Intellectual Property of Anesu T. Dzere.", italics: true, size: 18, color: "999999", font: "Calibri" })],
              spacing: { before: 600 },
            }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `OVIA_Student_Registry_${new Date().toISOString().slice(0, 10)}.docx`);
      toast({ title: "📄 Exported!", description: "Student registry downloaded as DOCX." });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const filtered = students.filter(s =>
    s.displayName.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.stream?.toLowerCase().includes(search.toLowerCase())
  );

  // Analytics derived data
  const streamDistribution = students.reduce<Record<string, number>>((acc, s) => {
    const stream = s.stream || "Unknown";
    acc[stream] = (acc[stream] || 0) + 1;
    return acc;
  }, {});

  const subjectPopularity = students.reduce<Record<string, number>>((acc, s) => {
    for (const subj of s.subjects) {
      acc[subj] = (acc[subj] || 0) + 1;
    }
    return acc;
  }, {});

  const topSubjects = Object.entries(subjectPopularity).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const activeRate = stats ? Math.round((stats.activeStudents / Math.max(stats.totalStudents, 1)) * 100) : 0;
  const blockedRate = stats ? Math.round((stats.blockedStudents / Math.max(stats.totalStudents, 1)) * 100) : 0;

  const { matched: matchedNames, unregistered: unregisteredNames } = importedNames.length > 0
    ? crossCheckNames()
    : { matched: [], unregistered: [] };

  if (!isAdmin) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="text-primary" size={24} />
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Director's Suite</h1>
              <p className="text-xs text-muted-foreground">OVIA Prep · Waterfalls Academy · Anesu T. Dzere</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refresh} className="gap-1"><RefreshCw size={14} /> Refresh</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>Back to App</Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: "Total Students", value: stats.totalStudents, icon: Users, color: "text-primary" },
              { label: "Active (7d)", value: stats.activeStudents, icon: CheckCircle, color: "text-green-500" },
              { label: "Assessments", value: stats.totalAssessments, icon: BarChart3, color: "text-blue-500" },
              { label: "Blocked", value: stats.blockedStudents, icon: Ban, color: "text-destructive" },
              { label: "Avg Mastery", value: `${stats.avgMastery}%`, icon: Shield, color: "text-accent" },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                <Card><CardContent className="p-4 text-center">
                  <s.icon className={`mx-auto mb-2 ${s.color}`} size={20} />
                  <div className="text-2xl font-bold text-foreground">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </CardContent></Card>
              </motion.div>
            ))}
          </div>
        )}

        <Tabs defaultValue="students">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="students" className="gap-1"><Users size={14} /> Students</TabsTrigger>
            <TabsTrigger value="import" className="gap-1"><Upload size={14} /> Import</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1"><PieChart size={14} /> Analytics</TabsTrigger>
            <TabsTrigger value="quota" className="gap-1"><Settings size={14} /> Quota</TabsTrigger>
            <TabsTrigger value="syllabus" className="gap-1"><GraduationCap size={14} /> Syllabus</TabsTrigger>
          </TabsList>

          {/* Students Tab */}
          <TabsContent value="students" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center gap-2"><Users size={18} /> Student Registry</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                      <Input placeholder="Search name, email, stream..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
                    </div>
                    <Button variant="outline" size="sm" onClick={exportStudentsDOCX} className="gap-1">
                      <Download size={14} /> Export DOCX
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filtered.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {students.length === 0 ? "No students registered yet." : "No students match your search."}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filtered.map((student) => (
                      <motion.div
                        key={student.id}
                        className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${student.isBlocked ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"}`}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      >
                        <OviAvatar size="sm" animate={false} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground text-sm">{student.displayName}</span>
                            <Badge variant="outline" className="text-xs">{student.stream}</Badge>
                            {student.isBlocked && <Badge variant="destructive" className="text-xs">Blocked</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{student.email}</div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>{student.assessmentCount} assessments</span>
                            <span>Avg: {student.avgScore}%</span>
                            <span>Mastery: {student.avgMastery}%</span>
                            {student.lastSignIn && <span>Last seen: {new Date(student.lastSignIn).toLocaleDateString()}</span>}
                          </div>
                          {student.subjects.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {student.subjects.map(s => <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">{s}</Badge>)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right mr-2 hidden sm:block">
                            <div className="text-xs text-muted-foreground mb-1">Mastery</div>
                            <Progress value={student.avgMastery} className="h-2 w-20" />
                          </div>
                          <Button
                            variant={student.isBlocked ? "outline" : "destructive"}
                            size="sm"
                            disabled={toggling === student.id}
                            onClick={() => toggleBlock(student.id, !student.isBlocked)}
                            className="gap-1"
                          >
                            {toggling === student.id ? <Loader2 className="animate-spin" size={14} /> : student.isBlocked ? <><CheckCircle size={14} /> Unblock</> : <><Ban size={14} /> Block</>}
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-4 border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Database size={18} className="text-primary mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Cloud Sync — User Isolation</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      All student data is isolated by unique authentication ID (UUID), not by display name.
                      Two students with the same name on the same device will never see each other's data.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Import / Export Tab */}
          <TabsContent value="import" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Upload size={18} /> Student Class List — DOCX Import</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload a DOCX file containing student names (one per line). The system will cross-check
                  against registered students to identify verified and unregistered identities.
                </p>

                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx"
                    onChange={handleDocxImport}
                    className="hidden"
                  />
                  <Button onClick={() => fileInputRef.current?.click()} disabled={importLoading} className="gap-1">
                    {importLoading ? <Loader2 className="animate-spin" size={14} /> : <FileText size={14} />}
                    Upload Class List (.docx)
                  </Button>
                  <Button variant="outline" onClick={exportStudentsDOCX} className="gap-1">
                    <Download size={14} /> Export Current Registry
                  </Button>
                </div>

                {importedNames.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="p-4 rounded-lg border border-border bg-muted/30">
                      <h4 className="text-sm font-semibold text-foreground mb-2">
                        📋 Imported {importedNames.length} names from class list
                      </h4>

                      <div className="grid sm:grid-cols-2 gap-4">
                        {/* Matched / Verified */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                            <CheckCircle size={14} />
                            Verified ({matchedNames.length})
                          </div>
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {matchedNames.map((n, i) => (
                              <div key={i} className="text-xs p-1.5 rounded bg-green-500/10 text-green-700 dark:text-green-400">{n}</div>
                            ))}
                            {matchedNames.length === 0 && <p className="text-xs text-muted-foreground">No matches found</p>}
                          </div>
                        </div>

                        {/* Unregistered */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-orange-600">
                            <UserPlus size={14} />
                            Not Registered ({unregisteredNames.length})
                          </div>
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {unregisteredNames.map((n, i) => (
                              <div key={i} className="text-xs p-1.5 rounded bg-orange-500/10 text-orange-700 dark:text-orange-400">{n}</div>
                            ))}
                            {unregisteredNames.length === 0 && <p className="text-xs text-muted-foreground">All students are registered!</p>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3">
                      <Button variant="destructive" size="sm" onClick={blockUnlisted} className="gap-1">
                        <UserMinus size={14} /> Block Unlisted Students
                      </Button>
                      <Button variant="outline" size="sm" onClick={unblockListed} className="gap-1">
                        <CheckCircle size={14} /> Unblock Listed Students
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      <strong>Block Unlisted:</strong> Students not on the uploaded class list will be suspended.
                      <br />
                      <strong>Unblock Listed:</strong> Students on the class list who are currently blocked will be reinstated.
                    </p>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-4 space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Activity className="mx-auto mb-2 text-primary" size={20} />
                  <div className="text-2xl font-bold text-foreground">{activeRate}%</div>
                  <div className="text-xs text-muted-foreground">Active Rate (7 days)</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="mx-auto mb-2 text-green-500" size={20} />
                  <div className="text-2xl font-bold text-foreground">{stats?.avgMastery ?? 0}%</div>
                  <div className="text-xs text-muted-foreground">Platform Avg Mastery</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Ban className="mx-auto mb-2 text-destructive" size={20} />
                  <div className="text-2xl font-bold text-foreground">{blockedRate}%</div>
                  <div className="text-xs text-muted-foreground">Blocked Rate</div>
                </CardContent>
              </Card>
            </div>

            {/* Stream Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><PieChart size={16} /> Stream Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(streamDistribution).map(([stream, count]) => (
                    <div key={stream} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground w-32 truncate">{stream}</span>
                      <div className="flex-1">
                        <Progress value={(count / Math.max(students.length, 1)) * 100} className="h-3" />
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right">{count}</span>
                    </div>
                  ))}
                  {Object.keys(streamDistribution).length === 0 && (
                    <p className="text-sm text-muted-foreground">No stream data yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Subject Popularity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><BarChart3 size={16} /> Most Popular Subjects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topSubjects.map(([subj, count]) => (
                    <div key={subj} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground w-48 truncate">{subj}</span>
                      <div className="flex-1">
                        <Progress value={(count / Math.max(students.length, 1)) * 100} className="h-3" />
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right">{count}</span>
                    </div>
                  ))}
                  {topSubjects.length === 0 && (
                    <p className="text-sm text-muted-foreground">No subject data yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Performance tiers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><TrendingUp size={16} /> Student Performance Tiers</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const excellent = students.filter(s => s.avgMastery >= 80).length;
                  const good = students.filter(s => s.avgMastery >= 50 && s.avgMastery < 80).length;
                  const needsWork = students.filter(s => s.avgMastery > 0 && s.avgMastery < 50).length;
                  const noData = students.filter(s => s.avgMastery === 0).length;
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div className="text-xl font-bold text-green-600">{excellent}</div>
                        <div className="text-xs text-muted-foreground">Excellent (80%+)</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <div className="text-xl font-bold text-blue-600">{good}</div>
                        <div className="text-xs text-muted-foreground">Good (50-79%)</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                        <div className="text-xl font-bold text-orange-600">{needsWork}</div>
                        <div className="text-xs text-muted-foreground">Needs Work (&lt;50%)</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50 border border-border">
                        <div className="text-xl font-bold text-muted-foreground">{noData}</div>
                        <div className="text-xs text-muted-foreground">No Data</div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quota Controller Tab */}
          <TabsContent value="quota" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings size={18} /> Institutional Quota Controller</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <h3 className="font-semibold text-foreground">Student Quota Limit</h3>
                    <p className="text-xs text-muted-foreground">Maximum students per institutional license</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      value={studentQuota}
                      onChange={e => setStudentQuota(Number(e.target.value))}
                      className="w-24 text-center"
                      min={1}
                    />
                    <Button size="sm" onClick={() => toast({ title: "Quota updated", description: `Set to ${studentQuota} students.` })}>
                      Apply
                    </Button>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Usage</span>
                    <span className="text-sm text-muted-foreground">{stats?.totalStudents ?? 0} / {studentQuota}</span>
                  </div>
                  <Progress value={((stats?.totalStudents ?? 0) / studentQuota) * 100} className="h-3" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {studentQuota - (stats?.totalStudents ?? 0)} slots remaining
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <h4 className="text-sm font-semibold text-foreground mb-1">Registration Policy</h4>
                  <p className="text-xs text-muted-foreground">
                    Students attempting to register beyond the quota will be shown:
                    <em className="text-foreground"> "Registration is currently closed. Please contact your school administration formally to request access."</em>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Syllabus Aligner Tab */}
          <TabsContent value="syllabus" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><GraduationCap size={18} /> ZIMSEC Syllabus Module Aligner</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Toggle modules on/off to align with the specific syllabus being followed at your institution.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ZIMSEC_MODULES.map(mod => (
                    <div key={mod} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <Label htmlFor={mod} className="text-sm font-medium cursor-pointer">{mod}</Label>
                      <Switch
                        id={mod}
                        checked={enabledModules.has(mod)}
                        onCheckedChange={() => toggleModule(mod)}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  {enabledModules.size} of {ZIMSEC_MODULES.length} modules active
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPage;
