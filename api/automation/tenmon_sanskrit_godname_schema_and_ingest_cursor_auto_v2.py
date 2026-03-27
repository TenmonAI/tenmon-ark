#!/usr/bin/env python3
"""
TENMON_SANSKRIT_GODNAME_SCHEMA_AND_INGEST_CURSOR_AUTO_V2
- npm run build 後、dist の ingest をサンプルで検証する。
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
SAMPLE = API_ROOT / "automation/samples/tenmon_sanskrit_godname_table_v1.sample.json"
RUNNER = API_ROOT / "scripts/run_sanskrit_godname_ingest_sample.mjs"


def _run_node_ingest(data: object) -> tuple[int, dict]:
    import tempfile

    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
        path = f.name
    try:
        p = subprocess.run(
            ["node", str(RUNNER), path],
            cwd=str(API_ROOT),
            capture_output=True,
            text=True,
        )
        out = p.stdout.strip()
        try:
            parsed = json.loads(out) if out else {}
        except json.JSONDecodeError:
            parsed = {"_raw": out, "_stderr": p.stderr}
        return p.returncode, parsed
    finally:
        Path(path).unlink(missing_ok=True)


def main() -> int:
    subprocess.run(["npm", "run", "build"], cwd=str(API_ROOT), check=True)

    if not SAMPLE.is_file():
        print("missing sample:", SAMPLE, file=sys.stderr)
        return 2

    rc, good = _run_node_ingest(json.loads(SAMPLE.read_text(encoding="utf-8")))
    if rc != 0 or not good.get("ok"):
        print("FAIL: good sample", good, file=sys.stderr)
        return 1

    rc_empty, bad_empty = _run_node_ingest({})
    if rc_empty == 0 or "empty_object_rejected" not in str(bad_empty.get("rejected", [])):
        print("FAIL: empty object should reject", bad_empty, file=sys.stderr)
        return 1

    no_gen = json.loads(SAMPLE.read_text(encoding="utf-8"))
    del no_gen["generation_order"]
    rc_ng, bad_ng = _run_node_ingest(no_gen)
    if rc_ng == 0:
        print("FAIL: missing generation_order should reject", file=sys.stderr)
        return 1

    no_reason = json.loads(SAMPLE.read_text(encoding="utf-8"))
    no_reason["sanskrit_candidates"] = [{"candidate": "x", "reason": ""}]
    rc_nr, bad_nr = _run_node_ingest(no_reason)
    if rc_nr == 0:
        print("FAIL: empty candidate reason should reject", file=sys.stderr)
        return 1

    out = {
        "ok": True,
        "card": "TENMON_SANSKRIT_GODNAME_SCHEMA_AND_INGEST_CURSOR_AUTO_V2",
        "schema_ready": True,
        "ingest_ready": True,
        "validation_failclosed_ready": True,
        "rollback_used": False,
        "nextOnPass": "TENMON_SANSKRIT_ROOT_ENGINE_AND_TENMON_MAPPER_CURSOR_AUTO_V2",
        "nextOnFail": "TENMON_SANSKRIT_GODNAME_SCHEMA_TRACE_CURSOR_AUTO_V1",
        "sample_ingest_ok": good.get("ok"),
        "ledger_rows": len(good.get("ledger", [])),
    }
    out_path = API_ROOT / "automation/tenmon_sanskrit_godname_schema_and_ingest_cursor_auto_v2.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
