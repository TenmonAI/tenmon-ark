#!/usr/bin/env python3
"""
tenmon_kokuzo_laws_name_bind_v1

kokuzo_laws の name / definition が NULL の行について、
doc='KHS' を対象に khs_laws から (doc, pdfPage) 結合で補完する。
"""

from __future__ import annotations

import argparse
import sqlite3
from dataclasses import dataclass
from pathlib import Path


DEFAULT_DB_PATH = Path("/opt/tenmon-ark-data/kokuzo.sqlite")


@dataclass
class BindStats:
    before_non_null_name: int
    target_rows_before: int
    updated_rows: int
    after_non_null_name: int
    remaining_null_targets: int


def run_bind(db_path: Path) -> BindStats:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.cursor()

        before_non_null_name = cur.execute(
            "SELECT COUNT(*) FROM kokuzo_laws WHERE name IS NOT NULL"
        ).fetchone()[0]

        target_rows_before = cur.execute(
            """
            SELECT COUNT(*)
            FROM kokuzo_laws
            WHERE doc = 'KHS'
              AND (name IS NULL OR definition IS NULL)
            """
        ).fetchone()[0]

        updated_rows = cur.execute(
            """
            UPDATE kokuzo_laws
               SET name = COALESCE(
                     name,
                     (
                       SELECT kl.name
                         FROM khs_laws AS kl
                        WHERE kl.doc = kokuzo_laws.doc
                          AND kl.pdfPage = kokuzo_laws.pdfPage
                          AND kl.name IS NOT NULL
                        LIMIT 1
                     )
                   ),
                   definition = COALESCE(
                     definition,
                     (
                       SELECT kl.definition
                         FROM khs_laws AS kl
                        WHERE kl.doc = kokuzo_laws.doc
                          AND kl.pdfPage = kokuzo_laws.pdfPage
                          AND kl.definition IS NOT NULL
                        LIMIT 1
                     )
                   )
             WHERE doc = 'KHS'
               AND (name IS NULL OR definition IS NULL)
               AND EXISTS (
                     SELECT 1
                       FROM khs_laws AS kl
                      WHERE kl.doc = kokuzo_laws.doc
                        AND kl.pdfPage = kokuzo_laws.pdfPage
                        AND (kl.name IS NOT NULL OR kl.definition IS NOT NULL)
                   )
            """
        ).rowcount

        conn.commit()

        after_non_null_name = cur.execute(
            "SELECT COUNT(*) FROM kokuzo_laws WHERE name IS NOT NULL"
        ).fetchone()[0]

        remaining_null_targets = cur.execute(
            """
            SELECT COUNT(*)
            FROM kokuzo_laws
            WHERE doc = 'KHS'
              AND (name IS NULL OR definition IS NULL)
            """
        ).fetchone()[0]

        return BindStats(
            before_non_null_name=before_non_null_name,
            target_rows_before=target_rows_before,
            updated_rows=updated_rows,
            after_non_null_name=after_non_null_name,
            remaining_null_targets=remaining_null_targets,
        )
    finally:
        conn.close()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Bind kokuzo_laws.name/definition from khs_laws for doc=KHS"
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_DB_PATH,
        help=f"SQLite DB path (default: {DEFAULT_DB_PATH})",
    )
    args = parser.parse_args()

    if not args.db.exists():
        raise SystemExit(f"DB not found: {args.db}")

    stats = run_bind(args.db)

    print("tenmon_kokuzo_laws_name_bind_v1")
    print(f"db={args.db}")
    print(f"before_non_null_name={stats.before_non_null_name}")
    print(f"target_rows_before={stats.target_rows_before}")
    print(f"updated_rows={stats.updated_rows}")
    print(f"after_non_null_name={stats.after_non_null_name}")
    print(f"remaining_null_targets={stats.remaining_null_targets}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
