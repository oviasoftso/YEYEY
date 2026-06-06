import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus, ChevronLeft, ChevronRight, Lightbulb, BookOpen, Trash2,
  Shuffle, RotateCcw, Check, Zap, Star, Flame, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import OviAvatar from "@/components/OviAvatar";
import LatexText from "@/components/LatexText";
import { store } from "@/lib/store";
import { SUBJECT_ICONS } from "@/lib/constants";
import { Flashcard, StudentProfile, StreakData } from "@/lib/types";
import {
  isDue, getCurrentState, getDueCards, daysUntilDanger, getForgettingCurve,
  updateStreak, type EaseRating
} from "@/lib/fsrs";

const FlashcardsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [filterSubject, setFilterSubject] = useState("all");
  const [showDueOnly, setShowDueOnly] = useState(false);
  const [streak, setStreak] = useState<StreakData>({ currentStreak: 0, longestStreak: 0, lastReviewDate: null, achievements: [] });
  const [showStats, setShowStats] = useState(false);

  // Response time tracking
  const flipTimeRef = useRef<number>(0);

  // Manual creation
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const p = store.getProfile();
    if (!p) { navigate("/"); return; }
    setProfile(p);
    setFlashcards(store.getFlashcards());
    setStreak(store.getStreak());
  }, [navigate]);

  // Track when card is flipped to measure response time
  const handleFlip = useCallback(() => {
    if (!flipped) {
      flipTimeRef.current = Date.now();
    }
    setFlipped(!flipped);
  }, [flipped]);

  if (!profile) return null;

  // Filter cards
  let filtered = filterSubject === "all"
    ? flashcards
    : flashcards.filter((f) => f.subject === filterSubject);

  if (showDueOnly) {
    filtered = filtered.filter(isDue);
  }

  const dueCards = getDueCards(flashcards);
  const dueCount = dueCards.length;
  const current = filtered[currentIdx];

  // FSRS-6 rating handler
  const rateCard = async (rating: EaseRating) => {
    if (!current) return;

    const responseTimeMs = flipTimeRef.current > 0 ? Date.now() - flipTimeRef.current : undefined;
    const updated = await store.reviewFlashcard(current.id, rating, responseTimeMs);

    if (updated) {
      // Award XP for review
      store.addXP(10, "flashcard_review");

      // Update streak
      const newStreak = updateStreak(streak, new Date());
      await store.setStreak(newStreak);
      setStreak(newStreak);

      // Check for new achievements
      if (newStreak.achievements.length > streak.achievements.length) {
        const newBadge = newStreak.achievements.find(a => !streak.achievements.includes(a));
        if (newBadge) {
          const days = newBadge.replace("streak_", "");
          toast({
            title: `${days}-Day Streak`,
            description: `Consistent effort pays off. Keep going.`,
          });
        }
      }
    }

    const allCards = store.getFlashcards();
    setFlashcards(allCards);

    const labels: Record<EaseRating, string> = { again: "Again", hard: "Hard", good: "Good", easy: "Easy" };
    const icons: Record<EaseRating, string> = { again: "Again", hard: "Hard", good: "Good", easy: "Easy" };
    const nextDays = updated ? daysUntilDanger(updated.stability) : 0;

    toast({
      title: `${icons[rating]} ${labels[rating]}`,
      description: rating === "again"
        ? "Reviewing again shortly"
        : `Next review in ~${nextDays} day${nextDays !== 1 ? "s" : ""}`,
    });

    // Move to next card
    setFlipped(false);
    flipTimeRef.current = 0;
    const newFiltered = filterSubject === "all" ? allCards : allCards.filter(f => f.subject === filterSubject);
    const filtered2 = showDueOnly ? newFiltered.filter(isDue) : newFiltered;
    if (currentIdx >= filtered2.length) {
      setCurrentIdx(Math.max(0, filtered2.length - 1));
    }
  };

  const addManual = async () => {
    if (!newFront.trim() || !newBack.trim() || !newSubject) return;
    const card = store.createFSRSCard(newSubject, "Custom", newFront, newBack);
    await store.addFlashcard(card);
    setFlashcards(store.getFlashcards());
    setNewFront("");
    setNewBack("");
    setNewSubject("");
    setDialogOpen(false);
    toast({ title: "Card Added", description: "Your flashcard has been created with FSRS-6 scheduling." });
  };

  const deleteCard = async () => {
    if (!current) return;
    await store.deleteFlashcard(current.id);
    const updated = store.getFlashcards();
    setFlashcards(updated);
    setCurrentIdx((i) => Math.max(0, Math.min(i, updated.length - 1)));
    setFlipped(false);
    toast({ title: "Card Deleted", description: "Flashcard removed." });
  };

  const shuffleCards = () => {
    setCurrentIdx(Math.floor(Math.random() * filtered.length));
    setFlipped(false);
  };

  const next = () => { setFlipped(false); setCurrentIdx((i) => Math.min(i + 1, filtered.length - 1)); };
  const prev = () => { setFlipped(false); setCurrentIdx((i) => Math.max(i - 1, 0)); };

  const parseBack = (back: string) => {
    const parts = back.split(/\n\n/);
    return { answer: parts[0] || back, tip: parts[1] || null };
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

  // FSRS-6 status label
  const getCardStatus = (card: Flashcard): { label: string; color: string } => {
    if (!card.lastReviewedAt) return { label: "New", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" };
    const state = getCurrentState(card);
    if (state.retrievability <= 0.5) return { label: "Critical", color: "bg-red-500/10 text-red-600 dark:text-red-400" };
    if (state.retrievability <= 0.7) return { label: "Due", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" };
    if (state.retrievability <= 0.9) return { label: "Reviewing", color: "bg-green-500/10 text-green-600 dark:text-green-400" };
    return { label: "Strong", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" };
  };

  // FSRS-6 stats for current card
  const getCardStats = (card: Flashcard) => {
    const state = getCurrentState(card);
    return {
      difficulty: Math.round(state.difficulty * 10) / 10,
      stability: Math.round(state.stability * 10) / 10,
      retrievability: Math.round(state.retrievability * 100),
      dangerDays: daysUntilDanger(state.stability),
    };
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <OviAvatar size="md" />
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">OVI PULSE</h1>
              <p className="text-muted-foreground text-sm">
                {dueCount > 0 ? (
                  <span className="text-warning font-medium">{dueCount} card{dueCount !== 1 ? "s" : ""} due for review</span>
                ) : (
                  <span>{filtered.length} {filtered.length === 1 ? "card" : "cards"} — all caught up!</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            {/* Streak display */}
            {streak.currentStreak > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="ghost" className="gap-1.5 text-orange-500 hover:text-orange-600">
                      <Flame size={16} className={streak.currentStreak > 5 ? "animate-pulse" : ""} />
                      <span className="font-bold">{streak.currentStreak}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {streak.currentStreak}-day streak
                      {streak.longestStreak > streak.currentStreak && ` (best: ${streak.longestStreak})`}
                      {streak.currentStreak > 5 && " — +10% bonus intervals!"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

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

        {/* Filters & Stats toggle */}
        <div className="flex gap-3 items-center">
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
          <Button
            size="sm"
            variant={showStats ? "default" : "ghost"}
            onClick={() => setShowStats(!showStats)}
            className="gap-1 ml-auto"
          >
            <TrendingUp size={14} /> Stats
          </Button>
        </div>

        {/* FSRS-6 Stats panel */}
        {showStats && current && (
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Difficulty</p>
                  <p className="text-lg font-bold text-foreground">{getCardStats(current).difficulty}</p>
                  <p className="text-[10px] text-muted-foreground">/ 10</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Stability</p>
                  <p className="text-lg font-bold text-foreground">{getCardStats(current).stability}</p>
                  <p className="text-[10px] text-muted-foreground">days</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Retention</p>
                  <p className={`text-lg font-bold ${
                    getCardStats(current).retrievability >= 90 ? "text-green-500" :
                    getCardStats(current).retrievability >= 70 ? "text-amber-500" : "text-red-500"
                  }`}>{getCardStats(current).retrievability}%</p>
                  <p className="text-[10px] text-muted-foreground">recall probability</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Danger Zone</p>
                  <p className={`text-lg font-bold ${
                    getCardStats(current).dangerDays > 7 ? "text-green-500" :
                    getCardStats(current).dangerDays > 3 ? "text-amber-500" : "text-red-500"
                  }`}>{getCardStats(current).dangerDays}d</p>
                  <p className="text-[10px] text-muted-foreground">until &lt;70% retention</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
              onClick={handleFlip}
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
                  <div className="absolute top-0 left-0 right-0 h-1 bg-primary/40" />
                  <CardContent className="p-6 flex flex-col h-full min-h-[300px]">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="outline" className={subjectColor(current?.subject || "")}>
                        {SUBJECT_ICONS[current?.subject || ""] || ""} {current?.subject}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">{current?.topic}</span>
                        {current && (
                          <Badge variant="secondary" className={`text-[10px] ${getCardStatus(current).color}`}>
                            {getCardStatus(current).label}
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
                  <div className="absolute top-0 left-0 right-0 h-1 bg-success/40" />
                  <CardContent className="p-6 flex flex-col h-full min-h-[300px]">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                        Answer
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

                    {/* FSRS-6 Rating Buttons */}
                    <div className="pt-3 border-t border-border mt-2">
                      <p className="text-xs text-muted-foreground text-center mb-2">How well did you recall this?</p>
                      <div className="grid grid-cols-4 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                          onClick={(e) => { e.stopPropagation(); rateCard("again"); }}
                        >
                          <RotateCcw size={12} className="mr-1" /> Again
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs border-warning/30 text-warning hover:bg-warning/10"
                          onClick={(e) => { e.stopPropagation(); rateCard("hard"); }}
                        >
                          Hard
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/10"
                          onClick={(e) => { e.stopPropagation(); rateCard("good"); }}
                        >
                          <Check size={12} className="mr-1" /> Good
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs border-primary/30 text-primary hover:bg-primary/10"
                          onClick={(e) => { e.stopPropagation(); rateCard("easy"); }}
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
                {filtered.map((card, i) => {
                  const status = getCardStatus(card);
                  return (
                    <button
                      key={card.id}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i === currentIdx
                          ? "bg-primary scale-125"
                          : status.label === "Critical" ? "bg-red-400/60" :
                            status.label === "Due" ? "bg-amber-400/60" :
                            "bg-muted-foreground/20 hover:bg-muted-foreground/40"
                      }`}
                      onClick={() => { setCurrentIdx(i); setFlipped(false); }}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default FlashcardsPage;
