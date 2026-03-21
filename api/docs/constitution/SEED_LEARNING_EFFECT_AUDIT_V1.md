# SEED_LEARNING_EFFECT_AUDIT_V1

**MODE:** `FORENSIC`  
**目的:** seed / cluster / apply_log / training が **保存されているだけでなく**、次回生成の **`routeReason` / `sourcePack|sourceKinds` / `densityContract` / `prose`** のいずれかに **実際に効いている痕跡**があるかを監査する。  
**次カード（1 本）:** **`KOKUZO_SEED_LEARNING_BRIDGE_V1`**（`kokuzo_fractal_seeds` / `ark` 系ログと KHS 管線の橋をカード化）

---

## 1. API（read-only）

| メソッド | パス |
|----------|------|
| `GET` | `/api/audit/seed-learning-effect-v1` |

**内容:**

- `kokuzo.sqlite` 上の実在テーブル（`khs_seeds_det_v1` / `khs_seed_clusters` / `khs_apply_log` / `synapse_log` / `khs_concepts` / `ark_thread_seeds` / `kz_seeds` 等）の **有無と行数・集計**
- `kokuzo_fractal_seeds` / `ark_seed_ledger` は **スキーマに無い環境では `tablePresence: false`**（橋カードの根拠）
- **効果シグナル**（存在ではなく相関・多様性）:
  - apply_log の `lawKey` と `usageScore>0` の seed の **結合件数**
  - **同一 thread** で **複数 `routeReason`** の synapse
  - usage 付き seed と synapse の **併存**
  - `clusterSize>=2` のクラスタ、`khs_concepts` の重み和 等
- `effectSignals.effectEvidenceSatisfied` — **DB だけで効果と言える最低ライン**

---

## 2. Live probe（スクリプト）

`api/scripts/seed_learning_effect_audit_v1.sh`

- `GET` 監査 JSON を保存
- **2 ターン** `POST /api/chat`（local-test ヘッダ）で  
  `routeReason` / `sourceKinds` / `densityTarget` / **応答先頭** を比較
- `merged_report.json` の `acceptance.seedEffectEvidence` =  
  **`db effectEvidenceSatisfied` OR live のいずれかの軸で差分**

→ **「少なくとも 1 つ seed が次回生成へ効いた証拠」** をスクリプト acceptance で担保しうる。

---

## 3. 最低観測（カード）

| # | 項目 | 所在 |
|---|------|------|
| 1 | seed 参照回数 | `observations.seedReference` |
| 2 | apply_log → usage | `observations.applyLogToUsage` |
| 3 | cluster 生成 | `observations.cluster` |
| 4 | training 痕跡 | `observations.training` + 必要なら `runTrainer` は別カード |
| 5 | dead / unused seed 率 | `deadSeedRatio` |
| 6 | 本文・トレース例 | `effectSignals.proseOrTraceExample` + live `proseSample*` |

---

## 4. 必須ルール

- **壊れても seal しない**（監査のみ）
- **低シグナルで自動昇格しない**（`policy.noAutoPromoteOnLowSignal`）
- **no-touch / schema / will / meaning / beauty** — **監査対象のみ**、自動変更なし

---

## 5. acceptance（束）

1. **build** PASS  
2. **health** PASS  
3. **効果レポート** — 「あるだけ」ではなく `effectEvidenceReasons` / live 差分  
4. **`seedEffectEvidence`** が **true**（DB または live）  
5. **`nextCard`:** `KOKUZO_SEED_LEARNING_BRIDGE_V1`  

---

## 6. 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-03-21 | 初版: audit GET + 証跡スクリプト + MD |
