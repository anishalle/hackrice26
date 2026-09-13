import { backendFetch } from './backend';

export async function agentSession(path = '', options = {}) {
  const response = await backendFetch(`/agents/sessions${path}`, {
    ...options, headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Could not connect to the browser.');
  }
  return response.status === 204 ? null : response.json();
}
