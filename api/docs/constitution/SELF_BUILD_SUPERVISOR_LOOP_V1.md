# SELF_BUILD_SUPERVISOR_LOOP_V1

**MODE:** `MIN_DIFF_PATCH`（runtime は **read-only audit 経路**に限定）  
**上位:** `SELF_BUILD_CONSTITUTION_AND_POLICY_V1.md` / `SELF_BUILD_GOVERNOR_V1.md`  
**位置づけ:** 束 A〜D の **runtime 完了後**、単発束の寄せ集めではなく **supervisor ループ**として  
`observe → decide → dispatch → acceptance → (rollback|quarantine) → learning → next_card` を **1 サイクル JSON** で閉じる。

---

## 1. 最上位判定式（運用意味）

**Ω = D · ΔS**

| 記号 | 意味（runtime object） |
|------|-------------------------|
| **D** | constitution / non-negotiables / verified canon（sha256 アンカー）/ acceptance・rollback・quarantine の **参照テキスト**（破壊しない） |
| **ΔS** | **8 系統**の観測: input / runtime / learning / sourceMaterial / buildHealthProbe / acceptanceProbe / contractAnchor / conversationMetrics |
| **Ω** | 応答に限らず **patchPlan（1 ステップ相当）** / **nextCard（1 つに固定）** / **sealReject 相当フラグ** / **dispatch ゲート** |

---

## 2. API（read-only）

| メソッド | パス |
|----------|------|
| `GET` | `/api/audit/supervisor/self-build-loop-v1` |
| `POST` | `/api/audit/supervisor/self-build-loop-v1` |

**ローカル検証用**（`x-tenmon-local-test: 1` のときのみ）:

- `POST` body: `{ "simulateOutcome": "rollback" \| "quarantine" }`  
  または query: `?simulate=rollback|quarantine`  
→ **acceptance: fail** と **Ω を rollback / quarantine** に落とす経路を確認（本番パイプラインでは使わない）。

---

## 3. リスク階層

| 条件 | `riskTier` | `reviewRequired` | `nextCardDispatch` |
|------|------------|------------------|---------------------|
| ready かつ constitution アンカー実在 | `low` | false | `allowed` |
| 未 ready または constitution `pending` | `high` | true | `hold_review` または `blocked_quarantine` |
| simulate rollback/quarantine | `high` | true | `blocked_quarantine` |

**low-risk のみ** `nextCardDispatch=allowed` で自動進行可能。**high-risk** は **review_required**。

---

## 4. 次カード（1 つに固定）

**`AUTONOMOUS_RUNTIME_CONFIDENCE_AUDIT_V1`** — `omega.nextCard` に常に単一文字列で返す（dispatch ゲートで抑止可能）。  
複数サイクル監査は **`GET /api/audit/autonomous-runtime-confidence-v1`**（`AUTONOMOUS_RUNTIME_CONFIDENCE_AUDIT_V1.md`）。

---

## 5. 証跡

スクリプト: `api/scripts/self_build_supervisor_loop_v1.sh`

- `cycle_pass.json` — 本番相当 1 周  
- `cycle_sim_rollback.json` / `cycle_sim_quarantine.json` — 失敗経路の観測  
- `envelope.json` — **`evidenceBundlePath`** 根拠  
- `health.json` / `SELF_BUILD_SUPERVISOR_LOOP_V1.log`

`SKIP_NPM_BUILD=1` で build 省略可（**事前 build + API 再起動**必須）。

---

## 6. acceptance（カード）

1. **build** PASS  
2. **health** PASS  
3. **supervisor** が 1 サイクル JSON を返す（`phases.observe|decide|dispatch|acceptance` が存在）  
4. **simulate** で rollback / quarantine に落とせる（local-test のみ）  
5. **D** を書き換えない（参照・ハッシュ読み取りのみ）  
6. **nextCard** が **1 つ**に固定されている  

---

## 7. 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-03-21 | 初版: `selfBuildSupervisorLoopV1` + audit ルート + 証跡スクリプト |
