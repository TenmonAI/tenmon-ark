#!/usr/bin/env python3
import json
from datetime import datetime, timezone
from pathlib import Path

QUEUE_PATH = Path(__file__).with_name("notion_pending_writeback_queue.json")
DEAD_LETTER_PATH = Path(__file__).with_name("notion_pending_writeback_dead_letter.json")
MAX_PENDING = 50


def _load(path: Path):
    if not path.exists():
        return []
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(raw, list):
            return raw
        return []
    except Exception:
        return []


def _save(path: Path, items):
    path.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")


def normalize_queue_limit():
    queue = _load(QUEUE_PATH)
    dead = _load(DEAD_LETTER_PATH)
    overflow = max(0, len(queue) - MAX_PENDING)
    if overflow > 0:
        moved = queue[:overflow]
        ts = datetime.now(timezone.utc).isoformat()
        for item in moved:
            if isinstance(item, dict):
                item.setdefault("moved_at", ts)
                item.setdefault("moved_reason", "pending_queue_overflow")
        dead.extend(moved)
        queue = queue[overflow:]
        _save(DEAD_LETTER_PATH, dead)
    _save(QUEUE_PATH, queue)
    return {"pending": len(queue), "dead_letter": len(dead), "overflow_moved": overflow}


def main():
    result = normalize_queue_limit()
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
