import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, ChevronLeft, ChevronRight, Lightbulb, BookOpen, Trash2, Shuffle, RotateCcw, Check, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import OviAvatar from "@/components/OviAvatar";
import LatexText from "@/components/LatexText";
import { store } from "@/lib/store";
import { SUBJECT_ICONS } from "@/lib/constants";
import { Flashcard, StudentProfile } from "@/lib/types";

// SM-2 Spaced Repetition Algorithm
const sm2 = (card: Flashcard, quality: number): Partial<Flashcard> => {
  // quality: 0=Again, 1=Hard, 2=Good, 3=Easy
  let { easeFactor, repetitions, interval } = card;

  if (quality < 2) {
    // Failed — reset
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 3;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  }

  // Update ease factor (minimum 1.3)
  easeFactor = Math.max(1.3, easeFactor + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02)));

  const nextReview = new Date(Date.now() + interval * 24 * 60 * 60 * 1000).toISOString();

  return { easeFactor, repetitions, interval, nextReview };
};

const FlashcardsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [filterSubject, setFilterSubject] = useState("all");
  const [showDueOnly, setShowDueOnly] = useState(false);

  // manual creation
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const p = store.getProfile();
    if (!p) { navigate("/"); return; }
    setProfile(p);
    setFlashcards(store.getFlashcards());
  }, [navigate]);

  if (!profile) return null;

  const now = new Date().toISOString();
  let filtered = filterSubject === "all"
    ? flashcards
    : flashcards.filter((f) => f.subject === filterSubject);

  if (showDueOnly) {
    filtered = filtered.filter((f) => f.nextReview <= now);
  }

  const dueCount = flashcards.filter(f => f.nextReview <= now).length;
  const current = filtered[currentIdx];

  const rateCard = async (quality: number) => {
    if (!current) return;
    const updates = sm2(current, quality);
    const updated: Flashcard = { ...current, ...updates };
    await store.updateFlashcard(updated);
    const allCards = store.getFlashcards();
    setFlashcards(allCards);

    const labels = ["Again", "Hard", "Good", "Easy"];
    toast({ 
      title: `${["🔄", "💪", "✅", "⭐"][quality]} ${labels[quality]}`, 
      description: `Next review: ${quality < 2 ? "tomorrow" : `in ${updated.interval} day${updated.interval > 1 ? "s" : ""}`}` 
    });

    // Move to next card
    setFlipped(false);
    const newFiltered = filterSubject === "all" ? allCards : allCards.filter(f => f.subject === filterSubject);
    const filtered2 = showDueOnly ? newFiltered.filter(f => f.nextReview <= now) : newFiltered;
    if (currentIdx >= filtered2.length) {
      setCurrentIdx(Math.max(0, filtered2.length - 1));
    }
  };

  const addManual = async () => {
    if (!newFront.trim() || !newBack.trim() || !newSubject) return;
    const card: Flashcard = {
      id: crypto.randomUUID(),
      subject: newSubject,
      topic: "Custom",
      front: newFront,
      back: newBack,
      nextReview: new Date().toISOString(),
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
    };
    await store.addFlashcard(card);
    setFlashcards(store.getFlashcards());
    setNewFront("");
    setNewBack("");
    setNewSubject("");
    setDialogOpen(false);
    toast({ title: "✅ Card Added", description: "Your flashcard has been created." });
  };

  const deleteCard = async () => {
    if (!current) return;
    await store.deleteFlashcard(current.id);
    const updated = store.getFlashcards();
    setFlashcards(updated);
    setCurrentIdx((i) => Math.max(0, Math.min(i, updated.length - 1)));
    setFlipped(false);
    toast({ title: "🗑️ Card Deleted", description: "Flashcard removed." });
  };

  const shuffleCards = () => {
    setCurrentIdx(Math.floor(Math.random() * filtered.length));
    setFlipped(false);
  };

  const next = () => { setFlipped(false); setCurrentIdx((i) => Math.min(i + 1, filtered.length - 1)); };
  const prev = () => { setFlipped(false); setCurrentIdx((i) => Math.max(i - 1, 0)); };

  const parseBack = (back: string) => {
    const parts = back.split(/\n\n📖\s*/);
    const answer = parts[0] || back;
    const tip = parts[1] || null;
    return { answer, tip };
  };

  const subjectColor = (subject: string) => {
    const colors: Record<string, string> = {
      Mathematics: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      Physics: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
      Chemistry: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
      Biology: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      English: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      Accounting: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    };
    return colors[subject] || "bg-primary/10 text-primary border-primary/20";
  };

  const getIntervalLabel = (card: Flashcard) => {
    if (card.repetitions === 0) return "New";
    const daysUntil = Math.ceil((new Date(card.nextReview).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 0) return "Due now";
    if (daysUntil === 1) return "Due tomorrow";
    return `Due in ${daysUntil}d`;
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <OviAvatar size="md" />
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Smart Flashcards</h1>
              <p className="text-muted-foreground text-sm">
                {dueCount > 0 ? (
                  <span className="text-warning font-medium">{dueCount} card{dueCount !== 1 ? "s" : ""} due for review</span>
                ) : (
                  <span>{filtered.length} {filtered.length === 1 ? "card" : "cards"} — all caught up! 🎉</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {filtered.length > 1 && (
              <Button size="sm" variant="ghost" onClick={shuffleCards} className="gap-1">
                <Shuffle size={16} /> Shuffle
              </Button>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1"><Plus size={16} /> Add Card</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Flashcard</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Select value={newSubject} onValueChange={setNewSubject}>
                    <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                    <SelectContent>
                      {profile.subjects.map((s) => (
                        <SelectItem key={s} value={s}>{SUBJECT_ICONS[s]} {s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Question (front of card)" value={newFront} onChange={(e) => setNewFront(e.target.value)} />
                  <Textarea placeholder="Answer (back of card)" rows={4} value={newBack} onChange={(e) => setNewBack(e.target.value)} />
                  <Button onClick={addManual} className="w-full">Add Flashcard</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <Select value={filterSubject} onValueChange={(v) => { setFilterSubject(v); setCurrentIdx(0); setFlipped(false); }}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {profile.subjects.map((s) => (
                <SelectItem key={s} value={s}>{SUBJECT_ICONS[s]} {s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            size="sm" 
            variant={showDueOnly ? "default" : "outline"}
            onClick={() => { setShowDueOnly(!showDueOnly); setCurrentIdx(0); setFlipped(false); }}
            className="gap-1"
          >
            <Zap size={14} /> Due Only {dueCount > 0 && `(${dueCount})`}
          </Button>
        </div>

        {filtered.length === 0 ? (
          <Card className="py-16 border-dashed">
            <CardContent className="text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <BookOpen size={28} className="text-muted-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                {showDueOnly ? "No Cards Due!" : "No Flashcards Yet"}
              </h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                {showDueOnly 
                  ? "You're all caught up! Check back later for due reviews."
                  : "Complete assessments to auto-generate flashcards from questions you got wrong, or create your own!"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Flashcard */}
            <div
              className="cursor-pointer select-none"
              onClick={() => setFlipped(!flipped)}
              style={{ perspective: "1200px" }}
            >
              <motion.div
                className="relative w-full"
                style={{ transformStyle: "preserve-3d" }}
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                {/* Front */}
                <Card
                  className="min-h-[300px] border-2 overflow-hidden"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-primary/20" />
                  <CardContent className="p-6 flex flex-col h-full min-h-[300px]">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="outline" className={subjectColor(current?.subject || "")}>
                        {SUBJECT_ICONS[current?.subject || ""] || "📚"} {current?.subject}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">{current?.topic}</span>
                        {current && (
                          <Badge variant="secondary" className="text-[10px]">
                            {getIntervalLabel(current)}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 flex items-center justify-center py-4">
                      <div className="text-center max-w-lg">
                        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                          Question
                        </div>
                        <LatexText className="text-base leading-relaxed text-foreground">
                          {current?.front || ""}
                        </LatexText>
                      </div>
                    </div>

                    <div className="text-center">
                      <span className="text-xs text-muted-foreground/60 italic">Tap to reveal answer</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Back */}
                <Card
                  className="min-h-[300px] border-2 border-primary/30 overflow-hidden absolute inset-0"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 via-green-400 to-emerald-400" />
                  <CardContent className="p-6 flex flex-col h-full min-h-[300px]">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                        ✅ Answer
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); deleteCard(); }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto py-2">
                      <LatexText className="text-sm leading-relaxed text-foreground">
                        {current ? parseBack(current.back).answer : ""}
                      </LatexText>

                      {current && parseBack(current.back).tip && (
                        <div className="mt-4 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                          <div className="flex items-start gap-2">
                            <Lightbulb size={16} className="text-amber-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
                                Remember This!
                              </p>
                              <LatexText className="text-xs text-amber-700 dark:text-amber-300">
                                {parseBack(current.back).tip || ""}
                              </LatexText>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SM-2 Rating Buttons */}
                    <div className="pt-3 border-t border-border mt-2">
                      <p className="text-xs text-muted-foreground text-center mb-2">How well did you know this?</p>
                      <div className="grid grid-cols-4 gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                          onClick={(e) => { e.stopPropagation(); rateCard(0); }}
                        >
                          <RotateCcw size={12} className="mr-1" /> Again
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-xs border-warning/30 text-warning hover:bg-warning/10"
                          onClick={(e) => { e.stopPropagation(); rateCard(1); }}
                        >
                          💪 Hard
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-xs border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/10"
                          onClick={(e) => { e.stopPropagation(); rateCard(2); }}
                        >
                          <Check size={12} className="mr-1" /> Good
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-xs border-primary/30 text-primary hover:bg-primary/10"
                          onClick={(e) => { e.stopPropagation(); rateCard(3); }}
                        >
                          <Star size={12} className="mr-1" /> Easy
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={prev} disabled={currentIdx === 0} className="gap-1">
                <ChevronLeft size={16} /> Prev
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {currentIdx + 1}
                </span>
                <span className="text-sm text-muted-foreground">of {filtered.length}</span>
              </div>
              <Button variant="outline" size="sm" onClick={next} disabled={currentIdx >= filtered.length - 1} className="gap-1">
                Next <ChevronRight size={16} />
              </Button>
            </div>

            {/* Progress dots */}
            {filtered.length <= 20 && (
              <div className="flex justify-center gap-1.5 flex-wrap">
                {filtered.map((_, i) => (
                  <button
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === currentIdx
                        ? "bg-primary scale-125"
                        : "bg-muted-foreground/20 hover:bg-muted-foreground/40"
                    }`}
                    onClick={() => { setCurrentIdx(i); setFlipped(false); }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default FlashcardsPage;
