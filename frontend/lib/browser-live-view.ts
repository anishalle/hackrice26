export interface BrowserLiveView {
  active: boolean;
  session_id?: string | null;
  live_url?: string | null;
  started_at?: string | null;
}

export async function getBrowserLiveView(): Promise<BrowserLiveView> {
  const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");
  const response = await fetch(`${backendUrl}/api/v1/browser/live-view`);

  if (!response.ok) {
    throw new Error("The guided browser is not available yet.");
  }

  return (await response.json()) as BrowserLiveView;
}
