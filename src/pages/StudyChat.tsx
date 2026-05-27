import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Loader2 } from "lucide-react";
import "katex/dist/katex.min.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AppLayout from "@/components/AppLayout";
import OviAvatar from "@/components/OviAvatar";
import SlideMessage from "@/components/SlideMessage";
import { store } from "@/lib/store";
import { ChatMessage, StudentProfile } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const StudyChat = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = store.getProfile();
    if (!p) { navigate("/"); return; }
    setProfile(p);
    setMessages([{
      role: "assistant",
      content: `Hi ${p.name}! 👋 I'm **OVI**, your revision companion.\n\nAsk me anything about your ZIMSEC subjects and I'll help you understand it step by step!\n\n> 💡 **Tip:** Try asking me to explain a concept, solve a problem, or give you exam tips for any topic.`,
    }]);
  }, [navigate]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!profile) return null;

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: input };
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
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev.slice(0, newMsgs.length), { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Session expired", description: "Please log in again.", variant: "destructive" });
        setLoading(false);
        return;
      }
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: newMsgs.map((m) => ({ role: m.role, content: m.content })),
          studentName: profile.name,
          subjects: profile.subjects,
        }),
      });

      if (resp.status === 429) {
        toast({ title: "Rate Limited", description: "Too many requests. Please wait a moment.", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (resp.status === 402) {
        toast({ title: "Credits Exhausted", description: "AI credits have run out.", variant: "destructive" });
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
          } catch { /* ignore */ }
        }
      }
    } catch {
      upsertAssistant("Sorry, I had trouble connecting. Please try again!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-64px)] lg:h-screen">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
          <OviAvatar size="sm" mood={loading ? "thinking" : "idle"} />
          <div>
            <h1 className="font-display font-bold text-foreground">Chat with OVI</h1>
            <p className="text-xs text-muted-foreground">
              {loading ? "OVI is thinking..." : "Ask me anything about your subjects"}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "items-start"}`}>
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

        {/* Input */}
        <div className="p-4 border-t border-border bg-card">
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask OVI anything... e.g. 'Explain Newton's second law'"
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={!input.trim() || loading} size="icon">
              <Send size={18} />
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            OVI uses AI to help you revise. Always verify important information with your textbook.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default StudyChat;
