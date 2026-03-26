# TENMON_GPT_CLAUDE_GEMINI_ROLE_ROUTER_CURSOR_AUTO_V1

## 目的

構築相談を **ChatGPT（実装・TS・API・UI・patch 草案）** / **Claude（長文 reasoning・設計妥当性・文体・会話改善）** / **Gemini（別案・比較・broad review）** に決定論的に振り分ける role router。ルーティング不能時は **fail-closed**（`manual_review_required: true`）。

## 実装

- `api/automation/model_role_router_v1.py`
- コア: `route_model_role_v1(objective, target_files, risk_class, domain)`

## CLI

```bash
python3 api/automation/model_role_router_v1.py \
  --objective "..." \
  --target-files "web/src/api/chat.ts" \
  --risk-class medium \
  --domain "" \
  [--input-json path.json] \
  [--output-file path.json]
```

`--input-json` がある場合は `objective`, `target_files`（配列または文字列）, `risk_class`, `domain` を読み、CLI 引数を上書き。

## 出力 JSON

| キー | 説明 |
|------|------|
| `primary_provider` | `chatgpt` \| `claude` \| `gemini` \| 失敗時 `null` |
| `secondary_providers` | 上記以外の候補リスト（順序固定） |
| `reason` | 採用ルール id（監査用） |
| `task_class` | タスク分類ラベル |
| `requires_consensus` | 高リスク等で true になりうる |
| `manual_review_required` | ルーティング不能時 true |

CLI では `card` を付与。

## ルール優先順（概要）

1. `chat.ts` / `finalize.ts` 等・会話品質キーワード → **claude** + chatgpt secondary  
2. PWA / browser → **chatgpt** + claude secondary  
3. shell / automation / `.py` / scripts → **chatgpt** + gemini secondary  
4. `.ts` / API・UI・patch 寄りキーワード → **chatgpt** + gemini secondary  
5. domain のみ（設計・比較）の特例  
6. objective が極短でパスなし → fail-closed  
7. それ以外にシグナルあり → 既定 **chatgpt** + gemini secondary  

`risk_class` が high/critical/escrow 等のとき `requires_consensus` を立てやすくする。

## 検証

```bash
python3 -m py_compile api/automation/model_role_router_v1.py
```

## nextOnPass

`TENMON_MULTI_MODEL_CONSENSUS_AND_CONFLICT_RESOLVER_CURSOR_AUTO_V1`

## nextOnFail

停止。router retry 1 枚のみ。
