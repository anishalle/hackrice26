"use client";

import { FormEvent, useMemo, useState } from "react";
import { Bot, Loader2, RotateCcw, Send, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import {
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  isAccessibilityPreferences,
} from "@/lib/accessibility";
import { askHermes, type HermesMessage } from "@/lib/hermes";
import { cn } from "@/lib/utils";
import { GuidedBrowser } from "@/components/guided-browser";

const STARTERS = [
  "Help me understand what I should do next on this website.",
  "Guide me through this task one step at a time.",
  "Explain this page in simple language.",
];

function suggestedWebsite(content: string): string | null {
  const match = content.match(
    /(?:Suggested website:\s*)?(https?:\/\/[^\s)\]]+)/i
  );
  return match?.[1] ?? null;
}

export function HermesAgent() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<HermesMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preferences = useMemo(() => {
    const stored = user?.prefs?.accessibility;
    return isAccessibilityPreferences(stored) ? stored : DEFAULT_ACCESSIBILITY_PREFERENCES;
  }, [user?.prefs?.accessibility]);

  const modeLabel =
    preferences.mode === "guide"
      ? "Guide me"
      : preferences.mode === "assist"
        ? "Assist me"
        : "Do it with me";

  const latestWebsite = [...messages]
    .reverse()
    .find((message) => message.role === "assistant" && suggestedWebsite(message.content));
  const websiteUrl = latestWebsite ? suggestedWebsite(latestWebsite.content) : null;

  async function submit(content: string) {
    const prompt = content.trim();
    if (!prompt || loading) return;

    const nextMessages = [...messages, { role: "user" as const, content: prompt }];
    setMessages(nextMessages);
    setDraft("");
    setError(null);
    setLoading(true);

    try {
      const answer = await askHermes(nextMessages, preferences);
      setMessages((current) => [...current, { role: "assistant", content: answer }]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Hermes could not complete that request.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(draft);
  }

  function readLatestAnswer() {
    const latest = [...messages].reverse().find((message) => message.role === "assistant");
    if (!latest || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(latest.content));
  }

  return (
    <section aria-labelledby="hermes-agent-title" className="mt-8 rounded-xl border bg-card shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b p-5 sm:px-7">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="size-5" />
          </div>
          <div>
            <h2 id="hermes-agent-title" className="font-semibold">
              Hermes agent
            </h2>
            <p className="text-sm text-muted-foreground">
              {modeLabel} mode · one step at a time
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {preferences.outputMethods.includes("speech") && (
            <Button variant="outline" size="sm" onClick={readLatestAnswer} disabled={!messages.length}>
              <Volume2 className="size-4" />
              Read aloud
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setMessages([])} disabled={!messages.length || loading}>
            <RotateCcw className="size-4" />
            New task
          </Button>
        </div>
      </header>

      <div className="min-h-72 space-y-5 p-5 sm:p-7" aria-live="polite">
        {messages.length === 0 ? (
          <div>
            <h3 className="text-xl font-semibold tracking-tight">What can I help you do?</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Hermes uses your selected interaction preferences. It will explain the next step and pause before any consequential action.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {STARTERS.map((starter) => (
                <Button key={starter} variant="outline" size="sm" onClick={() => void submit(starter)} disabled={loading}>
                  {starter}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <article
              key={`${message.role}-${index}`}
              className={cn(
                "max-w-3xl rounded-xl px-4 py-3 text-sm leading-6",
                message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "border bg-muted/40"
              )}
            >
              <p className="mb-1 text-xs font-medium opacity-70">
                {message.role === "user" ? "You" : "Hermes"}
              </p>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </article>
          ))
        )}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Hermes is working…
          </div>
        )}
        {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

        {websiteUrl && (
          <GuidedBrowser
            websiteUrl={websiteUrl}
            mode={preferences.mode}
          />
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t p-4 sm:p-5">
        <label htmlFor="agent-task" className="sr-only">
          Ask Hermes for help
        </label>
        <div className="flex items-end gap-3">
          <textarea
            id="agent-task"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Tell Hermes what you need help doing…"
            className="min-h-12 flex-1 resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !draft.trim()} className="min-h-12">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Ask
          </Button>
        </div>
      </form>
    </section>
  );
}
