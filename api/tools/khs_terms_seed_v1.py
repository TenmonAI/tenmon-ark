#!/usr/bin/env python3
import argparse, hashlib, json, re, sqlite3, sys, time
from collections import Counter

# --- deterministic candidate extract (same spirit as C-0-7b) ---
PAT = re.compile(r"^\s*(.{1,30}?)(とは|という|といふ|と云)")
STRIP = " \t\r\n　「」『』()（）[]【】<>〈〉《》〔〕"
ALLOW_CHARS = re.compile(r"^[0-9A-Za-zぁ-んァ-ヶ一-龥ー・]+$")

STOP_PREFIX = ("故に", "後に", "布斗麻", "此", "それ", "また", "夫", "凡そ")
STOP_SUFFIX = ("ノ", "ヲ", "ニ", "ハ", "ガ", "へ", "を", "に", "は", "が")

def norm_term_raw(s: str) -> str:
    t = (s or "").strip(STRIP)
    t = t.strip(" ,，、。.:：;；")
    return t

def reason_of(term: str) -> str | None:
    if not term:
        return "empty"
    if len(term) < 2 or len(term) > 12:
        return "len"
    if ("。" in term) or ("、" in term):
        return "punct"
    if term.startswith(STOP_PREFIX):
        return "prefix_stop"
    if term.endswith(STOP_SUFFIX):
        return "suffix_stop"
    if not ALLOW_CHARS.match(term):
        return "charset"
    return None

def norm_for_key(term: str) -> str:
    # deterministic normalization for hashing
    return (term or "").strip()

def sha12(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:12]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="/opt/tenmon-ark-data/kokuzo.sqlite")
    ap.add_argument("--limit", type=int, default=200000)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--top", type=int, default=50)
    args = ap.parse_args()

    t0 = time.time()
    conn = sqlite3.connect(args.db)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")

    before = conn.execute("SELECT COUNT(*) FROM khs_terms;").fetchone()[0]

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

    raw_cnt = Counter()
    keep_cnt = Counter()
    rej = Counter()
    example = {}

    for lawKey, unitId, quote in rows:
        q = (quote or "").strip()
        head = q[:200]
        m = PAT.search(head)
        if not m:
            continue
        term = norm_term_raw(m.group(1))
        raw_cnt[term] += 1
        r = reason_of(term)
        if r is not None:
            rej[r] += 1
            continue
        keep_cnt[term] += 1
        if term not in example:
            example[term] = (str(unitId), str(lawKey), head)

    items = sorted(keep_cnt.items(), key=lambda x: (-x[1], x[0]))
    print(f"[OBSERVE] def_rows={len(rows)} raw_terms={len(raw_cnt)} kept_terms={len(items)} elapsed_s={time.time()-t0:.2f}")
    print("[REJECT_COUNTS]")
    for k, v in sorted(rej.items(), key=lambda x: (-x[1], x[0])):
        print(f" - {k}\t{v}")

    # dry-run: show planned inserts
    planned = []
    for term, n in items:
        nk = norm_for_key(term)
        termKey = "KHS:TERM:CAND:" + sha12(nk)
        planned.append((termKey, term, nk, json.dumps([term], ensure_ascii=False)))

    print(f"[OBSERVE] planned_inserts={len(planned)} before_terms={before}")

    print("[TOP_PLANNED]")
    for termKey, display, nk, _alias in planned[:args.top]:
        unitId, lawKey, _head = example.get(display, ("", "", ""))
        print(f"{termKey}\t{display}\t{unitId}\t{lawKey}")

    if args.dry_run:
        print("[OK] dry-run only (no DB changes)")
        return

    ins = 0
    for termKey, display, nk, aliasJson in planned:
        cur = conn.execute(
            """
            INSERT OR IGNORE INTO khs_terms(termKey, display, reading, norm, aliasJson)
            VALUES(?,?,?,?,?)
            """,
            (termKey, display, "", nk, aliasJson)
        )
        if cur.rowcount and cur.rowcount > 0:
            ins += 1

    conn.commit()
    after = conn.execute("SELECT COUNT(*) FROM khs_terms;").fetchone()[0]
    print(f"[OK] inserted={ins} after_terms={after} elapsed_s={time.time()-t0:.2f}")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("[FATAL]", e, file=sys.stderr)
        raise
