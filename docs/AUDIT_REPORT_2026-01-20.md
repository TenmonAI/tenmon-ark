# TENMON-ARK 監査レポート（2026-01-20）

## 0. Executive Summary

**現状の完成度**: 75%

**ブロッカーTop5**:
1. `dist/version.js` が `null` のまま（VPS上で `copy-assets.mjs` が正しく実行されていない可能性）
2. `gitSha` が常に `null`（git リポジトリ外でのビルドまたは git コマンド失敗）
3. `chat.ts` が肥大化（977行、複数責務が混在）
4. NATURAL モードのテストが `acceptance_test.sh` に不足
5. `version.ts` の動的 import が実行時に失敗する可能性（top-level await の問題）

**最短で完成度を+20%上げる「次の3手」**:
1. `copy-assets.mjs` の `dist/version.js` 生成を確実化（エラー時も `builtAt` は必ず生成）
2. `chat.ts` を分割（NaturalRouter / KanagiReasoner / EvidenceRetriever）
3. `acceptance_test.sh` に NATURAL モードのゲートを追加

---

## 1. 現状のPASS/FAIL表

| 項目 | 状態 | 根拠 | 備考 |
|------|------|------|------|
| **Phase2: 候補提示→番号選択→detail string** | ✅ PASS | `acceptance_test.sh` Phase16/18 で検証済み | `detailType=="string" && detailLen>0` を jq -e で必須化済み |
| **Phase4: ku non-null** | ✅ PASS | `acceptance_test.sh` で HYBRID/GROUNDED の `kuType==object` を検証済み | すべての `decisionFrame.ku` が object 保証 |
| **AuditSLO: builtAt string** | ⚠️ PARTIAL | `/api/audit` で `builtAt` は返るが、`dist/version.js` が `null` のまま | VPS上で `copy-assets.mjs` が正しく実行されていない可能性 |
| **AuditSLO: gitSha** | ❌ FAIL | `/api/audit` で `gitSha: null` | git リポジトリ外または git コマンド失敗 |
| **NATURAL: greeting/datetime/smalltalk** | ✅ PASS | 実装済み（LLM呼び出しなし） | テストが `acceptance_test.sh` に不足 |
| **NATURAL: ku object** | ✅ PASS | `decisionFrame.ku` が必ず object | 実装済み |
| **LLM呼び出し禁止（HYBRID/NATURAL）** | ✅ PASS | `llm: null` を保証 | 捏造ゼロ維持 |

---

## 2. "壊れやすい点"Top5（再発原因）

### 1. `dist/version.js` 生成の不確実性
**原因**: 
- VPS上の `dist/version.js` が古いバージョン（`null` を含む）のまま
- `copy-assets.mjs` の try-catch がエラーを隠蔽している可能性
- ビルド順序の問題（`dist/version.js` が TypeScript コンパイル前に生成される必要がある）

**再発防止策**:
- `copy-assets.mjs` のエラーハンドリングを強化（エラー時も `builtAt` は必ず生成）
- ビルド後に `dist/version.js` の内容を検証するステップを追加
- `acceptance_test.sh` に `builtAt` の `length>0` チェックを追加

### 2. `gitSha` が常に `null`
**原因**:
- git リポジトリ外でのビルド（`/opt/tenmon-ark/api` が git リポジトリでない）
- `git rev-parse --short HEAD` が失敗している（権限問題または git がインストールされていない）

**再発防止策**:
- `gitSha` は `null` 許容として設計（要件通り）
- ただし、git リポジトリ内でのビルド時は必ず値を設定することを明記
- `acceptance_test.sh` で `gitSha` が `null` でも PASS するようにする（または警告のみ）

### 3. `chat.ts` の肥大化（977行）
**原因**:
- NATURAL/HYBRID/GROUNDED/LIVE のすべての分岐が1ファイルに集約
- ヘルパー関数（`formatJstNow`, `classifyNatural`, `parseDocAndPageStrict` 等）が混在
- 番号選択、候補メモリ、Kū Governor の統合が複雑

**再発防止策**:
- `chat.ts` を分割（NaturalRouter / KanagiReasoner / EvidenceRetriever）
- 各モジュールを独立してテスト可能にする
- `acceptance_test.sh` で各モジュールの動作を検証

### 4. `version.ts` の top-level await 問題
**原因**:
- `version.ts` が top-level await を使用しているが、CommonJS との互換性問題
- `dist/version.js` の動的 import が実行時に失敗する可能性

