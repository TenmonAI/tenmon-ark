# Track B: VPS 解析スクリプト v2

## 概要

TENMON_ARK_FULL_SYSTEM_ANALYSIS_V1 の Track B は、VPS 上で実行する READ-ONLY 解析スクリプト一式です。TENMON が VPS 上で 1 回実行するだけで、全システム情報を収集します。

v2 では、Part A のバグ修正（`collect_service_map.sh` / `collect_env_audit.sh`）と、Part B の新規スクリプト 3 本（Step 6〜8）を追加しています。

## 実行手順

### 全ステップ実行（推奨）

```bash
# 1. リポジトリを最新に更新
cd /opt/tenmon-ark-repo
git pull origin feature/full-system-analysis-track-b

# 2. Salt を生成（解析完了後に破棄）
export ANALYSIS_SALT=$(openssl rand -hex 32)

# 3. 解析実行（10〜15分）
sudo -E bash analysis/track_b/scripts/run_full_analysis.sh

# 4. 結果をコミット・プッシュ
git add analysis/track_b/output/
git commit -m "feat(analysis): 完全版 VPS データ収集 (all 8 steps completed)"
git push origin feature/full-system-analysis-track-b

# 5. Salt を破棄
unset ANALYSIS_SALT
```

### 特定ステップのみ実行

```bash
# 修正済みステップのみ再実行
sudo -E bash analysis/track_b/scripts/run_full_analysis.sh --step 2,3

# 新規ステップのみ実行
sudo -E bash analysis/track_b/scripts/run_full_analysis.sh --step 6,7,8

# 前回失敗したステップのみ再実行
sudo -E bash analysis/track_b/scripts/run_full_analysis.sh --retry-failed
```

### 部分実行スクリプト（代替）

```bash
# 特定ステップのみ（引数で指定）
sudo -E bash analysis/track_b/scripts/run_partial_analysis.sh 2 3

# 新規ステップのみ
sudo -E bash analysis/track_b/scripts/run_partial_analysis.sh 6 7 8
```

## スクリプト構成

```
analysis/track_b/scripts/
├── run_full_analysis.sh              # オーケストレータ v2（--step/--retry-failed 対応）
├── run_partial_analysis.sh           # 部分実行スクリプト v2
├── collect_db_inventory.sh           # Step 1: DB 解析（SQLite + MySQL）
├── collect_service_map.sh            # Step 2: サービスマップ (v2 修正済み)
├── collect_env_audit.sh              # Step 3: 環境監査 (v2 修正済み)
├── collect_founder_usage.sh          # Step 4: Founder 利用パターン
├── collect_hidden_feature_evidence.sh # Step 5: 隠れた機能の証拠
├── collect_table_timestamps.sh       # Step 6: テーブル timestamps (NEW)
├── collect_hidden_feature_deep.sh    # Step 7: 隠れた機能の深部診断 (NEW)
├── collect_service_dependencies.sh   # Step 8: サービス依存関係 (NEW)
└── lib/
    ├── mask_personal_info.sh         # 個人情報マスク共通関数
    └── safe_query.sh                 # READ-ONLY SQL 実行共通関数
```

## 安全性保証

1. **READ-ONLY 厳守**: 全 SQL は SELECT のみ。INSERT/UPDATE/DELETE/DROP は `validate_readonly_sql()` で禁止。
2. **systemctl 制限**: `status` / `is-active` / `is-enabled` / `show` / `cat` のみ使用。`restart` / `stop` / `start` / `reload` / `daemon-reload` / `disable` / `enable` は全面禁止。
3. **書き込み先限定**: `analysis/track_b/output/` のみ。
4. **個人情報マスク**: ユーザーID は SHA256 ハッシュ化、メール・氏名・電話番号・住所は `[REDACTED]`。
5. **秘匿値マスク**: API_KEY / TOKEN / SECRET / PASSWORD を含む環境変数の値は `[MASKED]`。変数名と長さのみ記録。
6. **冪等性**: 何度実行しても同じ結果（タイムスタンプ以外）。
7. **タイムアウト**: DB クエリは 10 秒上限。大規模テーブル（100万行超）はサンプリングクエリ。

