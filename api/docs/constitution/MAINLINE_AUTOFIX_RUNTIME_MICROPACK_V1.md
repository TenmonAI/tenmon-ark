# MAINLINE_AUTOFIX_RUNTIME_MICROPACK_V1

**MODE:** `AUTONOMOUS_BUNDLE` → **FORENSIC / MIN_DIFF_PATCH**（**micro-card 単位**。コード変更は **1 micro-card あたり最大 3 ファイル**・low-risk のみ）  
**上位束:** `MAINLINE_AUTOFIX_BUNDLE_V1.md`  
**目的:** 同束で定義した **7 micro-card** を実ランタイムで **固定順**に実行し、`evidenceBundlePath` を確定して **docs-pass → runtime-pass** に引き上げる。

---

## 0. 実行入口

| 項目 | 内容 |
|------|------|
| **スクリプト** | `api/scripts/mainline_autofix_runtime_micropack_v1.sh` |
| **用法** | `cd api && BASE=http://127.0.0.1:3000 ./scripts/mainline_autofix_runtime_micropack_v1.sh [EVIDENCE_ROOT]` |
| **環境** | `TENMON_DATA_DIR`（ledger）、`SKIP_SQLITE_CHECKS=1` で MC6 の sqlite 検査のみスキップ（本番 seal では非推奨） |
| **再起動** | `npm run build` 後は **`node dist/...` で動かしている API を必ず再起動**（古い dist を掴んだままだと WILL 等が旧挙動のまま） |

各 micro-card ディレクトリに **`envelope.json`**（`evidenceBundlePath`・`acceptancePlan`・`rollbackPlan`・`status`）を生成する。

---

## 1. micro-card 順序（固定）と責務

| # | ID | acceptance（機械） |
|---|----|--------------------|
| 1 | `mainline_probe_pack` | `final_mainline_stability_sweep_v1.sh` が **全体 PASS** |
| 2 | `human_readable_law_runtime_check` | HRL 代表 3 問・**KHSL:LAW:** なし・route/responsePlan ルール |
| 3 | `task_return_surface_cleanup` | タスク系短文・KHSL なし・空落ちなし・簡易機械キー検査 |
| 4 | `will_probe_residual_check` | `will_core_runtime_probe_v1.sh` **PASS** |
| 5 | `beauty_surface_residual_check` | `BEAUTY_COMPILER_PREEMPT_V1`・responsePlan・KHSL なし |
| 6 | `density_ledger_runtime_check` | 密度チャット後 **`conversation_density_ledger_runtime_v1` に ≥1 行**（sqlite 利用時） |
| 7 | `null_drop_regression_check` | PATCH29 8 本・期待 route・responsePlan・**応答 empty なし**・KHSL なし |

**ルール:** **1 micro-card = 1 責務 = 1 acceptance**。FAIL 時は **即終了** → 運用で **rollback → forensic → retry**。PASS のみ次へ。

---

## 2. 禁止・継承

- **主幹思想変更禁止**（will / meaning / beauty / worldview）。  
- **no-touch** / **dist 手編集** / **schema 主幹** に触れない。  
- `MAINLINE_AUTOFIX_BUNDLE_V1` の境界・mixed 分離を継承。

---

## 3. bundle（runtime）完了条件

- 上記 **7 micro-card すべて PASS**。  
- **未解決 rollback なし**（再実行前に restore 完了）。  
- **`EVIDENCE_ROOT` 一式**（各 `envelope.json`・`MICROPACK_MANIFEST.json`・サブログ）を保存。  
- この状態で **`MAINLINE_AUTOFIX_BUNDLE_V1` を runtime 完了**とみなせる。

---

## 4. 次カード

**`MEMORY_AND_PERSONA_AUTOBUNDLE_V1`**

---

## 5. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | ランタイム micropack・7 順固定・証跡スクリプト |
| V1.1 | build 後 API 再起動の注意。WILL 主線: `chat.ts` に **早期 WILL_CORE_PREEMPT**（RESEED より前）を追加し probe と整合 |
