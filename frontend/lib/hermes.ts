import type { AccessibilityPreferences } from "@/lib/accessibility";

export interface HermesMessage {
  role: "user" | "assistant";
  content: string;
}

interface HermesCompletion {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

function systemInstructions(preferences: AccessibilityPreferences): string {
  const mode =
    preferences.mode === "guide"
      ? "Guide me: explain one next action; do not operate a website."
      : preferences.mode === "assist"
        ? "Assist me: you may inspect or safely navigate, but pause before entering data or making a meaningful selection."
        : "Do it with me: take at most one routine browser action per response, explain what happened, then wait.";

  return [
    "You are an accessibility browser guide.",
    mode,
    `The user prefers input through: ${preferences.inputMethods.join(", ") || "text"}.`,
    `The user prefers output through: ${preferences.outputMethods.join(", ") || "text"}.`,
    preferences.oneStepAtATime
      ? "Give exactly one clear next step at a time."
      : "You may provide a short ordered plan when useful.",
    "When a web task needs a website, recommend the most relevant official URL on its own line in the form: Suggested website: https://example.com.",
    "Do not claim you opened, clicked, or completed anything unless a browser tool confirms it.",
    "Always return plain, screen-reader-friendly text.",
    "Never submit a form, send a message, make a purchase, change an account, or disclose sensitive information without explicit confirmation immediately before that action.",
    "If browser tools are unavailable, say so plainly and still guide the user using the information available.",
  ].join("\n");
}

export async function askHermes(
  messages: HermesMessage[],
  preferences: AccessibilityPreferences
): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_HERMES_URL?.replace(/\/$/, "");
  const apiKey = process.env.NEXT_PUBLIC_HERMES_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error("Hermes is not configured. Add the local Hermes URL and API key, then restart Next.js.");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 90_000);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "hermes-agent",
        stream: false,
        messages: [
          { role: "system", content: systemInstructions(preferences) },
          ...messages,
        ],
      }),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Hermes took more than 90 seconds. Start a new task and try a simpler browser request.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }

  const payload = (await response.json().catch(() => ({}))) as HermesCompletion;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Hermes request failed with status ${response.status}.`);
  }

  const answer = payload.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error("Hermes returned an empty response.");
  return answer;
}
