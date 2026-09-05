from __future__ import annotations

import argparse
import socket
import sys
import time
from pathlib import Path

import psycopg2


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.database import (
    DB_GSSENCMODE,
    DB_HOST,
    DB_NAME,
    DB_PASSWORD,
    DB_PORT,
    DB_SSLMODE,
    DB_USER,
)


TRANSACTION_POOLER_PORT = 6543


def _connect(port: int):
    return psycopg2.connect(
        host=DB_HOST,
        port=port,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        sslmode=DB_SSLMODE,
        gssencmode=DB_GSSENCMODE,
        connect_timeout=8,
        application_name="recoverflow-local-check",
    )


def _probe(port: int) -> tuple[bool, str]:
    connection = None
    cursor = None
    try:
        connection = _connect(port)
        cursor = connection.cursor()
        cursor.execute("SELECT 1")
        value = cursor.fetchone()[0]
        return True, f"SELECT 1 = {value}"
    except Exception as exc:
        message = " ".join(str(exc).splitlines())
        return False, f"{type(exc).__name__}: {message}"
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()


def _tcp_open(port: int) -> bool:
    try:
        with socket.create_connection((DB_HOST, port), timeout=5):
            return True
    except OSError:
        return False


def _candidate_ports() -> list[int]:
    ports = [DB_PORT]
    if DB_HOST and DB_HOST.endswith(".pooler.supabase.com") and DB_PORT == 5432:
        ports.append(TRANSACTION_POOLER_PORT)
    return ports


def resolve_port(verbose: bool = True) -> int | None:
    errors: dict[int, str] = {}

    for index, port in enumerate(_candidate_ports()):
        attempts = 3 if index == 0 else 2

        if index > 0 and verbose:
            print(
                "[INFO] Supabase session pooler 5432 did not accept a PostgreSQL "
                "session. Trying transaction pooler 6543..."
            )

        for attempt in range(1, attempts + 1):
            ok, message = _probe(port)
            if ok:
                if verbose:
                    print(f"DB_PORT_SELECTED={port}")
                    print(message)
                    if port != DB_PORT:
                        print(
                            "[INFO] Local development will use Supabase transaction "
                            "pooler port 6543 for this session."
                        )
                return port

            errors[port] = message
            if verbose and attempt < attempts:
                print(
                    f"[INFO] Database connection attempt {attempt}/{attempts} "
                    f"on port {port} failed; retrying in 3 seconds..."
                )
                time.sleep(3)

    if verbose:
        print("[WARN] Local PostgreSQL connection is unavailable on all supported pooler ports.")
        for port in _candidate_ports():
            state = "open" if _tcp_open(port) else "closed"
            print(f"TCP_{port}={state}")
            if port in errors:
                print(f"DB_ERROR_{port}={errors[port]}")
        print(
            "[INFO] This does not imply production is down. Local tooling can fall "
            "back to the deployed Render Test Mode API."
        )

    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="RecoverFlow Supabase connectivity probe")
    parser.add_argument("--target", action="store_true")
    parser.add_argument("--resolve-port", action="store_true")
    parser.add_argument("--port", type=int)
    args = parser.parse_args()

    if args.target:
        print(DB_HOST)
        print(DB_PORT)
        return 0

    if args.port is not None:
        ok, message = _probe(args.port)
        if ok:
            print(f"DB_PORT_SELECTED={args.port}")
            print(message)
            return 0
        print(f"DB_ERROR_{args.port}={message}")
        return 1

    selected = resolve_port(verbose=not args.resolve_port)
    if selected is None:
        if args.resolve_port:
            print("DB_UNAVAILABLE")
        return 1

    if args.resolve_port:
        print(selected)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
