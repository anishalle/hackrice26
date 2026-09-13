"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, MonitorUp, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBrowserLiveView, type BrowserLiveView } from "@/lib/browser-live-view";

interface GuidedBrowserProps {
  websiteUrl: string;
  mode: "guide" | "assist" | "together";
  onOpenWithHermes: (url: string) => void;
  loading: boolean;
}

export function GuidedBrowser({ websiteUrl, mode, onOpenWithHermes, loading }: GuidedBrowserProps) {
  const [watching, setWatching] = useState(false);
  const [liveView, setLiveView] = useState<BrowserLiveView | null>(null);
  const [status, setStatus] = useState("Ready when you are.");

  useEffect(() => {
    if (!watching) return;

    let cancelled = false;
    async function refresh() {
      try {
        const next = await getBrowserLiveView();
        if (cancelled) return;
        setLiveView(next);
        setStatus(next.active ? "Hermes is connected to this browser." : "Waiting for Hermes to open the guided browser…");
      } catch {
        if (!cancelled) setStatus("Waiting for the guided browser to become available…");
      }
    }

    void refresh();
    const interval = window.setInterval(() => void refresh(), 3_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [watching]);

  if (mode === "guide") {
    return (
      <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <p className="text-sm font-medium">Suggested official website</p>
        <a
          className="mt-1 inline-flex break-all text-sm text-primary underline underline-offset-4"
          href={websiteUrl}
          target="_blank"
          rel="noreferrer"
        >
          {websiteUrl}
          <ExternalLink className="ml-1 mt-0.5 size-3.5 shrink-0" />
        </a>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Guide mode leaves control with you. Open the site, then ask Hermes for the next step.
        </p>
      </div>
    );
  }

  return (
    <section className="mt-3 overflow-hidden rounded-xl border bg-card shadow-sm" aria-labelledby="guided-browser-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
        <div>
          <h3 id="guided-browser-title" className="flex items-center gap-2 text-sm font-semibold">
            <MonitorUp className="size-4 text-primary" />
            Guided browser
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{status}</p>
        </div>
        {watching && (
          <Button variant="ghost" size="sm" onClick={() => setWatching(false)}>
            <X className="size-4" />
            Hide view
          </Button>
        )}
      </div>

      {!watching ? (
        <div className="p-4">
          <p className="break-all text-sm text-muted-foreground">{websiteUrl}</p>
          <Button
            className="mt-3"
            onClick={() => {
              setWatching(true);
              setStatus("Asking Hermes to open the website…");
              onOpenWithHermes(websiteUrl);
            }}
            disabled={loading}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <MonitorUp className="size-4" />}
            Open in guided browser
          </Button>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Hermes can inspect and navigate. It will still ask before forms, submissions, or account changes.
          </p>
        </div>
      ) : liveView?.active && liveView.live_url ? (
        <div>
          <iframe
            title="Live browser controlled by Hermes"
            src={liveView.live_url}
            className="aspect-video w-full bg-muted"
            allow="autoplay"
          />
          <div className="flex items-center justify-between gap-2 p-3">
            <p className="text-xs text-muted-foreground">Live view of the browser Hermes is using.</p>
            <Button variant="outline" size="sm" onClick={() => setWatching(false)}>
              <RefreshCw className="size-3.5" />
              Refresh later
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-44 items-center justify-center gap-2 p-5 text-sm text-muted-foreground" aria-live="polite">
          <Loader2 className="size-4 animate-spin" />
          {status}
        </div>
      )}
    </section>
  );
}
