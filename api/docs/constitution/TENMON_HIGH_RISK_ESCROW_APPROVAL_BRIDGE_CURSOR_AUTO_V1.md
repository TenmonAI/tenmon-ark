# TENMON_HIGH_RISK_ESCROW_APPROVAL_BRIDGE_CURSOR_AUTO_V1

## 目的

high-risk カードを **無条件 bypass しない**。  
差分・build・probe・blocked_reason・recommended decision を **escrow package** として自動整備し、  
最後だけ **人間の 1 承認**で queue に入れられる bridge を作る。

## D（非交渉）

- bypass 禁止
- high-risk を無人で本番投入しない
- 最小diff
- 1変更=1検証
- success 捏造禁止（stale/fixture を成功根拠にしない）
- dist 直編集禁止

## 対象ファイル

- `api/automation/high_risk_escrow_approval_bridge_v1.py`
- `api/scripts/high_risk_escrow_approval_bridge_v1.sh`

## 振る舞い

### 1) 既定（approve 無し）

- queue へ enqueue **しない**
- 代わりに escrow package を出力する
  - diff summary（`git diff --stat` / `git diff --name-status` / `git status --porcelain -uall`）
  - build result（`tenmon_repo_hygiene_final_seal_summary.json`）
  - probe result（同上の `http.health/audit/audit_build`）
  - current-run evidence（`remote_cursor_queue.json` × `remote_cursor_result_bundle.json` の交差）
  - blocked_reason / recommended_decision

### 2) `--approve`（人間 1承認）

- escrow package を出力した上で、evidence が満たされる場合のみ queue に enqueue
- 併せて `tenmon_high_risk_explicit_approval_v1.json` を出力し、high-risk gate の trace を一貫させる

## acceptance

- high-risk card は勝手に実行されない（approve 無しでは enqueue しない）
- でも review 材料は自動で揃う（escrow package）
- human が 1 承認（`--approve` の 1 実行）で進める

## 実行例

```bash
cd /opt/tenmon-ark-repo/api

# package 作成（enqueue しない）
./scripts/high_risk_escrow_approval_bridge_v1.sh TENMON_SOME_HIGH_RISK_CARD_CURSOR_AUTO_V1

# 人間 1承認として enqueue（evidence OK の場合のみ）
./scripts/high_risk_escrow_approval_bridge_v1.sh TENMON_SOME_HIGH_RISK_CARD_CURSOR_AUTO_V1 --approve --approve-by "$(whoami)"
```

*Version: 1*

