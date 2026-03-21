# MAINLINE_SUPREME_COMPLETION_AUDIT_BUNDLE_V1

## 位置づけ

- **本体改善**（`chat.ts` 主幹・will/meaning/beauty 中枢・DB schema）は **manual review 必須**。
- 本束で **自動化**するのは: forensic / audit route / 集計 / evidence bundle / ledger 観測追記 / ドキュメント。
- **監査補正**（抽出器だけの水増し）と **実応答品質** を分離するため、`supreme_completion_audit_v1.py` は **raw.response + summary** の両方を参照する。

## micro-cards（実装マッピング）

| ID | 名前 | 本リポでの実装 |
|----|------|----------------|
| 1 | MAINLINE_SUPREME_COMPLETION_AUDIT_V1 | `mainline_supreme_completion_audit_v1.sh` + `supreme_completion_audit_v1.py` + `GET /api/audit/mainline-supreme-completion-audit-v1` |
| 2–9 | DEPTH / LONGFORM / ASK_KILL / … | **レポート内 `recommended_micro_cards`** として生成（閾値未達軸から）。コード変更は別 PR・manual review 下で実施。 |
| 10 | MAINLINE_SUPREME_REAUDIT_V1 | `mainline_supreme_reaudit_v1.sh` + `GET /api/audit/mainline-supreme-reaudit-v1` + `--baseline` 比較 |

## 実行

```bash
bash api/scripts/mainline_supreme_completion_audit_v1.sh /tmp/supreme_run_1
export TENMON_SUPREME_AUDIT_BASELINE=/tmp/supreme_run_1
bash api/scripts/mainline_supreme_reaudit_v1.sh /tmp/supreme_run_2
```

## API

- Manifest: `GET /api/audit/mainline-supreme-completion-audit-v1`（認証不要）
- レポート読取: 同上 + `x-tenmon-local-test: 1` + `?forensicRoot=/tmp/...`
- Ledger 追記: `POST /api/audit/mainline-supreme-completion-audit-ledger-v1?forensicRoot=...` + `x-tenmon-local-test: 1`（**自動昇格なし**・`regressionRisk: low`）

## no-touch

- `api/src/db/kokuzo_schema.sql` — 変更禁止（本束未接触）。
