import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Save, FileText, Target, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/AppLayout";
import OviAvatar from "@/components/OviAvatar";
import LatexText from "@/components/LatexText";
import { store } from "@/lib/store";
import { SUBJECT_TOPICS, SUBJECT_ICONS } from "@/lib/constants";
import { StudentProfile, RevisionNote } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";

const NotesPage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [savedNotes, setSavedNotes] = useState<RevisionNote[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [weakConcepts, setWeakConcepts] = useState<string[]>([]);

  useEffect(() => {
    const p = store.getProfile();
    if (!p) { navigate("/"); return; }
    setProfile(p);
    setSavedNotes(store.getNotes());
  }, [navigate]);

  useEffect(() => {
    if (!selectedSubject) return;
    const assessments = store.getAssessments();
    const relevant = assessments.filter(a =>
      a.subject === selectedSubject &&
      (!selectedTopic || a.topic === selectedTopic)
    );
    const allWeak = relevant.flatMap(a => a.weakConcepts || []);
    setWeakConcepts([...new Set(allWeak)]);
  }, [selectedSubject, selectedTopic]);

  if (!profile) return null;
  const topics = selectedSubject ? (SUBJECT_TOPICS[selectedSubject] || []) : [];

  const generate = async () => {
    setLoading(true);
    setGeneratedContent("");
    try {
      const assessments = store.getAssessments();
      const relevantAssessments = assessments
        .filter(a => a.subject === selectedSubject)
        .slice(-5)
        .map(a => ({ subject: a.subject, topic: a.topic, percentage: a.percentage }));

      const { data, error } = await supabase.functions.invoke("generate-notes", {
        body: {
          subject: selectedSubject,
          topic: selectedTopic,
          weakConcepts: weakConcepts.length > 0 ? weakConcepts : undefined,
          assessmentHistory: relevantAssessments.length > 0 ? relevantAssessments : undefined,
        },
      });
      if (error) throw error;
      setGeneratedContent(data.content);
    } catch {
      toast({ title: "Error", description: "Failed to generate notes.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveNote = async () => {
    const note: RevisionNote = {
      id: crypto.randomUUID(),
      subject: selectedSubject,
      topic: selectedTopic,
      content: generatedContent,
      createdAt: new Date().toISOString(),
    };
    await store.addNote(note);
    setSavedNotes(store.getNotes());
    toast({ title: "Saved to cloud! ☁️", description: "Notes synced — available on any device." });
  };

  // Download as DOCX file
  const downloadAsDocx = async (subject: string, topic: string, content: string) => {
    try {
      // Parse content into paragraphs, stripping markdown-style formatting
      const lines = content.split("\n").filter(l => l.trim());
      const children: Paragraph[] = [];

      // Title
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: `${subject} — ${topic}`, bold: true, size: 32, font: "Calibri" })],
        spacing: { after: 200 },
      }));

      // Subtitle
      children.push(new Paragraph({
        children: [new TextRun({ text: `OVIA PREP O-LEVEL | Generated: ${new Date().toLocaleDateString()}`, italics: true, size: 20, color: "666666", font: "Calibri" })],
        spacing: { after: 400 },
      }));

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("### ")) {
          children.push(new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun({ text: trimmed.replace(/^### /, ""), bold: true, size: 24, font: "Calibri" })],
            spacing: { before: 200, after: 100 },
          }));
        } else if (trimmed.startsWith("## ")) {
          children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: trimmed.replace(/^## /, ""), bold: true, size: 28, font: "Calibri" })],
            spacing: { before: 300, after: 150 },
          }));
        } else if (trimmed.startsWith("# ")) {
          children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: trimmed.replace(/^# /, ""), bold: true, size: 32, font: "Calibri" })],
            spacing: { before: 300, after: 150 },
          }));
        } else if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
          const bulletText = trimmed.replace(/^[-•]\s*/, "");
          // Handle bold markers within bullet text
          const parts = bulletText.split(/\*\*(.*?)\*\*/g);
          const runs: TextRun[] = parts.map((part, i) =>
            new TextRun({ text: part, bold: i % 2 === 1, size: 22, font: "Calibri" })
          );
          children.push(new Paragraph({
            children: [new TextRun({ text: "•  ", size: 22, font: "Calibri" }), ...runs],
            indent: { left: 720 },
            spacing: { after: 80 },
          }));
        } else {
          // Regular paragraph — handle **bold** markers
          const parts = trimmed.split(/\*\*(.*?)\*\*/g);
          const runs: TextRun[] = parts.map((part, i) =>
            new TextRun({ text: part, bold: i % 2 === 1, size: 22, font: "Calibri" })
          );
          children.push(new Paragraph({
            children: runs,
            spacing: { after: 120 },
          }));
        }
      }

      // Footer
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "\n© OVIA PREP O-LEVEL — Intellectual Property of Anesu T. Dzere. All rights reserved.", italics: true, size: 18, color: "999999", font: "Calibri" })],
        spacing: { before: 600 },
      }));

      const doc = new Document({
        sections: [{ children }],
      });

      const blob = await Packer.toBlob(doc);
      const filename = `OVIA_${subject.replace(/\s+/g, "_")}_${topic.replace(/\s+/g, "_")}.docx`;
      saveAs(blob, filename);
      toast({ title: "📄 Downloaded!", description: `${filename} saved to your device.` });
    } catch (err) {
      console.error("DOCX error:", err);
      toast({ title: "Error", description: "Failed to create document.", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <OviAvatar size="md" />
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Revision Notes</h1>
            <p className="text-muted-foreground text-sm">Data-driven notes tailored to your weak areas from assessments</p>
          </div>
        </div>

        <Tabs defaultValue="generate">
          <TabsList>
            <TabsTrigger value="generate">Generate Notes</TabsTrigger>
            <TabsTrigger value="saved">Cloud Notes ({savedNotes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Select value={selectedSubject} onValueChange={(v) => { setSelectedSubject(v); setSelectedTopic(""); }}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      {profile.subjects.map((s) => (
                        <SelectItem key={s} value={s}>{SUBJECT_ICONS[s]} {s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {topics.length > 0 && (
                    <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                      <SelectTrigger><SelectValue placeholder="Select topic" /></SelectTrigger>
                      <SelectContent>
                        {topics.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {weakConcepts.length > 0 && (
                  <div className="bg-warning/5 border border-warning/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-warning text-sm font-medium mb-2">
                      <Target size={16} />
                      OVI detected {weakConcepts.length} weak area{weakConcepts.length > 1 ? "s" : ""} from your assessments
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {weakConcepts.slice(0, 8).map((c) => (
                        <Badge key={c} variant="outline" className="text-xs border-warning/30 text-warning bg-warning/5">
                          {c}
                        </Badge>
                      ))}
                      {weakConcepts.length > 8 && (
                        <Badge variant="outline" className="text-xs">+{weakConcepts.length - 8} more</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Notes will be specifically tailored to address these gaps.
                    </p>
                  </div>
                )}

                <Button onClick={generate} disabled={!selectedSubject || !selectedTopic || loading} className="w-full">
                  {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <FileText size={18} className="mr-2" />}
                  {weakConcepts.length > 0 ? "Generate Targeted Notes" : "Generate Notes"}
                </Button>
              </CardContent>
            </Card>

            {generatedContent && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{selectedSubject} — {selectedTopic}</CardTitle>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => downloadAsDocx(selectedSubject, selectedTopic, generatedContent)} className="gap-1">
                        <Download size={14} /> Save DOCX
                      </Button>
                      <Button size="sm" onClick={saveNote} className="gap-1"><Save size={14} /> Save to Cloud</Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <LatexText>{generatedContent}</LatexText>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="saved" className="space-y-4 mt-4">
            {savedNotes.length === 0 ? (
              <Card className="py-12"><CardContent className="text-center text-muted-foreground">No cloud notes yet. Generate some from your assessments!</CardContent></Card>
            ) : (
              savedNotes.map((n) => (
                <Card key={n.id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{SUBJECT_ICONS[n.subject]} {n.subject} — {n.topic}</CardTitle>
                      <p className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => downloadAsDocx(n.subject, n.topic, n.content)} className="gap-1">
                      <Download size={14} /> DOCX
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <LatexText>{n.content}</LatexText>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default NotesPage;
