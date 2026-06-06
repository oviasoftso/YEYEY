import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Volume2, VolumeX, Play, Pause, SkipForward, Languages, Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import AppLayout from "@/components/AppLayout";
import OviAvatar from "@/components/OviAvatar";
import { store } from "@/lib/store";
import { SUBJECT_ICONS, SUBJECT_TOPICS } from "@/lib/constants";
import { StudentProfile, TopicMastery } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

const LANGUAGES = [
  { code: "en-US", label: "English", flag: "🇬🇧" },
  { code: "sn", label: "Shona", flag: "🇿🇼" },
  { code: "nd", label: "Ndebele", flag: "🇿🇼" },
];

const OviVoicePage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [language, setLanguage] = useState("en-US");
  const [customText, setCustomText] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [rate, setRate] = useState([0.9]);
  const [weakTopics, setWeakTopics] = useState<TopicMastery[]>([]);

  useEffect(() => {
    const p = store.getProfile();
    if (!p) { navigate("/"); return; }
    setProfile(p);
    // Find weak topics for voice tutoring suggestions
    const mastery = store.getMastery();
    setWeakTopics(mastery.filter((m) => m.mastery < 50).sort((a, b) => a.mastery - b.mastery).slice(0, 5));
  }, [navigate]);

  if (!profile) return null;

  const topics = selectedSubject ? (SUBJECT_TOPICS[selectedSubject] || []) : [];

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) {
      toast({ title: "Not Supported", description: "Your browser doesn't support text-to-speech.", variant: "destructive" });
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 3000));
    utterance.lang = language;
    utterance.rate = rate[0];
    utterance.pitch = 1.0;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const speakTopicExplanation = () => {
    if (!selectedSubject || !selectedTopic) {
      toast({ title: "Select a topic", description: "Choose a subject and topic first." });
      return;
    }
    const mastery = store.getMastery().find((m) => m.subject === selectedSubject && m.topic === selectedTopic);
    const masteryPct = mastery?.mastery || 0;
    const text = `Let's study ${selectedTopic} in ${selectedSubject}. Your current mastery is ${masteryPct} percent. ${
      masteryPct < 30 ? "This is a weak area. Let me explain the basics from first principles." :
      masteryPct < 60 ? "You're making progress. Let me reinforce the key concepts." :
      masteryPct < 80 ? "Good foundation. Let me cover the advanced points you need for ZIMSEC." :
      "Excellent mastery. Let me quiz you on exam-style questions."
    }`;
    speak(text);
  };

  const speakWeakTopic = (m: TopicMastery) => {
    const text = `You haven't reviewed ${m.topic} in ${m.subject} recently. Your mastery is ${m.mastery} percent. I recommend spending 20 minutes on this topic today. Would you like me to explain the key concepts?`;
    speak(text);
  };

  const speakCustom = () => {
    if (!customText.trim()) return;
    speak(customText);
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <OviAvatar size="md" mood="encouraging" />
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">OVI VOICE</h1>
              <p className="text-muted-foreground text-sm">Voice-powered revision — listen to explanations in your language</p>
            </div>
          </div>
          {speaking && (
            <Button variant="destructive" size="sm" onClick={stop} className="gap-2">
              <VolumeX size={16} /> Stop
            </Button>
          )}
        </div>

        {/* Language & Speed */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Languages size={16} className="text-primary" /> Language
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {LANGUAGES.map((lang) => (
                  <Button
                    key={lang.code}
                    variant={language === lang.code ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLanguage(lang.code)}
                    className="gap-1.5"
                  >
                    {lang.flag} {lang.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Play size={16} className="text-primary" /> Speed: {rate[0].toFixed(1)}x
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Slider value={rate} onValueChange={setRate} min={0.5} max={1.5} step={0.1} />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Slow</span><span>Normal</span><span>Fast</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Topic Voice Tutor */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Volume2 size={16} className="text-primary" /> Topic Voice Tutor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Select value={selectedSubject} onValueChange={(v) => { setSelectedSubject(v); setSelectedTopic(""); }}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {profile.subjects.map((s) => (
                    <SelectItem key={s} value={s}>{SUBJECT_ICONS[s] || "📚"} {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={!selectedSubject}>
                <SelectTrigger><SelectValue placeholder="Select topic" /></SelectTrigger>
                <SelectContent>
                  {topics.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={speakTopicExplanation} disabled={!selectedSubject || !selectedTopic || speaking} className="w-full gap-2">
              {speaking ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
              Explain {selectedTopic || "Topic"} Aloud
            </Button>
          </CardContent>
        </Card>

        {/* Weak Topics Voice Nudges */}
        {weakTopics.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Mic size={16} className="text-amber-500" /> Revision Nudges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {weakTopics.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg border bg-muted/30">
                    <div>
                      <span className="text-sm font-medium">{SUBJECT_ICONS[m.subject]} {m.subject} — {m.topic}</span>
                      <Badge variant="outline" className="ml-2 text-xs">{m.mastery}%</Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => speakWeakTopic(m)} disabled={speaking} className="gap-1.5">
                      <Volume2 size={14} /> Listen
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Custom Text */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Read Any Text Aloud</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Paste any text here — revision notes, definitions, formulas — and OVI will read it aloud..."
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={4}
            />
            <Button onClick={speakCustom} disabled={!customText.trim() || speaking} className="w-full gap-2">
              {speaking ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
              Read Aloud
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default OviVoicePage;
