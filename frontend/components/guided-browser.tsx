"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, MonitorUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getGuidedBrowserSession,
  startGuidedBrowser,
  type BrowserLiveView,
} from "@/lib/browser-live-view";

interface GuidedBrowserProps {
  websiteUrl: string;
  mode: "guide" | "assist" | "together";
}

export function GuidedBrowser({ websiteUrl, mode }: GuidedBrowserProps) {
  const [starting, setStarting] = useState(false);
  const [liveView, setLiveView] = useState<BrowserLiveView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = liveView?.session_id ?? "";
    if (!sessionId) return;

    let cancelled = false;
    async function refreshStatus() {
      try {
        const next = await getGuidedBrowserSession(sessionId);
        if (!cancelled) {
          setLiveView((current) => ({
            ...current,
            ...next,
            live_url: next.live_url || current?.live_url || "",
          }));
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "The guided browser status is unavailable."
          );
        }
      }
    }

    void refreshStatus();
    const interval = window.setInterval(() => void refreshStatus(), 2_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [liveView?.session_id]);

  async function openBrowser() {
    setStarting(true);
    setError(null);
    try {
      setLiveView(
        await startGuidedBrowser(
          websiteUrl,
          mode === "together" ? "together" : "assist"
        )
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The guided browser could not start.");
    } finally {
      setStarting(false);
    }
  }

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
    <section
      className="mt-3 overflow-hidden rounded-xl border bg-card shadow-sm"
      aria-labelledby="guided-browser-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
        <div>
          <h3 id="guided-browser-title" className="flex items-center gap-2 text-sm font-semibold">
            <MonitorUp className="size-4 text-primary" />
            Guided browser
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            A private Browser Use session opens only after you approve this website.
          </p>
        </div>
        {liveView?.live_url && (
          <Button variant="ghost" size="sm" onClick={() => setLiveView(null)}>
            <X className="size-4" />
            Hide view
          </Button>
        )}
      </div>

      {!liveView?.live_url ? (
        <div className="p-4">
          <p className="break-all text-sm text-muted-foreground">{websiteUrl}</p>
          <Button
            className="mt-3"
            onClick={() => void openBrowser()}
            disabled={starting}
          >
            {starting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MonitorUp className="size-4" />
            )}
            {starting ? "Opening guided browser…" : "Open in guided browser"}
          </Button>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            The browser opens the landing page only. No form, account, or submission action is allowed.
          </p>
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      ) : (
        <div>
          <iframe
            title="Live guided browser"
            src={liveView.live_url}
            className="aspect-video w-full bg-muted"
            allow="autoplay"
          />
          <div className="p-3 text-xs text-muted-foreground">
            <p>
              Browser Use status: {" "}
              <span className="font-medium text-foreground">
                {liveView.status ?? "starting"}
              </span>
            </p>
            {liveView.last_step_summary && (
              <p className="mt-1">{liveView.last_step_summary}</p>
            )}
            {error && (
              <p role="alert" className="mt-1 text-destructive">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
