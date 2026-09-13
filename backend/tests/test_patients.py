from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.api.routes import patients
from app.db_models import Patient


def example_patient():
    return Patient(
        id="demo",
        is_synthetic=True,
        record={
            "name": "Synthetic",
            "profile": dict(vision=3, hearing=3, motor=2, speech=2, cognitive=3),
        },
    )


def observation(week, value):
    return dict(
        patient_id="demo",
        metric="speaking_rate",
        week=week,
        sample_count=6,
        mean=value,
        minimum=value - 2,
        maximum=value + 2,
        variability=1.2,
    )


def test_empty_patient_is_explicit():
    result = patients.serialize_patient(example_patient(), [])
    assert result["is_synthetic"] is True
    assert result["trends"] == result["checkins"] == []
    assert result["since"] == "0 recorded weeks"


def test_weekly_delta_and_order():
    week = datetime(2026, 9, 7, tzinfo=timezone.utc)
    rows = [observation(week - timedelta(weeks=1), 140), observation(week, 135)]
    result = patients.serialize_patient(example_patient(), rows)
    assert result["trends"][0]["delta"] == "-5.0 wpm vs previous week"
    assert result["checkins"][0]["id"] == week.isoformat()
    assert result["trends"][0]["tone"] == "amber"


def test_missing_week_is_not_reported_as_weekly_change():
    week = datetime(2026, 9, 7, tzinfo=timezone.utc)
    rows = [observation(week, 135), observation(week - timedelta(weeks=2), 140)]
    result = patients.serialize_patient(example_patient(), rows)
    assert result["trends"][0]["delta"] == "No prior-week comparison"


class FakeSession:
    def get(self, model, patient_id):
        return example_patient() if patient_id == "demo" else None


def test_analytics_window_and_no_cross_patient_leak(monkeypatch):
    week = datetime(2026, 9, 7, tzinfo=timezone.utc)
    rows = [observation(week - timedelta(weeks=i), 140 + i) for i in range(14)]

    def query(session, patient_id):
        assert patient_id == "demo"
        return rows

    monkeypatch.setattr(patients, "weekly_rows", query)
    result = patients.patient_analytics("demo", weeks=4, session=FakeSession())
    assert result["observation_count"] == 24
    assert len(result["series"][0]["points"]) == 4
    assert result["series"][0]["delta"] == -1
    with pytest.raises(HTTPException) as error:
        patients.patient_analytics("missing", weeks=4, session=FakeSession())
    assert error.value.status_code == 404


def test_empty_analytics(monkeypatch):
    monkeypatch.setattr(patients, "weekly_rows", lambda *args: [])
    result = patients.patient_analytics("demo", weeks=4, session=FakeSession())
    assert result["latest_week"] is None
    assert result["observation_count"] == 0
    assert all(s["delta"] is None and not s["points"] for s in result["series"])


def test_profile_rejects_invalid_axes():
    profile = example_patient().record["profile"]
    assert patients.CapabilityProfile(**profile).speech == 2
    with pytest.raises(ValidationError):
        patients.CapabilityProfile(**{**profile, "speech": 9})
    with pytest.raises(ValidationError):
        patients.CapabilityProfile(**{**profile, "diagnosis": "not allowed"})
