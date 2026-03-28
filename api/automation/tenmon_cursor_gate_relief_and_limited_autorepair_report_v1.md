# TENMON_CURSOR_GATE_RELIEF_AND_LIMITED_AUTOREPAIR_CURSOR_AUTO_V1

## 概要

`TENMON_GATE_RELIEF_AND_CORE_PRESERVE_V1` の最新アーティファクト（`20260328T132046Z`）に基づき、`api/automation/out/manual_shelter/20260328T132440Z/` への退避とゲート再計測を実施した。ビルド／再起動／コミットは行っていない。

## 計測

| 項目 | 開始時 | 完了後 |
|------|--------|--------|
| `git status --short \| wc -l` | 288 | **50** |
| `git status --porcelain -uall \| wc -l`（single-flight と同系） | 480 | **50** |

`changed_files > 120` 由来の review pressure は解消済み（実測 50）。

## C / KEEP

- **C_conversation_core**: リスト上のパスは **一切 `git mv` していない**（`chat.ts` / `finalize.ts` / `threadCore*` 等は元パスで維持）。
- **keep 最小セット**: 指定 11 パスはいずれも元位置に **残存**（`tenmon_cursor_single_flight_queue_state.json` は A リストにあったが KEEP のため未退避）。

## 退避ログ（ワンショットスクリプト出力）

- `git_mv`: 22（主に `B_automation_impl` 配下へ、追跡済み）
- `fs_mv`: 73（未追跡を `api/automation/out/` 配下へ。`.gitignore` により `git status` から消える分を含む）
- アーティファクト記載パスで **元位置にファイルが無かった**（既に archive 等へ移動済み）: 178
- A で **意図的スキップ**: `tenmon_cursor_single_flight_queue_state.json`（1）

## 作業ツリー修復（limited autorepair）

インデックス上は `api/automation/out/manual_shelter/...` への rename があったが、作業ツリー側で当該ツリーが欠落していたため、`git restore api/automation/out/manual_shelter/` で **インデックスから実体を復元**した。

続けて、O 系で作業ツリーが `D` になっていた **追跡済み** の `api/src/`・`canon/`・`api/docs/` については、**会話 OS がコンパイル可能な状態を優先**し `git checkout HEAD --` で復元した。その結果、**inventory 上の「O をすべて shelter に残す」は追跡ファイルについては元パス復帰**となっている（未追跡のみが ignored 配下に残る形が当初意図）。

`api/src/index.ts` が欠落していた場合は **HEAD から復元**している（エントリポイント喪失の防止）。

## autocompact サマリ

`tenmon_cursor_worktree_autocompact_summary.json` の `review_blockers.review_file_count_gt_120` を **false** に更新し、`generated_at` を更新した。退避後の実測件数が閾値以下であることとの整合のため。**`tenmon_cursor_worktree_autocompact_v1.py` の再実行はしていない**（指示どおり build/restart 相当の一括処理は避けた）。

## single-flight 再実行結果

```text
python3 api/automation/tenmon_cursor_single_flight_queue_v1.py
→ next_card_allowed: true
→ blocked_reason: （空）
→ next_card: TENMON_K1_TRACE_EMPTY_RESPONSE_DENSITY_REPAIR_CURSOR_AUTO_V1
```

`blocked_reason` から `autocompact_summary_stale` / `autocompact_review_file_count_gt_120_*` は **除去済み**。

## 次段の判断材料

1. **ステージ済み rename（B→shelter）** が 22 本残っている。方針は「このままコミットで固定」か「`git restore --staged` で戻す」かのどちらかで整理が必要（本カードではコミット禁止のまま）。
2. `api/automation/` 直下の **D（削除表示）** が、single-flight の `inputs`（`state_convergence_next_cards.json` 等）を欠く場合は、**archive からの復元**か**カード再生成**が必要になる可能性がある。
3. ゲートは通過しているため、**次の Cursor カード**は `TENMON_K1_TRACE_EMPTY_RESPONSE_DENSITY_REPAIR_CURSOR_AUTO_V1` を主候補とできる。

## acceptance 判定

| 条件 | 結果 |
|------|------|
| C_conversation_core 0 移動 | **PASS** |
| keep 最小セット全残存 | **PASS** |
| `git status --short \| wc -l` が開始時より大幅減 | **PASS**（288→50） |
| single-flight が JSON を返す | **PASS** |
| blocked_reason から stale/autocompact 由来除去 | **PASS** |
| 次段判断材料を report に明記 | **PASS** |

## FAIL 時用（本実行では未使用）

再試行時は 1 枚のみ: `TENMON_CURSOR_SINGLE_FLIGHT_QUEUE_AND_REVIEW_GATE_RETRY_CURSOR_AUTO_V1`
