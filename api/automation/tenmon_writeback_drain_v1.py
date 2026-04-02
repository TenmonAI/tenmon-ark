#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, List

QUEUE_PATH = Path(__file__).resolve().parent / "notion_pending_writeback_queue.json"
DEAD_LETTER_PATH = Path(__file__).resolve().parent / "notion_pending_writeback_dead_letter.json"
MAX_ATTEMPT = 5


def _read_json_array(path: Path) -> List[Dict[str, Any]]:
  if not path.exists():
    return []
  try:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
      return [x for x in data if isinstance(x, dict)]
  except Exception:
    return []
  return []


def _write_json(path: Path, payload: Any) -> None:
  path.parent.mkdir(parents=True, exist_ok=True)
  path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _send_to_notion(entry: Dict[str, Any]) -> bool:
  mode = os.getenv("TENMON_NOTION_DRAIN_MODE", "mock").strip().lower()
  if mode != "live":
    return True

  # live mode placeholder: a real sender can be injected later.
  return False


def drain_pending_queue() -> Dict[str, int]:
  queue = _read_json_array(QUEUE_PATH)
  dead = _read_json_array(DEAD_LETTER_PATH)

  kept: List[Dict[str, Any]] = []
  sent = 0
  moved_dead = 0

  for entry in queue:
    attempt = int(entry.get("attempt", 0))
    ok = _send_to_notion(entry)
    if ok:
      sent += 1
      continue

    next_attempt = attempt + 1
    entry["attempt"] = next_attempt
    if next_attempt > MAX_ATTEMPT:
      dead.append(entry)
      moved_dead += 1
    else:
      kept.append(entry)

  _write_json(QUEUE_PATH, kept)
  _write_json(DEAD_LETTER_PATH, dead)

  return {
    "sent": sent,
    "remaining": len(kept),
    "dead_letter": moved_dead,
  }


def main() -> int:
  stats = drain_pending_queue()
  print(json.dumps(stats, ensure_ascii=False))
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
