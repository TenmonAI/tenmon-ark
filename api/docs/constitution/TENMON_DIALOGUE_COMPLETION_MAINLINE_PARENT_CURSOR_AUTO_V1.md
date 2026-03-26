# TENMON_DIALOGUE_COMPLETION_MAINLINE_PARENT_CURSOR_AUTO_V1

## 目的
`TENMON_MAC_WATCH_LOOP_REAL_EXECUTION_ENABLE_FOR_APPROVED_HIGH_RISK_CURSOR_AUTO_V1` の後段として、
TENMON-ARK の未完成な会話コアを **順序固定で収束**させる。

指定 6 カード（K1 → scripture/truth_gate → SUBCONCEPT → GENERAL/self_view → PWA continuity → rejudge/seal）を、
acceptance PASS だけ次へ進め、FAIL 時は停止して retry 1 枚だけ生成する。

## 実行順（固定）
1. `TENMON_K1_TRACE_EMPTY_RESPONSE_DENSITY_REPAIR_CURSOR_AUTO_V1`
2. `TENMON_SCRIPTURE_TRUTH_GATE_DEDUP_AND_NATURALIZATION_CURSOR_AUTO_V1`
3. `TENMON_SUBCONCEPT_CANON_SURFACE_CLEAN_AND_CONTEXT_CARRY_SKIP_CURSOR_AUTO_V1`
4. `TENMON_GENERAL_KNOWLEDGE_DENSITY_AND_SELF_VIEW_POLISH_CURSOR_AUTO_V1`
5. `TENMON_PWA_THREADID_CONTINUITY_LIVED_PROOF_REPAIR_CURSOR_AUTO_V1`
6. `TENMON_DIALOGUE_WORLDCLASS_REJUDGE_AND_SEAL_CURSOR_AUTO_V1`

## 実装（`parent` の非交渉条件）
- 最小 diff（1変更=1検証の姿勢を維持）
- 高リスクカードは 1 枚ずつ（並列禁止）
- build → restart → `/api/health` → `/api/audit.build` → probe の順固定
- acceptance `PASS` 以外で `nextOnPass` 禁止（停止/rettry へ分岐）
- `routeReason` 変更禁止（必要時のみ）
- success 捏造禁止
- dist 直編集禁止

## 完了条件（親）
- K1 が 140字以上で重複なく返る
- scripture / truth_gate が資料要旨口調や同語反復を起こさない
- SUBCONCEPT が空返答/テンプレ漏れを起こさない
- GENERAL / self_view が自然文密度へ上がる（説教口調・generic にならない）
- PWA continuity lived proof が改善（threadId の lived proof が通る）
- scorecard が再計算され、会話品質 blocker が更新される

## nextOnPass
`TENMON_K1_TRACE_EMPTY_RESPONSE_DENSITY_REPAIR_CURSOR_AUTO_V1`

## nextOnFail
停止。差分最小の retry 1 枚だけ生成。

*Version: 1*

