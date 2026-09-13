import { fetch } from 'expo/fetch';

// Expo statically substitutes these values into native release builds.
export function backendFetch(path, options = {}) {
  const base = process.env.EXPO_PUBLIC_BACKEND_URL?.replace(/\/$/, '');
  if (!base) throw new Error('Set EXPO_PUBLIC_BACKEND_URL and rebuild or restart Expo.');
  const headers = new Headers(options.headers);
  const key = process.env.EXPO_PUBLIC_BACKEND_API_KEY;
  if (key) headers.set('X-API-Key', key);
  return fetch(`${base}/api/v1${path}`, { ...options, headers });
}
