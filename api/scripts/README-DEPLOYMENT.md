# TENMON-ARK API デプロイメントガイド

## 概要

このドキュメントは、TENMON-ARK API のデプロイメントと運用に関する手順を説明します。

## STEP 5: 品質（会話が"棒"に戻らないための設計）

### 5-1. NATURALの返答テンプレ禁止

- ✅ 実装済み: `systemNatural()` プロンプトに以下を追加
  - 「核心語提示だけ」「次にどこ深く？」だけで終わるのは禁止
  - 最初に質問へ直接答える（1〜5文）
  - 必要なら確認質問は最大1つ

### 5-2. domain(HYBRID)のルール

- ✅ 実装済み: `systemHybridDomain()` プロンプトに以下を追加
  - 表：1段で答える（骨格）
  - 裏：#詳細なら根拠（pdfPage / lawId / 引用）を出す
  - domainでも "資料モード強制"に落ちない（docMode明示のみ）

## STEP 6: 回帰テストを自動化

### テストスクリプト

```bash
# スモークテストを実行
cd /opt/tenmon-ark/api
BASE_URL=https://tenmon-ark.com ./scripts/smoke_chat.sh
```

### テスト項目

1. API生存確認
2. NATURALモード（P6が混ざったら失格）
3. HYBRIDモード（domain: 表1段で答える）
4. GROUNDEDモード（#詳細でのみ内部根拠）
5. LIVEモード（必ず取得時刻＋出典URL）
6. 高リスクゲート（必ず止まる）

### CI/CD統合

デプロイ前に必ず実行してください：

```bash
# デプロイ前チェック
./scripts/smoke_chat.sh || exit 1
```

## STEP 7: 運用固定（systemd/環境変数/秘密管理）

### 7-1. systemd サービス設定

```bash
# セットアップスクリプトを実行
cd /opt/tenmon-ark/api
sudo ./scripts/systemd-setup.sh
```

### 7-2. 環境変数の設定

`/etc/systemd/system/tenmon-ark-api.service.d/override.conf` を編集：

```ini
[Service]
# 必須: OpenAI API Key
Environment=OPENAI_API_KEY=sk-...

# 必須: Bing Search API Key (LIVEモード用)
Environment=LIVE_SEARCH_API_KEY=...

# オプション: LLM Model (デフォルト: gpt-4o-mini)
Environment=TENMON_LLM_MODEL=gpt-4o-mini

# オプション: SQLite Path (デフォルト: /opt/tenmon-ark/api/db/threads.sqlite)
Environment=SQLITE_PATH=/opt/tenmon-ark/api/db/threads.sqlite

# オプション: Search Provider (デフォルト: bing)
Environment=LIVE_SEARCH_PROVIDER=bing

# 作業ディレクトリ
WorkingDirectory=/opt/tenmon-ark/api
```

### 7-3. 秘密管理（重要）

**⚠️ secrets は repo に置かない**

- `.env` ファイルは `.gitignore` に追加
- `override.conf` は secrets を含めない（テンプレートのみ）
- 本番環境では環境変数管理ツール（例: HashiCorp Vault）を使用推奨

### 7-4. サービス管理

```bash
# サービスを有効化
sudo systemctl enable tenmon-ark-api

# サービスを起動
sudo systemctl start tenmon-ark-api

# サービス状態を確認
sudo systemctl status tenmon-ark-api

# ログを確認
sudo journalctl -u tenmon-ark-api -f

# サービスを再起動
sudo systemctl restart tenmon-ark-api
```

### 7-5. ヘルスチェック

```bash
# ヘルスチェック
curl http://localhost:3000/api/health | jq .

# 外部サービスチェック（Bing/LLM/DB）
curl http://localhost:3000/api/health | jq .external
```

## トラブルシューティング

### サービスが起動しない

1. ログを確認: `sudo journalctl -u tenmon-ark-api -n 50`
2. 環境変数を確認: `sudo systemctl show tenmon-ark-api | grep Environment`
3. ポートが使用中でないか確認: `sudo lsof -i :3000`

### APIが応答しない

1. ヘルスチェック: `curl http://localhost:3000/api/health`
2. ログを確認: `sudo journalctl -u tenmon-ark-api -f`
3. リクエストログを確認: `sudo journalctl -u tenmon-ark-api | grep "requestId"`

### レート制限エラー

- `/api/chat`: 30req/min
- LIVEモード: 10req/min（未実装、将来対応）

## デプロイメントチェックリスト

- [ ] ビルド成功: `cd /opt/tenmon-ark/api && pnpm build`
- [ ] スモークテスト通過: `./scripts/smoke_chat.sh`
- [ ] 環境変数設定: `override.conf` に secrets を設定
- [ ] サービス有効化: `sudo systemctl enable tenmon-ark-api`
- [ ] サービス起動: `sudo systemctl start tenmon-ark-api`
- [ ] ヘルスチェック: `curl http://localhost:3000/api/health`
- [ ] ログ確認: `sudo journalctl -u tenmon-ark-api -f`

