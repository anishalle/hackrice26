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
    if (error.code !== 401) throw new Error('We couldn’t connect. Please try again.');
    // The form remains fake. A guest session supplies the user ID required by
    // the existing function without sending the form's email or password.
    await account.createAnonymousSession();
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
  });
  if (execution.responseStatusCode < 200 || execution.responseStatusCode >= 300) {
    throw new Error('We couldn’t open Persona. Please try again.');
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
  const actual = new URL(result.url);
  const expected = new URL(returnUrl);
  if (actual.protocol !== expected.protocol || actual.host !== expected.host || actual.pathname !== expected.pathname) {
    throw new Error('That return link didn’t match. Please try again.');
  }
  if (actual.searchParams.has('error')) throw new Error('Persona wasn’t completed. Please try again.');
  return true;
}
