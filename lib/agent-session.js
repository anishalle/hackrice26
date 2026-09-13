import { fetch } from 'expo/fetch';

export async function agentSession(path = '', options = {}) {
  const base = process.env.EXPO_PUBLIC_BACKEND_URL?.replace(/\/$/, '');
  if (!base) throw new Error('Set EXPO_PUBLIC_BACKEND_URL and restart Expo.');
  const response = await fetch(`${base}/api/v1/agents/sessions${path}`, {
    ...options, headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Could not connect to the browser.');
  }
  return response.status === 204 ? null : response.json();
}
