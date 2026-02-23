#!/usr/bin/env python3
import argparse, sqlite3, sys, time

ALLOW_DOCS = ["KHS", "言霊秘書.pdf", "KHS_UTF8"]  # C0-3b proven

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="/opt/tenmon-ark-data/kokuzo.sqlite")
    ap.add_argument("--dry-run", action="store_true", help="Report deletions only; do not modify DB")
    args = ap.parse_args()

    t0 = time.time()
    conn = sqlite3.connect(args.db)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")

    # Count rows to delete
    qs = ",".join(["?"] * len(ALLOW_DOCS))
    to_del = conn.execute(
        f"SELECT COUNT(*) FROM khs_units WHERE doc NOT IN ({qs});",
        ALLOW_DOCS
    ).fetchone()[0]

    total = conn.execute("SELECT COUNT(*) FROM khs_units;").fetchone()[0]
    print(f"[OBSERVE] total={total} would_delete={to_del} allow_docs={ALLOW_DOCS}")

    # Show top offending docs (if any)
    rows = conn.execute(
        f"""
        SELECT doc, COUNT(*) AS n
        FROM khs_units
        WHERE doc NOT IN ({qs})
        GROUP BY doc
        ORDER BY n DESC
        LIMIT 20;
        """,
        ALLOW_DOCS
    ).fetchall()
    print("[OBSERVE] non_khs_docs_top20:")
    for d, n in rows:
        print(" -", d, n)

    if args.dry_run:
        print("[OK] dry-run only (no changes)")
        return

    conn.execute(f"DELETE FROM khs_units WHERE doc NOT IN ({qs});", ALLOW_DOCS)
    conn.commit()

    after = conn.execute("SELECT COUNT(*) FROM khs_units;").fetchone()[0]
    print(f"[OK] deleted={to_del} after={after} elapsed_s={time.time()-t0:.2f}")

    # Postcheck: distinct docs must be subset of allowlist
    bad = conn.execute(
        f"SELECT doc FROM khs_units WHERE doc NOT IN ({qs}) GROUP BY doc LIMIT 5;",
        ALLOW_DOCS
    ).fetchall()
    if bad:
        print("[FATAL] still has non-khs docs:", bad, file=sys.stderr)
        raise SystemExit(2)

    print("[OK] khs_units now KHS-only")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("[FATAL]", e, file=sys.stderr)
        raise
