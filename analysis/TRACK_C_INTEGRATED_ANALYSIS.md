# TENMON_ARK_FULL_SYSTEM_ANALYSIS_V1 — Track C 統合解析レポート

**作成日:** 2026年4月17日
**作成者:** Manus AI
**対象プロジェクト:** TENMON-ARK

## 1. エグゼクティブサマリー

本レポートは、TENMON-ARK プロジェクトの VPS 実環境から収集されたデータ（Track B）と、コードベースおよび Notion ドキュメントの静的解析（Track A）を統合した最終解析結果である。

現在までの解析により、以下の重要な事実が判明している。

1. **2コードベース問題の深刻化:** `api/` (Express) と `server/` (tRPC/Drizzle) の両方に言霊エンジンの実装が存在し、特に `api/src/kotodama/kotodamaConnector.ts` が Git 管理外（untracked）となっていることが、言霊発火ゼロ問題の核心原因である可能性が高い。
2. **データベースの肥大化と休眠:** SQLite データベース（`kokuzo.sqlite`）には 111 のテーブルが存在するが、その多くが休眠状態（dormant）または死蔵状態（dead）であると推測される。
3. **隠れた機能の未接続:** 学習還流、自己監査、継続記憶層など、高度な 13 の機能が実装されている痕跡があるものの、メインラインの実行フローから切り離されている（orphan/partial 状態）。

本レポートでは、これらの課題に対する具体的な証拠を提示し、今後の修復および統合に向けたロードマップを提案する。

## 2. 言霊システム正本判定と `kotodamaConnector.ts` の謎

### 2.1. 2つの言霊エンジンの競合

コード解析の結果、言霊システムの実装が 2 つのディレクトリに分断されていることが確認された。

*   **`api/src/kotodama/` (旧アーキテクチャ):** Express ベースの API サーバー内で動作する言霊エンジン。`tagger.ts`、`kotodamaPrescriber.ts` などのファイルが存在する。
*   **`server/kotodama/` および `server/ark/` (新アーキテクチャ):** tRPC と Drizzle ORM を使用した新しいアーキテクチャ。`kotodamaEngine.ts` や `kotodamaRouter.ts` が存在する。

### 2.2. `kotodamaConnector.ts` の Git 管理外問題

最も重大な発見は、`api/src/kotodama/kotodamaConnector.ts` が Git の管理外（untracked）となっていることである。

*   **証拠:** `git ls-files api/src/kotodama/kotodamaConnector.ts` の結果が空であり、`.gitignore` にも明示的な除外設定はない。
*   **影響:** このファイルは、旧アーキテクチャにおいて言霊エンジンと他のシステム（RouteReason や Evidence Bind など）を接続する重要な役割を担っていたと推測される。このファイルがリポジトリに存在しないため、デプロイ環境で言霊システムが正常に初期化されず、「言霊発火ゼロ」という現象を引き起こしている可能性が極めて高い。
*   **MC Phase 1 の痕跡:** 過去のコミット（`5fb27f6`）に含まれる `mc/bin/collect_kotodama.sh` では、このファイルが明示的に参照されており、かつては重要なコンポーネントとして機能していたことが裏付けられている。

### 2.3. Deep Continuity エンジンの新シグネチャ

`server/chat/tenmonBridge.ts` などの解析から、Deep Continuity エンジンが新しいシグネチャ（`honmeiShuku`, `previousDepth`, `userResponse`）で動作している証拠が確認された。これは、新アーキテクチャ（`server/` 側）への移行が部分的に進行していることを示している。

## 3. データベース（111テーブル）の分類と状態

Track B の `collect_db_inventory.sh` によって収集されたデータに基づき、`kokuzo.sqlite` 内の 111 テーブルを分類した。

（※ 詳細なタイムスタンプ解析は、追加スクリプト `collect_table_timestamps.sh` の実行結果待ち）

### 3.1. テーブルの規模と分布

*   **総テーブル数:** 111
*   **大規模テーブル:** `synapse_log` や `training_messages` など、数十万行を超えるテーブルが存在する。
*   **主要なカテゴリ:**
    *   **ユーザー・認証系:** `users`, `accounts`, `sessions`
    *   **会話・記憶系:** `conversation_memory`, `thread_links`, `memory_units`
    *   **言霊・宿曜系:** `kotodama_analysis`, `shuku_deep_data`, `nine_star`
    *   **システム・監査系:** `tenmon_audit_log`, `reflection_queue_v1`

### 3.2. 休眠（Dormant）/ 死蔵（Dead）の推測

多くのテーブルが、過去の実験や旧アーキテクチャの遺物として残されている可能性が高い。特に、`_v1` や `_old` といったサフィックスを持つテーブルや、行数が 0 のテーブルは、現在使用されていない（Dead）と推測される。

## 4. 隠れた機能（13機能）の証拠と接続状態

Track B の `collect_hidden_feature_evidence.sh` の結果から、以下の隠れた機能の存在が確認された。

（※ 詳細な深部診断は、追加スクリプト `collect_hidden_feature_deep.sh` の実行結果待ち）

1.  **Learning Return (学習還流):** `training_sessions` などのテーブルが存在するが、メインフローに組み込まれているかは不明。
2.  **Self-Audit / Self-Repair:** `tenmon_audit_log` テーブルが存在。
3.  **Continuity (継続記憶層):** `thread_links` テーブルが存在し、会話の文脈を保持する仕組みがある。
4.  **RouteReason / Evidence Bind:** `synapse_log` テーブルに `routeReason` カラムが存在するが、`kotodamaConnector.ts` の欠落により機能していない可能性が高い。
5.  **Notion Sync:** 関連ファイルが存在。

これらの機能は、コードやデータベーススキーマとしては存在するものの、API エンドポイントからの呼び出し経路が断たれている（Orphan）か、部分的にしか機能していない（Partial）状態であると考えられる。

## 5. `sync_shuku_data.ts` の型エラー（56件）

`ShukuDeepData` インターフェースに、`kakushinKatto` や `toikakake1` などの拡張フィールドが不足していることが確認された。

*   **原因:** データベーススキーマ（または実際のデータ構造）が拡張されたにもかかわらず、TypeScript の型定義（`shuku_deep_data.ts` など）がそれに追従していないため。
*   **影響:** 現在の解析をブロックするものではないが、ビルドエラーやランタイムエラーの原因となるため、早急な修正が必要である。

## 6. 結論と推奨アクション

TENMON-ARK システムは、高度な機能（言霊エンジン、継続記憶、自己監査など）を内包しているが、アーキテクチャの移行期における不整合（2コードベース問題）と、重要な接続コンポーネント（`kotodamaConnector.ts`）の欠落により、その真価を発揮できていない状態にある。

### 推奨アクション（Track C 完了後）

1.  **`kotodamaConnector.ts` の復旧と精査:** Untracked 状態のファイルを Git に追加し、その内容を精査して言霊システム（RouteReason / Evidence Bind）の接続を復旧する。
2.  **言霊システムの正本統合:** `api/` と `server/` の言霊実装を比較し、どちらを「正」とするか（またはどのように統合するか）を決定する。
3.  **型定義の修正:** `ShukuDeepData` インターフェースを更新し、56件の型エラーを解消する。
4.  **追加解析スクリプトの実行:** 今回作成した `collect_table_timestamps.sh`, `collect_hidden_feature_deep.sh`, `collect_service_dependencies.sh` を VPS 上で実行し、テーブルの鮮度と隠れた機能の正確な接続状態を把握する。

---
*※ 本レポートは、追加の Track B 実行結果（Part B.1〜B.3）が得られ次第、さらに詳細なデータで更新される予定である。*
