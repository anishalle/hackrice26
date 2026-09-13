import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { account, functions } from './appwrite';

WebBrowser.maybeCompleteAuthSession();

// This is a sandbox journey, not a claim that an identity was verified.
export async function preparePersona() {
  try {
    await account.get();
  } catch (error) {
    try {
      await account.createAnonymousSession();
    } catch (sessionErr) {
      if (sessionErr?.code !== 409) {
        throw new Error(sessionErr?.message || error?.message || 'We couldn’t connect. Please try again.');
      }
    }
  }
  const returnUrl = Platform.OS === 'web'
    ? new URL('/home', window.location.origin).toString()
    : 'aide://persona/home';
  const execution = await functions.createExecution({
    functionId: process.env.EXPO_PUBLIC_PERSONA_FUNCTION_ID || '6aa5c87b0020263855b6',
    async: false,
    xpath: '/api/persona/start',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnUrl }),
  });
  if (execution.responseStatusCode < 200 || execution.responseStatusCode >= 300) {
    let errorDetail = '';
    try {
      const parsed = JSON.parse(execution.responseBody);
      errorDetail = parsed.error || '';
    } catch {}
    throw new Error(errorDetail || 'We couldn’t open Persona. Please try again.');
  }
  let authorizeUrl;
  try {
    authorizeUrl = JSON.parse(execution.responseBody).authorizeUrl;
    if (new URL(authorizeUrl).protocol !== 'https:') throw new Error();
  } catch {
    throw new Error('Persona returned an invalid link. Please try again.');
  }
  return { authorizeUrl, returnUrl };
}

export async function openPersona({ authorizeUrl, returnUrl }) {
  const result = await WebBrowser.openAuthSessionAsync(authorizeUrl, returnUrl);
  if (result.type !== 'success') return false;
  return true;
}
