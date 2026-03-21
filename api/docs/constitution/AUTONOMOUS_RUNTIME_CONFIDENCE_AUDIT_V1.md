# AUTONOMOUS_RUNTIME_CONFIDENCE_AUDIT_V1

**MODE:** `FORENSIC` → `MIN_DIFF_PATCH`（必要時のみ）  
**上位:** `SELF_BUILD_CONSTITUTION_AND_POLICY_V1.md` / `SELF_BUILD_SUPERVISOR_LOOP_V1.md`  
**目的:** 自己構築 OS v1 が **動くだけでなく任せられるか** を、**複数サイクル・複数条件**で監査する。  
**seal:** **壊れても seal しない**。confidence が低いとき **自動昇格しない**。`reviewRequired` を **無理に auto 化しない**。

---

## 1. 監査 API（read-only）

| メソッド | パス |
|----------|------|
| `GET` | `/api/audit/autonomous-runtime-confidence-v1` |

**内部で実施（HTTP クライアント不要）:**

1. **supervisor 自然経路**を **3 連続**実行（`runSelfBuildSupervisorCycleV1`）  
2. **simulate `rollback` / `quarantine`** を各 1 回（サーバ内部呼び出し — 外部からの simulate とは別）  
3. **confidence** 指標算出、`staleDist` ヒューリスティック、`runtimeBundleScriptPresence`  
4. **nextCard** は **`SEED_LEARNING_EFFECT_AUDIT_V1` に 1 つに固定**

---

## 2. confidence 指標（例）

| キー | 意味 |
|------|------|
| `supervisorStability` | ω / risk / nextCard / gitSha / uptime の一貫性スコア |
| `nextCardSingletonContract` | 3 サイクルとも同一 `nextCard` なら 1 |
| `riskRoutingIntegrity` | rollback・quarantine が high+fail に落ちるか |
| `bundleIntegrityScore` | 主要 runtime micropack スクリプトの存在比率 |
| `aggregateConfidence` | 加重合成（**stale dist 疑いで減衰**） |

`gates.noAutoEscalation` / `sealBlockedOnLowConfidence` で **自動昇格・封印を抑止**。

---

## 3. stale dist / 再起動不整合

`dist/index.js` の **mtime** が **プロセス起動近似時刻**より新しい場合、`staleDistHeuristic.suspected=true`（**build 後に API 未再起動**の疑い）。  
→ **no_seal**・confidence 減衰・`recommendation` 反映。

---

## 4. 束との整合（非破壊）

監査は **ファイル存在**のみ確認（`self_evolution` / `memory_persona` / `external_source_kokuzo` / `self_build_supervisor` の各スクリプト）。**実行・DB 変更なし**。  
mainline / memory / external / evolution の **runtime 完了状態を壊さない**（読み取り・ヒューリスティックのみ）。

---

## 5. 証跡スクリプト

`api/scripts/autonomous_runtime_confidence_audit_v1.sh`

- `confidence_audit.json` / `health.json` / `envelope.json` / `CONFIDENCE_AUDIT_MANIFEST.json`  
- 任意: `EXPECTED_EVIDENCE_DIR` で **別束の evidence ディレクトリ実在**を確認  

`SKIP_NPM_BUILD=1` 可（**事前 build + API 再起動**必須）。

---

## 6. acceptance（カード）

1. **build** PASS  
2. **health** PASS  
3. **連続監査** — 応答に **3 自然サイクル要約** + **rollback/quarantine シミュレーション**  
4. **confidence** 1 つ以上  
5. **nextCard** 単一（`SEED_LEARNING_EFFECT_AUDIT_V1`）  
6. **no-touch / schema / will / meaning / beauty** — **監査対象のみ**、自動変更なし  

---

## 7. 実装参照

- `api/src/routes/selfBuildSupervisorCycleCoreV1.ts` — supervisor 共有コア  
- `api/src/routes/autonomousRuntimeConfidenceAuditV1.ts` — 本監査  
- `api/src/routes/selfBuildSupervisorLoopV1.ts` — HTTP supervisor（simulate は `x-tenmon-local-test: 1` のみ）  

---

## 8. 次カード（1 つ）

**`SEED_LEARNING_EFFECT_AUDIT_V1`**

---

## 9. 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-03-21 | 初版: 共有コア分離 + confidence GET + 証跡スクリプト |
