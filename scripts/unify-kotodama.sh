#!/bin/bash

# TENMON-ARK 言灵表記統一スクリプト
# 「言霊」→「言灵」、「霊」→「靈」への統一

set -e

echo "🔥 TENMON-ARK 言灵表記統一を開始します..."

# 対象ディレクトリ
TARGETS=(
  "server"
  "client/src"
  "drizzle"
  "shared"
  "README.md"
  "todo.md"
)

# 1. 「言霊」→「言灵」
echo "📝 「言霊」→「言灵」を統一中..."
for target in "${TARGETS[@]}"; do
  if [ -e "$target" ]; then
    find "$target" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.md" -o -name "*.json" \) -exec sed -i 's/言霊/言灵/g' {} +
  fi
done

# 2. 「霊」→「靈」（ただし、既に「靈」になっている箇所は除外）
echo "📝 「霊」→「靈」を統一中..."
for target in "${TARGETS[@]}"; do
  if [ -e "$target" ]; then
    find "$target" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.md" -o -name "*.json" \) -exec sed -i 's/霊/靈/g' {} +
  fi
done

echo "✅ 言灵表記統一が完了しました！"
echo "📊 統計情報:"
echo "  - 「言灵」の出現回数: $(grep -r "言灵" server client/src drizzle shared 2>/dev/null | wc -l)"
echo "  - 「靈」の出現回数: $(grep -r "靈" server client/src drizzle shared 2>/dev/null | wc -l)"
