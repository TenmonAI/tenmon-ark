# TENMON_CARD_AUTO_GENERATOR_V1

## 目的

Improvement Ledger・Residual Quality Scorer・最新 `final_verdict` を束ね、**未達 blocker を focused Cursor/VPS カードへ自動変換**する（1 カード 1 主題）。

## 成果物

| 種別 | パス |
|------|------|
| ジェネレータ | `api/automation/card_auto_generator_v1.py` |
| manifest スキーマ | `api/automation/card_auto_generator_schema_v1.json` |
| VPS ランナー | `api/scripts/card_auto_generate_v1.sh` |
| Cursor 出力 | `api/automation/generated_cursor_apply/AUTO_GEN_<THEME>_<SLUG>_CURSOR_AUTO_V1.md` |
| VPS 出力 | `api/automation/generated_vps_cards/<ts>/AUTO_GEN_<THEME>_<SLUG>_VPS_V1.sh` |
| 実行ディレクトリ | `card_manifest.json`, `generated_cursor_card_sample.md`, `generated_vps_card_sample.sh`, `final_verdict.json` |

## 入力

- **seal ディレクトリ:** `final_verdict.json`（必須）
- **Residual:** `residual_priority_result.json`（`--priority-json` または `<seal>/_residual_quality_scorer_v1/`）
- **Ledger:** `improvement_ledger_entries_v1.jsonl` テール（`summary_human_ja` を WHY_NOW に注入）

## Cursor カード必須節

`CARD_NAME`, `OBJECTIVE`, `WHY_NOW`, `EDIT_SCOPE`, `DO_NOT_TOUCH`, `IMPLEMENTATION_POLICY`, `ACCEPTANCE`, `VPS_VALIDATION_OUTPUTS`, `FAIL_NEXT_CARD` を **常に含める**（`## SECTION` 形式）。

## VPS カード（.sh）

`build` / `systemctl restart` / `health` / `audit` / `chat URL probe` / `verdict hint` を含む。

## CLI

```bash
cd /opt/tenmon-ark-repo/api
python3 automation/card_auto_generator_v1.py generate \
  --seal-dir "$(readlink -f /var/log/tenmon/card)" \
  --out-dir /tmp/cardgen_out \
  --ts-folder "$(date -u +%Y%m%dT%H%M%SZ)"

python3 automation/card_auto_generator_v1.py sample \
  --blocker longform_quality_not_clean \
  --out-dir /tmp/cardgen_sample
```

## 編集境界

- `dist/**`, DB schema, `kokuzo_pages` 正文, route 本体, 既存 acceptance seal の主契約は変更しない。

## カード

- `TENMON_CARD_AUTO_GENERATOR_CURSOR_AUTO_V1`
- `TENMON_CARD_AUTO_GENERATOR_VPS_V1`
- `TENMON_CARD_AUTO_GENERATOR_RETRY_CURSOR_AUTO_V1`
