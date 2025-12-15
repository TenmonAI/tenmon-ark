#!/bin/bash

# ============================================================
#  Universe OS Release Package Creator
# ============================================================

set -e

VERSION="${1:-1.0.0}"
RELEASE_DIR="release/universe-os-v${VERSION}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "🔱 Creating Universe OS Release Package v${VERSION}..."
echo ""

# ディレクトリ作成
mkdir -p "${RELEASE_DIR}"
mkdir -p "${RELEASE_DIR}/server/reisho"
mkdir -p "${RELEASE_DIR}/client/src/dashboard"
mkdir -p "${RELEASE_DIR}/docs"
mkdir -p "${RELEASE_DIR}/scripts"

# サーバーファイルをコピー
echo "📦 Copying server files..."
cp -r server/reisho/*.ts "${RELEASE_DIR}/server/reisho/" 2>/dev/null || true
cp -r server/reisho/tests "${RELEASE_DIR}/server/reisho/" 2>/dev/null || true

# クライアントファイルをコピー
echo "📦 Copying client files..."
cp client/src/dashboard/ReishoOSDashboard.tsx "${RELEASE_DIR}/client/src/dashboard/" 2>/dev/null || true
cp client/src/dashboard/ReishoPanel.tsx "${RELEASE_DIR}/client/src/dashboard/" 2>/dev/null || true

# ドキュメントをコピー
echo "📦 Copying documentation..."
cp docs/UNIVERSE_OS_RELEASE_DOCUMENTATION.md "${RELEASE_DIR}/docs/" 2>/dev/null || true

# バージョンマニフェストを生成
echo "📦 Generating version manifest..."
cat > "${RELEASE_DIR}/VERSION_MANIFEST.json" <<EOF
{
  "version": "${VERSION}",
  "releaseDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "timestamp": "${TIMESTAMP}",
  "components": {
    "reishoOSCore": "server/reisho/osCore.ts",
    "memoryKernelV2": "server/reisho/memoryKernelV2.ts",
    "phaseEngine": "server/reisho/phaseEngine.ts",
    "reishoPipeline": "server/reisho/reishoPipeline.ts",
    "consciousMesh": "server/reisho/consciousMesh.ts",
    "universalMemoryLayer": "server/reisho/universalMemoryLayer.ts",
    "accelerationMode": "server/reisho/accelerationMode.ts",
    "fractalOvercompression": "server/reisho/fractalOvercompression.ts",
    "multiphasePersona": "server/reisho/multiphasePersona.ts",
    "universeOS": "server/reisho/universeOS.ts",
    "universeOSIntegration": "server/reisho/universeOSIntegration.ts",
    "systemSeedGenerator": "server/reisho/systemSeedGenerator.ts",
    "primaryMemoryKernel": "server/reisho/primaryMemoryKernel.ts",
    "consciousMeshIntegration": "server/reisho/consciousMeshIntegration.ts"
  },
  "integrations": {
    "atlasChatRouter": "server/chat/atlasChatRouter.ts",
    "synapticMemory": "server/synapticMemory.ts",
    "fractalEngine": "kokuzo/fractal/",
    "deviceCluster": "server/deviceCluster-v3/"
  }
}
EOF

# README を生成
echo "📦 Generating README..."
cat > "${RELEASE_DIR}/README.md" <<EOF
# 🔱 Universe OS v${VERSION}

Universe OS — Unified Structural Identity OS

## インストール

\`\`\`bash
# 依存関係をインストール
npm install

# 環境変数を設定
export ENABLE_UNIVERSE_OS=true
\`\`\`

## 使用方法

詳細は \`docs/UNIVERSE_OS_RELEASE_DOCUMENTATION.md\` を参照してください。

## リリース情報

- **バージョン**: ${VERSION}
- **リリース日**: $(date -u +%Y-%m-%d)
- **タイムスタンプ**: ${TIMESTAMP}

## ライセンス

TENMON-ARK Universe OS v${VERSION}  
Copyright (c) 2024
EOF

# アーカイブを作成
echo "📦 Creating archive..."
cd release
tar -czf "universe-os-v${VERSION}-${TIMESTAMP}.tar.gz" "universe-os-v${VERSION}"
cd ..

echo ""
echo "✅ Release package created: release/universe-os-v${VERSION}-${TIMESTAMP}.tar.gz"
echo "📁 Release directory: ${RELEASE_DIR}"
echo ""
echo "🔱 Universe OS v${VERSION} is ready for release!"

