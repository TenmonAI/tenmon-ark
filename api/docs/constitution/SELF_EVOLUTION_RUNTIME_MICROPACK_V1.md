# SELF_EVOLUTION_RUNTIME_MICROPACK_V1

**親カード:** `SELF_EVOLUTION_AUTOBUNDLE_V1`（束 D）  
**役割:** docs で固定した **7 micro-card** を **固定順**で実 API に対して実行し、各 `envelope.json`・ルート `MICROPACK_MANIFEST.json`・親 `envelope.json` に **`evidenceBundlePath`** を残す。

---

## 1. 実行

```bash
cd api
npm run build
# 重要: build 後は必ず API を再起動（古い node が掴んでいると /api/audit/evolution/* が 404 になる）
fuser -k 3000/tcp 2>/dev/null || true
PORT=3000 node dist/index.js &

SKIP_NPM_BUILD=1 BASE=http://127.0.0.1:3000 \
  ./scripts/self_evolution_runtime_micropack_v1.sh /path/to/evidence_dir
```

- **`SKIP_NPM_BUILD=1`**: スクリプト内の `npm run build` を省略（上記のように **事前 build + 再起動済み**のとき使用）。
- **`BASE`**: 検証対象 API の origin（既定 `http://127.0.0.1:3000`）。
- **`TENMON_DATA_DIR`**: `kokuzo.sqlite` 所在（既定 `/opt/tenmon-ark-data`）。

---

## 2. micro-card 順（固定）

| # | ID |
|---|-----|
| 1 | `self_learning_runtime_feedback_check` |
| 2 | `rule_binder_runtime_effect_check` |
| 3 | `seed_learning_effect_probe` |
| 4 | `apply_log_to_usage_effect_probe` |
| 5 | `evolution_ledger_definition_and_runtime_check` |
| 6 | `meta_optimizer_probe` |
| 7 | `intelligence_os_master_audit_probe` |

---

## 3. 実装参照（runtime）

| 項目 | 参照 |
|------|------|
| Meta optimizer / Intelligence audit | `GET /api/audit/evolution/meta-optimizer-v1`, `GET /api/audit/evolution/intelligence-os-master-v1`（`api/src/routes/audit.ts` + `evolutionAuditProbesV1.ts`） |
| Self-learning / binder | `tryHydratePriorRuleFeedbackV1` / `applySelfLearningRuleBinderV1`（`chat_refactor/finalize.ts` 等） |

---

## 4. 証跡レイアウト

- `EVIDENCE_ROOT/envelope.json` — 束全体 PASS  
- `EVIDENCE_ROOT/MICROPACK_MANIFEST.json` — micro ディレクトリ一覧  
- `EVIDENCE_ROOT/micro_*/envelope.json` — 各 micro の `evidenceBundlePath`  
- `EVIDENCE_ROOT/SELF_EVOLUTION_RUNTIME_MICROPACK_V1.log` — 実行ログ（tee）

---

## 5. 束 D の位置づけ

本パックが **7/7 PASS** かつ **rollback 未解決なし**のとき、`SELF_EVOLUTION_AUTOBUNDLE_V1` を **runtime 完了**とみなし、次カード **`SELF_BUILD_SUPERVISOR_LOOP_V1`** へ進行可能。
