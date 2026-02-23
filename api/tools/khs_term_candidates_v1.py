#!/usr/bin/env python3
import argparse, re, sqlite3, sys, time

PAT = re.compile(r"^\s*(.{1,30}?)(とは|という|といふ|と云)")

STRIP = " \t\r\n　「」『』()（）[]【】<>〈〉《》〔〕"

def norm_term(s: str) -> str:
    t = (s or "").strip(STRIP)
    # drop trailing punctuation-like
    t = t.strip(" ,，、。.:：;；")
    return t

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="/opt/tenmon-ark-data/kokuzo.sqlite")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=200000)
    args = ap.parse_args()

    t0 = time.time()
    conn = sqlite3.connect(args.db)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")

    # 1) set termKey='KHS:UNSET' for empty termKey in proposed
    empty = conn.execute(
        "SELECT COUNT(*) FROM khs_laws WHERE status='proposed' AND (termKey IS NULL OR termKey='');"
    ).fetchone()[0]
    print(f"[OBSERVE] empty_termKey_before={empty}")

    if not args.dry_run:
        conn.execute(
            "UPDATE khs_laws SET termKey='KHS:UNSET', updatedAt=datetime('now') "
            "WHERE status='proposed' AND (termKey IS NULL OR termKey='');"
        )
        conn.commit()

    empty_after = conn.execute(
        "SELECT COUNT(*) FROM khs_laws WHERE status='proposed' AND (termKey IS NULL OR termKey='');"
    ).fetchone()[0]
    unset = conn.execute(
        "SELECT COUNT(*) FROM khs_laws WHERE status='proposed' AND termKey='KHS:UNSET';"
    ).fetchone()[0]
    print(f"[OBSERVE] empty_termKey_after={empty_after} unset_count={unset}")

    # 2) extract candidates from DEF quotes (deterministic)
    rows = conn.execute(
        """
        SELECT l.lawKey, u.unitId, u.quote
        FROM khs_laws l
        JOIN khs_units u ON u.unitId = l.unitId
        WHERE l.status='proposed' AND l.lawType='DEF'
        ORDER BY l.lawKey ASC
        LIMIT ?
        """,
        (args.limit,)
    ).fetchall()

    cand = {}
    examples = {}
    for lawKey, unitId, quote in rows:
        q = (quote or "").strip()
        head = q[:200]
        m = PAT.search(head)
        if not m:
            continue
        term = norm_term(m.group(1))
        if not term:
            continue
        if len(term) > 30:
            continue
        cand[term] = cand.get(term, 0) + 1
        if term not in examples:
            examples[term] = {"lawKey": str(lawKey), "unitId": str(unitId), "head": head}

    # output deterministic sorted
    items = sorted(cand.items(), key=lambda x: (-x[1], x[0]))
    print(f"[OK] def_rows={len(rows)} candidates={len(items)} elapsed_s={time.time()-t0:.2f}")

    # print top 30 to stdout (full list written by caller)
    print("[TOP30]")
    for term, n in items[:30]:
        ex = examples.get(term, {})
        print(f"{term}\t{n}\t{ex.get('unitId','')}\t{ex.get('lawKey','')}")

    return items, examples

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("[FATAL]", e, file=sys.stderr)
        raise
