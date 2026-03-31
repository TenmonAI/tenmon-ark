#!/usr/bin/env python3
"""
Bind kokuzo_laws name/definition/evidenceIds for existing rows.

Phase 4 helper script.
"""

from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path


def data_dir() -> Path:
    return Path(os.environ.get("TENMON_DATA_DIR", "/opt/tenmon-ark-data"))


def main() -> int:
    db_path = data_dir() / "kokuzo.sqlite"
    if not db_path.exists():
        print(f"[WARN] kokuzo db not found: {db_path}")
        return 0

    con = sqlite3.connect(str(db_path))
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    rows = cur.execute(
        "SELECT id, doc, pdfPage, quote, name, definition, evidenceIds FROM kokuzo_laws ORDER BY id ASC"
    ).fetchall()

    updated = 0
    for row in rows:
        name = row["name"]
        definition = row["definition"]
        evidence_ids = row["evidenceIds"]
        doc = str(row["doc"] or "").strip()
        page = int(row["pdfPage"] or 0)
        quote = str(row["quote"] or "").strip()

        changed = False
        if not name:
            name = f"{doc} P{page}"
            changed = True
        if not definition:
            definition = quote[:200] if quote else f"{doc} page {page}"
            changed = True
        if not evidence_ids:
            evidence_ids = json.dumps([f"KZPAGE:{doc}:P{page}"], ensure_ascii=False)
            changed = True

        if changed:
            cur.execute(
                "UPDATE kokuzo_laws SET name=?, definition=?, evidenceIds=? WHERE id=?",
                (name, definition, evidence_ids, int(row["id"])),
            )
            updated += 1

    con.commit()
    con.close()
    print(f"[OK] updated_rows={updated}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
