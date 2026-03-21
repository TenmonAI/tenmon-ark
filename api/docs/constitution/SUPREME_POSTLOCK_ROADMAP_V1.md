# SUPREME_POSTLOCK_ROADMAP_V1

- **モード:** DOCS_ONLY（**runtime ロジック変更なし**）  
- **目的:** `FINAL_SUPREME_ASCENT_GATE_V1` の **clone 再現性ブロック**を、取り込み・隔離・廃棄・順序で固定する。  
- **参照:** `FINAL_SUPREME_ASCENT_GATE_V1.md`、`UNTRACKED_EXPERIMENTAL_ROUTES_CLASSIFY_V1.md`  
- **記録時 HEAD（参考）:** `ab474a1a20b82c4ecca450fce0aafa5ebca6e13f`  
- **未完の一点（拡散禁止）:** **「追跡されていないが `tsc` 解決に必須のソース」** — 本ロードマップでは **must のみ**がこれを解除する。

---

## 1. 四分類（must / optional / quarantine / discard）

### must — **clone → `api` build が通るために git に必須なものだけ**

| パス | 理由 |
|------|------|
| `api/src/renderer/beautyCompositionEngineV2.ts` | `chat.ts` が静的 import（clone で欠けると `tsc` 失敗） |
| `api/src/routes/evolutionAuditProbesV1.ts` | `audit.ts` import |
| `api/src/routes/selfBuildSupervisorLoopV1.ts` | 同上 |
| `api/src/routes/autonomousRuntimeConfidenceAuditV1.ts` | 同上 |
| `api/src/routes/autonomousBuildPhaseV1.ts` | 同上（内部で `selfBuildSupervisorCycleCoreV1` 参照） |
| `api/src/routes/desktopUiActionBrokerV1.ts` | 同上 |
| `api/src/routes/mainlineSupremeCompletionAuditV1.ts` | 同上 |
| `api/src/routes/selfBuildSupervisorCycleCoreV1.ts` | 同上（共有コア） |

**計 8 + 1 = 9 ファイル** — これ以外は **ビルド必須ではない**（本カードの must 定義）。

---

### optional — **再現性には不要だが、封印・監査・運用のために取り込み価値あり**

| パス | 理由 |
|------|------|
| `api/UNTRACKED_EXPERIMENTAL_ROUTES_CLASSIFY_V1.md` | 未追跡分類の正式記録（ゲートで「明文化不足」とされたものの本体） |
| `api/docs/constitution/FINAL_SUPREME_ASCENT_GATE_V1.md` | 四段裁定の公式記録 |
| `api/docs/constitution/SUPREME_POSTLOCK_ROADMAP_V1.md` | 本ロードマップ |
| `api/src/routes/CARD_*.md`（8 本） | 設計カード（experimental 資料） |
| `api/src/routes/CONVERSATION_QUALITY_VPS_ANALYSIS_V1.md` | 分析メモ |
| `api/src/routes/FINAL_REPORT_V1/**` | 封印・意思決定アーカイブ |
| `api/src/routes/RECONCILE_AUDIT_V1/**` | 監査マップアーカイブ |
| `api/src/routes/WORLD_CLASS_ANALYSIS_V2/**` | 最終寄り分析アーカイブ |
| `api/src/scripts/card_DB_REALITY_CHECK_AND_SEED_V1.ts` | 手動 DB reality カード（本番自動起動に載せない前提でトラック可） |

**`api/scripts/acceptance_test.sh` / `check_tenmon_core_seed.sh` の `M`** — clone 再現性とは独立。**別判断**: 意図した変更なら optional 同梱、ノイズなら **元に戻す（discard 扱い）**。

---

### quarantine — **index 未配線・境界未確定。誤って mainline に混ぜない**

| パス | 方針（コード変更は次カード以降） |
|------|-----------------------------------|
| `api/src/routes/founderRequest.ts` | 配線なし。**トラックする場合は** `api/src/experimental/founder/` 等へ移動 + `README.md` で「未マウント」を明記するバッチを推奨 |
| `api/src/founder/requestTriageSchemaV1.ts` | `founderRequest.ts` 専用。上記と同じバッチでペア管理 |

**must には含めない**（現状 `index.ts` から到達しないため `tsc` グラフの必須ではない）。

---

### discard — **リポジトリに残さない／掃除／重複**

| 対象 | 方針 |
|------|------|
| `**/*.bak_*`（gitignore 済み） | ローカル削除で可。履歴は git に委ねる |
| `api/src/routes/WORLD_CLASS_ANALYSIS_V1/**` | `V2` が最終なら **コミット対象外**または削除。残すなら `api/docs/_archive/world_class_v1/` へ **移動のみ**の整理バッチ |
| 意図しない `api/scripts/*.sh` の `M` | `git restore` で棄却 |

---

## 2. clone 再現性ブロックの解除順（固定）

**一点化:** 全工程は **「must バッチで tsc グラフを閉じる」** に収束させる。並行で multiple root causes を増やさない。

| 順序 | アクション | 完了条件 |
|------|------------|----------|
| **0** | 作業ツリー確認 | `must` 9 ファイルが `??` であることを確認 |
| **1** | **must 単独コミット** | 上記 9 ファイルのみ `git add` → `npm run build` PASS（clone 模擬: 別 worktree でも同様を推奨） |
| **2** | **constitution / 分類ドキュメント** | `UNTRACKED_*` + `FINAL_SUPREME_*` + `SUPREME_POSTLOCK_*` を **optional コミット**（must と混ぜないなら別コミット） |
| **3** | **optional 資料バッチ** | CARD / FINAL_REPORT / RECONCILE / WORLD_CLASS_V2 を `api/docs/` 配下への移動方針どおり **パス整理のみ**（任意・次々カードに分割可） |
| **4** | **quarantine** | founder 系を experimental ディレクトリへ移す **または** `.gitignore` 対象にする（合意が必要） |
| **5** | **discard** | V1 分析重複・ローカル bak の整理 |

---

## 3. 受け入れ対応表（本カード）

| # | 要件 | 本ドキュメントでの位置 |
|---|------|-------------------------|
| 1 | must / optional / quarantine / discard の 4 分類 | §1 |
| 2 | clone 再現性ブロックの解除順 | §2 |
| 3 | 未完の一点が拡散しない | 冒頭「一点化」+ §2 順序 **1 = must のみがブロック解除** |
| 4 | 次カード 1 つ | §4 |

---

## 4. 次カード（1 本）

**`REPRODUCIBLE_CLONE_SEAL_V1`** — §2 の **順序 1** を実行する:**must 9 ファイル**の add/commit、`api` build 検証、必要なら **clean worktree での再現確認**。`chat.ts` / `kokuzo_schema.sql` / `client/**` は触れない。
