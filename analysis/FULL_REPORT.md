# TENMON-ARK Full System Analysis: Comprehensive Report

**作成者**: Manus AI
**日付**: 2026-04-17
**対象**: TENMON-ARK プロジェクト全体 (GitHubリポジトリ + Notion MCP)

## 1. 導入 (Introduction)

本レポートは、TENMON-ARKプロジェクトの現在の実装状態と、Notion上に定義された「完成像（TENMON_AI_CORE_V1）」との間のギャップを特定し、最終的な完成に向けたロードマップを策定することを目的としています。VPS環境への直接アクセスが制限されているため、GitHubリポジトリの静的解析（Track A）と、VPS上で実行可能なREAD-ONLY解析スクリプトの作成（Track B）を組み合わせたハイブリッド方式を採用しました。

## 2. Track A: コード資産解析結果

### 2.1. システム全体構造と2コードベース問題
TENMON-ARKのコードベースを解析した結果、最も重要な発見として、**2つの独立したNode.jsアプリケーションが同一リポジトリ内に共存している**ことが判明しました。

#### 2.1.1. api/ (Express + 手動ルーティング)
- **エントリポイント**: `api/src/index.ts`
- **フロントエンド**: `web/` (React + Vite)
- **用途**: PWA版 (`tenmon-ark.com/pwa/`)
- **規模**: 211 TypeScriptファイル、約31,904行
- **特徴**: 
  - 35個のルートファイル (`api/src/routes/`)
  - 天津金木エンジン (`api/src/kanagi/` - 48ファイル)
  - 宿曜エンジン (`api/src/sukuyou/` - 12ファイル)
  - 39個の運用スクリプト (`api/src/scripts/`)

#### 2.1.2. server/ (tRPC + Vite SSR)
- **エントリポイント**: `server/_core/index.ts`
- **フロントエンド**: `client/` (React + wouter)
- **用途**: メインサイト (`tenmon-ark.com/`)
- **規模**: 466 TypeScriptファイル、約112,570行
- **特徴**:
  - 40個のtRPCルーター (`server/routers/`)
  - 31個のエンジンファイル (`server/engines/` - dialogue, hachigen, presence, speech, selfEvolution等)
  - 14個のサービスファイル (`server/services/` - ark-cinema, autonomous-mode, self-build等)

#### 2.1.3. 構造的課題
両者は同じリポジトリに共存していますが、共有されているコードは `shared/` ディレクトリ（6ファイル、966行）のみです。これにより、言霊（kotodama）、虚空蔵（kokuzo）、ペルソナ（persona）などのコア機能の実装が重複している可能性が高く、保守性の低下や機能の不整合を引き起こすリスクがあります。

### 2.2. 言語統計
プロジェクト全体のコード規模は以下の通りです。TypeScriptが支配的であり、大規模なフロントエンドおよびバックエンドロジックが実装されています。

| 言語 | ファイル数 | 行数（概算） |
|---|---|---|
| TypeScript (.ts) | ~780 | ~180,000 |
| TypeScript React (.tsx) | ~347 | ~34,000 |
| SQL (.sql) | ~35 | ~3,000 |
| Shell (.sh) | ~60 | ~5,000 |
| HTML/CSS | ~10 | ~2,000 |
| **合計** | **~1,232** | **~224,183** |

### 2.3. 固有概念マッピング
TENMON-ARK特有の概念がコードベース内のどこに実装されているかをマッピングしました。多くの概念が `api/` と `server/` の両方に存在しており、2コードベース問題の影響を受けています。

| 概念 | 出現ファイル数 | 主要所在ディレクトリ |
|---|---|---|
| **kotodama (言霊)** | 123 | `api/src/kotodama/`, `server/kotodama/`, `api/src/sukuyou/kotodamaPrescriber.ts` |
| **kokuzo (虚空蔵)** | 123 | `api/src/kokuzo/`, `server/kokuzo/`, `kokuzo/` |
| **persona (ペルソナ)** | 137 | `api/src/persona/`, `server/persona/`, `client/src/` |
| **kanagi (天津金木)** | 84 | `api/src/kanagi/` (48ファイル) |
| **fractal (フラクタル)** | 87 | `api/src/kokuzo/fractalStore.ts`, `server/fractalGuardianModel.ts` |
| **reisho (灵性)** | 65 | `client/src/dashboard/Reisho*.tsx`, `server/reisho/` |
| **selfEvolution (自己進化)** | 29 | `server/engines/selfEvolution/`, `server/services/autonomous-mode/` |
| **selfHeal (自己修復)** | 26 | `server/selfHeal/`, `server/services/self-build/selfHealEngine.ts` |
| **sukuyou (宿曜)** | 9 | `api/src/sukuyou/` (12ファイル) |
| **katakamuna (カタカムナ)** | 16 | `api/src/routes/chat.ts`, `server/katakamuna.ts` |
| **hachigen (八元)** | 3 | `server/engines/hachigen/` (3ファイル) |

