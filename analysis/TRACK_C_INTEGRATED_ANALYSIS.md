# TENMON_ARK_FULL_SYSTEM_ANALYSIS_V1 — Track C 統合解析レポート (完全版)

**作成日:** 2026年4月17日
**作成者:** Manus AI
**対象プロジェクト:** TENMON-ARK

## 1. エグゼクティブサマリー

本レポートは、TENMON-ARK プロジェクトの VPS 実環境から収集された完全版データ（Track B v2: 8/8ステップ完了）と、コードベースおよび Notion ドキュメントの静的解析（Track A）を統合した最終解析結果である。

現在までの解析により、以下の重要な事実が判明している。

1. **データベースの肥大化と休眠 (42%が死蔵/休眠):** SQLite データベース（`kokuzo.sqlite`）の 111 テーブルのうち、実際に稼働しているのは 23 テーブル（mainline: 16, active: 7）のみであり、残りの 88 テーブル（dormant: 30, dead: 37, empty: 10, no_ts: 11）は休眠または死蔵状態にある。
2. **隠れた機能の未接続 (13機能診断):** 学習還流や継続記憶層など一部の機能は mainline として稼働しているが、**Founder導線 (founder_onboarding)** と **ハイブリッドLLM (hybrid_llm)** は完全に absent（未接続・未稼働）状態である。
3. **2コードベース問題の深刻化:** `api/` (Express) と `server/` (tRPC/Drizzle) の両方に言霊エンジンの実装が存在し、特に `api/src/kotodama/kotodamaConnector.ts` が Git 管理外（untracked）となっていることが、言霊発火ゼロ問題の核心原因である可能性が高い。
4. **サービス依存関係の異常:** 17の tenmon-* サービスのうち、`tenmon-strict-promotion` が直近7日間で 117,887 回の再起動失敗を記録しており、深刻なクラッシュループに陥っている。

本レポートでは、これらの課題に対する具体的な証拠を提示し、今後の修復および統合に向けた 90日ロードマップの最優先課題を提案する。

## 2. データベース（111テーブル）の分類と状態

Track B の `collect_table_timestamps.sh` によって収集されたデータに基づき、`kokuzo.sqlite` 内の 111 テーブルを分類した。

### 2.1. テーブルの稼働状況サマリー

| ステータス | テーブル数 | 割合 | 説明 |
| :--- | :--- | :--- | :--- |
| **Mainline** | 16 | 14.4% | 24時間以内に更新あり。システムのコア機能（認証、セッション、同期など）。 |
| **Active** | 7 | 6.3% | 7日以内に更新あり。定期的なバッチ処理や監査ログなど。 |
| **Dormant** | 30 | 27.0% | 30日以内に更新あり。過去の実験や一時的な機能の可能性。 |
| **Dead** | 37 | 33.3% | 30日以上更新なし。旧アーキテクチャの遺物や廃止された機能。 |
| **Empty** | 10 | 9.0% | 行数が 0。未実装機能のプレースホルダ。 |
| **No Timestamp** | 11 | 9.9% | タイムスタンプカラムなし。静的マスタデータやFTSインデックス。 |

**結論:** 全体の 42%（Dormant + Dead）が実質的に使用されておらず、データベースの整理・統合の余地が極めて大きい。

### 2.2. 主要な Mainline / Active テーブル

*   **ユーザー・認証系 (Mainline):** `auth_local_accounts`, `auth_sessions`, `password_change_audit`, `password_reset_tokens`
*   **会話・記憶系 (Mainline/Active):** `conversation_log`, `session_memory`, `memory_units`, `memory_projection_logs`, `thread_center_memory`
*   **同期・PWA系 (Mainline):** `sync_devices`, `sync_events`, `synced_chat_folders`, `synced_chat_threads`, `synced_sukuyou_rooms`, `pwa_messages`, `pwa_threads`
*   **システム・監査系 (Active):** `conversation_density_ledger_runtime_v1`, `evolution_ledger_v1`, `reflection_queue_v1`, `runtime_projection_audit_v1`

## 3. 隠れた機能（13機能）の証拠と接続状態

