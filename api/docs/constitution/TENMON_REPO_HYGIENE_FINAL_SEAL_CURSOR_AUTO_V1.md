# TENMON_REPO_HYGIENE_FINAL_SEAL_CURSOR_AUTO_V1

## 目的

seal を止めている **repo hygiene** を、runtime core を壊さず最小 diff で整流する。

1. generated / runtime / transient を **clean バケット**として扱い、安全な範囲のみ削除  
2. `.gitignore` を **最小追記**し再発を抑える  
3. `must_block_seal` を **縮小可能な状態**へ寄せる  
4. **manual review** と **ignore 対象**を明示分離する  

## NON-NEGOTIABLES

- runtime core を自動削除しない  
- tracked 変更の勝手な revert はしない  
- ignore / 削除は **generated・runtime artifact・transient** に限定  
- manual review 対象は残す  
- `api/src/**`, `web/src/**` は cleanup の対象にしない  
- `git clean -fdx` 禁止  

## Phase A — classify

`tenmon_repo_hygiene_watchdog_verdict.json` を読み、次を確定（出力は `tenmon_repo_hygiene_final_seal_verdict.json` の `phase_a_classification`）:

- generated cleanup 候補  
- runtime artifact 候補  
- ignore 候補  
- manual review 候補  

## Phase B — safe cleanup

**次のディレクトリのみ** `rmtree`（存在する場合）:

- `api/automation/generated_cursor_apply`  
- `api/automation/generated_vps_cards`  
- `api/automation/out`  

いずれもリポジトリルート配下に解決することを検証する。`api/src` / `web/src` は触らない。

## Phase C — ignore normalization

ルート `.gitignore` に、本カード用ヘッダ付きブロックが **未登録なら** 1 回だけ追記する（重複防止）。
対象は最小:

- `api/automation/generated_cursor_apply/`
- `api/automation/generated_vps_cards/`
- `api/automation/out/`

`.json` などの manual review 可能性がある単体ファイルは本カードで追加 ignore しない。

## Phase D — rerun watchdog

`tenmon_repo_hygiene_watchdog_v1.py` を再実行し、`must_block_seal` / 件数を更新する。

## 実行

```bash
cd /opt/tenmon-ark-repo/api
bash scripts/tenmon_repo_hygiene_final_seal_v1.sh --stdout-json
```

オプション（Python へそのまま渡る）:

- `--dry-run` — 削除・gitignore 書き込み・watchdog 再実行を行わない（分類のみ確認に近い）  
- `--skip-watchdog` — Phase D をスキップ  

終了コード: Phase D 実行後は **watchdog と同じ**（`watchdog_clean` なら 0）。

## 出力

- `api/automation/tenmon_repo_hygiene_final_seal_verdict.json`  
- `api/automation/tenmon_repo_hygiene_final_seal_report.md`  

## watchdog 連携

`tenmon_repo_hygiene_watchdog_verdict.json` に `final_seal_policy`（safe rmdir リスト・触らない prefix）を併記する。

---

*Version: 1*
