#!/usr/bin/env python3
"""Notion writeback pending queue drain"""
import json, time
from pathlib import Path
from datetime import datetime

QUEUE = Path(__file__).parent / "notion_pending_writeback_queue.json"
DEAD = Path(__file__).parent / "notion_dead_letter_queue.json"
MAX_ATTEMPTS = 5

def drain():
    if not QUEUE.exists():
        return
    entries = json.loads(QUEUE.read_text())
    remaining = []
    for e in entries:
        if e.get("attempt", 0) >= MAX_ATTEMPTS:
            dead = json.loads(DEAD.read_text()) if DEAD.exists() else []
            dead.append(e)
            DEAD.write_text(json.dumps(dead, indent=2))
            print(f"dead_letter: {e.get('notion_page_id')}")
            continue
        try:
            # Notion 再送ロジック（実装省略・stub）
            e["attempt"] = e.get("attempt", 0) + 1
            e["last_retry"] = datetime.now().isoformat()
            remaining.append(e)
        except Exception as ex:
            e["attempt"] = e.get("attempt", 0) + 1
            remaining.append(e)
    QUEUE.write_text(json.dumps(remaining, indent=2))
    print(f"drained: {len(entries)-len(remaining)} ok, {len(remaining)} remaining")

if __name__ == "__main__":
    drain()
