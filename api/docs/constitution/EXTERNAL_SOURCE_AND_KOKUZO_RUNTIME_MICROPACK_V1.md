# EXTERNAL_SOURCE_AND_KOKUZO_RUNTIME_MICROPACK_V1

**親カード:** `EXTERNAL_SOURCE_AND_KOKUZO_AUTOBUNDLE_V1`（束 C）  
**目的:** 束 C で定義した **12 micro-card** を **固定順 1→12** で実ランタイム検証し、`evidenceBundlePath` / `envelope.json` / `MICROPACK_MANIFEST.json` を残して **docs-pass → runtime-pass** に引き上げる。

---

## 実行

```bash
cd api
BASE=http://127.0.0.1:3000 TENMON_DATA_DIR=/opt/tenmon-ark-data \
  ./scripts/external_source_kokuzo_runtime_micropack_v1.sh /path/to/evidence_bundle
```

- API が **`/health`・`/api/chat`・`/api/memory/seed`・`/api/audit`** に応答していること。  
- `kokuzo.sqlite` が `TENMON_DATA_DIR` 配下に存在すること。  
- ローカル検証ヘッダ（`x-tenmon-local-test` / `x-tenmon-local-user`）利用時は、スクリプト先頭の **命名3ターン bootstrap** で `NAMING_STEP` を消費してから各プローブを実行する。

---

## micro-card 順（固定）

| # | ID |
|---|-----|
| 1 | `external_source_priority_policy_bind` |
| 2 | `notion_source_panel_runtime_check` |
| 3 | `gdocs_local_connector_scope_check` |
| 4 | `dropbox_local_connector_scope_check` |
| 5 | `icloud_local_bridge_scope_check` |
| 6 | `notebooklm_source_scope_check` |
| 7 | `external_knowledge_binder_probe` |
| 8 | `kotodama_rule_index_runtime_probe` |
| 9 | `structural_crosswalk_probe` |
| 10 | `ark_scripture_guide_probe` |
| 11 | `kokuzo_seed_bridge_probe` |
| 12 | `kokuzo_guardian_integrity_probe` |

各 `micro_XX_*/envelope.json` に **単一 acceptance** を記録。FAIL 時は **rollback → forensic → retry**（`SELF_BUILD_RESTORE_POLICY_V1`）。

---

## 参照ドキュメント（単一源）

- `EXTERNAL_SOURCE_PRIORITY_AND_ISOLATION_POLICY_V1.md`  
- `EXTERNAL_CONNECTOR_SCOPE_DECLARATIONS_V1.md`  
- `docs/khs/KOKUZO_SEED_MIN_SCHEMA_v1.md`（guardian / quarantine 語）

---

## 変更履歴

| 版 | 内容 |
|----|------|
| V1 | 初版 — 12 順スクリプト・証跡フォーマット固定 |
