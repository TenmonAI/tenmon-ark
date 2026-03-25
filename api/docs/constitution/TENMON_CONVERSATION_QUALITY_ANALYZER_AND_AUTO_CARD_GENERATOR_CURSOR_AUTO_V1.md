# TENMON_CONVERSATION_QUALITY_ANALYZER_AND_AUTO_CARD_GENERATOR_CURSOR_AUTO_V1

## 目的

`conversation_log`（および `runtime_probe_matrix.json`）を **read-only** で解析し、会話品質上のリスクパターンを検出する。  
検出結果から **安全な範囲**の次カード候補のみを JSON で生成する（**`chat.ts` の自動編集は禁止**）。

## 前提

- `TENMON_FACTUAL_WEATHER_ROUTE_CURSOR_AUTO_V1` PASS。

## 非交渉

- **read-only 分析**から始める（SQLite は `mode=ro`）。
- **high-risk ファイル（`api/src/routes/chat.ts` 等）の自動編集は禁止**。
- **問題検出**（`conversation_quality_analyzer_v1.py`）と **card 生成**（`conversation_quality_auto_card_generator_v1.py`）を分離。
- **false positive 抑制**: 複数シグナル（ユーザ文＋`routeReason`＋本文）を組み合わせる。
- **current-run report**（`conversation_quality_analyzer_report.md` + `conversation_quality_analyzer_summary.json`）必須。

## 実装

### Phase A — analyzer

- 直近 **24h** かつ最大 **500 行**の `conversation_log`（`session_id` / `threadId` いずれかに対応）。
- 無い場合は `runtime_probe_matrix.json` をフォールバック解析。
- 検出タイプ（概要）:
  1. 定型先頭（`【天聞の所見】`）欠落の疑い（挨拶系ユーザ）
  2. factual 系ユーザに **context carry** 文言が乗った疑い
  3. **短入力**フォローで `CONTINUITY` 系 `routeReason` になっていない疑い
  4. **訂正**表現なのに `FACTUAL_CORRECTION` / 確認文が無い疑い
  5. **天気**質問なのに `FACTUAL_WEATHER` / 気温表記が無い疑い

- 検出器の疎通用に **ビルトイン自己検証サンプル**をマージ可能（`--no-selftest` で無効化）。

### Phase B — scored output

各パターンに `type`, `count`, `sample_messages`, `target_file`, `fix_hint`, `auto_fixable`, `requires_human_approval` を付与。

### Phase C — card generator

- **safe / auto_fix のみ**: プローブ JSON・手順 MD のみを候補に載せる（`CONV_QUALITY_SAFE_PROBE_PACK_V1`）。
- `chat.ts` 向けは **`requires_human_approval_cards`** に分離。

### Phase D — 実行

```bash
api/scripts/conversation_quality_analyzer_v1.sh
```

## 成果物

- `api/automation/conversation_quality_analyzer_summary.json`
- `api/automation/conversation_quality_analyzer_report.md`
- `api/automation/conversation_quality_generated_cards.json`
- `api/automation/conversation_quality_safe_probe_pack_v1.json`（プローブ定義）

## NEXT

- PASS → `TENMON_CONVERSATION_QUALITY_AND_SAFE_AUTOFIX_MASTER_CHAIN_CURSOR_AUTO_V1`
- FAIL → `TENMON_CONVERSATION_QUALITY_ANALYZER_AND_AUTO_CARD_GENERATOR_RETRY_CURSOR_AUTO_V1`
