"""Start a throwaway server on a fresh SQLite file, run scripts/acceptance.py
against it, then stop the server. Your real tenda.db is never touched.

Usage:  python scripts/run_acceptance.py
"""
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
PORT = 8010


def main() -> int:
    tmp = Path(tempfile.mkdtemp(prefix="tenda_acceptance_"))
    env = {
        **os.environ,
        # ACCEPTANCE_DATABASE_URL runs it against e.g. an empty Postgres instead (it must be empty)
        "DATABASE_URL": os.environ.get("ACCEPTANCE_DATABASE_URL") or f"sqlite+aiosqlite:///{(tmp / 'acceptance.db').as_posix()}",
        "PYTHONIOENCODING": "utf-8",
    }
    log = open(tmp / "server.log", "w", encoding="utf-8")
    server = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--port", str(PORT)],
        cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT,
    )
    try:
        for _ in range(60):
            try:
                if httpx.get(f"http://127.0.0.1:{PORT}/health", timeout=1).status_code == 200:
                    break
            except httpx.HTTPError:
                time.sleep(0.5)
        else:
            print("Server did not start; see", tmp / "server.log")
            return 1
        return subprocess.call([sys.executable, str(ROOT / "scripts" / "acceptance.py"), f"http://127.0.0.1:{PORT}"], cwd=ROOT)
    finally:
        server.terminate()
        server.wait(timeout=10)
        log.close()


if __name__ == "__main__":
    sys.exit(main())
