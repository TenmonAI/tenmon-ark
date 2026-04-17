# Track B: VPS 解析スクリプト

## 概要

TENMON_ARK_FULL_SYSTEM_ANALYSIS_V1 の Track B は、VPS 上で実行する READ-ONLY 解析スクリプト一式です。TENMON が VPS 上で 1 回実行するだけで、全システム情報を収集します。

## 実行手順

```bash
# 1. リポジトリを最新に更新
cd /opt/tenmon-ark-repo
git pull origin feature/full-system-analysis-track-b

# 2. Salt を生成（解析完了後に破棄）
export ANALYSIS_SALT=$(openssl rand -hex 32)

# 3. 解析実行（10〜20分）
sudo -E bash analysis/track_b/scripts/run_full_analysis.sh

# 4. 結果をコミット・プッシュ
git add analysis/track_b/output/
git commit -m "feat(analysis): VPS 実データ収集完了"
git push origin feature/full-system-analysis-track-b

# 5. Salt を破棄
unset ANALYSIS_SALT
```

## スクリプト構成

```
analysis/track_b/scripts/
├── run_full_analysis.sh              # オーケストレータ（これを実行）
├── collect_db_inventory.sh           # DB 解析（SQLite + MySQL）
├── collect_service_map.sh            # サービスマップ（systemd, nginx, cron, journal, disk, ports）
├── collect_env_audit.sh              # 環境変数監査（値はマスク）
├── collect_founder_usage.sh          # 利用パターン（匿名化）
├── collect_hidden_feature_evidence.sh # 隠れた機能の証拠
└── lib/
    ├── mask_personal_info.sh         # 個人情報マスク共通関数
    └── safe_query.sh                 # READ-ONLY SQL 実行共通関数
```

## 安全性保証

1. **READ-ONLY 厳守**: 全 SQL は SELECT のみ。INSERT/UPDATE/DELETE/DROP は `validate_readonly_sql()` で禁止。
2. **systemctl は status のみ**: restart/stop/start は一切使用しない。
3. **書き込み先限定**: `analysis/track_b/output/` のみ。
4. **個人情報マスク**: ユーザーID は SHA256 ハッシュ化、メール・氏名・電話番号・住所は `[REDACTED]`。
5. **環境変数値マスク**: 変数名と長さのみ記録、値は含めない。
6. **冪等性**: 何度実行しても同じ結果（タイムスタンプ以外）。
7. **タイムアウト**: DB クエリは 10 秒上限。

## 出力ファイル

```
analysis/track_b/output/
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
└── hidden_feature_evidence/        # 隠れた機能の証拠
    ├── api_health.json
    ├── active_routes.json
    ├── self_evolution_evidence.json
    ├── kokuzo_evidence.json
    └── mc_evidence.json
```

## レビューチェックリスト

TENMON が実行前に確認すべき項目:

- [ ] 全 SQL が SELECT のみであること（INSERT/UPDATE/DELETE/DROP なし）
- [ ] systemctl の操作が status / is-active のみであること（restart/stop/start なし）
- [ ] ファイル書き込み先が `analysis/track_b/output/` のみであること
- [ ] `set -euo pipefail` が全スクリプトにあること
- [ ] 個人情報マスクが実装されていること
- [ ] Salt が環境変数経由であること（ハードコードなし）
