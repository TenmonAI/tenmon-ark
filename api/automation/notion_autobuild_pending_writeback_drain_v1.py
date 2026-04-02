#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import notion_autobuild_intake_v1 as intake_mod
import notion_autobuild_writeback_v1 as writeback_mod

CARD = "TENMON_NOTION_AUTOBUILD_PENDING_WRITEBACK_DRAIN_CURSOR_AUTO_V1"


def _write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def drain(auto_dir: Path, max_entries: int) -> dict[str, Any]:
  queue_path = auto_dir / writeback_mod.PENDING_FN
  entries = writeback_mod._read_pending_queue(queue_path)
  token = intake_mod._notion_token()
  cfg = writeback_mod._read_json(auto_dir / writeback_mod.CONFIG_FN)
  version = str(cfg.get("notion_version") or "2022-06-28")
  processed: list[dict[str, Any]] = []
  if not token:
      return {"ok": False, "card": CARD, "error": "notion_token_missing", "processed": []}
  for row in entries:
      if len(processed) >= max_entries:
          break
      if str(row.get("status") or "") != "pending":
          continue
      pid = str(row.get("notion_page_id") or "").strip()
      payload = row.get("patch_payload")
      if not pid or not isinstance(payload, dict):
          row["status"] = "error"
          row["last_error"] = "invalid_pending_payload"
          processed.append({"id": row.get("id"), "ok": False, "reason": row["last_error"]})
          continue
      code, data, err = intake_mod.notion_request(
          token=token,
          version=version,
          method="PATCH",
          url=f"https://api.notion.com/v1/pages/{pid}",
          body=payload,
      )
      row["last_attempt_at"] = writeback_mod._utc_iso()
      row["attempt_count"] = int(row.get("attempt_count") or 0) + 1
      if code == 200 and isinstance(data, dict):
          row["status"] = "sent"
          row["last_error"] = ""
          processed.append({"id": row.get("id"), "ok": True})
      else:
          row["last_error"] = f"notion_patch_failed:{code}:{err}"
          processed.append({"id": row.get("id"), "ok": False, "reason": row["last_error"]})
  _write_json(
      queue_path,
      {
          "schema": "TENMON_NOTION_AUTOBUILD_PENDING_WRITEBACKS_V1",
          "card": CARD,
          "entries": entries,
      },
  )
  return {
      "ok": True,
      "card": CARD,
      "queue_path": str(queue_path),
      "processed": processed,
      "pending_remaining": sum(1 for row in entries if str(row.get("status") or "") == "pending"),
  }


def main() -> None:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--auto-dir", type=str, default="")
    ap.add_argument("--max-entries", type=int, default=10)
    args = ap.parse_args()
    auto_dir = Path(args.auto_dir).resolve() if args.auto_dir else Path(__file__).resolve().parent
    out = drain(auto_dir, max(1, int(args.max_entries)))
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
