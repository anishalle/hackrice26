"""Run `uv run python -m app.services.seed_patients` after migrations.

Additive and idempotent: existing patient edits and measurements are never
overwritten. Fixed dates/random seed make the demo reproducible.
"""

import json
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import text

from app.core.db import get_engine


def seed():
    patients = json.loads(
        Path(__file__).resolve().parents[1].joinpath("patient_seed.json").read_text()
    )
    rng = random.Random(26)
    start = datetime(2026, 6, 8, 12, tzinfo=timezone.utc)
    rows = []
    with get_engine().begin() as conn:
        for index, patient in enumerate(patients):
            conn.execute(
                text("""
                INSERT INTO patients (id, record) VALUES (:id, CAST(:record AS jsonb))
                ON CONFLICT (id) DO UPDATE SET record =
                    patients.record || jsonb_build_object('records',
                        COALESCE(patients.record->'records',
                                 EXCLUDED.record->'records'))
            """),
                {"id": patient["id"], "record": json.dumps(patient)},
            )
            for week in range(14):
                # Different slopes illustrate change, stability and improvement.
                slope = [-2.1, 0.1, -0.5, 0.4, -1.0, 0.0][index]
                for day in (0, 2, 4):
                    for hour in (0, 7):
                        at = start + timedelta(weeks=week, days=day, hours=hour)
                        values = {
                            "speaking_rate": 162
                            - index * 3
                            + slope * week
                            + rng.uniform(-4, 4)
                            - (3 if hour else 0),
                            "pause_seconds": 0.5
                            + index * 0.02
                            - slope * week * 0.01
                            + rng.uniform(-0.06, 0.06),
                            "tap_accuracy": 97
                            - index
                            + min(slope, 0) * week * 0.22
                            + rng.uniform(-1, 1),
                        }
                        for metric, value in values.items():
                            rows.append(
                                dict(
                                    patient_id=patient["id"],
                                    recorded_at=at,
                                    metric=metric,
                                    value=round(value, 3),
                                )
                            )
        conn.execute(
            text("""
            INSERT INTO patient_measurements
                (patient_id, recorded_at, metric, value)
            VALUES (:patient_id, :recorded_at, :metric, :value)
            ON CONFLICT DO NOTHING
        """),
            rows,
        )
    # CALL refresh requires a top-level transaction, separate from seed writes.
    with get_engine().connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(
            text("""
            CALL refresh_continuous_aggregate('patient_weekly_metrics',
                TIMESTAMPTZ '2026-06-08', TIMESTAMPTZ '2026-09-14')
        """)
        )
    print(
        f"Seed complete: {len(patients)} synthetic patients; "
        f"{len(rows)} measurements prepared (existing rows preserved)."
    )


if __name__ == "__main__":
    seed()
