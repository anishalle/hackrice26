"use client";

import { useEffect, useState } from "react";
import { getRecordingAudio, type VoiceSample } from "@/lib/voice-preservation";

// Calendar weeks start Monday in the viewer's local timezone.
function weekStart(timestamp: string): Date {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (date.getDay() + 6) % 7);
  return date;
}

function RecordingPlayer({ sample, ownerSubject }: { sample: VoiceSample; ownerSubject: string }) {
  const [requested, setRequested] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!requested) return;
    let cancelled = false;
    let objectUrl: string | undefined;
    void getRecordingAudio(ownerSubject, sample.id).then((blob) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch((caught) => {
      if (!cancelled) {
        setError(caught instanceof Error ? caught.message : "Recording unavailable.");
        setRequested(false);
      }
    });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [requested, ownerSubject, sample.id]);
  return (
    <li className="py-4">
      <p className="font-medium">{sample.phrase_hint || sample.original_filename}</p>
      <p className="mt-1 text-xs text-[var(--text-3)]">
        {new Date(sample.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
      </p>
      {url ? <audio controls preload="metadata" src={url} className="mt-3 w-full" aria-label={`Recording: ${sample.phrase_hint || sample.original_filename}`} /> : (
        <button type="button" disabled={requested} onClick={() => { setError(null); setRequested(true); }}
          className="target mt-3 rounded-full border border-[var(--line)] px-4 text-sm hover:bg-[var(--surface-2)] disabled:opacity-60">
          {requested ? "Loading recording…" : "Listen to recording"}
        </button>
      )}
      {error && <p role="alert" className="mt-2 text-sm">{error}</p>}
    </li>
  );
}

export function WeeklyVoiceHistory({ samples, ownerSubject }: { samples: VoiceSample[]; ownerSubject: string }) {
  const weeks = new Map<number, VoiceSample[]>();
  for (const sample of samples) {
    const key = weekStart(sample.created_at).getTime();
    weeks.set(key, [...(weeks.get(key) ?? []), sample]);
  }
  const currentWeek = weekStart(new Date().toISOString()).getTime();
  return (
    <section className="mt-8" aria-labelledby="weekly-history-title">
      <div className="flex items-center justify-between gap-3">
        <h3 id="weekly-history-title" className="text-xl font-medium">Weekly check-ins</h3>
        <span className="rounded-full bg-[var(--signal-mint)] px-3 py-1 text-xs">{weeks.size} recorded weeks</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--text-2)]">
        Listen back to the same exercises across weeks. Weeks start Monday, in your local time.
      </p>
      {!weeks.has(currentWeek) && <p className="mt-4 rounded-xl bg-[var(--surface-2)] p-4 text-sm">No recordings this week yet. Record an exercise above when you’re ready.</p>}
      <div className="mt-5 grid gap-3">
        {[...weeks.entries()].sort(([a], [b]) => b - a).map(([week, recordings]) => (
          <details key={week} open={week === Math.max(...weeks.keys())} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <summary className="cursor-pointer font-medium">
              Week of {new Date(week).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              <span className="ml-2 text-xs font-normal text-[var(--text-3)]">{recordings.length} recordings{week === currentWeek ? " · This week" : ""}</span>
            </summary>
            <ul className="mt-2 divide-y divide-[var(--line)]">
              {recordings.sort((a, b) => b.created_at.localeCompare(a.created_at)).map((sample) => <RecordingPlayer key={sample.id} sample={sample} ownerSubject={ownerSubject} />)}
            </ul>
          </details>
        ))}
      </div>
    </section>
  );
}
