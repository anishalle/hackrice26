import { Account, Client, Functions } from 'react-native-appwrite';

const client = new Client()
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1')
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '6aa054e6000f7a0f3af1')
  .setPlatform('com.anishalle.aide');

export const account = new Account(client);
export const functions = new Functions(client);
