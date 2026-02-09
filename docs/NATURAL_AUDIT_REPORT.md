# NATURAL モード現状レポート

## 目的
NATURAL モードがどこでメニューに吸われ、どこで会話が途切れているかを「分岐表」で整理する。

---

## 1. chat.ts の return res.json 経路全列挙

### 分岐表

| 条件（ifの式） | decisionFrame.mode | 返すresponseの性質 | 行番号 |
|---|---|---|---|
| `!message` | NATURAL | エラー: "message required" | 374 |
| `wantsPassphraseRecall(trimmed)` | NATURAL | 合言葉リコール（決定論） | 416-428 |
| `extractPassphrase(trimmed)` | NATURAL | 合言葉登録（決定論） | 432-443 |
| `isLowSignalPing` | NATURAL | フォールバック: "お手伝いできることはありますか？" | 461-470 |
| `isLowSignal(trimmed) && !isGreetingLike(trimmed)` | NATURAL | フォールバック: "お手伝いできることはありますか？" | 474-482 |
| `pending === "LANE_PICK" && lane === "LANE_1"` | HYBRID | 言灵/カタカムナ質問の検索結果 | 486-524 |
| `numberMatch` (番号選択) | GROUNDED | 候補選択後の資料準拠回答 | 532-547 |
| `trimmed.startsWith("#talk") && !enabled` | NATURAL | "#talk は現在OFFです" | 555-563 |
| `trimmed.startsWith("#talk") && !q` | NATURAL | 使い方説明 | 565-573 |
| `trimmed.startsWith("#talk") && enabled` | HYBRID | LLM応答（provisional=true） | 636-646 |
| `trimmed === "#menu" && isGreetingLike(message)` | NATURAL | メニュー誘導 | 650-665 |
| `trimmed.startsWith("#status")` | NATURAL | KOKUZO状態表示 | 668-680 |
| `trimmed.startsWith("#search ")` | HYBRID | 検索結果（候補あり/なし） | 682-715 |
| `trimmed.startsWith("#pin ")` | GROUNDED | 資料準拠回答（#詳細付き） | 717-737 |
| `isNaturalCommand` (hello/date/help/おはよう) | NATURAL | naturalRouter の応答 | 743-752 |
| `isJapanese && !wantsDetail && !hasDocPage && nat.handled && nat.responseText.includes("どの方向で話しますか") && isGreetingLike(message)` | NATURAL | メニュー誘導 | 762-773 |
| `mPage && groundedDoc` (doc/pdfPage指定) | GROUNDED | 資料準拠回答 | 785-812 |
| `!sanitized.isValid` | NATURAL | エラー: sanitized.error | 826-832 |
| `isDomainQuestion && isJapanese && !wantsDetail && !hasDocPage` (ドメイン質問) | HYBRID | 検索結果ベースの回答（候補あり/なし） | 914-946 |
| 通常処理（Kanagi経由） | HYBRID | Kanagi応答 + candidates | 1096-1105 |
| `catch (error)` | HYBRID | エラーフォールバック | 1114-1121 |

### ストレス系相談の早期return（DET_NATURAL_STRESS_V1）

| 条件 | decisionFrame.mode | 返すresponseの性質 | 行番号 |
|---|---|---|---|
| `isStressLike && /不安|こわい|.../` | NATURAL | "いま一番しんどいのは 体力 ？ 気持ち ？" | 386-394 |
| `isStressLike && /やることが多すぎ|.../` | NATURAL | "いま 締切がある？ ない？" | 396-404 |

---

## 2. naturalRouter.ts の handled条件と返す文面パターン

### 分類表

