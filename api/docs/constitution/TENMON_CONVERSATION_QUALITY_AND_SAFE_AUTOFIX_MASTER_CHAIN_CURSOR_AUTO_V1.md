# TENMON_CONVERSATION_QUALITY_AND_SAFE_AUTOFIX_MASTER_CHAIN_CURSOR_AUTO_V1

## 目的

会話品質に関する 6 カードを **順序固定・fail-fast** で一気通貫検証し、  
TENMON-ARKを「自動操縦の土台」から **会話品質も自己改善ループに載せられる状態**へ近づける。

## チェーン順（前カード相当の検証が通るまで次に進まない）

1. `TENMON_SURFACE_TEMPLATE_CLEAN_FINALIZE_CURSOR_AUTO_V1`
2. `TENMON_CONTEXT_CARRY_FACTUAL_SKIP_ROUTING_CURSOR_AUTO_V1`
3. `TENMON_SHORT_INPUT_CONTINUITY_HOLD_CURSOR_AUTO_V1`
4. `TENMON_FACTUAL_CORRECTION_ROUTE_CURSOR_AUTO_V1`
5. `TENMON_FACTUAL_WEATHER_ROUTE_CURSOR_AUTO_V1`
6. `TENMON_CONVERSATION_QUALITY_ANALYZER_AND_AUTO_CARD_GENERATOR_CURSOR_AUTO_V1`

## マスターポリシー

- **fail-fast**：最初の失敗で停止。
- **1 failure → retry 1 枚のみ**：`api/automation/generated_cursor_apply/<RETRY>.md` を 1 つ生成して終了。
- **stale truth 成功禁止**：本実行開始後に更新された analyzer 成果物のみ合格（mtime 検査）。
- **current-run 証跡必須**：`tenmon_conversation_quality_safe_autofix_master_summary.json` / `_report.md`。
- **`chat.ts` の high-risk 広域自動改変は禁止**（本チェーンは検証・観測のみ）。
- **safe autofix**：コード編集は行わず、analyzer が `auto_fixable=true` のものだけを generator が候補化する既存仕様に従う。

## 実行

```bash
# 既定: KHS（kokuzo 健全性）まで含め PASS が必要
python3 api/automation/tenmon_conversation_quality_safe_autofix_master_chain_v1.py --repo-root /opt/tenmon-ark-repo

# KG0 DB が無い開発環境では（KHS をスキップ）
TENMON_CQ_MASTER_HEALTH_OPTIONAL=1 python3 api/automation/tenmon_conversation_quality_safe_autofix_master_chain_v1.py
```

または:

```bash
bash api/scripts/tenmon_conversation_quality_safe_autofix_master_chain_v1.sh
```

## 最終受け入れ（summary の `final_acceptance`）

- 定型テンプレの**素文字列再混入なし**（`finalize.ts` 内は strip 用 `/.../` のみ許容）
- context carry skip 実装の存在
- 短入力 continuity hold の存在
- correction / weather ルートの存在
- analyzer による問題抽出 + safe generated cards
- `npm run build` PASS
- KHS `verdict=PASS`（`TENMON_CQ_MASTER_HEALTH_OPTIONAL` 未設定時）
- 成果物の鮮度 audit PASS

## 成果物

- `api/automation/tenmon_conversation_quality_safe_autofix_master_summary.json`
- `api/automation/tenmon_conversation_quality_safe_autofix_master_report.md`

## NEXT

- PASS → `TENMON_WORLDCLASS_DIALOGUE_QUALITY_FINISH_CURSOR_AUTO_V1`
- FAIL → 失敗カードに対応する **retry 1 枚**（`generated_cursor_apply`）のみ実行して stop
