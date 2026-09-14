import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';

// Who owns the voice bank, as far as the backend is concerned.
//
// ponytail: the backend takes the owner as a header and Appwrite is not yet
// verified server-side, so the app mints its own subject. It is random the
// first time and then kept, so recordings made this week are still yours next
// week; clearing the app's storage starts a fresh, empty bank. Swap this for
// the Appwrite user id once the backend checks sessions.

const KEY = 'aide.voice-owner';
let cached = null;
let pending = null;

export function getOwnerSubject() {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = (async () => {
      let subject = null;
      try {
        subject = await AsyncStorage.getItem(KEY);
      } catch {}
      if (!subject) {
        subject = `session-${randomUUID()}`;
        try {
          await AsyncStorage.setItem(KEY, subject);
        } catch {}
      }
      cached = subject;
      return subject;
    })();
  }
  return pending;
}
