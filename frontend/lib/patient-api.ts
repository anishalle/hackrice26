"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Patient } from "./patients";

export const patientApiUrl = () =>
  (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

type Catalog = { patients: Patient[]; status: "loading" | "ready" | "error"; error: string | null };
const initial: Catalog = { patients: [], status: "loading", error: null };
let catalog = initial;
let pending = false;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => catalog;
const serverSnapshot = () => initial;

export async function reloadPatients() {
  if (pending) return;
  pending = true;
  catalog = { ...catalog, status: "loading", error: null };
  listeners.forEach((notify) => notify());
  try {
    const response = await fetch(`${patientApiUrl()}/api/v1/patients`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Patient database request failed (${response.status}).`);
    const patients = await response.json() as Patient[];
    catalog = { patients, status: "ready", error: null };
  } catch (error) {
    catalog = { ...catalog, status: "error", error: error instanceof Error ? error.message : "Patient database unavailable." };
  } finally {
    pending = false;
    listeners.forEach((notify) => notify());
  }
}

export function usePatients() {
  const value = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  useEffect(() => { if (catalog === initial) void reloadPatients(); }, []);
  return { ...value, retry: reloadPatients };
}

export function cachedPatient(id: string) {
  return catalog.patients.find((patient) => patient.id === id);
}

export interface WeeklyPoint {
  week: string; sample_count: number; mean: number; minimum: number;
  maximum: number; variability: number;
}
export interface PatientAnalytics {
  patient_id: string; observation_count: number; latest_week: string | null;
  refresh_interval_minutes: number;
  series: { metric: string; label: string; unit: string; precision: number;
    delta: number | null; points: WeeklyPoint[] }[];
}
