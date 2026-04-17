# TENMON-MC: Mission Control Phase 1 MVP

TENMON-ARK の運用状況を5分ごとに自動収集し、プレーンテキストレポートとして表示する読み取り専用の観測ダッシュボードです。

## 設計思想

Mission Control は「観測専用・書き込み権なし」を原則としています。天聞アーク本体のファイル、データベース、設定を一切変更しません。全てのデータベースアクセスは `sqlite3 -readonly` で行います。

## アーキテクチャ

```
Layer 1: 収集層 (cron, 5分ごと実行)
  /opt/tenmon-mc/bin/collect.sh
  ↓ 書き込み
Layer 2: データ層 (JSON + TXT スナップショット)
  /var/www/tenmon-mc/data/snapshot.json
  /var/www/tenmon-mc/data/report.txt
  ↑ 読み込み
Layer 3: 表示層 (静的HTML + Basic Auth)
  https://tenmon-ark.com/mc/
```

## 収集セクション

| Section | 内容 |
|---------|------|
| Infra | systemd状態, API health, CPU/MEM/Disk, エラー数 |
| Sukuyou | ゴールデンサンプル検証, Lookup Table, 深化データカバー率 |
| Kotodama | 言霊連携コード参照数, ログ内発火数 |
| Founder | ユーザー数, アクティブ数, 鑑定数, 宿分布 |
| Learning | Audit/Training/Scripture/Growth/Synapse ログ |
| Data Integrity | Git状態, バックアップファイル, DB情報 |

## セットアップ手順

### 前提条件

VPS上に以下が存在すること:
- `/opt/tenmon-ark-repo` — 天聞アークリポジトリ
- `/opt/tenmon-ark-data/kokuzo.sqlite` — SQLiteデータベース
- nginx が `tenmon-ark.com` で稼働中
- Node.js がインストール済み

### インストール

```bash
# 1. リポジトリを取得（既存リポジトリの場合）
cd /opt/tenmon-ark-repo
git fetch origin
git checkout feature/mc-phase1

# 2. インストーラを実行
cd mc
sudo bash INSTALL.sh
```

INSTALL.sh は対話式で以下を確認します:
- DB_PATH（SQLiteファイルの場所）
- REPO_PATH（リポジトリの場所）
- Basic Auth のユーザー名とパスワード

### インストーラが行うこと

1. 必要パッケージの確認とインストール (jq, sqlite3, bc, apache2-utils)
2. `/opt/tenmon-mc` ディレクトリ作成とスクリプト配置
3. `/var/www/tenmon-mc` ディレクトリ作成とHTML/CSS配置
4. nginx設定への `location /mc/` 追記
5. nginx設定テストとリロード
6. Basic Auth パスワード設定
7. cron登録（5分間隔）
8. 初回データ収集と結果表示

### 手動実行

```bash
# 収集を手動実行
sudo /opt/tenmon-mc/bin/collect.sh

# レポート確認
cat /var/www/tenmon-mc/data/report.txt

# JSON確認
jq . /var/www/tenmon-mc/data/snapshot.json
```

## ディレクトリ構成

```
/opt/tenmon-mc/
├── bin/
│   ├── common.sh                 # 共通関数
│   ├── collect.sh                # メイン統合
│   ├── collect_infra.sh          # §1 インフラ
│   ├── collect_sukuyou.sh        # §2 宿曜品質
│   ├── collect_kotodama.sh       # §3 言霊連携
│   ├── collect_founder.sh        # §4 ファウンダー
│   ├── collect_learning.sh       # §5 学習機能
│   ├── collect_data_integrity.sh # §6 データ整合性
│   └── assemble_report.sh        # レポート組み立て
└── config/
    └── mc.env                    # 設定ファイル

/var/www/tenmon-mc/
├── index.html
├── style.css
├── .htpasswd
└── data/
    ├── snapshot.json
    ├── report.txt
    └── history/
```

## 設定ファイル

`/opt/tenmon-mc/config/mc.env`:

```bash
REPO_PATH="/opt/tenmon-ark-repo"
DB_PATH="/opt/tenmon-ark-data/kokuzo.sqlite"
API_URL="http://127.0.0.1:3000"
SERVICE_NAME="tenmon-ark-api"
DATA_DIR="/var/www/tenmon-mc/data"
HISTORY_RETENTION_MIN=360
GOLDEN_BIRTHDATE="1990-09-26"
GOLDEN_EXPECTED_SHUKU="斗"
```

## トラブルシューティング

[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) を参照してください。

## 完了条件

[docs/ACCEPTANCE.md](docs/ACCEPTANCE.md) を参照してください。

## 禁止事項

1. MCから天聞アーク本体のファイル・DB・設定を変更する機能は追加しない
2. `.env` ファイルの中身、TOKEN、SECRETはログ・JSON・HTMLに含めない
3. メールアドレス、生年月日、対話内容そのものは表示しない（集計済み数字のみ）
4. SQLite を WRITE モードで開かない（`sqlite3 -readonly` を必ず使う）