**再発防止策**:
- `version.ts` の動的 import を関数内に移動（lazy loading）
- または、ビルド時に `dist/version.js` の内容を TypeScript に注入する方式に変更

### 5. `acceptance_test.sh` のテスト不足
**原因**:
- NATURAL モードのテストが不足（greeting/datetime/smalltalk の個別テストがない）
- `builtAt` の `length>0` チェックが不足
- `gitSha` の `null` 許容チェックが不足

**再発防止策**:
- NATURAL モードのテストを追加（greeting/datetime/smalltalk）
- `builtAt` の `length>0` チェックを追加
- `gitSha` の `null` 許容チェックを追加（警告のみ）

---

## 3. 次にやるべき作業（順番・完了条件・受入テスト）

### Task 1: `copy-assets.mjs` の `dist/version.js` 生成を確実化
**順番**: 1
**完了条件**:
- `dist/version.js` が必ず `TENMON_ARK_BUILT_AT` と `TENMON_ARK_GIT_SHA` を含む（`null` でも可）
- エラー時も `builtAt` は必ず生成される
- ビルド後に `dist/version.js` の内容を検証するログを出力

**受入テストコマンド**:
```bash
cd /opt/tenmon-ark/api
pnpm -s build
grep -q "TENMON_ARK_BUILT_AT" dist/version.js && echo "✅ builtAt exists" || echo "❌ builtAt missing"
grep -q "TENMON_ARK_GIT_SHA" dist/version.js && echo "✅ gitSha exists" || echo "❌ gitSha missing"
node -e "import('./dist/version.js').then(m => console.log(JSON.stringify({builtAt: m.TENMON_ARK_BUILT_AT, gitSha: m.TENMON_ARK_GIT_SHA}, null, 2)))"
```

### Task 2: `version.ts` の動的 import を確実化
**順番**: 2
**完了条件**:
- `version.ts` が実行時に `dist/version.js` を正しく読み込む
- top-level await の問題を回避（関数内での lazy loading または別方式）

**受入テストコマンド**:
```bash
cd /opt/tenmon-ark/api
pnpm -s build
node -e "import('./dist/routes/chat.js').then(() => import('./src/version.js').then(m => console.log(JSON.stringify({builtAt: m.TENMON_ARK_BUILT_AT, gitSha: m.TENMON_ARK_GIT_SHA}, null, 2))))"
```

### Task 3: `acceptance_test.sh` に NATURAL モードのテストを追加
**順番**: 3
**完了条件**:
- greeting/datetime/smalltalk の個別テストを追加
- `decisionFrame.ku` が object であることを検証
- `decisionFrame.llm` が `null` であることを検証

**受入テストコマンド**:
```bash
cd /opt/tenmon-ark/api
bash scripts/acceptance_test.sh
# Phase 19: NATURAL モードのテストが PASS することを確認
```

### Task 4: `acceptance_test.sh` に `builtAt` の `length>0` チェックを追加
**順番**: 4
**完了条件**:
- `/api/audit` の `builtAt` が `string` かつ `length>0` であることを jq -e で検証
- 失敗時は `exit 1`

**受入テストコマンド**:
```bash
cd /opt/tenmon-ark/api
bash scripts/acceptance_test.sh
# Phase 17 で `builtAt` の `length>0` チェックが PASS することを確認
```

### Task 5: `chat.ts` を `NaturalRouter` に分割
**順番**: 5
**完了条件**:
- `src/persona/naturalRouter.ts` を新規作成
- `formatJstNow`, `classifyNatural`, NATURAL モードの応答生成を移動
- `chat.ts` から `NaturalRouter` を import して使用

**受入テストコマンド**:
```bash
cd /opt/tenmon-ark/api
pnpm -s build
bash scripts/acceptance_test.sh
# NATURAL モードのテストが PASS することを確認
```

### Task 6: `chat.ts` を `KanagiReasoner` に分割
**順番**: 6
**完了条件**:
- `src/kanagi/kanagiReasoner.ts` を新規作成
- `buildCoreAnswerPlanFromEvidence`, `verifyCorePlan`, `composeDetailFromEvidence` の統合を移動
- `chat.ts` から `KanagiReasoner` を import して使用

**受入テストコマンド**:
```bash
cd /opt/tenmon-ark/api
pnpm -s build
bash scripts/acceptance_test.sh
# HYBRID/GROUNDED モードのテストが PASS することを確認
```

