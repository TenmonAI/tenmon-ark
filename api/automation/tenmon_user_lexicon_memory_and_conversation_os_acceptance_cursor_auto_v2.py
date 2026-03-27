#!/usr/bin/env python3
"""
TENMON_USER_LEXICON_MEMORY_AND_CONVERSATION_OS_ACCEPTANCE_CURSOR_AUTO_V2
Fail-closed acceptance / seal runner.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
OUT_JSON = API_ROOT / "automation/tenmon_user_lexicon_memory_and_conversation_os_acceptance_cursor_auto_v2.json"


def run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, cwd=str(API_ROOT), capture_output=True, text=True, check=False)


def main() -> int:
    b = run(["npm", "run", "build"])
    if b.returncode != 0:
        print(b.stdout)
        print(b.stderr, file=sys.stderr)
        return 2

    js = r"""
import { updateUserLexiconMemoryV1, emptyUserLexiconMemoryV1 } from './dist/core/userLexiconMemoryV1.js';
import { composeTenmonLongformV1 } from './dist/core/tenmonLongformComposerV1.js';
import { selectTenmonSurfaceStyleV1 } from './dist/core/tenmonSurfaceStyleSelectorV1.js';
import { CONVERSATION_OS_7LAYER_REGISTRY_V1 } from './dist/os/conversationOs7LayerRegistryV1.js';
import { resolveTenmonBookReadingKernelV1 } from './dist/core/tenmonBookReadingKernelV1.js';
import { ingestSanskritGodnameBatchV1, analyzeAcceptedSanskritGodnameRecordsV1 } from './dist/deepread/sanskritGodnameIngestV1.js';

const requiredLexicon = [
  'イキ','灵','タカアマハラ','與合','天津金木相','言葉 / 言靈 / 真言','造化三神中心','アウワ不採用'
];

let mem = emptyUserLexiconMemoryV1();
const turns = [
  '水火はイキで読みたい。灵表記を保持して。',
  'タカアマハラと與合を中心に。',
  '天津金木相で整理して。',
  '言葉 / 言靈 / 真言は区別して。',
  '造化三神中心で。',
  'アウワ不採用で進めて。',
  '法華経の長文定義をお願いします。',
  '比較読解を続けたい。',
  '提案書形式で。',
  '最後に要点確認。'
];
for (const t of turns) mem = updateUserLexiconMemoryV1({ prev: mem, userMessage: t, assistantSurface: null });
const stable10turn = requiredLexicon.every((v)=>Object.values(mem.preferred_lexicon).includes(v)) && !mem.drift_detected;
const driftProbe = updateUserLexiconMemoryV1({ prev: mem, userMessage: 'ok', assistantSurface: 'アウワ採用で行く' });
const driftDetectWorks = driftProbe.drift_detected === true;

const lf1000 = composeTenmonLongformV1({
  mode:'exposition',
  body:'法華経の中心は、方便と実相を分離せずに読解する点にある。現代運用では、判断の軸を分けながら中心命題を保つ。'.repeat(8),
  centerClaim:'法華経は中心命題を保持して展開する読解法である。',
  nextAxis:'本文構造と現代運用の接続を検証する。',
  targetLength:1000
});
const lf3000 = composeTenmonLongformV1({
  mode:'exposition',
  body:'法華経の中心を、語義・章構造・運用順序・誤読防止の順で検証する。'.repeat(60),
  centerClaim:'法華経読解は中心保持と段階展開を両立する。',
  nextAxis:'比較読解で他経典との接続を検証する。',
  targetLength:3000
});
const compareStyle = selectTenmonSurfaceStyleV1({ routeReason:'TENMON_SCRIPTURE_CANON_V1', rawMessage:'天照・月読・素戔嗚の比較', mode:'compare', targetLength:1200 });
const proposalStyle = selectTenmonSurfaceStyleV1({ routeReason:'NATURAL_GENERAL_LLM_TOP', rawMessage:'VPS構築提案書', mode:'proposal', targetLength:1200 });
const registryOk = Array.isArray(CONVERSATION_OS_7LAYER_REGISTRY_V1.layers) &&
  CONVERSATION_OS_7LAYER_REGISTRY_V1.layers.length === 7 &&
  CONVERSATION_OS_7LAYER_REGISTRY_V1.llm_projector_only_ready === true;

const books = [
  resolveTenmonBookReadingKernelV1('言霊秘書の構造読解'),
  resolveTenmonBookReadingKernelV1('いろはの構造読解'),
  resolveTenmonBookReadingKernelV1('空海の構造読解'),
  resolveTenmonBookReadingKernelV1('カタカムナの構造読解'),
];
const bookReadOk = books.every((b)=>Array.isArray(b.generation_order) && b.generation_order.length >= 9);

