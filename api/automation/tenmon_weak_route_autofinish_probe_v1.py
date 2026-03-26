#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import argparse
import json
import time
import urllib.error
import urllib.request
from typing import Any

CARD = "TENMON_WEAK_ROUTE_AUTOFINISH_PROBE_V1"

FIXED_PROBES = [
    {"label": "k1_hokekyo", "message": "法華経とは"},
    {"label": "k1_sokushin", "message": "即身成仏とは"},
    {"label": "concept_suika", "message": "水火の法則とは"},
    {"label": "self_tenmon", "message": "天聞とは何か"},
]


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _post(base: str, message: str, thread_id: str) -> dict[str, Any]:
    req = urllib.request.Request(
        f"{base.rstrip('/')}/api/chat",
        data=json.dumps({"message": message, "threadId": thread_id}, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
        return {"status": resp.status, "raw": raw}


def _parse_row(label: str, message: str, raw: str, status: int) -> dict[str, Any]:
    try:
        j = json.loads(raw)
    except Exception:
        j = {}
    ku = ((j.get("decisionFrame") or {}).get("ku") or {}) if isinstance(j, dict) else {}
    rp = ku.get("responsePlan") if isinstance(ku, dict) and isinstance(ku.get("responsePlan"), dict) else {}
    response = str(j.get("response") or "") if isinstance(j, dict) else ""
    return {
        "label": label,
        "message": message,
        "status": status,
        "routeReason": ku.get("routeReason"),
        "centerMeaning": ku.get("centerMeaning"),
        "sourcePack": ku.get("sourcePack"),
        "thoughtGuideSummary": ku.get("thoughtGuideSummary"),
        "personaConstitutionSummary": ku.get("personaConstitutionSummary"),
        "lawsUsed": ku.get("lawsUsed"),
        "evidenceIds": ku.get("evidenceIds"),
        "semanticBody": rp.get("semanticBody"),
        "response": response,
        "response_len": len(response),
        "response_has_toc_like": any(x in response for x in ["目次", "訳注", "請来目録", "解説", "書誌"]),
        "response_has_prefix_glitch": ("この点では、天聞の所見】" in response) or response.lstrip().startswith("天聞の所見】"),
        "raw": raw[:5000],
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--include-extra", action="store_true")
    args = ap.parse_args()

    probes = list(FIXED_PROBES)
    if args.include_extra:
        probes.append({"label": "k1_hokke_23", "message": "法華経 第二十三品の核心は何か"})

    rows: list[dict[str, Any]] = []
    for idx, p in enumerate(probes, start=1):
        try:
            r = _post(args.base, p["message"], f"autofinish-{int(time.time() * 1000)}-{idx}")
            rows.append(_parse_row(p["label"], p["message"], r["raw"], int(r["status"])))
        except urllib.error.HTTPError as e:
            rows.append({"label": p["label"], "message": p["message"], "error": f"http:{e.code}"})
        except Exception as e:
            rows.append({"label": p["label"], "message": p["message"], "error": f"{type(e).__name__}: {e}"})

    out = {"card": CARD, "generated_at": utc(), "rows": rows}
    with open(args.out, "w", encoding="utf-8") as fp:
        json.dump(out, fp, ensure_ascii=False, indent=2)
    print(json.dumps({"ok": True, "out": args.out, "rows": len(rows)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