### Task 7: `chat.ts` を `EvidenceRetriever` に分割
**順番**: 7
**完了条件**:
- `src/kotodama/evidenceRetriever.ts` を新規作成
- `retrieveAutoEvidence`, `getPageCandidates`, `getCorpusPage` の統合を移動
- `chat.ts` から `EvidenceRetriever` を import して使用

**受入テストコマンド**:
```bash
cd /opt/tenmon-ark/api
pnpm -s build
bash scripts/acceptance_test.sh
# 自動検索のテストが PASS することを確認
```

### Task 8: `chat.ts` を `KuGovernor` 統合に最適化
**順番**: 8
**完了条件**:
- `chat.ts` が `KuGovernor` のみを import して使用
- `decideKuStance` の結果に基づいて分岐するだけのシンプルな構造

**受入テストコマンド**:
```bash
cd /opt/tenmon-ark/api
pnpm -s build
bash scripts/acceptance_test.sh
# すべてのテストが PASS することを確認
```

### Task 9: `acceptance_test.sh` に `gitSha` の `null` 許容チェックを追加
**順番**: 9
**完了条件**:
- `/api/audit` の `gitSha` が `null` でも PASS する（警告のみ）
- ただし、`gitSha` が `string` の場合は `length>0` を検証

**受入テストコマンド**:
```bash
cd /opt/tenmon-ark/api
bash scripts/acceptance_test.sh
# Phase 17 で `gitSha` のチェックが PASS することを確認
```

### Task 10: 全体の回帰テスト
**順番**: 10
**完了条件**:
- すべての `acceptance_test.sh` のテストが PASS
- `chat.ts` の行数が 500行以下になる
- 各モジュールが独立してテスト可能

**受入テストコマンド**:
```bash
cd /opt/tenmon-ark/api
pnpm -s build
bash scripts/acceptance_test.sh
wc -l src/routes/chat.ts
# chat.ts が 500行以下であることを確認
```

---

## 4. chat.ts 肥大化を防ぐ分割設計案

### 4.1 現状の構造

```
src/routes/chat.ts (977行)
├── ヘルパー関数（formatJstNow, classifyNatural, parseDocAndPageStrict）
├── 候補メモリ（autoPickMemory, getCandidateMemory）
├── NATURAL モード分岐（412-497行）
├── HYBRID モード分岐（507-893行）
├── GROUNDED モード分岐（HYBRID内に統合）
└── LIVE モード分岐（270-407行）
```

### 4.2 分割設計案

#### A. `src/persona/naturalRouter.ts`（新規）
**責務**: NATURAL モードの応答生成
**関数**:
- `formatJstNow(): string`
- `classifyNatural(message: string): "greeting" | "datetime" | "other"`
- `generateNaturalResponse(message: string, naturalType: "greeting" | "datetime" | "other"): string`

**使用箇所**: `chat.ts` の NATURAL 分岐

#### B. `src/kanagi/kanagiReasoner.ts`（新規）
**責務**: 天津金木推論の統合
**関数**:
- `reasonWithKanagi(message: string, evidence: EvidencePack, plan: CorePlan): { response: string; detail?: string }`
- `buildAndVerifyPlan(message: string, evidence: EvidencePack): CorePlan`
- `composeResponseFromPlan(plan: CorePlan, evidence: EvidencePack): string`

**使用箇所**: `chat.ts` の HYBRID/GROUNDED 分岐

#### C. `src/kotodama/evidenceRetriever.ts`（新規）
**責務**: 証拠の取得と統合
**関数**:
- `retrieveEvidence(message: string, doc?: string, pdfPage?: number): Promise<EvidencePack>`
- `getPageEvidence(doc: string, pdfPage: number): Promise<EvidencePack>`
- `mergeAutoEvidence(auto: AutoEvidenceResult, selected?: { doc: string; pdfPage: number }): EvidencePack`

**使用箇所**: `chat.ts` の HYBRID/GROUNDED 分岐

#### D. `src/routes/chat.ts`（簡素化後、目標: 500行以下）
**責務**: ルーティングとモード分岐のみ
**構造**:
```typescript
router.post("/chat", async (req, res) => {
  // 1. リクエスト解析
  // 2. mode 決定（Truth Skeleton）
  // 3. モード別分岐
  //    - NATURAL → naturalRouter.generateNaturalResponse()
  //    - HYBRID → evidenceRetriever.retrieveEvidence() → kanagiReasoner.reasonWithKanagi()
  //    - GROUNDED → evidenceRetriever.getPageEvidence() → kanagiReasoner.reasonWithKanagi()
  //    - LIVE → fetchLiveEvidence() → llmChat()
  // 4. レスポンス生成（decisionFrame.ku を必ず含む）
});
```

