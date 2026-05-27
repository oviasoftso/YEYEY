import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ArrowLeft, Users, Lightbulb, HelpCircle, Sparkles, Loader2, RefreshCw, Save, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AppLayout from "@/components/AppLayout";
import OviAvatar from "@/components/OviAvatar";
import LatexText from "@/components/LatexText";
import { SET_BOOKS, SetBook } from "@/lib/set-books";
import { store } from "@/lib/store";
import { SUBJECT_TOPICS } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { RevisionNote, StudentProfile } from "@/lib/types";

const StudyGuides = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [selectedBook, setSelectedBook] = useState<SetBook | null>(null);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [weakConcepts, setWeakConcepts] = useState<string[]>([]);

  useEffect(() => {
    const p = store.getProfile();
    if (!p) { navigate("/"); return; }
    setProfile(p);
  }, [navigate]);

  // Recompute weak concepts whenever subject/topic changes.
  useEffect(() => {
    if (!subject) { setWeakConcepts([]); return; }
    const assessments = store.getAssessments();
    const mastery = store.getMastery();
    const weakFromAssess = assessments
      .filter((a) => a.subject === subject && (!topic || a.topic === topic))
      .flatMap((a) => a.weakConcepts || []);
    const weakFromMastery = mastery
      .filter((m) => m.subject === subject && m.mastery < 50 && (!topic || m.topic === topic))
      .map((m) => m.topic);
    setWeakConcepts([...new Set([...weakFromAssess, ...weakFromMastery])]);
  }, [subject, topic]);

  if (!profile) return null;

  const subjects = profile.subjects || [];
  const topics = subject ? (SUBJECT_TOPICS[subject] || []) : [];
  const isArts = profile.stream === "arts";

  const generateAdaptive = async () => {
    if (!subject || !topic) {
      toast({ title: "Pick a subject and topic first.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setContent("");
    try {
      const assessments = store.getAssessments()
        .filter((a) => a.subject === subject)
        .slice(-5)
        .map((a) => ({ subject: a.subject, topic: a.topic, percentage: a.percentage }));

      const { data, error } = await supabase.functions.invoke("generate-notes", {
        body: {
          subject,
          topic,
          weakConcepts: weakConcepts.length > 0 ? weakConcepts : undefined,
          assessmentHistory: assessments.length > 0 ? assessments : undefined,
        },
      });
      if (error) throw error;
      setContent(data.content || "");
    } catch (e) {
      console.error(e);
      toast({ title: "Could not generate guide", description: "Please try again in a moment.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveGuide = async () => {
    if (!content) return;
    const note: RevisionNote = {
      id: crypto.randomUUID(),
      subject,
      topic: `${topic} (Adaptive)`,
      content,
      createdAt: new Date().toISOString(),
    };
    await store.addNote(note);
    toast({ title: "Saved to your notes ☁️" });
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <OviAvatar size="md" mood="explaining" />
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Adaptive Study Guides</h1>
            <p className="text-muted-foreground">Targeted revision shaped by your weak areas{isArts ? " — plus Literature set books" : ""}.</p>
          </div>
        </div>

        {/* Adaptive generator (all streams) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target size={18} /> Personalised revision
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Select value={subject} onValueChange={(v) => { setSubject(v); setTopic(""); setContent(""); }}>
                <SelectTrigger><SelectValue placeholder="Pick a subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={topic} onValueChange={(v) => { setTopic(v); setContent(""); }} disabled={!subject}>
                <SelectTrigger><SelectValue placeholder="Pick a topic" /></SelectTrigger>
                <SelectContent>
                  {topics.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {weakConcepts.length > 0 && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="text-xs font-semibold text-foreground mb-1">Targeting your weak areas:</div>
                <div className="flex flex-wrap gap-1.5">
                  {weakConcepts.slice(0, 6).map((w, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{w}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={generateAdaptive} disabled={!subject || !topic || loading} className="gap-2">
                {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                {content ? "Refresh based on latest performance" : "Generate adaptive guide"}
              </Button>
              {content && (
                <Button variant="outline" onClick={saveGuide} className="gap-2">
                  <Save size={16} /> Save to notes
                </Button>
              )}
            </div>

            {content && (
              <div className="rounded-lg border border-border bg-card/50 p-4">
                <LatexText>{content}</LatexText>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Set books — arts students only */}
        {isArts && (
          <AnimatePresence mode="wait">
            {!selectedBook ? (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                  <BookOpen size={18} /> Literature Set Books
                </h2>
                <div className="grid gap-4">
                  {SET_BOOKS.map((book) => (
                    <motion.div key={book.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                      <Card className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setSelectedBook(book)}>
                        <CardContent className="p-5 flex items-center gap-4">
                          <span className="text-5xl">{book.cover}</span>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-display text-lg font-bold text-foreground">{book.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2">by {book.author}</p>
                            <p className="text-sm text-foreground/80 line-clamp-2">{book.synopsis}</p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {book.themes.slice(0, 3).map((t, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">{t.split("—")[0].trim()}</Badge>
                              ))}
                              {book.themes.length > 3 && (
                                <Badge variant="outline" className="text-xs">+{book.themes.length - 3} more</Badge>
                              )}
                            </div>
                          </div>
                          <BookOpen className="text-muted-foreground shrink-0" size={20} />
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => setSelectedBook(null)} className="gap-2">
                  <ArrowLeft size={16} /> Back to all guides
                </Button>

                <div className="flex items-center gap-4">
                  <span className="text-6xl">{selectedBook.cover}</span>
                  <div>
                    <h2 className="font-display text-2xl font-bold text-foreground">{selectedBook.title}</h2>
                    <p className="text-muted-foreground">by {selectedBook.author}</p>
                  </div>
                </div>

                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BookOpen size={18} /> Synopsis</CardTitle></CardHeader>
                  <CardContent><p className="text-foreground/90 leading-relaxed">{selectedBook.synopsis}</p></CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles size={18} /> Key Themes</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {selectedBook.themes.map((theme, i) => {
                      const [title, desc] = theme.split("—");
                      return (
                        <div key={i} className="flex gap-3 items-start">
                          <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                          <div>
                            <span className="font-semibold text-foreground">{title.trim()}</span>
                            {desc && <span className="text-muted-foreground"> — {desc.trim()}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users size={18} /> Key Characters</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {selectedBook.characters.map((char, i) => (
                      <div key={i} className="border border-border rounded-lg p-3">
                        <span className="font-semibold text-foreground">{char.name}</span>
                        <p className="text-sm text-muted-foreground mt-0.5">{char.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Lightbulb size={18} /> Study Points</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {selectedBook.studyPoints.map((point, i) => (
                        <li key={i} className="flex gap-2 items-start text-sm">
                          <span className="text-primary shrink-0">✦</span>
                          <span className="text-foreground/90">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-base"><HelpCircle size={18} /> Sample Exam Questions</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {selectedBook.sampleQuestions.map((q, i) => (
                      <div key={i} className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm text-foreground font-medium">Q{i + 1}. {q}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </AppLayout>
  );
};

export default StudyGuides;
