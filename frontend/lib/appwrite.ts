import { Client, Account, ID } from "appwrite";

export const APPWRITE_ENDPOINT =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  process.env.APPWRITE_ENDPOINT ||
  "https://nyc.cloud.appwrite.io/v1";

export const APPWRITE_PROJECT_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  process.env.APPWRITE_PROJECT_ID ||
  "6aa054e6000f7a0f3af1";

export const APPWRITE_PROJECT_NAME =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_NAME ||
  process.env.APPWRITE_PROJECT_NAME ||
  "cool";

export const client = new Client();
client
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const account = new Account(client);

export { ID };
