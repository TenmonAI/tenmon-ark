# 会話品質監査レポート（CONVO_AUDIT_REPORT）

## 目的
HYBRID（Kanagi）応答がログっぽくて不自然（正中/内集/凝縮/未解…が生のまま出る）問題を調査する。

---

## 1. responseComposer.ts が生成する文字列

### 1.1 ログ語彙が入る箇所

| 関数 | 行番号 | 生成される文字列 | ログ語彙 |
|---|---|---|---|
| `getFormTemplate` | 17 | "凝縮・内集・一点化" | 凝縮、内集 |
| `getFormTemplate` | 23 | "正中・保留・圧縮" | 正中、圧縮 |
| `getPhaseNote` | 39 | "正中" | 正中 |
| `composeResponse` | 89 | "未解決：" | 未解決 |
| `composeResponse` | 97 | "矛盾（保持中）：" | 矛盾（保持中） |

### 1.2 生成フロー

```
composeResponse(trace, personaState)
  ↓
getFormTemplate(trace.form) → "凝縮・内集・一点化" など
  ↓
getPhaseNote(trace.phase) → "（正中）" など
  ↓
baseObservation + formNote + phaseNote → "観測中 凝縮・内集・一点化（正中）"
  ↓
未解決があれば "未解決：" を追加
  ↓
矛盾があれば "矛盾（保持中）：" を追加
  ↓
adjustToneByPersona で語り口調整
  ↓
返却
```

---

## 2. chat.ts での呼び出し経路

### 2.1 呼び出し箇所

| 行番号 | コンテキスト | 使用箇所 |
|---|---|---|
| 833 | HYBRIDモード（通常処理） | `const baseText = String(composeConversationalResponse(trace, personaState, sanitized.text) ?? "");` |
| 922 | finalResponse の初期値 | `let finalResponse = arkResponse || baseText;` |

### 2.2 返却経路

```
chat.ts:833
  composeResponse(trace, personaState)
    ↓
baseText = "観測中 凝縮・内集・一点化（正中）\n\n未解決：\n- ..."
    ↓
chat.ts:922
  finalResponse = arkResponse || baseText
    ↓
chat.ts:1031
  surfaceize(finalResponse, sanitized.text)  # ENABLE_LLM_SURFACE=1 のときのみ
    ↓
chat.ts:1096
  conversationalFallback(finalText, sanitized.text)  # 観測ログ風なら補正
    ↓
chat.ts:1103
  return res.json({ response: finalText, ... })
```

### 2.3 問題点

1. **ログ語彙がそのまま返される**: `composeResponse` が生成したログ語彙が `finalResponse` にそのまま入る
2. **補正が不十分**: `conversationalFallback` は `isGreetingLike` のときのみ動作
3. **相談系の入力でログ語彙が出る**: 通常の相談でもログ語彙が表に出る

---

## 3. ログ語彙の出現頻度（相談/雑談/質問）

### 3.1 禁止語彙トップ20

| 語彙 | 出現箇所 | 頻度 |
|---|---|---|
| 正中 | `responseComposer.ts:23,39`, `fusionReasoner.ts:240` | 高 |
| 内集 | `responseComposer.ts:17`, `fusionReasoner.ts:245` | 高 |
| 外発 | `fusionReasoner.ts:250` | 高 |
| 凝縮 | `responseComposer.ts:17`, `fusionReasoner.ts:245` | 高 |
| 圧縮 | `responseComposer.ts:23`, `fusionReasoner.ts:240` | 高 |
| 未解決 | `responseComposer.ts:89,107` | 高 |
| 発酵中 | `fusionReasoner.ts:67,69,70` | 中 |
| 矛盾（保持中） | `responseComposer.ts:97` | 中 |
| 観測中 | `responseComposer.ts:25,76` | 中 |
| 貫通 | `responseComposer.ts:19` | 低 |
| 循環 | `responseComposer.ts:21` | 低 |
| 拮抗 | `responseComposer.ts:21` | 低 |
| 保留 | `responseComposer.ts:23` | 低 |
| 一点化 | `responseComposer.ts:17` | 低 |
| 昇 | `responseComposer.ts:35` | 低 |
| 降 | `responseComposer.ts:36` | 低 |
| 開 | `responseComposer.ts:37` | 低 |
| 閉 | `responseComposer.ts:38` | 低 |
| 発酵 | `fusionReasoner.ts:67,69,70` | 低 |
| 未解放エネルギー | `fusionReasoner.ts:70` | 低 |

### 3.2 相談系入力での出現例

**入力**: "不安で動けない"
**出力**: "観測中 正中・保留・圧縮（正中）\n\n未解決：\n- ..."

**入力**: "やることが多すぎる"
**出力**: "観測中 凝縮・内集・一点化\n\n未解決：\n- ..."

**入力**: "どうすればいい？"
**出力**: "観測中 外発・貫通・方向性\n\n未解決：\n- ..."

---

## 4. 改善方針

### 4.1 最小diff修正

1. **`composeConversationalResponse` を追加**: ログ語彙を自然文に置換
2. **chat.ts で置き換え**: `composeResponse` の代わりに `composeConversationalResponse` を使用
3. **末尾に質問を追加**: 必ず「次の一手」を1問で終える

### 4.2 禁止語彙の置換表

| ログ語彙 | 自然文への置換 |
|---|---|
| 正中・保留・圧縮 | いまは答えをまとめている途中です |
| 凝縮・内集・一点化 | いまは一点に集中している状態です |
| 外発・貫通・方向性 | いまは行動に向かっている状態です |
| 未解決 | （削除 or "まだ決まっていない点"） |
| 矛盾（保持中） | （削除 or "異なる見方があります"） |
| 観測中 | （削除 or "考えています"） |

---

## 5. 合格条件チェック

### 5.1 相談系の入力で「ログ用語」が表に出ない

**現状**: ❌ ログ用語がそのまま出る
**改善後**: ✅ 自然文に置換される

### 5.2 返答が自然な日本語で「1つ質問で終わる」

**現状**: ❌ ログ語彙で終わる
**改善後**: ✅ 質問で終わる（例：「いま一番困ってるのは何？」）

### 5.3 根拠の捏造なし（doc/pdfPageはGROUNDEDのみ）

**現状**: ✅ 根拠の捏造なし
**改善後**: ✅ 維持

---

生成日: 2025-01-XX
作成者: Cursor AI Agent
