import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Endpoints } from "@/lib/api";
import {
  Sparkles, Send, FileText, Users, Package, TrendingUp,
  Mic, MicOff, Keyboard, Volume2, VolumeX, Trash2,
} from "lucide-react";

export const Route = createFileRoute("/assistant")({
  head: () => ({ meta: [{ title: "Assistant — Tally AI" }] }),
  component: Assistant,
});

type Msg = { id: string; role: "user" | "ai"; text: string };

const seed: Msg[] = [
  { id: "m1", role: "ai", text: "Good morning, Rohan. You have 3 invoices going overdue this week — totalling ₹4.6L. Want me to draft polite reminders?" },
  { id: "m2", role: "user", text: "Yes. Also tell me which item is running low." },
  { id: "m3", role: "ai", text: "Drafted 3 reminders (ready to review). Low stock: Invoice Printer Ribbon (6 left, reorder at 12) and Carbon Receipt Pad (18, reorder at 20)." },
];

const suggestions = [
  { icon: FileText, label: "Summarise May P&L" },
  { icon: Users, label: "Top 5 overdue customers" },
  { icon: Package, label: "What needs reordering?" },
  { icon: TrendingUp, label: "Forecast next quarter" },
];

function Assistant() {
  const [msgs, setMsgs] = useState<Msg[]>(seed);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [muted, setMuted] = useState(false);
  const [manualMode, setManualMode] = useState(true);
  const recRef = (Assistant as any)._recRef || ((Assistant as any)._recRef = { current: null as any });

  const speak = (text: string) => {
    if (muted || typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-IN";
    window.speechSynthesis.speak(u);
  };

  const send = async (text: string) => {
    if (!text.trim()) return;
    const userId = Math.random().toString(36).slice(2);
    const aiId = Math.random().toString(36).slice(2);
    setMsgs((m) => [
      ...m,
      { id: userId, role: "user", text },
      { id: aiId, role: "ai", text: "Got it — pulling that from your books now…" },
    ]);
    setInput("");
    try {
      const res = await Endpoints.parse(text) as { response?: string; result?: { message?: string } };
      const reply = res?.response || res?.result?.message || "Done.";
      setMsgs((m) => m.map((msg) => (msg.id === aiId ? { ...msg, text: reply } : msg)));
      speak(reply);
    } catch (err) {
      console.warn("Assistant request failed:", err);
      const reply = "Sorry, I could not reach the assistant. Check that the backend is running.";
      setMsgs((m) => m.map((msg) => (msg.id === aiId ? { ...msg, text: reply } : msg)));
      toast.error("Assistant backend is not reachable");
    }
  };

  const toggleMic = () => {
    const SR: any =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SR) {
      toast.error("Voice input isn't supported in this browser. Try Chrome or Edge.");
      return;
    }
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join("");
      setInput(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
    setManualMode(false);
  };

  const clearChat = () => {
    setMsgs([]);
    toast.success("Chat cleared");
  };

  const toggleMute = () => {
    setMuted((m) => {
      if (!m && typeof window !== "undefined") window.speechSynthesis?.cancel();
      toast.info(!m ? "Assistant voice muted" : "Assistant voice unmuted");
      return !m;
    });
  };

  return (
    <AppShell
      title="Assistant"
      subtitle="Ask anything about your books. Powered by Tally AI."
      actions={
        <>
          <Button variant="outline" size="sm" className="rounded-full" onClick={toggleMute}>
            {muted ? <VolumeX className="mr-1.5 h-4 w-4" /> : <Volume2 className="mr-1.5 h-4 w-4" />}
            {muted ? "Unmute" : "Mute"}
          </Button>
          <Button variant="outline" size="sm" className="rounded-full" onClick={clearChat}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Clear chat
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="reveal reveal-1 col-span-1 flex h-[68vh] flex-col border-border/60 shadow-soft lg:col-span-8">
          <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-navy">
              <Sparkles className="h-4 w-4 text-gold" />
            </div>
            <div>
              <p className="text-sm font-semibold">Tally Assistant</p>
              <p className="text-[11px] text-muted-foreground">
                Connected to your ledger · {muted ? "Voice off" : "Voice on"}
              </p>
            </div>
            <Badge className="ml-auto rounded-full border-0 bg-success/15 text-success">Online</Badge>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {msgs.length === 0 && (
              <p className="mt-8 text-center text-sm text-muted-foreground">No messages yet. Ask something below.</p>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`reveal flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-soft ${
                    m.role === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm border border-border/60 bg-card text-card-foreground"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border/60 p-4">
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => { e.preventDefault(); send(input); }}
            >
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => { setManualMode(true); }}
                aria-label="Manual keyboard entry"
                className={`h-11 w-11 rounded-full ${manualMode ? "bg-accent/15 text-accent" : ""}`}
                title="Keyboard entry"
              >
                <Keyboard className="h-4 w-4" />
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={listening ? "Listening…" : "Ask about revenue, customers, stock…"}
                className="h-11 rounded-full border-border/70 bg-muted/50 px-4"
              />
              <Button
                type="button"
                size="icon"
                onClick={toggleMic}
                aria-label={listening ? "Stop voice input" : "Start voice input"}
                title={listening ? "Mic on — tap to stop" : "Tap to speak"}
                className={`h-11 w-11 rounded-full shadow-soft ${
                  listening
                    ? "bg-destructive text-destructive-foreground animate-pulse"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button type="submit" size="icon" aria-label="Send" className="h-11 w-11 rounded-full bg-primary shadow-elegant">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>

        <div className="col-span-1 space-y-4 lg:col-span-4">
          <Card className="reveal reveal-2 border-border/60 bg-gradient-navy p-5 text-primary-foreground shadow-elegant">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gold" />
              <span className="text-xs uppercase tracking-widest text-primary-foreground/70">Today's brief</span>
            </div>
            <p className="mt-3 font-display text-lg leading-snug">
              Revenue is up 11.7% MoM. Cash position healthy at ₹18.2L.
            </p>
          </Card>

          <Card className="reveal reveal-3 border-border/60 p-4 shadow-soft">
            <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Try asking</p>
            <div className="space-y-2">
              {suggestions.map((s) => (
                <button
                  key={s.label}
                  onClick={() => send(s.label)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5 text-left text-sm transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-soft"
                >
                  <s.icon className="h-4 w-4 text-accent" />
                  {s.label}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
