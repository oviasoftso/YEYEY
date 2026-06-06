import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Loader2, AlertCircle, BookOpen, HelpCircle, Calendar, FileText, X } from "lucide-react";
import "katex/dist/katex.min.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AppLayout from "@/components/AppLayout";
import OviAvatar from "@/components/OviAvatar";
import OviVoice from "@/components/OviVoice";
import SlideMessage from "@/components/SlideMessage";
import { store } from "@/lib/store";
import { ChatMessage, StudentProfile, NeglectionFlag, TopicMastery } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { SUBJECT_TOPICS, SUBJECT_ICONS } from "@/lib/constants";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const CHAT_HISTORY_KEY = "ovi_chat_history";
const MAX_HISTORY_EXCHANGES = 5; // last 5 user+assistant pairs = 10 messages

/** Load saved chat history from localStorage */
function loadChatHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.slice(-MAX_HISTORY_EXCHANGES * 2);
  } catch { /* ignore corrupt data */ }
  return [];
}

/** Save chat history to localStorage */
function saveChatHistory(messages: ChatMessage[]) {
  try {
    // Keep only the last N exchanges (pairs of user+assistant)
    const recent = messages.slice(-MAX_HISTORY_EXCHANGES * 2);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(recent));
  } catch { /* quota exceeded, silently fail */ }
}

/** Get mastery label and color for a mastery percentage */
function getMasteryInfo(mastery: number): { label: string; color: string } {
  if (mastery >= 80) return { label: "Excellent", color: "bg-green-500" };
  if (mastery >= 60) return { label: "Good", color: "bg-blue-500" };
  if (mastery >= 40) return { label: "Developing", color: "bg-yellow-500" };
  return { label: "Needs Work", color: "bg-red-500" };
}

