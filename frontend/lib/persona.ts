import { ExecutionMethod, Functions } from "appwrite";
import { client } from "./appwrite";

const functions = new Functions(client);

export async function startPersona(): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    window.location.assign("/home");
    return;
  }
  // Invoke through the authenticated Appwrite API so the execution receives
  // x-appwrite-user-id. Domain requests only forward the user JWT.
  const execution = await functions.createExecution({
    functionId: "6aa5c87b0020263855b6",
    async: false,
    xpath: "/api/persona/start",
    method: ExecutionMethod.POST,
    headers: { "Content-Type": "application/json" },
  });
  if (execution.responseStatusCode < 200 || execution.responseStatusCode >= 300) {
    throw new Error(
      execution.responseStatusCode === 401
        ? "Appwrite could not authenticate this verification request. Please try again."
        : "Identity verification is unavailable. Please try again.",
    );
  }
  const { authorizeUrl } = JSON.parse(execution.responseBody);
  if (typeof authorizeUrl !== "string" || new URL(authorizeUrl).protocol !== "https:") {
    throw new Error("Unable to open identity verification. Please try again.");
  }
  window.location.assign(authorizeUrl);
}
