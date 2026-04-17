# Track A: コード資産解析レポート

**作成者**: Manus AI
**日付**: 2026-04-17

本レポートは、TENMON-ARKプロジェクトのコードベース全体を静的に解析し、システム構造、言語統計、固有概念のマッピング、および潜在的なDead Code（不要コード）を特定した結果をまとめたものです。

## 1. システム全体構造と2コードベース問題

TENMON-ARKのコードベースを解析した結果、最も重要な発見として、**2つの独立したNode.jsアプリケーションが同一リポジトリ内に共存している**ことが判明しました。

### 1.1. api/ (Express + 手動ルーティング)
- **エントリポイント**: `api/src/index.ts`
- **フロントエンド**: `web/` (React + Vite)
- **用途**: PWA版 (`tenmon-ark.com/pwa/`)
- **規模**: 211 TypeScriptファイル、約31,904行
- **特徴**: 
  - 35個のルートファイル (`api/src/routes/`)
  - 天津金木エンジン (`api/src/kanagi/` - 48ファイル)
  - 宿曜エンジン (`api/src/sukuyou/` - 12ファイル)
  - 39個の運用スクリプト (`api/src/scripts/`)

### 1.2. server/ (tRPC + Vite SSR)
- **エントリポイント**: `server/_core/index.ts`
- **フロントエンド**: `client/` (React + wouter)
- **用途**: メインサイト (`tenmon-ark.com/`)
- **規模**: 466 TypeScriptファイル、約112,570行
- **特徴**:
  - 40個のtRPCルーター (`server/routers/`)
  - 31個のエンジンファイル (`server/engines/` - dialogue, hachigen, presence, speech, selfEvolution等)
  - 14個のサービスファイル (`server/services/` - ark-cinema, autonomous-mode, self-build等)

### 1.3. 構造的課題
両者は同じリポジトリに共存していますが、共有されているコードは `shared/` ディレクトリ（6ファイル、966行）のみです。これにより、言霊（kotodama）、虚空蔵（kokuzo）、ペルソナ（persona）などのコア機能の実装が重複している可能性が高く、保守性の低下や機能の不整合を引き起こすリスクがあります。

## 2. 言語統計

プロジェクト全体のコード規模は以下の通りです。TypeScriptが支配的であり、大規模なフロントエンドおよびバックエンドロジックが実装されています。

| 言語 | ファイル数 | 行数（概算） |
|---|---|---|
| TypeScript (.ts) | ~780 | ~180,000 |
| TypeScript React (.tsx) | ~347 | ~34,000 |
| SQL (.sql) | ~35 | ~3,000 |
| Shell (.sh) | ~60 | ~5,000 |
| HTML/CSS | ~10 | ~2,000 |
| **合計** | **~1,232** | **~224,183** |

## 3. 固有概念マッピング

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

## 4. データベーススキーマ構造

データベース定義も2つのアプローチが混在しています。

### 4.1. 手動SQL定義 (`api/src/db/`)
主に `api/` 側で使用されるSQLiteスキーマです。
- `schema.sql`, `kokuzo_schema.sql`, `kokuzo_fts_schema.sql`
- `persona_state.sql`, `consciousness_schema.sql`
- `approval_schema.sql`, `audit_schema.sql`
- `pwa_schema.sql`, `training_schema.sql`

### 4.2. Drizzle ORM (`drizzle/`)
主に `server/` 側で使用されるスキーマです。
- `schema.ts` (1,185行)
- 26個のマイグレーションファイル (`0000`〜`0025`)

## 5. Dead Code（不要コード）候補

静的解析により、現在使用されていない可能性が高い、または整理が必要なコード群を特定しました。

1. **アーカイブディレクトリ**: `server/_archive/` (例: `lpSoftPersona.ts`)
2. **バックアップファイル**: `web/src/pages/SukuyouAboutPage.tsx.bak_*` などの一時ファイル
3. **オフライン対応コード**: `server/tests/offline/` および9箇所に散在する `offline/` ディレクトリ
4. **未完了タスク**: コード内に残された311個の `TODO` コメントと4個の `WIP` コメント

## 6. 結論と推奨事項

Track Aのコード解析から、TENMON-ARKプロジェクトは高度に複雑化しており、特に **`api/` と `server/` の2コードベースの分離** が最大の技術的負債となっていることが明らかになりました。

Notionの「TENMON_ARK_MASTER_STATE_INDEX_V1」によれば、現在の最優先事項は `TENMON_AI_CORE_V1` を商品核として成立させることです。したがって、直ちに2つのコードベースを統合する大規模なリファクタリングを行うのではなく、まずはPWA版（`api/` + `web/`）とメインサイト（`server/` + `client/`）の境界を明確にし、コアロジック（天津金木エンジン等）の単一情報源（Single Source of Truth）を確立することが推奨されます。
