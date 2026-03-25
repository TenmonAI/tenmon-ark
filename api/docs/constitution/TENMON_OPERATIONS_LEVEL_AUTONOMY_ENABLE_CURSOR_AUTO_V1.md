# TENMON_OPERATIONS_LEVEL_AUTONOMY_ENABLE_CURSOR_AUTO_V1

## 目的

監査・問題抽出・次カード選定・remote cursor dispatch・result ingest・rejudge・retry を、**安全ゲート付きの運用自動ループ**として回す。目的は無人での無差別プロダクト改変ではなく、**スコープ制限と 1 cycle=1 検証**の運用核である。

## 前提

次のいずれか（理想は両方）:

- `TENMON_SELF_BUILD_REAL_CLOSED_LOOP_PROOF_CURSOR_AUTO_V1` が実証済み
- `TENMON_CURSOR_ONLY_REPO_HYGIENE_FINAL_SEAL_CURSOR_AUTO_V1` 相当で `must_block_seal=false`

## 不変更条件（NON-NEGOTIABLE）

- `api/src/routes/chat.ts` 等 high-risk は execution gate **green** まで自動編集キューに乗せない（許可スコープ外として選定されない）
- hardstop / gate が緑でない間は product core 相当（medium/high 宣言カード）は選ばれない
- safe / medium / high のパス宣言は `operations_level_autonomy_policy_v1.json` に固定
- 1 cycle = 選んだ 1 カード用の 1 変更群＋検証
- retry は同一カードで最大 1 回（state の `retry_used`）
- stale verdict を真実源にしない（当ランで rejudge を更新）
- キュー空を PASS にしない
- submit→result→bundle→build/audit の current-run 証跡がなければ success を宣言しない

## スコープ階層

| 層 | パス |
|----|------|
| safe | `api/automation/**`, `api/scripts/**`, `api/docs/constitution/**` |
| medium | `api/src/core/**`, `api/src/kokuzo/**`, `api/src/routes/chat_refactor/**` |
| high_risk | `chat.ts`, `finalize.ts`, `web/src/**`（宣言ベース） |

ゲート:

- execution `pass` かつ衛生 clean かつ worldclass の保留が route/surface 系に限定 → **high_risk** まで許可
- execution `pass` かつ衛生 clean → **medium** まで
- それ以外 → **safe** のみ

## 実行

```bash
api/scripts/tenmon_operations_level_autonomy_v1.sh
```

必須環境（フル cycle）:

- `FOUNDER_KEY` または `TENMON_REMOTE_CURSOR_FOUNDER_KEY`（`GET /api/admin/cursor/next` 到達可）
- `TENMON_GATE_BASE`（既定 `http://127.0.0.1:3000`）
- キュー候補: `state_convergence_next_cards.json` 等（空なら `empty_queue` で失敗）

開発用:

- `--skip-dispatch` / `--skip-rejudge`（**autonomy_cycle_pass 不可**）

## systemd timer

```bash
SKIP_SYSTEMCTL_INSTALL=1 api/scripts/install_tenmon_operations_level_autonomy_timer_v1.sh   # 生成のみ
sudo api/scripts/install_tenmon_operations_level_autonomy_timer_v1.sh
```

- 起動後 10 分、以降 **3 時間毎**
- 重複実行は `api/automation/out/operations_level_autonomy/cycle.lock` の flock で抑止

## 成果物

- `operations_level_autonomy_policy_v1.json`
- `operations_level_autonomy_state_v1.json`
- `tenmon_operations_level_autonomy_summary.json`
- `tenmon_operations_level_autonomy_report.md`
- `tenmon_operations_level_autonomy_enable_verdict.json`（master chain 互換フラグ）

## NEXT

- **PASS**: `TENMON_AUTONOMY_OPERATIONS_LEVEL_MASTER_CHAIN_CURSOR_AUTO_V1`
- **FAIL**: `TENMON_OPERATIONS_LEVEL_AUTONOMY_ENABLE_RETRY_CURSOR_AUTO_V1`
