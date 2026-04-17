# TENMON-MC Phase 4 Acceptance Criteria

## Agent DB

- [ ] `init_agent_db.sh` が `/var/www/tenmon-mc/agents.db` を作成する
- [ ] `agent_logs`, `agent_tokens`, `notion_synced` テーブルが存在する
- [ ] インデックスが作成されている

## AI Ingest

- [ ] `ai_ingest.sh` が `/var/www/tenmon-mc/inbox/*.json` を処理する
- [ ] 有効なトークンの JSON が `agent_logs` に挿入される
- [ ] 無効なトークンの JSON が `inbox_archive/invalid_token_*` に移動される
- [ ] 不正な JSON が `inbox_archive/invalid_*` に移動される
- [ ] 処理済み JSON が `inbox_archive/` にアーカイブされる
- [ ] 30日以上前のアーカイブが自動削除される

## Agent Activities JSON

- [ ] `export_agent_activities.sh` が `agent_activities.json` を生成する
- [ ] `agents.db` が存在しない場合は空配列 `[]` を出力する
- [ ] 最新100件が降順で出力される

## AI Agents ダッシュボード

- [ ] `ai_agents.html` が表示される
- [ ] エージェント/アクション/優先度フィルタが動作する
- [ ] `agent_activities.json` からデータを読み込み表示する
- [ ] 30秒ごとに自動更新される

## Notion ミラー

- [ ] `notion_mirror.sh` が `NOTION_TOKEN` 未設定時にスキップする
- [ ] 未同期の `agent_logs` を Notion に POST する
- [ ] 成功時に `notion_synced` テーブルに記録する
- [ ] 同じログを二重送信しない

## cron 設定

- [ ] `ai_ingest.sh` が1分毎に実行される
- [ ] `notion_mirror.sh` が1時間毎に実行される
- [ ] ログローテートが深夜3時に実行される

## INSTALL.sh

- [ ] inbox ディレクトリが作成される
- [ ] agents.db が初期化される
- [ ] ai_agents.js, ai_agents.css が配置される
- [ ] 4つのログファイルが初期化される

## セキュリティ

- [ ] NOTION_TOKEN が git にコミットされていない
- [ ] mc.env のテンプレートに空文字列のみ含まれる
- [ ] トークンハッシュ検証が ai_ingest.sh で実装されている
- [ ] 本体 API・DB への書き込みが一切ない

## テスト手順

```bash
# Agent Token 発行
TOKEN_HASH=$(echo -n "TEST-TOKEN-123" | sha256sum | cut -d' ' -f1)
sqlite3 /var/www/tenmon-mc/agents.db "
  INSERT INTO agent_tokens (token_hash, agent_name, is_active)
  VALUES ('${TOKEN_HASH}', 'claude', 1);
"

# テスト投稿
cat > /var/www/tenmon-mc/inbox/test_$(date +%s).json <<EOF
{
  "token": "TEST-TOKEN-123",
  "agent_name": "claude",
  "action_type": "observation",
  "target_area": "sukuyou",
  "title": "テスト投稿",
  "content": "Phase 4 動作確認",
  "priority": "low"
}
EOF

# ingest 実行
sudo /opt/tenmon-mc/bin/ai_ingest.sh

# 確認
sqlite3 /var/www/tenmon-mc/agents.db "SELECT * FROM agent_logs ORDER BY id DESC LIMIT 1;"

# Activities JSON 生成
sudo /opt/tenmon-mc/bin/export_agent_activities.sh
cat /var/www/tenmon-mc/data/agent_activities.json
```