/** Find topics not revised in 7+ days */
function findStaleTopics(mastery: TopicMastery[], profileSubjects: string[]): TopicMastery[] {
  const now = Date.now();
  const stale: { entry: TopicMastery; days: number }[] = [];

  for (const m of mastery) {
    if (!profileSubjects.includes(m.subject)) continue;
    if (!m.lastRevised) {
      stale.push({ entry: m, days: 999 });
      continue;
    }
    const daysSince = Math.floor((now - new Date(m.lastRevised).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince >= 7) {
      stale.push({ entry: m, days: daysSince });
    }
  }

  // Sort by most days since revision first, return top 3
  stale.sort((a, b) => b.days - a.days);
  return stale.slice(0, 3).map((s) => ({
    ...s.entry,
    // Encode days into mastery temporarily for display; restore below
    lastRevised: String(s.days),
  }));
}

const StudyChat = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Topic Selector state ──
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");

  // ── Revision Nudge state ──
  const [staleTopics, setStaleTopics] = useState<TopicMastery[]>([]);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  // ── Derived topic list for selected subject ──
  const availableTopics = useMemo(() => {
    if (!selectedSubject) return [];
    return SUBJECT_TOPICS[selectedSubject] || [];
  }, [selectedSubject]);

  // ── Mastery for selected topic ──
  const selectedTopicMastery = useMemo(() => {
    if (!profile || !selectedSubject || !selectedTopic) return null;
    const allMastery = store.getMastery();
    const entry = allMastery.find(
      (m) => m.subject === selectedSubject && m.topic === selectedTopic
    );
    return entry ?? null;
  }, [profile, selectedSubject, selectedTopic, messages.length]); // re-eval after messages change

  useEffect(() => {
    const p = store.getProfile();
    if (!p) {
      navigate("/");
      return;
    }
    setProfile(p);

    // Load conversation history from localStorage
    const history = loadChatHistory();
    if (history.length > 0) {
      setMessages(history);
    } else {
      setMessages([
        {
          role: "assistant",
          content: `Hi ${p.name}! I'm **OVI MIND**, your AI tutor.\n\nSelect a subject and topic above, then ask me anything. I can explain concepts, quiz you, or help with exam technique.\n\n> Pick a topic to get started, or just type a question!`,
        },
      ]);
    }

    // Set default subject from profile
    if (p.subjects.length > 0) {
      setSelectedSubject(p.subjects[0]);
    }

    // Find stale topics for revision nudge
    const mastery = store.getMastery();
    const stale = findStaleTopics(mastery, p.subjects);
    setStaleTopics(stale);
  }, [navigate]);

  // Save messages to localStorage whenever they change (after initial load)
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      return;
    }
    if (messages.length > 1) {
      saveChatHistory(messages);
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset topic when subject changes
  useEffect(() => {
    setSelectedTopic("");
  }, [selectedSubject]);

  // Compute OVI context from store data
  const oviContext = useMemo(() => {
    if (!profile) return null;
    const mastery = store.getMastery();
    const masteryScores: Record<string, number> = {};
    const weakTopics: string[] = [];
    for (const m of mastery) {
      masteryScores[`${m.subject}: ${m.topic}`] = m.mastery;
      if (m.mastery < 50) weakTopics.push(`${m.topic} (${m.subject})`);
    }
    // Detect neglection (7+ days inactive)
    const neglectionFlags: NeglectionFlag[] = [];
    const subjectLastReview = new Map<string, number>();
    for (const m of mastery) {
      const existing = subjectLastReview.get(m.subject) || Infinity;
      subjectLastReview.set(
        m.subject,
        Math.min(existing, new Date(m.lastRevised).getTime())
      );
    }
    for (const [subject, lastTime] of subjectLastReview) {
      const daysInactive = Math.floor(
        (Date.now() - lastTime) / (1000 * 60 * 60 * 24)
      );
      if (daysInactive >= 7) {
        const subjectEntries = mastery.filter((m) => m.subject === subject);
        const avgMastery =
          subjectEntries.reduce((s, m) => s + m.mastery, 0) /
          Math.max(1, subjectEntries.length);
        neglectionFlags.push({
          subject,
          daysInactive,
          mastery: Math.round(avgMastery),
        });
      }
    }
    return {
      masteryScores,
      weakTopics: weakTopics.slice(0, 5),
      neglectionFlags,
      languagePref: profile.languagePref || "en",
    };
  }, [profile]);

  // Build context-enriched message payload
  const buildPayload = useCallback(
    (msgs: ChatMessage[]) => {
      let contextPrefix = "";
      if (selectedSubject) {
        contextPrefix = `[Subject: ${selectedSubject}`;
        if (selectedTopic) contextPrefix += `, Topic: ${selectedTopic}`;
        contextPrefix += "] ";
      }

      // Prepend context to the last user message only
      const enriched = msgs.map((m, i) => {
        if (m.role === "user" && i === msgs.length - 1 && contextPrefix) {
          return { role: m.role, content: contextPrefix + m.content };
        }
        return { role: m.role, content: m.content };
      });

      return {
        messages: enriched,
        studentName: profile?.name,
        subjects: profile?.subjects,
        languagePref: oviContext?.languagePref || "en",
        masteryScores: oviContext?.masteryScores || {},
        weakTopics: oviContext?.weakTopics || [],
        neglectionFlags: oviContext?.neglectionFlags || [],
      };
    },
    [profile, selectedSubject, selectedTopic, oviContext]
  );

  const send = async (overrideInput?: string) => {
    const text = overrideInput ?? input;
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > newMsgs.length) {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [
          ...prev.slice(0, newMsgs.length),
          { role: "assistant", content: assistantSoFar },
        ];
      });
    };

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Session expired",
          description: "Please log in again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(buildPayload(newMsgs)),
      });

      if (resp.status === 429) {
        toast({
          title: "Rate Limited",
          description: "Too many requests. Please wait a moment.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      if (resp.status === 402) {
        toast({
          title: "Credits Exhausted",
          description: "AI credits have run out.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      if (!resp.ok || !resp.body) throw new Error("Stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nlIdx: number;
        while ((nlIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nlIdx);
          buffer = buffer.slice(nlIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      upsertAssistant("Sorry, I had trouble connecting. Please try again!");
    } finally {
      setLoading(false);
    }
  };

  // ── Quick action handlers ──
  const quickActions = useMemo(() => {
    const topicLabel = selectedTopic || selectedSubject || "your subjects";
    return [
      {
        icon: BookOpen,
        label: "Explain this topic",
        message: `Explain ${topicLabel} in simple terms with examples I can relate to`,
      },
      {
        icon: HelpCircle,
        label: "Quiz me",
        message: `Give me 3 quick questions on ${topicLabel} to test my understanding`,
      },
      {
        icon: Calendar,
        label: "Study plan",
        message:
          "What should I study this week based on my weak areas?",
      },
      {
        icon: FileText,
        label: "Mark scheme",
        message: `What do ZIMSEC examiners look for in ${topicLabel} answers? Give me key marking points.`,
      },
    ];
  }, [selectedSubject, selectedTopic]);

  // ── Handle revision nudge click ──
  const handleNudgeQuiz = (topic: TopicMastery) => {
    setSelectedSubject(topic.subject);
    setSelectedTopic(topic.topic);
    setNudgeDismissed(true);
    // Auto-send quiz request
    setTimeout(() => {
      send(`Give me 3 quick questions on ${topic.topic} (${topic.subject}) to test my understanding`);
    }, 100);
  };

  if (!profile) return null;

  const masteryInfo = selectedTopicMastery
    ? getMasteryInfo(selectedTopicMastery.mastery)
    : null;

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-64px)] lg:h-screen">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
          <OviAvatar size="sm" mood={loading ? "thinking" : "idle"} />
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-foreground">OVI MIND</h1>
            <p className="text-xs text-muted-foreground">
              {loading
                ? "OVI is thinking..."
                : "Your AI tutor -- ask anything about your subjects"}
            </p>
          </div>
        </div>

        {/* Topic Selector + Mastery Indicator */}
        <div className="px-4 py-3 border-b border-border bg-card/50 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground shrink-0">
              Topic:
            </span>
            <Select
              value={selectedSubject}
              onValueChange={setSelectedSubject}
            >
              <SelectTrigger className="h-8 w-auto min-w-[140px] max-w-[200px] text-xs">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {profile.subjects.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {SUBJECT_ICONS[s] || ""} {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {availableTopics.length > 0 && (
              <Select
                value={selectedTopic}
                onValueChange={setSelectedTopic}
              >
                <SelectTrigger className="h-8 w-auto min-w-[140px] max-w-[220px] text-xs">
                  <SelectValue placeholder="Select topic" />
                </SelectTrigger>
                <SelectContent>
                  {availableTopics.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Difficulty Indicator */}
            {selectedTopic && masteryInfo && (
              <Badge
                variant="secondary"
                className="text-[10px] gap-1 px-2 py-0.5"
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full ${masteryInfo.color}`}
                />
                {selectedTopic}: {selectedTopicMastery!.mastery}% -- {masteryInfo.label}
              </Badge>
            )}

            {selectedTopic && !masteryInfo && (
              <Badge
                variant="outline"
                className="text-[10px] gap-1 px-2 py-0.5"
              >
                {selectedTopic}: No data yet
              </Badge>
            )}
          </div>
        </div>

        {/* Proactive Revision Nudge */}
        {staleTopics.length > 0 && !nudgeDismissed && (
          <div className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={18} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Time for a revision refresh?
                </p>
                <div className="mt-1.5 space-y-1.5">
                  {staleTopics.map((t, i) => {
                    const days = Number(t.lastRevised);
                    return (
                      <div key={i} className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-amber-700 dark:text-amber-300">
                          You haven't reviewed <strong>{t.topic}</strong> ({t.subject}) in {days === 999 ? "a long time" : `${days} days`}.
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] px-2 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900"
                          onClick={() => handleNudgeQuiz(t)}
                        >
                          Quiz me
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={() => setNudgeDismissed(true)}
                className="text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-200 shrink-0"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-3 ${m.role === "user" ? "justify-end" : "items-start"}`}
            >
              {m.role === "assistant" && (
                <div className="shrink-0 mt-1">
                  <OviAvatar size="sm" animate={false} />
                </div>
              )}
              {m.role === "user" ? (
                <div className="max-w-[75%] bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
                  <p className="text-sm leading-relaxed">{m.content}</p>
                </div>
              ) : (
                <div className="max-w-[85%] bg-card border border-border rounded-2xl rounded-bl-md px-5 py-4 shadow-sm">
                  <SlideMessage
                    content={m.content}
                    isStreaming={loading && i === messages.length - 1}
                  />
                  {!loading && m.content && (
                    <div className="mt-2 flex justify-end">
                      <OviVoice text={m.content.replace(/[#*_`~\[\]]/g, "").slice(0, 3000)} size="sm" />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3 items-start">
              <div className="shrink-0 mt-1">
                <OviAvatar size="sm" mood="thinking" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-bl-md px-5 py-4 shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="animate-spin" size={16} />
                  <span>OVI is thinking...</span>
                </div>
                <div className="flex gap-1 mt-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-primary/40 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input + Quick Actions */}
        <div className="p-4 border-t border-border bg-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                selectedTopic
                  ? `Ask about ${selectedTopic}...`
                  : selectedSubject
                    ? `Ask about ${selectedSubject}...`
                    : "Ask OVI anything..."
              }
              disabled={loading}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!input.trim() || loading}
              size="icon"
            >
              <Send size={18} />
            </Button>
          </form>

          {/* Quick Action Buttons */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                className="h-8 text-[11px] gap-1.5 px-2.5"
                disabled={loading}
                onClick={() => send(action.message)}
              >
                <action.icon size={14} />
                {action.label}
              </Button>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            OVI MIND uses AI to help you revise. Always verify important
            information with your textbook.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default StudyChat;
