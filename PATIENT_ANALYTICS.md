# Synthetic patient analytics on Tiger Data

## Demo flow

Open `/clinician`, choose **Open record**, and scroll to **Change over time**.
Switch between 4, 8 and 14 weeks, open the exact-value tables, and compare
patients. The capability controls still drive the patient's preview. Use
**Save profile to database** to persist those controls; otherwise they remain
local preview overrides. The existing **Full record** sections remain available.

All six patients and all measurements are synthetic. No real voice samples are
analyzed or associated with these identities. Amber indicates a nonzero rounded
weekly change, not a clinical warning. The charts are descriptive, not diagnostic.
Other full-record sections (voice-bank counts, functional scores, recording
metadata, etc.) retain the original synthetic fixtures, now stored in PostgreSQL.
Their example dates are independent of the generated measurement timeline.

## Setup

From the repository root, using the existing `DATABASE_URL` in `.env`:

```sh
uv run alembic upgrade head
uv run python -m app.services.seed_patients
```

The configured database has already been migrated and seeded. The seed is
deterministic and additive: six identities, 14 weeks from June 8 to September 13,
2026, six exercise sessions per week and three metrics per session = 1,512 metric
observations. Re-running preserves existing profile edits and measurement values.
It fills missing legacy record metadata without overwriting existing metadata.
It does not create users, consent, cloned voices, or actual audio for demo patients.

Frontend uses the existing `NEXT_PUBLIC_BACKEND_URL`. No database credentials
belong in frontend environment variables. Restart the API if it is not using reload.

## What is actually using Tiger Data

| Database object | Purpose |
| --- | --- |
| `patients` | Stable demo ID, synthetic-only flag, JSONB display/avatar/capability/legacy record metadata |
| `patient_measurements` | TimescaleDB hypertable, 4-week chunks, composite primary key `(patient_id, recorded_at, metric)` |
| `patient_weekly_metrics` | Continuous aggregate: weekly count, mean, minimum, maximum and population standard deviation per patient/metric |
| Refresh policy | Recomputes the trailing year every 15 minutes, excluding the newest hour |

The UI queries precomputed weekly aggregates rather than fetching all raw
observations. `timescaledb.materialized_only=false` enables real-time aggregation
above the materialization watermark. Inserts into already materialized weeks
appear after the next policy refresh (or a manual refresh), not necessarily
immediately. Seed setup explicitly refreshes its entire fixed time range.

Weeks start Monday in UTC. The analytics window ends at the **latest observation**,
not the wall clock; this makes the fixed demo reproducible and explicitly exposes
the latest week. Missing weeks are not filled with zeros or interpolated. Deltas
are only computed across consecutive weeks. N counts metric observations, not
patients or completed check-ins. The original voice-bank weekly history still
uses viewer-local weeks and is a separate feature.

This is a real Timescale continuous aggregate, not just a Tiger Data badge on
ordinary PostgreSQL queries. No performance multiplier is claimed for 1,512 rows.
Timescale Toolkit and pgvector remain installed; neither is required by these
descriptive charts. Existing skill retrieval/voice/browser features are unchanged.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/v1/patients` | Caseload, profiles, latest trends, weekly check-ins, synthetic record sections |
| GET | `/api/v1/patients/{id}` | One patient; unknown ID returns 404 |
| GET | `/api/v1/patients/{id}/analytics?weeks=14` | Weekly metric series, consecutive-week deltas, counts and provenance; window constrained to 2–52 weeks |
| PUT | `/api/v1/patients/{id}/profile` | Persist all five capability axes, integers 0–3; no arbitrary metadata updates |

Example PUT body:

```json
{"vision":3,"hearing":3,"motor":2,"speech":2,"cognitive":3}
```

These are **synthetic-only demo routes**, not authenticated clinical APIs.
Clinician assignment/consent gates in the existing UI are still demo behavior,
not server-side authorization. Do not use these routes for real medical data
without authenticated clinician identity, patient consent, row-level access,
audit records and an appropriate privacy/security review. Profile writes are
last-write-wins; production collaboration needs revision/conflict handling.

## Inspect in DBeaver

```sql
SELECT id, record->>'name' AS name, is_synthetic FROM patients;
SELECT * FROM patient_measurements ORDER BY recorded_at DESC LIMIT 30;
SELECT * FROM patient_weekly_metrics
WHERE patient_id = 'anish' ORDER BY week DESC, metric;

SELECT hypertable_name, num_chunks
FROM timescaledb_information.hypertables
WHERE hypertable_name = 'patient_measurements';

SELECT view_name, materialized_only
FROM timescaledb_information.continuous_aggregates
WHERE view_name = 'patient_weekly_metrics';

SELECT job_id, schedule_interval, config
FROM timescaledb_information.jobs
WHERE proc_name = 'policy_refresh_continuous_aggregate';
```

## Verification

`uv run pytest` covers empty histories, weekly deltas, gaps, windows, unknown IDs,
and profile validation. Live checks also compared every aggregate count/mean
against the raw hypertable, exercised profile round-tripping, and re-ran the seed
without changing counts or saved profiles. Frontend lint/build and browser checks
cover the database-backed caseload, patient switching, window selection and mobile
layout. Test data and audio from real voice-bank users are never modified.

References: [Tiger Data continuous aggregates](https://www.tigerdata.com/learn/continuous-aggregates-timescaledb).
UI disclosure inspiration: [21st.dev card-based accordion](https://21st.dev/community/components/shadcn/accordion/card-based),
implemented with native details/summary and existing Aide styles, without new dependencies.
