from __future__ import annotations

import sys
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import text

from app.database import DB_HOST, DB_PORT, engine


def main() -> int:
    if "--target" in sys.argv:
        print(DB_HOST)
        print(DB_PORT)
        return 0

    connection = None
    try:
        connection = engine.connect()
        value = connection.execute(text("SELECT 1")).scalar()
        print(f"SELECT 1 = {value}")
        return 0
    except Exception as exc:
        message = " ".join(str(exc).splitlines())
        print(f"DB_ERROR={type(exc).__name__}: {message}")
        return 1
    finally:
        if connection is not None:
            connection.close()


if __name__ == "__main__":
    raise SystemExit(main())