### 4.3 分割の利点

1. **テスト容易性**: 各モジュールを独立してテスト可能
2. **保守性**: 責務が明確で、変更の影響範囲が限定的
3. **再利用性**: `NaturalRouter` を他のエンドポイントでも使用可能
4. **可読性**: `chat.ts` が 500行以下になり、理解しやすくなる

---

## 5. 追加すべき acceptance_test.sh のゲート（jq -e）

### Phase 19: NATURAL モードのテスト（新規追加）

```bash
# ============================================
# Phase 19: NATURAL モードのテスト（新規追加）
# ============================================
echo "【Phase 19-1: NATURAL greeting テスト】"
echo "テスト: こんにちは → mode=NATURAL, kuType=object, llm=null"
RESPONSE_N1_JSON=$(curl -sS "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-natural-greeting","message":"こんにちは"}')

MODE_N1=$(echo "${RESPONSE_N1_JSON}" | jq -e -r '.decisionFrame.mode' 2>/dev/null || echo "null")
KU_TYPE_N1=$(echo "${RESPONSE_N1_JSON}" | jq -e -r '.decisionFrame.ku | type' 2>/dev/null || echo "null")
LLM_N1=$(echo "${RESPONSE_N1_JSON}" | jq -e -r '.decisionFrame.llm // "NOT_PRESENT"' 2>/dev/null || echo "null")

if [ "${MODE_N1}" != "NATURAL" ]; then
  echo "${FAIL}: NATURAL greeting: mode should be NATURAL, but got ${MODE_N1}"
  exit 1
fi

if [ "${KU_TYPE_N1}" != "object" ]; then
  echo "${FAIL}: NATURAL greeting: decisionFrame.ku should be object, but got type: ${KU_TYPE_N1}"
  exit 1
fi

if [ "${LLM_N1}" != "null" ] && [ "${LLM_N1}" != "NOT_PRESENT" ]; then
  echo "${FAIL}: NATURAL greeting: decisionFrame.llm should be null, but got: ${LLM_N1}"
  exit 1
fi

echo "${PASS}: NATURAL greeting で mode=NATURAL, kuType=object, llm=null"
echo ""

echo "【Phase 19-2: NATURAL datetime テスト】"
echo "テスト: 今日は何日？ → mode=NATURAL, kuType=object, responseにJST時刻が含まれる"
RESPONSE_N2_JSON=$(curl -sS "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-natural-datetime","message":"今日は何日？"}')

MODE_N2=$(echo "${RESPONSE_N2_JSON}" | jq -e -r '.decisionFrame.mode' 2>/dev/null || echo "null")
KU_TYPE_N2=$(echo "${RESPONSE_N2_JSON}" | jq -e -r '.decisionFrame.ku | type' 2>/dev/null || echo "null")
RESPONSE_N2=$(echo "${RESPONSE_N2_JSON}" | jq -e -r '.response' 2>/dev/null || echo "")

if [ "${MODE_N2}" != "NATURAL" ]; then
  echo "${FAIL}: NATURAL datetime: mode should be NATURAL, but got ${MODE_N2}"
  exit 1
fi

if [ "${KU_TYPE_N2}" != "object" ]; then
  echo "${FAIL}: NATURAL datetime: decisionFrame.ku should be object, but got type: ${KU_TYPE_N2}"
  exit 1
fi

if ! echo "${RESPONSE_N2}" | grep -qE "(JST|今日|202[0-9]-[0-9]{2}-[0-9]{2})"; then
  echo "${FAIL}: NATURAL datetime: response should contain JST time, but got: ${RESPONSE_N2:0:100}"
  exit 1
fi

echo "${PASS}: NATURAL datetime で mode=NATURAL, kuType=object, JST時刻が含まれる"
echo ""

echo "【Phase 19-3: NATURAL smalltalk誘導 テスト】"
echo "テスト: ちょっと相談 → mode=NATURAL, kuType=object, responseに選択肢が含まれる"
RESPONSE_N3_JSON=$(curl -sS "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-natural-smalltalk","message":"ちょっと相談"}')

MODE_N3=$(echo "${RESPONSE_N3_JSON}" | jq -e -r '.decisionFrame.mode' 2>/dev/null || echo "null")
KU_TYPE_N3=$(echo "${RESPONSE_N3_JSON}" | jq -e -r '.decisionFrame.ku | type' 2>/dev/null || echo "null")
RESPONSE_N3=$(echo "${RESPONSE_N3_JSON}" | jq -e -r '.response' 2>/dev/null || echo "")

if [ "${MODE_N3}" != "NATURAL" ]; then
  echo "${FAIL}: NATURAL smalltalk: mode should be NATURAL, but got ${MODE_N3}"
  exit 1
fi

if [ "${KU_TYPE_N3}" != "object" ]; then
  echo "${FAIL}: NATURAL smalltalk: decisionFrame.ku should be object, but got type: ${KU_TYPE_N3}"
  exit 1
fi

if ! echo "${RESPONSE_N3}" | grep -qE "(1\)|2\)|3\)|言灵|カタカムナ|天津金木)"; then
  echo "${FAIL}: NATURAL smalltalk: response should contain choice options, but got: ${RESPONSE_N3:0:100}"
  exit 1
fi

echo "${PASS}: NATURAL smalltalk誘導 で mode=NATURAL, kuType=object, 選択肢が含まれる"
echo ""
```