### 2.4. データベーススキーマ構造
データベース定義も2つのアプローチが混在しています。

#### 2.4.1. 手動SQL定義 (`api/src/db/`)
主に `api/` 側で使用されるSQLiteスキーマです。
- `schema.sql`, `kokuzo_schema.sql`, `kokuzo_fts_schema.sql`
- `persona_state.sql`, `consciousness_schema.sql`
- `approval_schema.sql`, `audit_schema.sql`
- `pwa_schema.sql`, `training_schema.sql`

#### 2.4.2. Drizzle ORM (`drizzle/`)
主に `server/` 側で使用されるスキーマです。
- `schema.ts` (1,185行)
- 26個のマイグレーションファイル (`0000`〜`0025`)

### 2.5. Dead Code（不要コード）候補
静的解析により、現在使用されていない可能性が高い、または整理が必要なコード群を特定しました。

1. **アーカイブディレクトリ**: `server/_archive/` (例: `lpSoftPersona.ts`)
2. **バックアップファイル**: `web/src/pages/SukuyouAboutPage.tsx.bak_*` などの一時ファイル
3. **オフライン対応コード**: `server/tests/offline/` および9箇所に散在する `offline/` ディレクトリ
4. **未完了タスク**: コード内に残された311個の `TODO` コメントと4個の `WIP` コメント

## 3. Track A.1: Notion完成像の読み取り結果

### 3.1. Notion全体構造
- **参照統治ハブ（天聞AI 参照統治ハブ）**: 5層の参照優先順位（正典 > 主線 > 作業 > ログ > 保留）を定義。AI既定参照は「正典 + 主線」のみ。
- **主要ページ階層**: 天聞アーク構築スケジュール、天聞AI 参照統治ハブ、天聞アーク開発スケジュール、今後の構築スケジュール一覧。

### 3.2. 改善要望DB
- **スキーマ**: タイトル、カテゴリ、AI優先度、ユーザー優先度、ステータス、受付番号、Founder区分、構築タスク化、詳細内容、AI要約、類似件数。
- **確認できた要望（25件中の主要なもの）**:
  1. **宿曜鑑定チャットの長文切れ・会話精度・再補正機能の改善希望** (FB-20260416-4252): 長文回答途中切れ、定型説明優先、ユーザー実感とのズレ補正、同じ説明の繰り返し。
  2. **宿曜鑑定における「宿分類と実際の状態の乖離」について** (最新 2026-04-17)
  3. **聞いた内容が途中で途切れた**
  4. **宿曜鑑定の結果が保存されませんでした**
  5. **キーボードのエンターのタイミング**
  6. **メニューもじが薄くて見えない**
  7. **メニューの左トークルームの未分類から、ドロップでチャットのトークフォルダーに移動できるようにしてほしい**

### 3.3. 完成ロードマップ統合メモ
- **統合完成主線（7ステップ）**:
  1. 言灵コア正典を固定する
  2. 正典ごとに会話用蒸留カードを作る
  3. 橋渡しを唯一の変換ゲートにする
  4. 会話ルーターを固定する
  5. 深さ制御を入れる
  6. 会話記憶と研究記憶を分ける
  7. acceptanceを普通会話ベースで通す
- **完成判定基準**: 普通会話が自然、follow-upが主線維持、currentが古い断定をしない、言灵解析で正典主線が出る、深い解析で橋渡しと開発主線が崩れない、acceptance probeを通る。

### 3.4. MASTER_STATE_INDEX_V1（現在地）
- **三層定義**:
  - **Layer 1**: 天津金木コア（真理構造解析エンジン）
  - **Layer 2**: 聖典コーパス参照系（照合・補強）
  - **Layer 3**: 会話還元回路（Two-Pass）
- **現在の達成率（運用推定）**: 約82%（会話主線/route修理は92〜96%完了）
- **未完ブロッカー**: acceptance present 2/12, missing 10/12、continuity density以前にhold entry forensicが必要、bridge hang（_archive_block系）、scorecard stale、pwa_lived_completion_readiness.json未生成。
- **禁止事項**: verdict JSONの人工green化、readiness JSONの手書きready=true、archive/outを正本扱い、systemdと手動nodeの混在、天津金木の修理済み箇所をroot causeなしに再変更、scripture_trunk_v1.tsへtenmon_fusionを入れること、evidenceなしPASS宣言、dist直編集。

