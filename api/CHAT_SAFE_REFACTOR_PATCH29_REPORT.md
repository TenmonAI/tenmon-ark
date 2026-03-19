# CHAT_SAFE_REFACTOR_PATCH29_FINAL_ACCEPTANCE_SWEEP_V1

## 8 probe 一括実行結果（decisionFrame.ku 監査）

| probe | routeReason | routeClass | answerLength | answerMode | answerFrame | responsePlan |
|-------|-------------|------------|--------------|------------|-------------|--------------|
| compare | RELEASE_PREEMPT_STRICT_COMPARE_BEFORE_TRUTH_V1 | analysis | medium | analysis | statement_plus_one_question | RELEASE_PREEMPT_STRICT_COMPARE_BEFORE_TRUTH_V1 |
| selfaware | R22_SELFAWARE_CONSCIOUSNESS_V1 | selfaware | short | analysis | one_step | R22_SELFAWARE_CONSCIOUSNESS_V1 |
| systemdiag | SYSTEM_DIAGNOSIS_PREEMPT_V1 | analysis | short | analysis | statement_plus_one_question | SYSTEM_DIAGNOSIS_PREEMPT_V1 |
| future | R22_FUTURE_OUTLOOK_V1 | analysis | short | analysis | one_step | R22_FUTURE_OUTLOOK_V1 |
| judgement | R22_JUDGEMENT_PREEMPT_V1 | judgement | short | analysis | one_step | R22_JUDGEMENT_PREEMPT_V1 |
| essence | R22_ESSENCE_ASK_V1 | analysis | short | analysis | one_step | R22_ESSENCE_ASK_V1 |
| structure | TENMON_STRUCTURE_LOCK_V1 | analysis | medium | define | statement_plus_one_question | TENMON_STRUCTURE_LOCK_V1 |
| explicit | EXPLICIT_CHAR_PREEMPT_V1 | analysis | long | analysis | one_step | EXPLICIT_CHAR_PREEMPT_V1 |

全 8 probe で routeReason / routeClass / answerLength / answerMode / answerFrame / responsePlan が存在することを確認。

## chat.ts 掃除内容

- **未使用 import 削除**: `finalizeSingleExitV1`（chat.ts では majorRoutes の exit 経路のみ使用のため不要）を削除。
- **restore**: PATCH26 の共通 restore は「reply 入口直後」と「最外周 res.json 直前」の 2 箇所のみ。重複なし。
- **旧 return 残骸**: 既存置換でインライン return は helper 呼び出しに統一済みのため、特になし。

## 掃除後の probe 再実行

上記と同じ監査表で全 8 probe 通過を再確認済み（`/tmp/patch29_after_sweep` で再実行）。

## 実行コマンド

- 8 probe: `BASE=http://127.0.0.1:3000 api/scripts/patch29_probe_8_sweep.sh /tmp/patch29_run`
- health: `curl -s http://127.0.0.1:3000/api/health` または `curl -s http://127.0.0.1:3000/api/audit`
- build: リポジトリで `npm run build`（要 `npm install` 済み。vite 依存が未解決の環境では失敗する場合あり）
