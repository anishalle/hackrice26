import { Account, Client, Functions } from 'appwrite';

const client = new Client()
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1')
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '6aa054e6000f7a0f3af1');

export const account = new Account(client);
export const functions = new Functions(client);
