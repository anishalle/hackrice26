"""Synthetic patient records and Tiger Data weekly analytics."""

from alembic import op

revision = "20260913_0003"
down_revision = "20260913_0002"
branch_labels = None
depends_on = None


def upgrade():
    # Explicitly require TimescaleDB: never silently replace the hackathon's
    # analytics engine with an ordinary table/view.
    op.execute("CREATE EXTENSION IF NOT EXISTS timescaledb")
    op.execute("""
        CREATE TABLE patients (
            id text PRIMARY KEY,
            record jsonb NOT NULL,
            is_synthetic boolean NOT NULL DEFAULT true CHECK (is_synthetic),
            created_at timestamptz NOT NULL DEFAULT now()
        )
    """)
    op.execute("""
        CREATE TABLE patient_measurements (
            patient_id text NOT NULL REFERENCES patients(id),
            recorded_at timestamptz NOT NULL,
            metric text NOT NULL CHECK (metric IN
                ('speaking_rate', 'pause_seconds', 'tap_accuracy')),
            value double precision NOT NULL CHECK
                (value >= 0 AND value < 'Infinity'::float8),
            is_synthetic boolean NOT NULL DEFAULT true CHECK (is_synthetic),
            PRIMARY KEY (patient_id, recorded_at, metric)
        )
    """)
    op.execute("""
        SELECT create_hypertable('patient_measurements', 'recorded_at',
            chunk_time_interval => INTERVAL '4 weeks')
    """)
    op.execute("""
        CREATE MATERIALIZED VIEW patient_weekly_metrics
        WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
        SELECT patient_id, metric,
            time_bucket(INTERVAL '1 week', recorded_at) AS week,
            count(*) AS sample_count, avg(value) AS mean,
            min(value) AS minimum, max(value) AS maximum,
            stddev_pop(value) AS variability
        FROM patient_measurements
        GROUP BY patient_id, metric, time_bucket(INTERVAL '1 week', recorded_at)
        WITH NO DATA
    """)
    op.execute("""
        SELECT add_continuous_aggregate_policy('patient_weekly_metrics',
            start_offset => INTERVAL '1 year', end_offset => INTERVAL '1 hour',
            schedule_interval => INTERVAL '15 minutes')
    """)


def downgrade():
    op.execute("DROP MATERIALIZED VIEW patient_weekly_metrics")
    op.execute("DROP TABLE patient_measurements")
    op.execute("DROP TABLE patients")
