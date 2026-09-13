export interface BrowserLiveView {
  active: boolean;
  session_id?: string | null;
  live_url?: string | null;
  started_at?: string | null;
  status?: string | null;
  last_step_summary?: string | null;
}

export async function getBrowserLiveView(): Promise<BrowserLiveView> {
  const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");
  const response = await fetch(`${backendUrl}/api/v1/browser/live-view`);

  if (!response.ok) {
    throw new Error("The guided browser is not available yet.");
  }

  return (await response.json()) as BrowserLiveView;
}

export async function startGuidedBrowser(
  websiteUrl: string,
  mode: "assist" | "together"
): Promise<BrowserLiveView> {
  const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");
  const response = await fetch(`${backendUrl}/api/v1/browser/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ website_url: websiteUrl, mode }),
  });
  const payload = (await response.json().catch(() => ({}))) as BrowserLiveView & {
    detail?: string;
  };

  if (!response.ok) {
    throw new Error(payload.detail ?? "The guided browser could not start.");
  }
  return payload;
}

export async function getGuidedBrowserSession(sessionId: string): Promise<BrowserLiveView> {
  const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");
  const response = await fetch(`${backendUrl}/api/v1/browser/sessions/${sessionId}`);
  const payload = (await response.json().catch(() => ({}))) as BrowserLiveView & {
    detail?: string;
  };

  if (!response.ok) {
    throw new Error(payload.detail ?? "The guided browser status is unavailable.");
  }
  return payload;
}
