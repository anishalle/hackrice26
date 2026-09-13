#!/usr/bin/env python3
"""Run with `uv run python deploy/manage.py --help` from this checkout."""

import argparse
import os
import secrets
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = ROOT / "deploy/private"
REMOTE_DIR = "apps/aide"
AZURE = "ani@20.112.123.120"
SSH_OPTIONS = ["-o", "BatchMode=yes", "-o", "ConnectTimeout=10"]


def run(args, **kwargs):
    return subprocess.run(args, check=True, text=True, **kwargs)


def ssh(host, command, **kwargs):
    return run(["ssh", *SSH_OPTIONS, host, command], **kwargs)


def write_private(path, content):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    path.write_text(content)
    path.chmod(0o600)


def initialize(host):
    from cryptography.fernet import Fernet

    from app.core.config import Settings

    # Check access before generating credentials or changing either server.
    ssh(host, "docker info >/dev/null && sudo -n true")
    ssh(host, f"test ! -e {REMOTE_DIR}/deploy/private/backend.env")
    config = Settings(_env_file=ROOT / ".env")
    required = [
        "DATABASE_URL",
        "HERMES_API_KEY",
        "BROWSER_USE_API_KEY",
        "ELEVENLABS_API_KEY",
    ]
    missing = [name for name in required if getattr(config, name) is None]
    if missing:
        raise SystemExit("Missing .env values: " + ", ".join(missing))
    env_path = PRIVATE / "backend.env"
    if not env_path.exists():
        values = {}
        for name in type(config).model_fields:
            value = getattr(config, name)
            if value is not None:
                if hasattr(value, "get_secret_value"):
                    value = value.get_secret_value()
                values[name] = (
                    str(value).lower() if isinstance(value, bool) else str(value)
                )
        values["BACKEND_API_KEY"] = values.get(
            "BACKEND_API_KEY"
        ) or secrets.token_urlsafe(48)
        values["VOICE_SAMPLE_ENCRYPTION_KEY"] = (
            values.get("VOICE_SAMPLE_ENCRYPTION_KEY") or Fernet.generate_key().decode()
        )
        values["FASTAPI_ENV"] = "production"
        if any("\n" in value or "\r" in value for value in values.values()):
            raise SystemExit("Environment values must be single-line")
        write_private(env_path, "".join(f"{k}={v}\n" for k, v in values.items()))
        # Separate client fragment: no provider credentials.
        write_private(
            PRIVATE / "client.env",
            "EXPO_PUBLIC_BACKEND_API_KEY=" + values["BACKEND_API_KEY"] + "\n",
        )
    key = PRIVATE / "ssh/id_ed25519"
    key.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if not key.exists():
        run(
            [
                "ssh-keygen",
                "-q",
                "-t",
                "ed25519",
                "-N",
                "",
                "-C",
                "aide-hermes-tunnel",
                "-f",
                str(key),
            ]
        )
    # Obtain the host key through the already-authenticated Azure SSH connection.
    host_key = ssh(
        AZURE, "cat /etc/ssh/ssh_host_ed25519_key.pub", capture_output=True
    ).stdout.strip()
    write_private(key.parent / "known_hosts", "20.112.123.120 " + host_key + "\n")
    public_key = key.with_suffix(".pub").read_text().strip()
    # This key can forward only to Hermes; it cannot open a shell or a PTY.
    authorized = (
        'restrict,port-forwarding,permitopen="127.0.0.1:8642",'
        'command="/bin/false" ' + public_key
    )
    ssh(
        AZURE,
        "umask 077; mkdir -p ~/.ssh; touch ~/.ssh/authorized_keys; "
        'IFS= read -r key; grep -qxF "$key" ~/.ssh/authorized_keys || '
        "printf '%s\\n' \"$key\" >> ~/.ssh/authorized_keys",
        input=authorized + "\n",
    )
    ssh(host, f"umask 077; mkdir -p {REMOTE_DIR}/deploy/private/ssh")
    # Never overwrite a live encryption key on a repeated init.
    ssh(host, f"test ! -e {REMOTE_DIR}/deploy/private/backend.env")
    run(
        [
            "scp",
            *SSH_OPTIONS,
            str(env_path),
            f"{host}:{REMOTE_DIR}/deploy/private/backend.env",
        ]
    )
    run(
        [
            "scp",
            *SSH_OPTIONS,
            str(key),
            str(key.parent / "known_hosts"),
            f"{host}:{REMOTE_DIR}/deploy/private/ssh/",
        ]
    )
    ssh(
        host,
        f"sudo chown -R 10001:10001 {REMOTE_DIR}/deploy/private/ssh && "
        f"sudo chmod 700 {REMOTE_DIR}/deploy/private/ssh",
    )
    print("Initialized. Back up deploy/private; client key is in client.env.")


def push(host):
    ssh(
        host,
        f"test -f {REMOTE_DIR}/deploy/private/backend.env && docker info >/dev/null",
    )
    # Explicit allowlist: do not transfer local env, databases, or unrelated apps.
    run(
        [
            "rsync",
            "-az",
            "--relative",
            "--exclude=__pycache__",
            "--exclude=*.pyc",
            "--exclude=private",
            "-e",
            "ssh " + " ".join(SSH_OPTIONS),
            "Dockerfile",
            ".dockerignore",
            "docker-compose.yml",
            "pyproject.toml",
            "uv.lock",
            "alembic.ini",
            "alembic",
            "backend/app",
            "backend/README.md",
            "deploy",
            f"{host}:{REMOTE_DIR}/",
        ],
        cwd=ROOT,
    )
    ssh(
        host,
        f"cd {REMOTE_DIR} && docker compose config -q && docker compose build && "
        "docker compose up -d --wait --wait-timeout 120",
    )
    smoke(host)


def smoke(host):
    code = """import httpx, os
base = "http://127.0.0.1:8000"
assert httpx.get(base + "/api/v1/health").status_code == 200
assert httpx.post(base + "/api/v1/agents/sessions", json={}).status_code == 401
headers = {"X-API-Key": os.environ["BACKEND_API_KEY"]}
assert httpx.get(base + "/api/v1/openapi.json", headers=headers).status_code == 200
r = httpx.get(os.environ["HERMES_BASE_URL"] + "/v1/axl/capabilities",
    headers={"Authorization": "Bearer " + os.environ["HERMES_API_KEY"]}, timeout=15)
assert r.status_code == 200 and r.json().get("version") == 1
print("Health, API authentication, and Hermes tunnel/capabilities passed.")
"""
    ssh(host, f"cd {REMOTE_DIR} && docker compose exec -T api python -", input=code)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "action",
        choices=["init", "push", "status", "logs", "restart", "check", "migrate"],
    )
    parser.add_argument("--host", default="ubuntu@34.200.110.216")
    args = parser.parse_args()
    os.umask(0o077)
    if args.action == "init":
        initialize(args.host)
    elif args.action == "push":
        push(args.host)
    elif args.action == "check":
        smoke(args.host)
    elif args.action == "migrate":
        ssh(
            args.host,
            f"cd {REMOTE_DIR} && "
            "docker compose run --rm --no-deps api alembic upgrade head",
        )
    else:
        command = {"status": "ps", "logs": "logs --tail=100", "restart": "restart"}[
            args.action
        ]
        ssh(args.host, f"cd {REMOTE_DIR} && docker compose {command}")


if __name__ == "__main__":
    main()
