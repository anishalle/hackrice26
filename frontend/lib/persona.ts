import { ExecutionMethod, Functions } from "appwrite";
import { account, client } from "./appwrite";

const functions = new Functions(client);
const FUNCTION_ID =
  process.env.NEXT_PUBLIC_PERSONA_FUNCTION_ID ?? "6aa5c87b0020263855b6";

export interface PersonaJourney {
  authorizeUrl: string;
  returnUrl: string;
}

/** Create the same Persona journey as the native client. */
export async function preparePersona(): Promise<PersonaJourney> {
  try {
    await account.get();
  } catch {
    throw new Error("Please sign in before starting identity verification.");
  }

  const returnUrl = new URL("/persona/complete", window.location.origin).toString();
  const execution = await functions.createExecution({
    functionId: FUNCTION_ID,
    async: false,
    xpath: "/api/persona/start",
    method: ExecutionMethod.POST,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ returnUrl }),
  });
  if (execution.responseStatusCode < 200 || execution.responseStatusCode >= 300) {
    let detail = "";
    try {
      const payload = JSON.parse(execution.responseBody) as { error?: unknown };
      detail = typeof payload.error === "string" ? payload.error : "";
    } catch {
      // The function can return a non-JSON error response.
    }
    throw new Error(
      execution.responseStatusCode === 401
        ? "Appwrite could not authenticate this verification request. Please try again."
        : detail || "Identity verification is unavailable. Please try again.",
    );
  }
  let authorizeUrl: unknown;
  try {
    authorizeUrl = (JSON.parse(execution.responseBody) as { authorizeUrl?: unknown }).authorizeUrl;
  } catch {
    // Handled by the same user-facing message below.
  }
  let isSecureUrl = false;
  if (typeof authorizeUrl === "string") {
    try {
      isSecureUrl = new URL(authorizeUrl).protocol === "https:";
    } catch {
      isSecureUrl = false;
    }
  }
  if (!isSecureUrl || typeof authorizeUrl !== "string") {
    throw new Error("Unable to open identity verification. Please try again.");
  }
  return { authorizeUrl, returnUrl };
}

/** Navigate from a person-initiated click so browsers do not block the handoff. */
export function openPersona(journey: PersonaJourney): void {
  window.location.assign(journey.authorizeUrl);
}
