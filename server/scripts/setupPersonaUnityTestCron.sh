#!/bin/bash

# TENMON-ARK Persona Unity Test 自動実行 Cron ジョブ設定スクリプト
# 
# 目的: Persona の劣化を自動検知する「霊核防衛システム」
# 実行頻度: 毎日 1回（午前3時）

echo "Setting up Persona Unity Test Cron Job..."

# プロジェクトディレクトリ
PROJECT_DIR="/home/ubuntu/os-tenmon-ai-v2"

# Cron ジョブを追加（毎日午前3時に実行）
# 0 3 * * * = 毎日午前3時
CRON_JOB="0 3 * * * cd $PROJECT_DIR && NODE_ENV=production tsx server/scripts/autoPersonaUnityTest.ts >> logs/persona_unity_tests/cron.log 2>&1"

# 既存の Cron ジョブを取得
crontab -l > /tmp/current_crontab 2>/dev/null || true

# Persona Unity Test Cron ジョブが既に存在するかチェック
if grep -q "autoPersonaUnityTest.ts" /tmp/current_crontab; then
  echo "Persona Unity Test Cron Job already exists. Skipping..."
else
  # Cron ジョブを追加
  echo "$CRON_JOB" >> /tmp/current_crontab
  crontab /tmp/current_crontab
  echo "Persona Unity Test Cron Job added successfully!"
fi

# 一時ファイルを削除
rm /tmp/current_crontab

echo "Cron Job setup completed!"
echo "Persona Unity Test will run every day at 3:00 AM"
echo "Logs will be saved to: $PROJECT_DIR/logs/persona_unity_tests/"