| 条件 | handled | responseText | 行番号 |
|---|---|---|---|
| `typ === "greeting"` | true | "おはようございます。天聞アークです。" / "Hello. How can I help you today?" | 70-75 |
| `typ === "datetime"` | true | "現在時刻（JST）: YYYY-MM-DD HH:MI" | 77-83 |
| `isDomainQuestion` (言灵/カタカムナ等) | **false** | "" (空文字で通常処理へフォールスルー) | 97-103 |
| `isAnxietyLike` (不安/こわい/動けない等) | true | "いま一番しんどいのは 体力 ？ 気持ち ？\n\n番号でOK / 1行でもOK" | 106-111 |
| `isOverwhelmedLike` (やることが多すぎ等) | true | "いま 締切がある？ ない？\n\n番号でOK / 1行でもOK" | 114-119 |
| `isExplicitMenu` (#menu または「メニュー」) | true | "了解。どの方向で話しますか？\n1) 言灵/カタカムナ/天津金木の質問\n2) 資料指定（doc/pdfPage）で厳密回答\n3) いまの状況整理（何を作りたいか）" | 122-131 |
| `ja && それ以外` | false | "" (通常処理へフォールスルー) | 134-137 |
| `!ja` (非日本語) | true | 英語メニュー | 140-147 |

### 発火条件の整理

#### "短文相談（不安/過多/迷い）"
- **不安系**: `/不安|こわい|怖い|動けない|しんどい|つらい|辛い|無理|焦る|焦って|詰んだ/i`
  - `naturalRouter.ts:106-111` で `handled=true` を返す
  - `chat.ts:386-394` でも早期return（二重チェック）
- **過多系**: `/やることが多すぎ|やること.*多すぎ|多すぎる|終わらない|溜まって|詰んで|パンク|忙し/i`
  - `naturalRouter.ts:114-119` で `handled=true` を返す
  - `chat.ts:396-404` でも早期return（二重チェック）

#### "挨拶"
- **日本語**: `/(\u304a\u306f\u3088\u3046|\u3053\u3093\u306b\u3061\u306f|\u3053\u3093\u3070\u3093\u306f|\u306f\u3058\u3081\u307e\u3057\u3066|\u3088\u308d\u3057\u304f)/`
- **英語**: `/^(hello|hi|hey|good\s+(morning|afternoon|evening)|greetings)\b/`
- `naturalRouter.ts:70-75` で `handled=true` を返す

#### "メニュー誘導"
- **明示的**: `#menu` または「メニュー」のみ
- `naturalRouter.ts:122-131` で `handled=true` を返す
- `chat.ts:650-665` でも `#menu` を処理（`isGreetingLike` のときのみ `LANE_PICK` を設定）

---

## 3. kokuzo連携（searchPagesForHybrid, getPageText）の使用状況

### NATURALモードでの使用状況

| 関数 | NATURALモードでの使用 | 使用箇所 |
|---|---|---|
| `searchPagesForHybrid` | **使用されていない** | NATURALモードでは一切呼ばれない |
| `getPageText` | **使用されていない** | NATURALモードでは一切呼ばれない |

### 使用されている箇所

| 関数 | 使用箇所 | モード |
|---|---|---|
| `searchPagesForHybrid` | `chat.ts:492` (LANE_1選択時) | HYBRID |
| `searchPagesForHybrid` | `chat.ts:693` (#search コマンド) | HYBRID |
| `searchPagesForHybrid` | `chat.ts:900` (通常処理・ドメイン質問) | HYBRID |
| `getPageText` | `chat.ts:145` (buildGroundedResponse) | GROUNDED |
| `getPageText` | `chat.ts:498` (LANE_1選択時) | HYBRID |
| `getPageText` | `chat.ts:917` (ドメイン質問) | HYBRID |
| `getPageText` | `chat.ts:1013` (#詳細時) | HYBRID |

### 結論

**NATURALモードでは kokuzo連携が一切使われていない。**

- NATURALモードは決定論テンプレートのみ（挨拶、日時、メニュー、ストレス相談）
- ドメイン質問は `naturalRouter.ts` で `handled=false` となり、通常処理（HYBRID）へフォールスルー
- HYBRIDモードで `searchPagesForHybrid` が呼ばれる

---

## 4. 「自然会話に知恵を織り込める入口」の提案

### 現状の問題点

1. **短文相談がメニューに吸われる**
   - 不安/過多系はテンプレートで返すが、**質問で終わっていない**（「番号でOK / 1行でもOK」は曖昧）
   - メニュー誘導に吸われやすい

2. **kokuzoの知恵がNATURALに届かない**
   - NATURALモードでは `searchPagesForHybrid` が呼ばれない
   - 短文相談でも「参考の視点」を織り込めない

3. **断言禁止ルールがない**
   - NATURALモードでも根拠なしで断言する可能性がある

### 提案：NATURALでのkokuzo統合（最小diff）

#### 方針1: 短文相談でもkokuzoを参照（optional）

```typescript
// naturalRouter.ts に追加
export async function routeNaturalConversation(
  message: string,
  threadId: string
): Promise<{ handled: boolean; responseText: string }> {
  // 短文相談判定
  const isAnxietyLike = /不安|こわい|.../i.test(message);
  const isOverwhelmedLike = /やることが多すぎ|.../i.test(message);
  
  if (isAnxietyLike || isOverwhelmedLike) {
    // kokuzo検索（optional、候補があれば1行だけ混ぜる）
    const candidates = searchPagesForHybrid(null, message, 3);
    let snippet = "";
    if (candidates.length > 0) {
      const top = candidates[0];
      snippet = `\n\n参考: ${top.snippet.slice(0, 100)}...`;
    }
    
    // 質問で終わる（断言禁止）
    const question = isAnxietyLike
      ? "いま一番しんどいのは 体力 ？ 気持ち ？"
      : "いま 締切がある？ ない？";
    
    return {
      handled: true,
      responseText: `${question}${snippet}\n\n次の1手を教えてください。`,
    };
  }
  
  // その他...
}
```

#### 方針2: 短文一般でもkokuzoを参照

```typescript
// 「今日は何をすればいい？」等の短文一般
const isShortGeneral = message.length < 30 && /何|どう|いつ|どこ/i.test(message);
if (isShortGeneral) {
  const candidates = searchPagesForHybrid(null, message, 3);
  // 候補があれば1行だけ混ぜる
  // 最後は必ず質問で終わる
}
```

#### 方針3: 断言禁止ルールの明文化

- NATURALモードでは根拠（evidence/doc/pdfPage）がない限り断言禁止
- 「〜です」「〜だ」ではなく「〜かもしれません」「〜の可能性があります」または質問形式

---

## 5. 改善優先度

### P1（必須）
- [ ] 短文相談を**必ず質問で終わらせる**（「次の1手を教えてください」等）
- [ ] NATURALでも `searchPagesForHybrid` を呼び、候補があれば1行だけ混ぜる（optional）
- [ ] 断言禁止ルールを明文化（`NATURAL_POLICY.md`）

### P2（推奨）
- [ ] 短文一般（「今日は何をすればいい？」）でもkokuzo参照
- [ ] メニュー誘導の条件を厳格化（挨拶以外では出さない）

### P3（将来）
- [ ] LLM統合（ENABLE_TALK_LLM=1 のときのみ）
- [ ] 会話履歴からの文脈理解

---

## 6. まとめ

### 現状
- NATURALモードは決定論テンプレートのみ
- kokuzo連携は一切なし
- 短文相談は質問で終わっていない（メニューに吸われやすい）

### 改善方向
- NATURALでもkokuzoを参照（optional、候補があれば1行だけ）
- 短文相談は必ず質問で終わる
- 断言禁止ルールを明文化

---

生成日: 2025-01-XX
作成者: Cursor AI Agent
