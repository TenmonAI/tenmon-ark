#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
QUEUE = ROOT / "notion_pending_writeback_queue.json"
DEAD = ROOT / "notion_pending_writeback_dead_letter.json"


def read_json(path: Path, default):
  if not path.exists():
    return default
  try:
    return json.loads(path.read_text(encoding="utf-8"))
  except Exception:
    return default


def write_json(path: Path, payload):
  path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
  queue = read_json(QUEUE, {"entries": [], "dead_letter": []})
  if not isinstance(queue, dict):
    queue = {"entries": [], "dead_letter": []}
  entries = queue.get("entries") if isinstance(queue.get("entries"), list) else []
  dead = queue.get("dead_letter") if isinstance(queue.get("dead_letter"), list) else []
  if not entries:
    queue["entries"] = []
    queue["dead_letter"] = dead
    write_json(QUEUE, queue)
    return 0

  e = entries.pop(0)
  if not isinstance(e, dict):
    dead.append({"raw": e, "reason": "invalid_entry"})
  else:
    # Safe default: do not stop on writeback failure.
    ok = bool(e.get("dry_run", True))
    if not ok:
      dead.append({**e, "reason": "writeback_failed_nonfatal"})

  queue["entries"] = entries
  queue["dead_letter"] = dead
  write_json(QUEUE, queue)
  write_json(DEAD, {"dead_letter": dead})
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