Track B の `collect_hidden_feature_deep.sh` の結果から、13の高度な機能の稼働状態を診断した。

### 3.1. 稼働状態サマリー

| 機能名 | ステータス | 診断結果・証拠 |
| :--- | :--- | :--- |
| **01. 学習還流 (Learning Return)** | Mainline | `training_sessions` / `kokuzo_synapses` が存在し、活動が確認された。 |
| **03. 継続記憶層 (Continuity)** | Mainline | `thread_center_memory` (9,178行, active), `session_memory` (35,280行, mainline) が稼働中。 |
| **04. RouteReason / Evidence** | Mainline | `synapse_log` (23,896行) にデータが存在。ただし直近15日は更新なし (dormant)。 |
| **02. 自己監査 (Self-Audit)** | Partial | `reflection_queue_v1` (17,145行, active) は稼働しているが、`tenmon_audit_log` は dead。 |
| **07. PWA I/O** | Partial | `export_artifacts` (4行), `export_jobs` (1行) が存在。 |
| **08. Seed圧縮** | Partial | `ark_seed_ledger` (5行), `kokuzo_seeds` (68行) が存在するが dead 状態。 |
| **09. 憲法レイヤー** | Partial | ファイルは存在するが、自動更新メカニズムが未稼働。 |
| **11. Live検索** | Partial | `search.ts` は存在するが、Web検索APIが未統合。 |
| **13. 音声システム** | Partial | `voiceConversationPipeline.ts` 等は存在するが、エンドポイント未接続。 |
| **05. Notion同期** | Absent | 関連ファイルは存在するが、サービス/テーブル接続なし。 |
| **06. Founder導線** | Absent | `auth_founder.ts` は最小限のキー認証のみ。`invite_tokens` / `member_status` は未接続。 |
| **10. ハイブリッドLLM** | Absent | `server/_core/llm.ts` は `gemini-2.5-flash` 固定。切替ロジック未稼働。 |
| **12. 代替アルゴリズム** | Absent | 九星×宿曜DBや五行関連テーブルが未構築。 |

### 3.2. 致命的な Absent 機能（ロードマップ最優先候補）

1.  **Founder導線 (founder_onboarding):**
    *   **証拠:** `api/src/routes/auth_founder.ts` は単一の環境変数 `FOUNDER_KEY` との比較による最小限のログイン機能しか提供していない。データベース上には `invite_tokens` や `member_status` などのテーブルが存在するが、これらを利用したオンボーディングのステートマシンやメンバープロビジョニングのフローは実装されていない。
    *   **影響:** 販売可能な完成品とするためには、この機能の欠如は致命的である。
2.  **ハイブリッドLLM (hybrid_llm):**
    *   **証拠:** `server/_core/llm.ts` の `invokeLLM()` はモデルを `gemini-2.5-flash` にハードコードしており、プロバイダのルーティングやマルチモデルの調停ロジックは存在しない。API側の `api/src/core/llmWrapper.ts` も単一プロバイダのラッパーである。
    *   **影響:** LLM自体は動作しているため「動いている」と錯覚しやすいが、実際にはコストや品質に基づく自動切替（真のハイブリッド）は機能していない。

## 4. 言霊システム正本判定と `kotodamaConnector.ts` の謎

### 4.1. 2つの言霊エンジンの競合

コード解析の結果、言霊システムの実装が 2 つのディレクトリに分断されていることが確認された。

*   **`api/` 側 (旧アーキテクチャ):** Express ベース。`api/src/kotodama/` に `tagger.ts` や `kotodamaPrescriber.ts` が存在。
*   **`server/` 側 (新アーキテクチャ):** tRPC/Drizzle ベース。`server/kotodama/` や `server/ark/kotodamaEngine.ts` が存在。

**正本判定の証拠:** `server/chat/tenmonBridge.ts` の `invokeTenmonEngine()` は、チャットフローを `${TENMON_API_URL}/api/chat` に POST して委譲している。これは、`server/` 側がフォールバック用のシェルとして機能し、実際の RouteReason や Evidence Bind のロジックは `api/` 側が「正本」として担っていることを示している。

