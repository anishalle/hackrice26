"""Synthetic caseload API. Real clinical access needs server-side ACLs."""

from datetime import timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.db_models import Patient

router = APIRouter(prefix="/patients", tags=["patients"])

METRICS = {
    "speaking_rate": ("Speaking rate", "wpm", "speech", 1),
    "pause_seconds": ("Mean pause", "s", "speech", 2),
    "tap_accuracy": ("Tap accuracy", "%", "motor", 1),
}


class CapabilityProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")
    vision: Literal[0, 1, 2, 3]
    hearing: Literal[0, 1, 2, 3]
    motor: Literal[0, 1, 2, 3]
    speech: Literal[0, 1, 2, 3]
    cognitive: Literal[0, 1, 2, 3]


def weekly_rows(session: Session, patient_id: str | None = None):
    return (
        session.execute(
            text("""
        SELECT patient_id, metric, week, sample_count, mean, minimum, maximum,
            variability FROM patient_weekly_metrics
        WHERE (CAST(:patient_id AS text) IS NULL OR patient_id = :patient_id)
        ORDER BY week DESC, metric
    """),
            {"patient_id": patient_id},
        )
        .mappings()
        .all()
    )


def serialize_patient(patient: Patient, rows):
    record = dict(patient.record)
    record.update(id=patient.id, is_synthetic=True)
    grouped = {}
    for row in rows:
        grouped.setdefault(row["week"], []).append(row)
    weeks = sorted(grouped, reverse=True)
    record["since"] = f"{len(weeks)} recorded weeks"
    record["trends"] = []
    if weeks:
        previous = {
            r["metric"]: r for r in grouped.get(weeks[0] - timedelta(weeks=1), [])
        }
        for row in grouped[weeks[0]]:
            metric = row["metric"]
            label, unit, axis, precision = METRICS[metric]
            prev = previous.get(metric)
            delta = row["mean"] - prev["mean"] if prev else None
            record["trends"].append(
                dict(
                    id=metric,
                    axis=axis,
                    label=label,
                    value=f"{row['mean']:.{precision}f} {unit}",
                    delta=(
                        f"{delta:+.{precision}f} {unit} vs previous week"
                        if delta is not None
                        else "No prior-week comparison"
                    ),
                    tone="amber"
                    if delta is not None and round(delta, precision) != 0
                    else "periwinkle",
                )
            )
    record["checkins"] = [
        dict(
            id=week.isoformat(),
            date=week.strftime("%b %d, %Y"),
            title=f"Week of {week.strftime('%b %d')}",
            summary="Synthetic exercise observations summarized in UTC calendar weeks.",
            flags=[
                dict(
                    tone="periwinkle",
                    text=(
                        f"{METRICS[r['metric']][0]}: "
                        f"{r['mean']:.{METRICS[r['metric']][3]}f} "
                        f"{METRICS[r['metric']][1]} "
                        f"· {r['sample_count']} observations"
                    ),
                )
                for r in grouped[week]
            ],
        )
        for week in weeks
    ]
    # Preserve the demo's other record sections, but use the same database
    # rollups for overlapping speech/motor charts on both screens.
    if "records" in record:
        records = dict(record["records"])
        series = [
            s
            for s in records.get("series", [])
            if s["id"] not in {"rate", "pause", "accuracy"}
        ]
        for metric, (label, unit, _axis, _precision) in METRICS.items():
            points = sorted(
                [r for r in rows if r["metric"] == metric], key=lambda r: r["week"]
            )
            series.append(
                dict(
                    id=metric,
                    label=label,
                    unit=unit,
                    points=[round(r["mean"], _precision) for r in points],
                    labels=[r["week"].strftime("%b %d") for r in points],
                    tone="periwinkle",
                    betterWhen="lower" if metric == "pause_seconds" else "higher",
                    scope="signals",
                    reading=(
                        "Synthetic weekly means from Tiger Data; "
                        "not a clinical assessment."
                    ),
                )
            )
        records["series"] = series
        record["records"] = records
    return record


@router.get("")
def list_patients(session: Session = Depends(get_db)):
    patients = session.scalars(select(Patient).where(Patient.is_synthetic)).all()
    rows = weekly_rows(session)
    return [
        serialize_patient(p, [r for r in rows if r["patient_id"] == p.id])
        for p in sorted(patients, key=lambda p: (not p.record.get("focus"), p.id))
    ]


def required_patient(session, patient_id):
    patient = session.get(Patient, patient_id)
    if patient is None or not patient.is_synthetic:
        raise HTTPException(404, "Synthetic patient not found")
    return patient


@router.get("/{patient_id}")
def get_patient(patient_id: str, session: Session = Depends(get_db)):
    return serialize_patient(
        required_patient(session, patient_id), weekly_rows(session, patient_id)
    )


@router.put("/{patient_id}/profile")
def save_profile(
    patient_id: str, profile: CapabilityProfile, session: Session = Depends(get_db)
):
    patient = required_patient(session, patient_id)
    patient.record = {**patient.record, "profile": profile.model_dump()}
    session.commit()
    return {"patient_id": patient_id, "profile": profile.model_dump()}


@router.get("/{patient_id}/analytics")
def patient_analytics(
    patient_id: str,
    weeks: int = Query(default=14, ge=2, le=52),
    session: Session = Depends(get_db),
):
    required_patient(session, patient_id)
    rows = weekly_rows(session, patient_id)
    last_week = max((r["week"] for r in rows), default=None)
    selected = [r for r in rows if r["week"] >= last_week - timedelta(weeks=weeks - 1)]
    series = []
    for metric, (label, unit, axis, precision) in METRICS.items():
        points = sorted(
            [dict(r) for r in selected if r["metric"] == metric],
            key=lambda r: r["week"],
        )
        delta = None
        if len(points) > 1 and points[-1]["week"] - points[-2]["week"] == timedelta(
            weeks=1
        ):
            delta = round(points[-1]["mean"] - points[-2]["mean"], precision)
        series.append(
            dict(
                metric=metric,
                label=label,
                unit=unit,
                axis=axis,
                precision=precision,
                delta=delta,
                points=points,
            )
        )
    return dict(
        patient_id=patient_id,
        is_synthetic=True,
        engine="Tiger Data / TimescaleDB",
        source="patient_weekly_metrics",
        refresh_interval_minutes=15,
        timezone="UTC",
        latest_week=last_week,
        window="Trailing weeks ending at latest observation",
        observation_count=sum(r["sample_count"] for r in selected),
        series=series,
    )