### 3.5. TENMON_AI_CORE_V1 憲法
- **最優先方針**: 商品として最初に売る対象は `TENMON-ARK Full OS` ではなく `TENMON_AI_CORE_V1`。言霊秘書を最上位正典とする。スピ系の曖昧な言霊解釈を採らない。1変更=1検証、最小diff。
- **7日間ロードマップ**: Day 0: Core憲法封印とbeta到達、Day 1: acceptance再調整、Day 2: 言霊秘書系引用精度改善、Day 3: サンスクリット深層解読安定化、Day 4: 聖典読解比較の整備、Day 5: UI/レポート改善、Day 6: Arc接続候補を1つだけ試験接続、Day 7: 監査と次週計画。

### 3.6. Manus直接実装済みコミット（2026-04-12）
- ddd154d Phase 6 policy docs + release gate script
- f93c00a EMPTY_CATCH_RECOVERY (75 empty catches → console.debug)
- 40b88c7 CORE_SEED_FULL_RESTORE (placeholder → 190行 knowledge pack)
- aa5e126 LLM_WRAPPER_PERSONA_RELINK (role separation fix + persona injection)
- 37b4cf1 BACKEND_ROLE_RELOCK (dual backend boundary document)
- 95e2e2b GOLDEN_BASELINE_LOCK + REGRESSION_TEST (25 cases, 5 categories)
- 2f0ab11 API_PWA_BRIDGE design document
- 2856552 tenmonBridge.ts + chatAI.ts integration

### 3.7. pwa-mo1xlk3d 調査結果
- Notion検索では「pwa-mo1xlk3d」という直接的なIDは見つからなかった。
- PWA関連ページは多数存在（API_PWA_Equivalence, PWA最終確認等）。
- 改善要望DB内にPWA固有の要望は確認できず（チャット機能・宿曜鑑定が中心）。

## 4. Track B: VPS解析スクリプトの作成

VPS環境への直接アクセスが制限されているため、TENMONがVPS上で実行可能なREAD-ONLY解析スクリプト一式を作成しました。

### 4.1. スクリプト構成
- `run_full_analysis.sh`: オーケストレータ
- `collect_db_inventory.sh`: DB 解析（SQLite + MySQL）
- `collect_service_map.sh`: サービスマップ（systemd, nginx, cron, journal, disk, ports）
- `collect_env_audit.sh`: 環境変数監査（値はマスク）
- `collect_founder_usage.sh`: 利用パターン（匿名化）
- `collect_hidden_feature_evidence.sh`: 隠れた機能の証拠
- `lib/mask_personal_info.sh`: 個人情報マスク共通関数
- `lib/safe_query.sh`: READ-ONLY SQL 実行共通関数

### 4.2. 安全性保証
- **READ-ONLY 厳守**: 全 SQL は SELECT のみ。INSERT/UPDATE/DELETE/DROP は `validate_readonly_sql()` で禁止。
- **systemctl は status のみ**: restart/stop/start は一切使用しない。
- **書き込み先限定**: `analysis/track_b/output/` のみ。
- **個人情報マスク**: ユーザーID は SHA256 ハッシュ化、メール・氏名・電話番号・住所は `[REDACTED]`。
- **環境変数値マスク**: 変数名と長さのみ記録、値は含めない。
- **冪等性**: 何度実行しても同じ結果（タイムスタンプ以外）。
- **タイムアウト**: DB クエリは 10 秒上限。

## 5. 結論と推奨事項

Track Aのコード解析およびNotion読み取りから、TENMON-ARKプロジェクトは高度に複雑化しており、特に **`api/` と `server/` の2コードベースの分離** が最大の技術的負債となっていることが明らかになりました。

Notionの「TENMON_ARK_MASTER_STATE_INDEX_V1」によれば、現在の最優先事項は `TENMON_AI_CORE_V1` を商品核として成立させることです。したがって、直ちに2つのコードベースを統合する大規模なリファクタリングを行うのではなく、まずはPWA版（`api/` + `web/`）とメインサイト（`server/` + `client/`）の境界を明確にし、コアロジック（天津金木エンジン等）の単一情報源（Single Source of Truth）を確立することが推奨されます。

また、改善要望DBで指摘されている「長文切れ」や「定型説明の優先」に対処するため、会話還元回路（Two-Pass）のプロンプトやロジックを微調整することが急務です。

本レポート（Track A）およびVPS解析スクリプト（Track B）の成果物を `feature/full-system-analysis-track-b` ブランチにコミット・プッシュします。TENMONによるTrack Bスクリプトの実行結果を待って、最終的な統合解析（Track C）を実施し、90日ロードマップを完成させます。
