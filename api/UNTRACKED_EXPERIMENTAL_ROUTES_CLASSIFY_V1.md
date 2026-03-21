# UNTRACKED_EXPERIMENTAL_ROUTES_CLASSIFY_V1

- **モード:** FORENSIC → DOCS_ONLY  
- **基準日:** 2026-03-13  
- **参照 HEAD（調査時）:** `ab474a1a20b82c4ecca450fce0aafa5ebca6e13f`  
- **禁止遵守:** `chat.ts` / `client/**` / `kokuzo_schema.sql` / `dist/**` 未変更。runtime ロジック変更なし。

## 1. 分類の定義

| ラベル | 意味 |
|--------|------|
| **mainline 必須** | 会話主線（`/api/chat` 経路など）のビルド・実行に直結。未追跡のままでは再現性が壊れる。 |
| **補助 runtime** | `index.ts` 等でマウント済みの観測・監査・スーパーバイザ系。本番バイナリに含まれるが主線応答とは別系統。 |
| **experimental** | 設計カード・分析レポート・未配線のルータ草案。合意なしに本番主線へ載せない。 |
| **quarantine** | 隔離推奨（未配線・権限境界が曖昧・誤マウントリスク）。トラックするなら `experimental/` 等へ移し README で用途固定。 |
| **廃棄候補** | `.gitignore` 済みバックアップ、重複レポート、リポジトリ外管理が適する一時物。 |

## 2. 未追跡群の分類表（一次分類）

### 2-A. TypeScript（実行コード）

| パス | 分類 | 根拠（短く） |
|------|------|----------------|
| `api/src/renderer/beautyCompositionEngineV2.ts` | **mainline 必須** | `chat.ts` から `composeBeautyCompositionProseV2` を import。未追跡だと clone ビルドが不安定。 |
| `api/src/routes/evolutionAuditProbesV1.ts` | **補助 runtime** | `audit.ts` → `/api/audit/evolution/*` |
| `api/src/routes/selfBuildSupervisorLoopV1.ts` | **補助 runtime** | `audit.ts` → supervisor loop |
| `api/src/routes/autonomousRuntimeConfidenceAuditV1.ts` | **補助 runtime** | `audit.ts` → autonomous runtime confidence |
| `api/src/routes/autonomousBuildPhaseV1.ts` | **補助 runtime** | `audit.ts` → cursor / build loop 系 |
| `api/src/routes/desktopUiActionBrokerV1.ts` | **補助 runtime** | `audit.ts` から import |
| `api/src/routes/mainlineSupremeCompletionAuditV1.ts` | **補助 runtime** | `audit.ts` → supreme completion audit |
| `api/src/routes/selfBuildSupervisorCycleCoreV1.ts` | **補助 runtime** | 上記複数モジュールの共有コア |
| `api/src/founder/requestTriageSchemaV1.ts` | **quarantine** | `founderRequest.ts` 専用。`index.ts` からは未マウント確認。 |
| `api/src/routes/founderRequest.ts` | **quarantine** | ルータは存在するが `index.ts` 未配線（実験・将来用）。誤配線時は権限境界要レビュー。 |
| `api/src/scripts/card_DB_REALITY_CHECK_AND_SEED_V1.ts` | **experimental**（運用は **補助**） | 手動・カード実行向け DB reality 観測。本番自動起動に載せない。 |

### 2-B. ドキュメント・レポート（`api/src/routes/` 配下）

| パス | 分類 | 備考 |
|------|------|------|
| `CARD_*.md`（8 本） | **experimental** | 設計・判断カード。主線コードではない。 |
| `CONVERSATION_QUALITY_VPS_ANALYSIS_V1.md` | **experimental** | 分析メモ。 |
| `FINAL_REPORT_V1/**` | **experimental**（**補助資料**） | 封印・意思決定の参照アーカイブ。 |
| `RECONCILE_AUDIT_V1/**` | **experimental**（**補助資料**） | 監査・分類の参照アーカイブ。 |
| `WORLD_CLASS_ANALYSIS_V1/**` | **廃棄候補**（または **experimental** アーカイブ） | `V2` が最終系なら V1 は縮退・削除候補。 |
| `WORLD_CLASS_ANALYSIS_V2/**` | **experimental**（**補助資料**） | 最終寄りレポート群。 |

### 2-C. 既に追跡済み（対照）

| パス | 分類 |
|------|------|
| `api/src/routes/audit.ts` | **補助 runtime**（マウント点） |
| `api/src/routes/seedLearningEffectAuditV1.ts` 等 | **補助 runtime**（追跡済み） |
| `api/tools/*.py`（14 本） | **補助 runtime**（KHS / ingest / レポート系オペレーション） |

### 2-D. `.gitignore` 済み（リポジトリ外扱い）

| パターン | 分類 |
|----------|------|
| `**/*.bak_*`（`chat.ts.bak_*`, `gates_impl.ts.bak_*` 等） | **廃棄候補**（ローカル救済用。履歴は git に任せる） |

## 3. mainline 必須 vs experimental（要約）

- **mainline 必須（コード）:**  
  - 現状未追跡で最優先は **`api/src/renderer/beautyCompositionEngineV2.ts`**（`chat.ts` 依存）。
- **experimental（主にドキュメント + 未配線 TS）:**  
  - `CARD_*.md`、各 `WORLD_CLASS_*` / `FINAL_REPORT_*` / `RECONCILE_*`  
  - `founderRequest.ts` + `requestTriageSchemaV1.ts`（未マウント）  
  - `card_DB_REALITY_CHECK_AND_SEED_V1.ts`（手動カード）

## 4. quarantine 行き候補（明示）

1. **`api/src/routes/founderRequest.ts`** + **`api/src/founder/requestTriageSchemaV1.ts`** — 配線なし・境界未定義。  
2. **`WORLD_CLASS_ANALYSIS_V1/**`** — `V2` と役割重複。隔離または削除方針の決定待ち。

## 5. 廃棄候補（明示）

1. **`* .bak_*`**（gitignore 済み）— ワークスペース掃除で削除可。  
2. **`WORLD_CLASS_ANALYSIS_V1/**`** — `V2` 採用が組織合意ならアーカイブ退避または削除。  
3. ルート／`api/` 直下の **巨大・重複 Cursor テキスト**（`SEAL_BE3F7FF_UNTRACKED_MAP.md` 等に列挙済みの観測物）— リポジトリに残すなら `docs/_archive/` 等への移動を検討。

## 6. 最終封鎖前の整理方針（確定案・コード変更なし）

1. **再現性:** `beautyCompositionEngineV2.ts` と、**`audit.ts` が import する未追跡 8 ファイル**は「補助 runtime だがビルド必須」として **git 追跡に乗せる**のが筋（別カードで add/commit）。  
2. **主線と資料の分離:** レポート類は **`api/docs/` または `api/docs/sealing/`** への移動を検討（パス規約のみの整理）。  
3. **founder 系:** マウントするまで **`quarantine`** ラベル維持。マウント時は `auth_founder` との関係を文書化。  
4. **スクリプト:** `api/src/scripts/*` は本番 `npm start` から自動 require されないことを維持。

## 7. 次カード（1 本に絞る）

**FINAL_SUPREME_ASCENT_GATE_V1** — 上記方針に沿った追跡化（ビルド必須ファイル）／資料ディレクトリ整理／quarantine 明示の完了条件をゲート化する。
