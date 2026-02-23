#!/usr/bin/env python3
import argparse, hashlib, re, sqlite3, sys, time
from collections import Counter

# deterministic extract (same as C-0-8)
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

def sha12(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:12]

def compute_termKey(term: str) -> str:
    nk = (term or "").strip()
    return "KHS:TERM:CAND:" + sha12(nk)

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

    # load existing termKeys (only our prefix)
    termkeys = set(r[0] for r in conn.execute(
        "SELECT termKey FROM khs_terms WHERE termKey LIKE 'KHS:TERM:CAND:%';"
    ).fetchall())

    # target laws: DEF + proposed + UNSET only
    rows = conn.execute(
        """
        SELECT l.lawKey, l.termKey, u.quote
        FROM khs_laws l
        JOIN khs_units u ON u.unitId = l.unitId
        WHERE l.status='proposed' AND l.lawType='DEF' AND l.termKey='KHS:UNSET'
        ORDER BY l.lawKey ASC
        LIMIT ?
        """,
        (args.limit,)
    ).fetchall()

    would = []
    rej = Counter()

    for lawKey, _termKey, quote in rows:
        q = (quote or "").strip()
        head = q[:200]
        m = PAT.search(head)
        if not m:
            rej["no_pat"] += 1
            continue
        term = norm_term_raw(m.group(1))
        r = reason_of(term)
        if r is not None:
            rej[r] += 1
            continue
        tk = compute_termKey(term)
        if tk not in termkeys:
            rej["no_termkey"] += 1
            continue
        would.append((tk, str(lawKey)))

    print(f"[OBSERVE] def_unset_rows={len(rows)} would_link={len(would)} elapsed_s={time.time()-t0:.2f}")
    print("[REJECT_COUNTS]")
    for k, v in sorted(rej.items(), key=lambda x: (-x[1], x[0])):
        print(" -", k, v)

    print("[SAMPLE] would_link (up to 10):")
    for tk, lk in would[:10]:
        print(" -", tk, lk)

    if args.dry_run:
        print("[OK] dry-run only (no DB changes)")
        return

    if would:
        conn.executemany(
            "UPDATE khs_laws SET termKey=?, updatedAt=datetime('now') WHERE lawKey=? AND status='proposed' AND lawType='DEF' AND termKey='KHS:UNSET';",
            would
        )
        conn.commit()

    # report after
    after = conn.execute(
        "SELECT termKey, COUNT(*) FROM khs_laws WHERE status='proposed' AND lawType='DEF' GROUP BY termKey ORDER BY COUNT(*) DESC;"
    ).fetchall()
    print("[OK] after DEF termKey counts:")
    for tk, n in after:
        print(" -", tk, n)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("[FATAL]", e, file=sys.stderr)
        raise
