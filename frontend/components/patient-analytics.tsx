"use client";

import { useEffect, useState } from "react";
import { patientApiUrl, type PatientAnalytics } from "@/lib/patient-api";
import { Panel, PlotLabel } from "@/components/primitives";

export function PatientAnalyticsPanel({ patientId }: { patientId: string }) {
  const [weeks, setWeeks] = useState(14);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: PatientAnalytics; error?: string } | null>(null);
  const key = `${patientId}:${weeks}:${attempt}`;
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${patientApiUrl()}/api/v1/patients/${encodeURIComponent(patientId)}/analytics?weeks=${weeks}`, {
      signal: controller.signal, cache: "no-store",
    }).then(async (response) => {
      if (!response.ok) throw new Error(`Analytics unavailable (${response.status}).`);
      const data = await response.json() as PatientAnalytics;
      if (!controller.signal.aborted) setResult({ key, data });
    }).catch((error) => {
      if (!controller.signal.aborted) setResult({ key, error: error.message });
    });
    return () => controller.abort();
  }, [patientId, weeks, key]);
  const data = result?.key === key ? result.data : undefined;
  const error = result?.key === key ? result.error : undefined;

  return (
    <section className="mt-12" aria-labelledby="patient-analytics-title">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <PlotLabel>Tiger Data · continuous analytics</PlotLabel>
          <h2 id="patient-analytics-title" className="mt-3 text-2xl font-medium">Change over time.</h2>
        </div>
        <label className="text-sm">Window
          <select aria-label="Analytics window" value={weeks} onChange={(event) => setWeeks(Number(event.target.value))}
            className="target ml-3 rounded-[var(--r-pill)] border border-[var(--line)] bg-[var(--surface)] px-4">
            <option value={4}>4 weeks</option><option value={8}>8 weeks</option><option value={14}>14 weeks</option>
          </select>
        </label>
      </div>
      <p className="mt-3 max-w-[65ch] text-sm leading-6 text-[var(--text-2)]">
        Synthetic exercise observations, grouped into Monday-start UTC weeks.
        Changes describe this demo dataset—not disease progression or a diagnosis.
      </p>
      {!data && !error && <p role="status" className="mt-5">Loading weekly aggregates…</p>}
      {error && <p role="alert" className="mt-5">{error} <button className="target underline" onClick={() => setAttempt(attempt + 1)}>Retry</button></p>}
      {data && <>
        <p className="mt-4 font-mono text-xs leading-6 text-[var(--text-3)]">
          {data.observation_count.toLocaleString()} metric observations · Latest week: {data.latest_week?.slice(0, 10) ?? "none"}
          <br />Window ends at the latest recorded week, not today. Rollups refresh every {data.refresh_interval_minutes} minutes.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {data.series.map((series) => {
            const latest = series.points.at(-1);
            const min = Math.min(...series.points.map((p) => p.minimum));
            const max = Math.max(...series.points.map((p) => p.maximum));
            const span = Math.max(max - min, 0.01);
            const firstTime = Date.parse(series.points[0]?.week ?? "");
            const lastTime = Date.parse(latest?.week ?? "");
            const x = (week: string) => 12 + (Date.parse(week) - firstTime) / Math.max(lastTime - firstTime, 1) * 276;
            const y = (value: number) => 100 - (value - min) / span * 80;
            return <Panel key={series.metric} className="min-w-0 p-5">
              <h3 className="font-medium">{series.label}</h3>
              <p className="mt-3 text-3xl tabular-nums">{latest ? latest.mean.toFixed(series.precision) : "—"} <span className="text-sm text-[var(--text-3)]">{series.unit}</span></p>
              <p className="mt-2 text-xs text-[var(--text-2)]">{series.delta === null ? "No consecutive-week comparison" : `${series.delta > 0 ? "+" : ""}${series.delta.toFixed(series.precision)} ${series.unit} vs previous week`}</p>
              {latest && <svg viewBox="0 0 300 125" className="mt-5 w-full text-[var(--brand)]" role="img" aria-label={`${series.label} weekly means and observed ranges; exact values in the table below`}>
                {series.points.map((point, index) => {
                  const previous = series.points[index - 1];
                  const consecutive = previous && Date.parse(point.week) - Date.parse(previous.week) === 604800000;
                  return <g key={point.week}>
                    {consecutive && <line x1={x(previous.week)} y1={y(previous.mean)} x2={x(point.week)} y2={y(point.mean)} stroke="currentColor" strokeWidth="2" />}
                    <line x1={x(point.week)} x2={x(point.week)} y1={y(point.minimum)} y2={y(point.maximum)} stroke="currentColor" strokeWidth="5" opacity="0.18" />
                    <circle cx={x(point.week)} cy={y(point.mean)} r="3" fill="currentColor" />
                  </g>;
                })}
              </svg>}
              <p className="mt-2 text-xs text-[var(--text-3)]">Dots: weekly mean · bars: observed range. Each chart uses its own vertical scale.</p>
              <details className="mt-4 border-t border-[var(--line)] pt-4">
                <summary className="cursor-pointer text-sm">Weekly values &amp; variability</summary>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs tabular-nums">
                    <caption className="sr-only">{series.label} in {series.unit}; SD is within-week standard deviation</caption>
                    <thead><tr><th scope="col" className="py-2">Week</th><th scope="col">Mean</th><th scope="col">SD</th><th scope="col">N</th></tr></thead>
                    <tbody>{series.points.map((point) => <tr key={point.week} className="border-t border-[var(--line)]">
                      <th scope="row" className="py-2 font-normal">{point.week.slice(5, 10)}</th>
                      <td>{point.mean.toFixed(series.precision)}</td><td>{point.variability.toFixed(series.precision)}</td><td>{point.sample_count}</td>
                    </tr>)}</tbody>
                  </table>
                </div>
              </details>
            </Panel>;
          })}
        </div>
        <details className="mt-4 rounded-[var(--r)] border border-[var(--line)] p-5 text-sm">
          <summary className="cursor-pointer font-medium">What Tiger Data is doing here</summary>
          <p className="mt-3 max-w-[70ch] leading-6 text-[var(--text-2)]">
            Measurements live in a time-partitioned hypertable. A continuous aggregate
            precomputes weekly counts, averages, ranges and variability in PostgreSQL.
            This screen reads those summaries, with real-time aggregation for newer data,
            instead of downloading every raw observation. No speedup is claimed from this small demo dataset.
          </p>
        </details>
      </>}
    </section>
  );
}
