# 本番環境デプロイチェックリスト

**生成日時**: 2026-01-12  
**目的**: 本番環境の問題を解消するためのデプロイ手順

---

## 🔴 本番環境で発生している問題

1. **LLMが使用されている**（必須仕様違反）
   - ログ: `llm: 3832`, `llm: 2285`（HYBRIDモード）
   - 必須仕様: HYBRIDモードはLLM未使用

2. **一般知識テンプレが混入**（必須仕様違反）
   - 「日本の伝統的な考え方」「ポジティブな言葉」等
   - 必須仕様: response本文にも一般テンプレが混入しない

3. **detail捏造**（必須仕様違反）
   - `pdfPage: 3`, `lawId: 言霊-001`（捏造）
   - 必須仕様: detail は EvidencePack 由来のみ

4. **distファイルが古い**
   - mtime: `2026-01-10 18:05:19`（2日前）
   - 最新修正が反映されていない

---

## ✅ 現在のコード（ローカル）の状態

**必須仕様の実装状況**: ✅ **すべて完了**

1. ✅ intent=domain → mode=HYBRID（#詳細でもdoc指定でも）
2. ✅ evidence==0 → LLM不使用（資料不足＋候補提示のみ）
3. ✅ detail は EvidencePack 由来のみ（LLM由来禁止）
4. ✅ response に一般テンプレ混入なし（domain strict）
5. ✅ ktk/iroha fallback ID規格化（KTK-P####-T### / IROHA-P####-T###）

**実装詳細**:
- HYBRIDモード: `generateResponseFromPlan()` と `generateDetailFromPlan()` を使用（LLM未使用）
- ログ: `llm: null` を記録
- 一般テンプレ混入なし（LLM未使用のため）
- detail捏造なし（EvidencePack由来のみ）

---

## 📝 デプロイ手順

### 1. コードのビルド

```bash
cd /Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset/api
pnpm install
pnpm build
```

**確認**:
- `dist/routes/chat.js` が生成されていること
- `dist/truth/truthSkeleton.js` が生成されていること
- `dist/persona/speechStyle.js` が生成されていること

### 2. 本番環境へのデプロイ

```bash
# 本番環境にSSH接続
ssh root@x162-43-90-247

# サービスを停止
systemctl stop tenmon-ark-api.service

# バックアップ（オプション）
cp -r /opt/tenmon-ark/api/dist /opt/tenmon-ark/api/dist.backup.$(date +%Y%m%d_%H%M%S)

# 新しいコードをデプロイ
# （ローカルからrsyncまたはscpで転送）
# 例: rsync -avz --delete dist/ root@x162-43-90-247:/opt/tenmon-ark/api/dist/

# サービスを起動
systemctl start tenmon-ark-api.service

# ステータス確認
systemctl status tenmon-ark-api.service
```

### 3. 動作確認

**テスト1: HYBRIDモードでLLM未使用を確認**
```bash
curl -sS http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test","message":"言灵とは？"}' | jq '{mode:.decisionFrame.mode, llm_usage:.decisionFrame.llm}'
```

**ログ確認**:
```bash
journalctl -u tenmon-ark-api.service -n 50 --no-pager | grep "llm"
```

**期待値**: `"llm": null` が記録されること

**テスト2: 一般知識テンプレが混入しないことを確認**
```bash
curl -sS http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test","message":"言灵とは？"}' | jq -r '.response' | grep -E "(日本の伝統|ポジティブ|古来)"
```

**期待値**: マッチしない（一般テンプレが含まれていない）

**テスト3: detail捏造がないことを確認**
```bash
curl -sS http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test","message":"言灵とは？ #詳細"}' | jq -r '.detail' | grep -E "(pdfPage: 3|言霊-001|lawId.*言霊)"
```

**期待値**: マッチしない（捏造された情報が含まれていない）

---

## ✅ デプロイ後の確認事項

1. **ログ確認**: `journalctl -u tenmon-ark-api.service -f` でリアルタイムログを確認
   - `"llm": null` が記録されること
   - エラーが発生していないこと

2. **API動作確認**: `/api/version` エンドポイントでビルド時刻を確認
   ```bash
   curl -sS http://localhost:3000/api/version | jq
   ```

3. **受入テスト実行**: 可能であれば、本番環境で受入テストを実行
   ```bash
   BASE_URL=http://localhost:3000 ./scripts/acceptance_test.sh
   ```

---

## 🎯 期待される効果

デプロイ後、以下の問題が解消される：

1. ✅ HYBRIDモードでLLM未使用（`llm: null`）
2. ✅ 一般知識テンプレ混入なし
3. ✅ detail捏造なし（EvidencePack由来のみ）
4. ✅ すべての必須仕様を満たす