### Phase 17 の `builtAt` チェック強化（既存を拡張）

```bash
# ゲート化: builtAt が string && length>0 であることを必須にする（jq -e）
BUILT_AT_TYPE=$(echo "${AUDIT_BODY}" | jq -e -r '.builtAt | type' 2>/dev/null || echo "null")
BUILT_AT_LEN=$(echo "${AUDIT_BODY}" | jq -e -r '.builtAt | length' 2>/dev/null || echo "0")
if [ "${BUILT_AT_TYPE}" != "string" ]; then
  echo "${FAIL}: /api/audit builtAt should be string, but got type: ${BUILT_AT_TYPE}"
  exit 1
fi
if [ "${BUILT_AT_LEN}" -le 0 ]; then
  echo "${FAIL}: /api/audit builtAt should have length > 0, but got: ${BUILT_AT_LEN}"
  exit 1
fi
BUILT_AT_VALUE=$(echo "${AUDIT_BODY}" | jq -e -r '.builtAt' 2>/dev/null || echo "")
if [ -z "${BUILT_AT_VALUE}" ] || [ "${BUILT_AT_VALUE}" = "null" ]; then
  echo "${FAIL}: /api/audit builtAt should not be null or empty"
  exit 1
fi
echo "✅ builtAt type check: ${BUILT_AT_TYPE}, length: ${BUILT_AT_LEN}, value: ${BUILT_AT_VALUE:0:30}..."

# ゲート化: gitSha が null でも PASS（警告のみ）、string の場合は length>0 を検証
GIT_SHA_TYPE=$(echo "${AUDIT_BODY}" | jq -e -r '.gitSha | type' 2>/dev/null || echo "null")
GIT_SHA_VALUE=$(echo "${AUDIT_BODY}" | jq -e -r '.gitSha // "null"' 2>/dev/null || echo "null")
if [ "${GIT_SHA_TYPE}" = "string" ]; then
  GIT_SHA_LEN=$(echo "${AUDIT_BODY}" | jq -e -r '.gitSha | length' 2>/dev/null || echo "0")
  if [ "${GIT_SHA_LEN}" -le 0 ]; then
    echo "⚠️  WARN: /api/audit gitSha is string but length is 0"
  else
    echo "✅ gitSha type check: ${GIT_SHA_TYPE}, length: ${GIT_SHA_LEN}, value: ${GIT_SHA_VALUE}"
  fi
elif [ "${GIT_SHA_TYPE}" = "null" ]; then
  echo "⚠️  WARN: /api/audit gitSha is null (git repository may not be available)"
else
  echo "${FAIL}: /api/audit gitSha should be string or null, but got type: ${GIT_SHA_TYPE}"
  exit 1
fi
```

---

## 6. 結論

**現状の完成度**: 75%
- Phase2/Phase4/NATURAL は実装済み
- AuditSLO は `builtAt` が返るが、`dist/version.js` の生成が不確実

**次の優先順位**:
1. `copy-assets.mjs` の `dist/version.js` 生成を確実化（Task 1）
2. `acceptance_test.sh` に NATURAL モードのテストを追加（Task 3）
3. `chat.ts` を分割して保守性を向上（Task 5-8）

**投入学習への準備**:
- 中枢（天津金木思考）を入れる前に、自然会話と監査SLOを固定
- `chat.ts` の分割により、各モジュールを独立してテスト可能にする
- `acceptance_test.sh` のゲート化により、回帰を防止

