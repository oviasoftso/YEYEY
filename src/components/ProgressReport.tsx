/**
 * OVI Progress Report Generator
 * Generates a printable progress report for parents.
 */
import { useMemo } from "react";
import { FileText, Download, TrendingUp, TrendingDown, Minus, Award, Brain, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { store } from "@/lib/store";
import { SUBJECT_ICONS } from "@/lib/constants";
import { getLevelInfo } from "@/lib/gamification";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";

export default function ProgressReport() {
  const profile = store.getProfile();
  const mastery = store.getMastery();
  const assessments = store.getAssessments();
  const xpData = store.getXPData();
  const streak = store.getStreak();
  const flashcards = store.getFlashcards();
  const levelInfo = getLevelInfo(xpData.level);

  const subjectStats = useMemo(() => {
    if (!profile) return [];
    return profile.subjects.map((subject) => {
      const subjectMastery = mastery.filter((m) => m.subject === subject);
      const subjectAssessments = assessments.filter((a) => a.subject === subject);
      const avgMastery = subjectMastery.length > 0
        ? Math.round(subjectMastery.reduce((s, m) => s + m.mastery, 0) / subjectMastery.length)
        : 0;
      const avgScore = subjectAssessments.length > 0
        ? Math.round(subjectAssessments.reduce((s, a) => s + a.percentage, 0) / subjectAssessments.length)
        : 0;
      const weakTopics = subjectMastery.filter((m) => m.mastery < 40).map((m) => m.topic);
      const trend = subjectAssessments.length >= 2
        ? subjectAssessments[subjectAssessments.length - 1].percentage > subjectAssessments[subjectAssessments.length - 2].percentage
          ? "improving" : "declining"
        : "stable";

      return { subject, avgMastery, avgScore, assessments: subjectAssessments.length, weakTopics, trend };
    });
  }, [profile, mastery, assessments]);

  const overallAvg = assessments.length > 0
    ? Math.round(assessments.reduce((s, a) => s + a.percentage, 0) / assessments.length)
    : 0;

  const downloadReport = async () => {
    if (!profile) return;

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "OVIA PREP — Student Progress Report", bold: true, size: 32 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, size: 20, color: "666666" })],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: "Student Information", bold: true })],
          }),
          new Paragraph({ children: [new TextRun({ text: `Name: ${profile.name}`, size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: `Stream: ${profile.stream}`, size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: `Subjects: ${profile.subjects.join(", ")}`, size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: `Level: ${xpData.level} (${levelInfo.name}) — ${xpData.totalXP} XP`, size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: `Current Streak: ${streak.current_streak} days | Longest: ${streak.longest_streak} days`, size: 22 })] }),
          new Paragraph({ text: "" }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: "Overall Performance", bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: `Overall Mastery: ${Math.round(mastery.reduce((s, m) => s + m.mastery, 0) / (mastery.length || 1))}%`, size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: `Average Assessment Score: ${overallAvg}%`, size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: `Total Assessments: ${assessments.length}`, size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: `Flashcards Created: ${flashcards.length}`, size: 22 })] }),
          new Paragraph({ text: "" }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: "Subject Breakdown", bold: true })] }),
          ...subjectStats.flatMap((s) => [
            new Paragraph({
              children: [
                new TextRun({ text: `${s.subject}: `, bold: true, size: 22 }),
                new TextRun({ text: `Mastery ${s.avgMastery}% | Avg Score ${s.avgScore}% | ${s.assessments} assessments | Trend: ${s.trend}`, size: 22 }),
              ],
            }),
            ...(s.weakTopics.length > 0
              ? [new Paragraph({ children: [new TextRun({ text: `  Weak areas: ${s.weakTopics.join(", ")}`, size: 20, color: "CC0000" })] })]
              : []),
          ]),
          new Paragraph({ text: "" }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: "Recommendations", bold: true })] }),
          ...subjectStats
            .filter((s) => s.avgMastery < 50 || s.weakTopics.length > 0)
            .flatMap((s) => [
              new Paragraph({
                children: [new TextRun({
                  text: `${s.subject}: Focus on ${s.weakTopics.length > 0 ? s.weakTopics.join(", ") : "overall mastery"}. ${s.trend === "declining" ? "Scores are declining — more practice needed." : "Keep working on weak areas."}`,
                  size: 22,
                })],
              }),
            ]),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "Generated by OVIA Prep — Waterfalls Academy", size: 18, color: "999999", italics: true })],
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `OVIA_Report_${profile.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.docx`);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText size={16} className="text-primary" />
            Progress Report
          </span>
          <Button variant="outline" size="sm" onClick={downloadReport} className="gap-1.5 text-xs">
            <Download size={14} /> Download DOCX
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {subjectStats.slice(0, 4).map((s) => (
            <div key={s.subject} className="flex items-center gap-3">
              <span className="text-sm">{SUBJECT_ICONS[s.subject] || "📚"}</span>
              <span className="text-xs text-foreground flex-1 truncate">{s.subject}</span>
              <Progress value={s.avgMastery} className="h-1.5 w-20" />
              <span className="text-xs text-muted-foreground w-8 text-right">{s.avgMastery}%</span>
              {s.trend === "improving" && <TrendingUp size={12} className="text-green-500" />}
              {s.trend === "declining" && <TrendingDown size={12} className="text-red-500" />}
              {s.trend === "stable" && <Minus size={12} className="text-muted-foreground" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