const mk = (name, kana, role, pos, relTarget) => ({
  schema:'TENMON_SANSKRIT_GODNAME_TABLE_V1',
  generation_order:['系譜上位','所在','役割'],
  japanese_name:name,
  japanese_name_kana:kana,
  name_variants:[name],
  relations:[{target:relTarget, relation_type:'系譜上位'}],
  sanskrit_candidates:[{candidate:'agni-parallel', reason:'比較候補としての音韻対照'}],
  strict_etymology:'語源は伝統文献に依拠し同一視しない。',
  tradition_evidence:'古事記・日本書紀系を一次参照。',
  tenmon_mapping:'天津金木写像の仮説候補。',
  kojiki_role:role,
  amatsukanagi_position:pos,
  alignment_type:'mapping_candidate',
  mapping_confidence:0.35,
  evidence_level:'speculative',
  evidence_refs:[{ref:'ref:'+name, kind:'scripture_lineage'}],
  uncertain_points:['evidence_limited']
});

const words = ['agni','tejas','soma','maṇi','nāga','dharma'].map((w)=>mk(w,w,'概念語','比較層','比較対象'));
const gods = [
  mk('天之御中主神','あめのみなかぬしのかみ','造化三神','中核','高御産巣日神'),
  mk('国常立神','くにのとこたちのかみ','神代七代','初発','豊雲野神'),
  mk('天照大神','あまてらすおおみかみ','三貴子','中核','月読命'),
];
const ingest = ingestSanskritGodnameBatchV1([...words, ...gods]);
const analysis = analyzeAcceptedSanskritGodnameRecordsV1(ingest.accepted);
const deepreadShapeOk = analysis.length >= 9 && analysis.every((a)=>
  a.strict && a.mapping && a.alignment && a.relations_graph && typeof a.surface_fixed === 'string'
);
const strictSeparatedOk = analysis.every((a)=>
  !('tenmon_mapping' in a.strict) && !('strict_etymology' in a.mapping)
);
const uncertaintyNonEmpty = analysis.every((a)=>Array.isArray(a.alignment.uncertain_points) && a.alignment.uncertain_points.length > 0);
const fixedFormatOk = analysis.every((a)=>
  ['[WORD]','[ROOT]','[DIRECT MEANING]','[TRADITION EVIDENCE]','[TENMON MAPPING]','[FINAL JUDGEMENT]','[UNCERTAINTY]']
    .every((t)=>a.surface_fixed.includes(t))
);

const conversationReady =
  stable10turn && driftDetectWorks &&
  lf1000.longform.length >= 1000 && lf1000.centerLockPassed &&
  lf3000.longform.length >= 3000 && lf3000.centerLockPassed &&
  (compareStyle.style === 'scripture_centered' || compareStyle.style === 'deep_exegesis') &&
  proposalStyle.style === 'proposal_formal' &&
  registryOk && bookReadOk;

const deepreadReady = ingest.rejected.length === 0 && deepreadShapeOk && strictSeparatedOk && uncertaintyNonEmpty && fixedFormatOk;

const out = {
  user_lexicon_memory_ready: stable10turn && driftDetectWorks,
  conversation_os_acceptance_ready: conversationReady,
  deepread_acceptance_ready: deepreadReady,
  deepread_sealed: deepreadReady,
  checks: {
    stable10turn, driftDetectWorks, registryOk, bookReadOk,
    longform1000_len: lf1000.longform.length,
    longform3000_len: lf3000.longform.length,
    deepreadAccepted: ingest.accepted.length,
    deepreadRejected: ingest.rejected.length,
    strictSeparatedOk, uncertaintyNonEmpty, fixedFormatOk
  }
};
console.log(JSON.stringify(out));
"""

    n = run(["node", "--input-type=module", "-e", js])
    if n.returncode != 0:
        print(n.stdout)
        print(n.stderr, file=sys.stderr)
        return 2

    try:
        checks = json.loads(n.stdout.strip())
    except json.JSONDecodeError:
        print(n.stdout)
        print(n.stderr, file=sys.stderr)
        return 2

    ok = bool(
        checks.get("user_lexicon_memory_ready")
        and checks.get("conversation_os_acceptance_ready")
        and checks.get("deepread_acceptance_ready")
        and checks.get("deepread_sealed")
    )

    result = {
        "ok": ok,
        "card": "TENMON_USER_LEXICON_MEMORY_AND_CONVERSATION_OS_ACCEPTANCE_CURSOR_AUTO_V2",
        "user_lexicon_memory_ready": bool(checks.get("user_lexicon_memory_ready")),
        "conversation_os_acceptance_ready": bool(checks.get("conversation_os_acceptance_ready")),
        "deepread_acceptance_ready": bool(checks.get("deepread_acceptance_ready")),
        "deepread_sealed": bool(checks.get("deepread_sealed")),
        "rollback_used": False,
        "nextOnPass": None if ok else None,
        "nextOnFail": "TENMON_USER_LEXICON_OS_TRACE_CURSOR_AUTO_V1",
        "checks": checks.get("checks", {}),
    }

    OUT_JSON.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())