### 4.2. `kotodamaConnector.ts` の Git 管理外問題

最も重大な矛盾は、RouteReason 機能が `mainline` と判定されているにもかかわらず、その中核コンポーネントである `api/src/kotodama/kotodamaConnector.ts` が Git の管理外（untracked）となっていることである。

*   **矛盾の構造:** `synapse_log` テーブルには 23,896 行のデータが存在し、かつては確実に機能していた。しかし、直近15日間は更新がなく（dormant）、現在のデプロイ環境では `kotodamaConnector.ts` が Git に含まれていないため、初期化に失敗して「言霊発火ゼロ」を引き起こしている。
*   **考察:** 開発者がローカル環境でテストした際には untracked のまま動作していたが、VPS へのデプロイ（Git pull）時にファイルが欠落した可能性が高い。

### 4.3. Deep Continuity エンジンの新シグネチャ

`server/chat/tenmonBridge.ts` などの解析から、Deep Continuity エンジンが新しいシグネチャ（`honmeiShuku`, `previousDepth`, `userResponse`）で動作している証拠が確認された。これは、新アーキテクチャ（`server/` 側）への移行が部分的に進行していることを示している。

## 5. サービス依存関係の異常

Track B の `collect_service_dependencies.sh` により、17の `tenmon-*` サービスの稼働状態と依存関係グラフを抽出した。

*   **正常稼働 (Active):** `tenmon-ark-api`, `tenmon-auto-patch`, `tenmon-notion-task-status-fix`, `tenmon-runtime-watchdog`, `tenmon-todaycut-stack`
*   **クラッシュループ (Activating / Auto-restart):**
    *   `tenmon-strict-promotion`: 直近7日間で **117,887回** の失敗。
    *   `tenmon-notion-task-audit`: 直近7日間で 59,028回の失敗。
    *   `tenmon-notion-task-requeue`: 直近7日間で 59,013回の失敗。
    *   `tenmon-notion-task-readback`: 直近7日間で 58,958回の失敗。
*   **影響:** これらの Notion タスク関連サービスが互いに依存し合いながらクラッシュループに陥っており、システムリソースを浪費している。

## 6. `sync_shuku_data.ts` の型エラー（56件）

`ShukuDeepData` インターフェースに、`kakushinKatto` や `toikakake1` などの拡張フィールドが不足していることが確認された。

*   **原因:** データベーススキーマ（または実際のデータ構造）が拡張されたにもかかわらず、TypeScript の型定義（`shuku_deep_data.ts` など）がそれに追従していないため。
*   **影響:** 現在の解析をブロックするものではないが、ビルドエラーやランタイムエラーの原因となるため、早急な修正が必要である。

## 7. 結論と推奨アクション

TENMON-ARK システムは、高度な機能（言霊エンジン、継続記憶、自己監査など）を内包しているが、アーキテクチャの移行期における不整合（2コードベース問題）と、重要な接続コンポーネント（`kotodamaConnector.ts`）の欠落により、その真価を発揮できていない状態にある。

### 90日ロードマップへの最優先組み込み課題

1.  **Founder導線 (founder_onboarding) の完全実装:** 販売可能な製品とするため、単なるキー認証から、招待トークンとメンバーステータスを連動させた本格的なオンボーディングフローへ移行する。
2.  **ハイブリッドLLM (hybrid_llm) の有効化:** ハードコードされた単一プロバイダから脱却し、コストと品質に基づく動的なモデル切替ロジックを実装する。
3.  **`kotodamaConnector.ts` の復旧と Git 管理化:** Untracked 状態のファイルを Git に追加し、言霊システム（RouteReason / Evidence Bind）の接続を復旧する。
4.  **クラッシュループサービスの停止・修正:** `tenmon-strict-promotion` をはじめとする Notion タスク関連サービスを一時停止し、エラー原因を特定・修正する。
5.  **データベースの整理 (Dead/Dormant テーブルのパージ):** 使用されていない 42% のテーブルをバックアップ後に削除またはアーカイブし、スキーマをクリーンアップする。
