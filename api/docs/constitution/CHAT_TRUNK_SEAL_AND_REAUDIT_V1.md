# CHAT_TRUNK_SEAL_AND_REAUDIT_V1

## 未封印差分の分類（会話主線）

| ファイル | 役割 | 本バッチでの位置づけ |
|----------|------|----------------------|
| `api/src/routes/chat.ts` | NATURAL / general / preempt / finalize 前処理の**幹** | 会話主線の入口・分岐・`applyFinalAnswerConstitutionAndWisdomReducerV1` 接続 |
| `api/src/routes/chat_parts/gates_impl.ts` | ゲート実装・route 登録 | 幹から参照される**直結部** |
| `api/src/core/knowledgeBinder.ts` | binder 系（ku 補助） | chat 幹から呼ばれる**最小接続** |
| `api/src/core/sourceGraph.ts` | ソースグラフ参照 | 同上（差分 1 行級） |
| `api/src/core/kanagiGrowthLedger.ts` | 成長台帳伝播 | 同上 |

## 明示除外

- `client/**`, `kokuzo_schema.sql`, `dist/**`
- 既に封印済みの `planning/`・`chat_refactor/` 等は**本カードで無目的に編集しない**

## コミット単位

- **runtime のみ 1 コミット**: 上表 5 ファイルのみ staged（`git diff --cached --name-only` が 5 行になること）

## 再監査（受け入れ後）

- 原理 5 プローブ: `SYSTEM_DIAGNOSIS_PREEMPT_V1` 誤吸着なし、`根拠束:` 旧形式なし
- supreme 18 本 + `supreme_audit_report.json` 再生成

## 次カード

`MAINLINE_SUPREME_REAUDIT_AFTER_SEAL_V1`
