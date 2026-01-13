# 本番環境の問題分析レポート

**生成日時**: 2026-01-12  
**本番環境**: x162-43-90-247  
**問題**: HYBRIDモードでLLMが使用され、一般知識テンプレが混入、detail捏造が発生

---

## 🔴 本番環境で発生している問題

### 1. LLMが使用されている（必須仕様違反）

**ログから確認**:
```json
{"level":"info","requestId":"610c4b56-8e6e-4026-9baf-82a07121e0be","threadId":"t","mode":"HYBRID","risk":"none","latency":{"total":3921,"liveEvidence":null,"llm":3832},"evidenceConfidence":null,"returnedDetail":true}
```

**問題**: 
- HYBRIDモードで `llm: 3832`（LLMが使用されている）
- 必須仕様: `evidence==0` のとき LLMを呼ばない
- 必須仕様: HYBRIDモードは `generateResponseFromPlan()` と `generateDetailFromPlan()` を使用（LLM未使用）

### 2. 一般知識テンプレが混入（必須仕様違反）

**reproduceセクションから確認**:
```json
{
  "response": "言霊（ことだま）とは、日本の伝統的な考え方で、言葉に霊的な力や影響力があると信じられています。言葉を発することで、その言葉が現実に影響を及ぼすと考えられ、特に祝詞や詩歌などで重視されます。ポジティブな言葉を使うことで良い結果を引き寄せるとされています。"
}
```

**問題**:
- 「日本の伝統的な考え方」- 禁止テンプレ語
- 「ポジティブな言葉を使うことで良い結果を引き寄せる」- 禁止テンプレ語
- 必須仕様: response本文にも一般テンプレが混入しない（domain strict）

### 3. detail捏造（必須仕様違反）

**reproduceセクションから確認**:
```
#詳細
- pdfPage: 3
- lawId: 言霊-001
- 引用: 「言霊とは、言葉に宿る霊的な力を指し、古来より日本文化において重要視されてきた概念である。」
```

**問題**:
- `pdfPage: 3` - 捏造（EvidencePackに存在しない）
- `lawId: 言霊-001` - 捏造（ID規格違反: 正しくは `KHS-P####-T###`）
- 引用がEvidencePack由来でない（LLMが生成した可能性）
- 必須仕様: detail は EvidencePack 由来のみでコード生成（LLM由来禁止）

### 4. distファイルが古い

**確認**:
```
mtime=2026-01-10 18:05:19.148418719 +0900 size=2601 /opt/tenmon-ark/api/dist/index.js
mtime=2026-01-10 18:05:19.088418842 +0900 size=20169 /opt/tenmon-ark/api/dist/routes/chat.js
```

**問題**:
- distファイルのmtimeが `2026-01-10 18:05:19`（2日前）
- 最新の修正（2026-01-12）が反映されていない
- 本番環境で古いコードが動いている可能性が高い

---

## ✅ 現在のコード（ローカル）の状態

### HYBRIDモードの実装（288-394行目）

**コード確認**:
```typescript
if (mode === "HYBRID") {
  // 1. CoreAnswerPlan を構築
  let plan = await buildCoreAnswerPlan(message, detail);
  
  // 2. plan === null なら EvidencePack が無いため、定義回答禁止でreturn
  if (!plan) {
    // LLMを呼ばずに「資料不足」レスポンスを返す
    const response = "資料不足です。次に読むべきdoc/pdfPageを指定してください。";
    // ... llm: null をログに記録 ...
    return res.json(result);
  }

  // 3. response/detail はコードで組み立てる（Surface Generatorを使用）
  let response = generateResponseFromPlan(plan);  // LLM未使用
  const detailText = detail ? generateDetailFromPlan(plan) : undefined;  // LLM未使用

  // ... llm: null をログに記録 ...
}
```

**状態**: ✅ **正しく実装されている**
- LLM未使用（`generateResponseFromPlan()` と `generateDetailFromPlan()` を使用）
- ログで `llm: null` を記録
- 一般テンプレが混入しない（LLM未使用のため）
- detail捏造が発生しない（EvidencePack由来のみ）

---

## 🔍 原因分析

### 本番環境のコードが古いバージョン

**推測**:
1. 本番環境の `/opt/tenmon-ark/api/dist/` が古いバージョン（2026-01-10）
2. 古いコードでは、HYBRIDモードでLLMを使用していた
3. 古いコードでは、`systemHybridDomain` プロンプトを使用してLLMを呼び出していた
4. LLMが一般知識テンプレを生成し、detailに捏造された情報を含めていた

**確認方法**:
- 本番環境の `/opt/tenmon-ark/api/src/routes/chat.ts` を確認
- または、`dist/routes/chat.js` を確認して、HYBRIDモードでLLMが呼ばれているか確認

---

## ✅ 修正済み（ローカルコード）

現在のローカルコードは、すべての必須仕様を満たしています：

1. ✅ **intent=domain → mode=HYBRID**: `detectIntent()` を修正（domain優先）
2. ✅ **evidence==0 → LLM不使用**: `plan === null` の場合、LLMを呼ばずに「資料不足」レスポンス
3. ✅ **detail は EvidencePack 由来のみ**: `generateDetailFromPlan(plan)` - plan.quotes から生成（LLM未使用）
4. ✅ **response に一般テンプレ混入なし**: `generateResponseFromPlan(plan)` - テンプレ固定生成（LLM未使用）
5. ✅ **ktk/iroha fallback ID規格化**: ID形式を `KTK-P####-T###` / `IROHA-P####-T###` に修正

---

## 📝 次のステップ

1. **本番環境へのデプロイ**: 最新のコードをビルドして本番環境にデプロイ
2. **動作確認**: デプロイ後に、同じリクエストを送信して問題が解消されたか確認
3. **ログ確認**: ログで `llm: null` が記録されることを確認

---

## 🎯 結論

**現在のローカルコード**: ✅ **すべての必須仕様を満たしている**

**本番環境の問題**: 🔴 **古いコードが動いている（2026-01-10ビルド）**

**対処**: 最新のコードをビルドして本番環境にデプロイする必要がある


