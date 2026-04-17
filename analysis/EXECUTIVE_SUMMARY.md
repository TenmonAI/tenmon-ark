# TENMON-ARK Full System Analysis: Executive Summary

**作成者**: Manus AI
**日付**: 2026-04-17
**対象**: TENMON-ARK プロジェクト全体 (GitHubリポジトリ + Notion MCP)

## 1. 解析の目的と背景

本解析は、TENMON-ARKプロジェクトの現在の実装状態と、Notion上に定義された「完成像（TENMON_AI_CORE_V1）」との間のギャップを特定し、最終的な完成に向けたロードマップを策定することを目的としています。VPS環境への直接アクセスが制限されているため、GitHubリポジトリの静的解析（Track A）と、VPS上で実行可能なREAD-ONLY解析スクリプトの作成（Track B）を組み合わせたハイブリッド方式を採用しました。

## 2. 主要な発見 (Key Findings)

### 2.1. 構造的課題: 2コードベース問題
リポジトリ内に2つの独立したNode.jsアプリケーションが共存しており、これが最大の技術的負債となっています。
- **api/ (Express)**: PWA版 (`tenmon-ark.com/pwa/`) 用。天津金木エンジンや宿曜エンジンを含む。
- **server/ (tRPC)**: メインサイト (`tenmon-ark.com/`) 用。多数のエンジンとサービスを含む。
両者間でコア機能（言霊、虚空蔵、ペルソナ等）の実装が重複しており、保守性の低下と機能の不整合を引き起こすリスクがあります。

### 2.2. Notion完成像とのギャップ
Notionの「TENMON_ARK_MASTER_STATE_INDEX_V1」によれば、現在の最優先事項は `TENMON_AI_CORE_V1` を商品核として成立させることです。
- **現在の達成率**: 約82%（会話主線/route修理は92〜96%完了）
- **未完ブロッカー**: acceptanceテストの未通過（10/12がmissing）、continuityのdensity問題、bridge hangなど。
- **改善要望**: 宿曜鑑定チャットにおける長文切れ、定型説明の優先、ユーザー実感とのズレ補正などが課題として挙げられています。

### 2.3. データベースとインフラの複雑性
- **DB**: SQLite（手動SQL定義）とMySQL/TiDB（Drizzle ORM）が混在。
- **インフラ**: systemdサービスとnginx設定が複数存在し、デプロイメントが複雑化しています。

## 3. 推奨されるアクション (Quick Wins & Critical Issues)

### 3.1. Critical Issues (最優先課題)
1. **Acceptanceテストの通過**: `TENMON_AI_CORE_V1` の商品化に向けて、未通過のacceptanceテスト（10件）を修正し、最終封印工程（final seal）を完了させる。
2. **PWA版とメインサイトの境界明確化**: 2コードベースの完全統合は後回しにし、まずは両者の役割を明確に定義し、コアロジック（天津金木エンジン等）の単一情報源（Single Source of Truth）を確立する。

### 3.2. Quick Wins (短期的な改善)
1. **チャット機能の改善**: 改善要望DBで指摘されている「長文切れ」や「定型説明の優先」に対処するため、会話還元回路（Two-Pass）のプロンプトやロジックを微調整する。
2. **Dead Codeの整理**: `server/_archive/` や `offline/` ディレクトリ、多数のTODOコメントなど、不要なコードを整理し、コードベースの可読性を向上させる。

## 4. 次のステップ

本レポート（Track A）およびVPS解析スクリプト（Track B）の成果物を `feature/full-system-analysis-track-b` ブランチにコミット・プッシュします。TENMONによるTrack Bスクリプトの実行結果を待って、最終的な統合解析（Track C）を実施し、90日ロードマップを完成させます。
