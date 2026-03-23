# AUTO_BUILD_MAINLINE_COMPLETION_SYNC_V1

## 目的

主線4 FINAL 実装後に、registry / manifests / `full_autopilot.runNext` / campaign / replay の **mainline completion** 表現を揃える（`chat.ts` 非接触）。

## 成果物

- `api/automation/reports/mainline_runtime_acceptance_complete_v1.json` — `mainlineFinalTrunkComplete: true` で `full_autopilot` が `MAINLINE_COMPLETED_READ_ONLY_SEAL_V1` を `runNext.nextCard` に載せる。
- `campaign_state_v1.json` の `cards` を4 FINAL に更新。
- `CHAT_TRUNK_RUNTIME_ACCEPTANCE_LOCK_V1_FINAL` の `nextOnPass` → `MAINLINE_COMPLETED_READ_ONLY_SEAL_V1` → `CHAT_TRUNK_EXIT_CONTRACT_LOCK_V1`（DAG 同順）。

## 検証

postcheck: patch_planner emit + supervisor validate。運用では CHECK 列の `replay_audit` / `execution_gate` / `npm run build` を併用。
