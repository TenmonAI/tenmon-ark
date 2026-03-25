# TENMON_POST_COMPLETION_STABILIZER_4CARD_MASTER_CAMPAIGN_CURSOR_AUTO_V1

## 目的

`TENMON_TOTAL_COMPLETION_8CARD_MASTER_CAMPAIGN_CURSOR_AUTO_V1` と `TENMON_POST_COMPLETION_OS_6CARD_MASTER_CAMPAIGN_CURSOR_AUTO_V1` の後段で、gate 契約の不整合・repo 再汚染・remote admin runtime proof 不足・worldclass 判定の曖昧さを閉じ、**sealed-operable** な運用状態に固定する親カード。

## D

- completion 主線および OS 6 枚完了後に投入
- 憲法: 最小 diff、1 変更 = 1 検証、**dist 直編集禁止**、**cause 未断定 patch 禁止**、acceptance PASS 以外封印禁止
- **stabilizer 専用**（product 新機能より運用の真値固定を優先）
- **子カード順固定**（FAIL したら次へ進まず retry）

## 子カード（固定順）

| Phase | カード |
|-------|--------|
| 1 | `TENMON_GATE_CONTRACT_HEALTH_ALIGNMENT_CURSOR_AUTO_V1` |
| 2 | `TENMON_REPO_HYGIENE_WATCHDOG_CURSOR_AUTO_V1`（`tenmon_repo_hygiene_watchdog_v1.py`） |
| 3 | `TENMON_REMOTE_ADMIN_CURSOR_RUNTIME_PROOF_CURSOR_AUTO_V1` |
| 4 | `TENMON_WORLDCLASS_ACCEPTANCE_SCORECARD_CURSOR_AUTO_V1` |

## 実行規則

- health gate が未整合のまま watchdog / scorecard を確定しない
- repo hygiene 未固定のまま remote を sealed-complete としない
- remote runtime proof 未固定のまま worldclass claim をしない

## 停止条件（campaign completion）

- `health` / `audit` / `audit.build` の **gate contract 整合**
- repo hygiene watchdog が再汚染を検知可能
- remote admin / cursor / result ingest の **runtime proof** が subsystem verdict で確定
- worldclass acceptance scorecard が **定量化 completion score** を返す

## FAIL_NEXT_CARD

`TENMON_POST_COMPLETION_STABILIZER_4CARD_MASTER_CAMPAIGN_RETRY_CURSOR_AUTO_V1`

## Phase 1 参照

憲法: `TENMON_GATE_CONTRACT_HEALTH_ALIGNMENT_CURSOR_AUTO_V1.md`  
スクリプト: `api/automation/tenmon_gate_contract_health_alignment_v1.py`  
verdict: `api/automation/tenmon_gate_contract_verdict.json`