## 出力ファイル

```
analysis/track_b/output/
├── .step_status.json               # ステップ実行状態（--retry-failed 用）
├── db_inventory.json               # DB テーブル一覧・行数・スキーマ
├── db_inventory_sqlite.json        # SQLite 詳細
├── db_inventory_mysql.json         # MySQL/TiDB 詳細
├── service_map.json                # 統合サービスマップ
├── systemd_inventory.json          # systemd サービス状態
├── nginx_config.json               # nginx 設定
├── cron_inventory.json             # cron ジョブ
├── journalctl_errors.json          # 直近7日のエラー
├── disk_usage.json                 # ディスク使用量
├── listening_ports.json            # ポートリスニング
├── env_audit.json                  # 環境変数監査
├── founder_usage.json              # 利用統計
├── founder_endpoint_usage.json     # API エンドポイント統計
├── founder_error_patterns.json     # エラーパターン
├── table_timestamps.json           # テーブル最終更新日時 (NEW)
├── service_dependencies.json       # サービス依存関係 (NEW)
└── hidden_feature_evidence/        # 隠れた機能の証拠
    ├── api_health.json
    ├── active_routes.json
    ├── self_evolution_evidence.json
    ├── kokuzo_evidence.json
    ├── mc_evidence.json
    ├── 01_learning_return.json     # (NEW) 学習還流
    ├── 02_self_audit.json          # (NEW) 自己監査
    ├── 03_continuity.json          # (NEW) 継続記憶層
    ├── 04_route_evidence.json      # (NEW) RouteReason/Evidence Bind
    ├── 05_notion_sync.json         # (NEW) Notion同期
    ├── 06_founder_onboarding.json  # (NEW) Founder導線
    ├── 07_pwa_import_export.json   # (NEW) PWA Import/Export
    ├── 08_seed_compression.json    # (NEW) Seed圧縮/知識パック
    ├── 09_constitution_layer.json  # (NEW) 憲法レイヤー
    ├── 10_hybrid_llm.json          # (NEW) ハイブリッドLLM
    ├── 11_live_web_search.json     # (NEW) 時事情報取得
    ├── 12_alternative_algorithms.json # (NEW) 代替アルゴリズム
    └── 13_voice_systems.json       # (NEW) 音声系
```

## v2 変更点サマリー

### Part A: バグ修正

| Step | スクリプト | 修正内容 |
|------|-----------|---------|
| 2 | collect_service_map.sh | `●` マーカー除去、`split(None, 4)` で堅牢化、drop-in 対応、failed サービス収集 |
| 3 | collect_env_audit.sh | パスを `/opt/tenmon-ark-repo/` に修正、systemd drop-in 対応、秘匿値マスク強化 |

### Part B: 新規スクリプト

| Step | スクリプト | 目的 |
|------|-----------|------|
| 6 | collect_table_timestamps.sh | 111テーブルの最終更新日時を取得し mainline/dormant/dead を判定 |
| 7 | collect_hidden_feature_deep.sh | 13機能それぞれの個別診断（テーブル・ファイル・サービス・ログ） |
| 8 | collect_service_dependencies.sh | tenmon-* サービスの依存関係グラフ（Mermaid 出力付き） |

### Part C: オーケストレータ更新

| 機能 | 説明 |
|------|------|
| `--step N,M,...` | 特定ステップのみ実行 |
| `--retry-failed` | 前回失敗したステップのみ再実行 |
| `.step_status.json` | ステップごとの成功/失敗/所要時間を記録 |

## レビューチェックリスト

TENMON が実行前に確認すべき項目:

- [ ] 全 SQL が SELECT のみであること（INSERT/UPDATE/DELETE/DROP なし）
- [ ] systemctl の操作が status / is-active / is-enabled / show / cat のみであること
- [ ] ファイル書き込み先が `analysis/track_b/output/` のみであること
- [ ] `set -euo pipefail` が全スクリプトにあること
- [ ] 個人情報マスクが実装されていること
- [ ] Salt が環境変数経由であること（ハードコードなし）
- [ ] 秘匿値（API_KEY/TOKEN/SECRET/PASSWORD）が `[MASKED]` であること
