# CHAT_TRUNK_EXIT_CONTRACT_LOCK_V1

## 目的

`api/src/routes/chat.ts` を**読み取り専用**で解析し、`return` / `reply`（`__reply`）/ `res.json` / トップレベル JSON 送出 / 早期 `return` の出口パターンを抽出して **exit contract JSON** と **drift 候補**を出す。split（trunk 分割）前に「出口の形」が契約から大きく外れていないかを機械的に可視化する。

**runtime 非変更**。`chat.ts` / `client/**` / `dist/**` / `kokuzo_schema.sql` は本カードのツールでは**編集しない**（別途 `chat_refactor/**` への min diff はカタログ上の `patchStrategy` で許可される作業）。

## 成果物

| パス | 内容 |
|------|------|
| `api/automation/chatts_exit_contract_lock_v1.py` | CLI（`--stdout-json` / `--emit-report` / `--check-json`） |
| `api/automation/chatts_exit_contract_schema_v1.json` | レポート JSON Schema |
| `api/automation/reports/chatts_exit_contract_v1.json` | 解析結果 |
| `api/automation/reports/chatts_exit_contract_v1.md` | 要約レポート |

## 契約ビュー（サイト単位）

各 **exit site** について、行番号付近のウィンドウ（±45 行）からヒューリスティクで:

- **routeReason** / **mode** / **intent**（リテラル文字列が取れた場合）
- **ku object**（`ku:` / `decisionFrame.ku` の有無）
- **lawsUsed / evidenceIds / lawTrace**（ウィンドウ内言及 → default 方針ラベル）
- **rewriteUsed / rewriteDelta**（コメント `CARD6C` / `res.json ONCE` 等）
- **threadId propagation**
- **synapseTop** / **responsePlan**（attach 候補の言及）
- `return res.json` が **`__tenmonGeneralGateResultMaybe`** 経由か

**exit kind**: `return_res_json` | `bare_res_json` | `return_reply` | `return_object` | `early_return`

## Drift 候補

例:

- `return res.json` でゲートラッパ有無が混在
- ゲート無し `return res.json`
- `decisionFrame` があるのにウィンドウ内に **literal routeReason** が見つからない

偽陽性あり（分割ウィンドウ・動的生成）。

## trunk 別 required exit contract（静的）

`trunkRequiredExitContracts` に **6 trunk**（`infra_wrapper`, `define`, `scripture`, `general`, `continuity`, `support_selfdiag`）それぞれの必須ポリシーを文字列で固定。split 計画（domain map）と照らして人手で解釈する。

## CLI

```bash
python3 api/automation/chatts_exit_contract_lock_v1.py --repo-root .
python3 api/automation/chatts_exit_contract_lock_v1.py --repo-root . --stdout-json
python3 api/automation/chatts_exit_contract_lock_v1.py --repo-root . --emit-report --check-json
```

## 次カード（自動化候補）

**`AUTO_BUILD_WORKSPACE_OBSERVER_V1`**

## 受け入れ

- `py_compile` / `json.tool` schema / 上記 CLI / `npm run build` / `supervisor --validate-only`
