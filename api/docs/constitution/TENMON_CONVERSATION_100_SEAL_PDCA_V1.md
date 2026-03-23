# TENMON_CONVERSATION_100_SEAL_PDCA_V1

## 監査基盤（P1）

- **`repo_resolve_v1.py`**: `Path.cwd()` だけでは `.git` に届かない環境（例: `/root`）でも、`api/automation` から上位走査して repo root を解決する。
- **適用スクリプト**: `workspace_observer_v1` / `execution_gate_v1` / `full_autopilot_v1` / `replay_audit_v1` / `auto_build_runner_v1` / `queue_scheduler_v1` / `chatts_*` / `patch_planner_v1` / `campaign_executor_v1` / `cursor_applier_v1` / `cursor_bridge_v1` 等。
- **`post_7pack_total_reveal_v1.py`**: `chatts_*` 呼び出しは `--repo-root <絶対>` と `--chat-path <chat.ts 絶対>` を付与。

## 長文化（P4 抜粋）

- **`TRUTH_GATE_RETURN_V2`**: 明示字数 **≥500** のときは発火しない（短答 LLM に吸わせず `EXPLICIT_CHAR_PREEMPT_V1` 側へ）。
- **`finalize.ts`**: `EXPLICIT_CHAR_PREEMPT_V1` かつ `explicitLengthRequested >= 2400` では、天聞見出し＋本文のみ（補助一手・根拠束行を付けない早期 return）。

## ログ（最上位 D）

カード実行ログは運用ポリシーどおり `/var/log/tenmon/card_<CARD>/<TS>/run.log` に集約すること（本リポジトリのコード変更ではパスは強制しない）。

## CHECK コマンド（抜粋）

```bash
cd /opt/tenmon-ark-repo/api && npm run build
sudo systemctl restart tenmon-ark-api.service
curl -fsS http://127.0.0.1:3000/health
python3 /opt/tenmon-ark-repo/api/automation/execution_gate_v1.py --repo-root /opt/tenmon-ark-repo --stdout-json
python3 /opt/tenmon-ark-repo/api/automation/full_autopilot_v1.py --repo-root /opt/tenmon-ark-repo --stdout-json
```

`--repo-root` 省略時も、上記 `repo_resolve_v1` により通常は正しい repo が選ばれる。
