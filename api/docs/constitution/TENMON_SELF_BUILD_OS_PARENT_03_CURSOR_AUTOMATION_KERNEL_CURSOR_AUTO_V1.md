# TENMON_SELF_BUILD_OS_PARENT_03_CURSOR_AUTOMATION_KERNEL_CURSOR_AUTO_V1

## 目的

Cursor **完全自動構築の核**として、`card schema` / `executor bridge`（既存 v2 と併用）/ `retry` / `next-card` / `result collector` を **`cursor_automation_kernel_v1.py` で統合**し、カード粒度を固定する。

## 非対象（DO NOT TOUCH）

- `dist/**`
- `chat.ts` 本体
- runtime route 本体
- DB schema
- `kokuzo_pages` 正文
- `/api/chat` 契約

## 必須フィールド（全 Cursor カード）

`CARD_NAME`, `OBJECTIVE`, `WHY_NOW`, `EDIT_SCOPE`, `DO_NOT_TOUCH`, `IMPLEMENTATION_POLICY`, `ACCEPTANCE`, `VPS_VALIDATION_OUTPUTS`, `FAIL_NEXT_CARD`

機械定義: `cursor_card_contract_v1.py` → **`cursor_card_schema.json`**（kernel 正本。`cursor_card_schema_v2.json` とは別ファイル）

## モジュール

| ファイル | 役割 |
|---------|------|
| `cursor_card_contract_v1.py` | スキーマ JSON 出力、`--validate <path.md>` で契約検証 |
| `cursor_result_collector_v1.py` | `cursor_kernel_result.json`（build / acceptance / output_files / next_card / fail_type） |
| `cursor_automation_kernel_v1.py` | contract → collector → **bootstrap MD**（`generated_cursor_apply`）→ 成否に応じ **retry** |

## 正本ディレクトリ

**`api/automation/generated_cursor_apply`** — kernel が書く bootstrap / retry を優先（手置き MD は PR で contract 検証推奨）

## 実行

```bash
cd api/automation
python3 cursor_automation_kernel_v1.py
# bootstrap のみ:
python3 cursor_automation_kernel_v1.py --emit-bootstrap-only
```

## 成果物（VPS）

- `TENMON_SELF_BUILD_OS_PARENT_03_CURSOR_AUTOMATION_KERNEL_VPS_V1`
- `cursor_card_schema.json`
- `cursor_kernel_result.json`
- `cursor_retry_card.md`（失敗時は詳細 retry、成功時は短いスタブ）

## FAIL NEXT

`TENMON_SELF_BUILD_OS_PARENT_03_CURSOR_AUTOMATION_KERNEL_RETRY_CURSOR_AUTO_V1` — `generated_cursor_apply/` に同名 `.md` も出力
