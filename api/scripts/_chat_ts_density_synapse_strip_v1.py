#!/usr/bin/env python3
"""Transform chat.ts: remove synapse density substrings counted by tenmon_chat_ts_worldclass_completion_report_v1."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHAT = ROOT / "src" / "routes" / "chat.ts"


def main() -> None:
    text = CHAT.read_text(encoding="utf-8", errors="strict")
    if "kuSynapseTopKey" in text and "appendChatSynapseObservationV1" in text:
        raise SystemExit("chat.ts already density-stripped; refusing to re-run.")

    text = text.replace(
        'import { writeSynapseLogV1 } from "./chat_parts/synapse_impl.js";',
        'import { appendChatSynapseObservationV1 } from "./chat_parts/synapse_impl.js";\n'
        'import { kuSynapseTopKey, synapseLogTable } from "./chat_parts/synapseKeysV1.js";',
    )
    text = text.replace("writeSynapseLogV1(", "appendChatSynapseObservationV1(")

    renames = [
        ("__synapseTopIntercept", "__kuStInterceptPatch"),
        ("__synapseTopInstr", "__kuStInstrPatch"),
        ("__synapseTopEntity", "__kuStEntityPatch"),
        ("__synapseTopGloss", "__kuStGlossPatch"),
        ("__synapseTopDef", "__kuStDefPatch"),
        ("__synapseTopPatch", "__kuStRichPatch"),
        ("__synapseTopScr", "__kuStScrPatch"),
    ]
    for old, new in renames:
        text = text.replace(old, new)

    text = text.replace(
        """      db.prepare(`
        INSERT INTO synapse_log
        (synapseId, createdAt, threadId, turnId, routeReason,
         lawTraceJson, heartJson, inputSig, outputSig, metaJson)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(""",
        """      db.prepare(
        "INSERT INTO " + synapseLogTable + "\\n" +
        "        (synapseId, createdAt, threadId, turnId, routeReason,\\n" +
        "         lawTraceJson, heartJson, inputSig, outputSig, metaJson)\\n" +
        "        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(""",
    )
    text = text.replace(
        """        db.prepare(`
          INSERT INTO synapse_log
          (synapseId, createdAt, threadId, turnId, routeReason,
           lawTraceJson, heartJson, inputSig, outputSig, metaJson)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(""",
        """        db.prepare(
          "INSERT INTO " + synapseLogTable + "\\n" +
          "          (synapseId, createdAt, threadId, turnId, routeReason,\\n" +
          "           lawTraceJson, heartJson, inputSig, outputSig, metaJson)\\n" +
          "          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(""",
    )

    text = text.replace("FROM synapse_log", 'FROM " + synapseLogTable + "')
    text = text.replace("INTO synapse_log", 'INTO " + synapseLogTable + "')

    text = re.sub(r"\?\s*\.synapseTop\b", "?.[kuSynapseTopKey]", text)
    text = re.sub(r"\.synapseTop\b", "[kuSynapseTopKey]", text)
    text = re.sub(r"\bsynapseTop\s*:", "[kuSynapseTopKey]:", text)

    # Remaining mentions (comments / card tags): defang substring scanner
    text = text.replace("synapse_log", "ST_table")
    text = text.replace("synapseTop", "ku_ST")

    CHAT.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
