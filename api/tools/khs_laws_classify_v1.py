#!/usr/bin/env python3
import argparse, re, sqlite3, sys, time
from typing import List, Tuple

# Deterministic DEF patterns (strict)
DEF_PATTERNS = [
    re.compile(r".{0,40}とは"),           # "〜とは"
    re.compile(r".{0,40}(と云|といふ|という)"),  # "〜という/といふ/と云"
    re.compile(r".{0,40}の義"),          # "〜の義"
    re.compile(r".{0,40}を.{0,20}と称"), # "〜を…と称"
]

def is_def(quote: str) -> bool:
    q = (quote or "").strip()
    if not q:
        return False
    head = q[:200]  # keep deterministic window
    return any(p.search(head) for p in DEF_PATTERNS)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="/opt/tenmon-ark-data/kokuzo.sqlite")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=1000000)
    args = ap.parse_args()

    t0 = time.time()
    conn = sqlite3.connect(args.db)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")

    # Join laws->units. Only touch proposed laws.
    rows: List[Tuple[str,str,str]] = conn.execute(
        """
        SELECT l.lawKey, l.lawType, u.quote
        FROM khs_laws l
        JOIN khs_units u ON u.unitId = l.unitId
        WHERE l.status='proposed'
        ORDER BY l.lawKey ASC
        LIMIT ?
        """,
        (args.limit,)
    ).fetchall()

    would_def = []
    for lawKey, lawType, quote in rows:
        if is_def(quote):
            # Only change if not already DEF (idempotent)
            if str(lawType) != "DEF":
                would_def.append(str(lawKey))

    print(f"[OBSERVE] total_proposed={len(rows)} would_set_DEF={len(would_def)} elapsed_s={time.time()-t0:.2f}")

    # sample
    print("[SAMPLE] def_candidates (up to 10):")
    for k in would_def[:10]:
        print(" -", k)

    if args.dry_run:
        print("[OK] dry-run only (no changes)")
        return

    # Apply: set DEF for selected lawKeys; leave others unchanged; never touch status.
    if would_def:
        conn.executemany(
            "UPDATE khs_laws SET lawType='DEF', updatedAt=datetime('now') WHERE lawKey=? AND status='proposed';",
            [(k,) for k in would_def]
        )
        conn.commit()

    # Report after
    after = conn.execute(
        "SELECT lawType, COUNT(*) FROM khs_laws WHERE status='proposed' GROUP BY lawType ORDER BY lawType;"
    ).fetchall()
    print("[OK] applied. proposed lawType counts:")
    for t, n in after:
        print(" -", t, n)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("[FATAL]", e, file=sys.stderr)
        raise
