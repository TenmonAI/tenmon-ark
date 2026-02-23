#!/usr/bin/env python3
import argparse, sqlite3, sys, time

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="/opt/tenmon-ark-data/kokuzo.sqlite")
    ap.add_argument("--limit", type=int, default=1000000)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    t0 = time.time()
    conn = sqlite3.connect(args.db)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")

    # select units
    rows = conn.execute(
        "SELECT unitId FROM khs_units ORDER BY unitId ASC LIMIT ?;",
        (args.limit,)
    ).fetchall()

    if args.dry_run:
        print(f"[DRYRUN] units={len(rows)} limit={args.limit}")
        return

    ins = 0
    for (unitId,) in rows:
        unitId = str(unitId)
        lawKey = f"KHSL:LAW:{unitId}"
        cur = conn.execute(
            """
            INSERT OR IGNORE INTO khs_laws(
              lawKey, lawType, title, summary, termKey, operator, truthAxis, waterFireClass,
              conditionJson, verdictJson, unitId, status, confidence
            )
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
              lawKey, "LAW", "", "", "", "", "", "",
              "{}", "{}", unitId, "proposed", 0
            )
        )
        if cur.rowcount and cur.rowcount > 0:
            ins += 1

    conn.commit()
    total = conn.execute("SELECT COUNT(*) FROM khs_laws;").fetchone()[0]
    print(f"[OK] inserted={ins} total_khs_laws={total} elapsed_s={time.time()-t0:.2f}")

    # sample
    samp = conn.execute("SELECT lawKey, lawType, unitId, status FROM khs_laws ORDER BY createdAt DESC LIMIT 5;").fetchall()
    print("[SAMPLE] last5:")
    for r in samp:
        print(" -", r)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("[FATAL]", e, file=sys.stderr)
        raise
