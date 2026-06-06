/**
 * OVI Mistake Journal — Auto-collected wrong answers for review.
 * Students can review mistakes, make flashcards, and retry questions.
 */
import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Brain, CheckCircle2, XCircle, AlertTriangle, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AppLayout from "@/components/AppLayout";
import OviAvatar from "@/components/OviAvatar";
import LatexText from "@/components/LatexText";
import { store } from "@/lib/store";
import { SUBJECT_ICONS } from "@/lib/constants";
import { StudentProfile, MistakeEntry } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

const MistakeJournalPage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [mistakes, setMistakes] = useState<MistakeEntry[]>([]);
  const [filterSubject, setFilterSubject] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const p = store.getProfile();
    if (!p) { navigate("/"); return; }
    setProfile(p);
    setMistakes(store.getMistakes());
  }, [navigate]);

  // Stats — must be before any early returns (rules-of-hooks)
  const topicCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    mistakes.forEach((m) => {
      const key = `${m.subject}: ${m.topic}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [mistakes]);

  if (!profile) return null;

  const filtered = filterSubject === "all"
    ? mistakes
    : mistakes.filter((m) => m.subject === filterSubject);

  const subjects = [...new Set(mistakes.map((m) => m.subject))];
  const unreviewed = mistakes.filter((m) => !m.reviewed).length;

  const makeFlashcard = (mistake: MistakeEntry) => {
    store.addFlashcard({
      id: crypto.randomUUID(),
      subject: mistake.subject,
      topic: mistake.topic,
      question: mistake.question,
      answer: mistake.correctAnswer,
      difficulty: 5,
      stability: 1,
      retrievability: 1,
      last_review: null,
      next_review: null,
      review_count: 0,
    });
    toast({ title: "Flashcard Created", description: `Added to ${mistake.subject} — ${mistake.topic}` });
  };

  const markReviewed = (id: string) => {
    store.markMistakeReviewed(id);
    setMistakes(store.getMistakes());
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <OviAvatar size="md" />
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Mistake Journal</h1>
              <p className="text-muted-foreground text-sm">
                {mistakes.length} mistakes collected · {unreviewed} to review
              </p>
            </div>
          </div>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Filter by subject" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s} value={s}>{SUBJECT_ICONS[s]} {s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        {topicCounts.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                Most Common Mistakes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topicCounts.map(([topic, count]) => (
                  <div key={topic} className="flex items-center gap-3">
                    <span className="text-sm text-foreground flex-1">{topic}</span>
                    <Badge variant="destructive" className="text-xs">{count} mistake{count !== 1 ? "s" : ""}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mistake list */}
        {filtered.length === 0 ? (
          <Card className="py-16">
            <CardContent className="text-center">
              <CheckCircle2 size={48} className="mx-auto mb-4 text-success" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                {mistakes.length === 0 ? "No Mistakes Yet" : "No Mistakes in This Subject"}
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                {mistakes.length === 0
                  ? "Complete an assessment to start collecting mistakes. Every wrong answer gets saved here for review."
                  : "Try selecting a different subject filter."}
              </p>
              {mistakes.length === 0 && (
                <Link to="/assessment">
                  <Button className="gap-2">
                    Start an Assessment <ArrowRight size={14} />
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((mistake) => (
              <Card key={mistake.id} className={`${!mistake.reviewed ? "border-amber-500/30" : ""}`}>
                <CardContent className="p-4">
                  <div
                    className="cursor-pointer"
                    onClick={() => setExpandedId(expandedId === mistake.id ? null : mistake.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {SUBJECT_ICONS[mistake.subject]} {mistake.subject}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">{mistake.topic}</Badge>
                          {!mistake.reviewed && (
                            <Badge variant="destructive" className="text-xs">New</Badge>
                          )}
                        </div>
                        <LatexText className="text-sm">{mistake.question}</LatexText>
                      </div>
                      <XCircle size={18} className="text-destructive shrink-0 mt-1" />
                    </div>
                  </div>

                  {expandedId === mistake.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-4 space-y-3"
                    >
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="bg-destructive/5 rounded-lg p-3">
                          <strong className="text-xs uppercase tracking-wide text-destructive">Your Answer:</strong>
                          <LatexText className="mt-1 text-sm">{mistake.studentAnswer || "Not answered"}</LatexText>
                        </div>
                        <div className="bg-success/5 rounded-lg p-3">
                          <strong className="text-xs uppercase tracking-wide text-success">Correct Answer:</strong>
                          <LatexText className="mt-1 text-sm">{mistake.correctAnswer}</LatexText>
                        </div>
                      </div>

                      {mistake.explanation && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <strong className="text-xs uppercase tracking-wide">Explanation:</strong>
                          <LatexText className="mt-1 text-sm">{mistake.explanation}</LatexText>
                        </div>
                      )}

                      {mistake.improvementAdvice && (
                        <div className="bg-primary/5 rounded-lg p-3">
                          <strong className="text-xs uppercase tracking-wide text-primary">How to Improve:</strong>
                          <LatexText className="mt-1 text-sm">{mistake.improvementAdvice}</LatexText>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => makeFlashcard(mistake)}
                          className="gap-1.5"
                        >
                          <Brain size={14} /> Make Flashcard
                        </Button>
                        {!mistake.reviewed && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markReviewed(mistake.id)}
                            className="gap-1.5"
                          >
                            <CheckCircle2 size={14} /> Mark Reviewed
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default MistakeJournalPage;
