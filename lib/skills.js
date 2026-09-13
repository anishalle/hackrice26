import { useEffect, useState } from 'react';
import { backendFetch } from './backend';
import { PROFILE } from '../data/profile';

// The marketplace catalogue lives in the backend's Postgres now. This module is
// the one copy of it in the app: every screen that shows skills reads the same
// snapshot, so sharing or removing a skill on one screen shows up on the rest
// without a refetch.
//
// Icons are still not stored on a skill. They follow from the first tag, via
// `tagGlyph` in the theme, which is why the categories stay a client constant.
export const CATEGORIES = ['Speech', 'Voice', 'Mobility', 'Daily', 'Care', 'Automation'];

// ponytail: the backend takes the owner as a header for now, so the demo
// profile's handle stands in until it verifies the Appwrite session itself.
const OWNER = PROFILE.handle;

async function api(path, options = {}) {
  const response = await backendFetch(`/skills${path}`, {
    ...options,
    headers: { 'X-Owner-Subject': OWNER, ...options.headers },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw Object.assign(new Error(describe(data.detail, response.status)), { status: response.status });
  }
  return response.status === 204 ? null : response.json();
}

// FastAPI returns a string for our own errors and a list for schema errors.
function describe(detail, status) {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length) return detail.map((d) => d.msg).join(' ');
  return `Marketplace request failed (${status}).`;
}

let state = { skills: null, loading: false, error: null };
const listeners = new Set();

function set(next) {
  state = { ...state, ...next };
  for (const listener of listeners) listener(state);
}

export async function refreshSkills() {
  if (state.loading) return;
  set({ loading: true, error: null });
  try {
    set({ skills: await api(''), loading: false });
  } catch (error) {
    set({ loading: false, error: error.message });
  }
}

export function useSkills() {
  const [snapshot, setSnapshot] = useState(state);
  useEffect(() => {
    listeners.add(setSnapshot);
    setSnapshot(state);
    if (state.skills === null && !state.loading) refreshSkills();
    return () => listeners.delete(setSnapshot);
  }, []);
  return {
    skills: snapshot.skills ?? [],
    loaded: snapshot.skills !== null,
    loading: snapshot.loading,
    error: snapshot.error,
    refresh: refreshSkills,
  };
}

// The server orders by karma; a new skill has none, so it belongs at the end.
export async function shareSkill({ title, description, tags, summary }) {
  const skill = await api('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, tags, summary: summary || null }),
  });
  set({ skills: [...(state.skills ?? []), skill] });
  return skill;
}

export async function removeSkill(slug) {
  await api(`/${encodeURIComponent(slug)}`, { method: 'DELETE' });
  set({ skills: (state.skills ?? []).filter((s) => s.slug !== slug) });
}
