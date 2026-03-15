# 本番適用カード仕様: answerLength / answerMode / answerFrame 導入

**設計承認**: ANSWER_LENGTH_MODE_FRAME_DESIGN.md に基づく。  
**方針**: 最小 diff、3 ファイル以内、既存ルートは壊さない。コードは本カードでは書かず、仕様のみ整理する。

---

# 1. カード名

**CARD_ANSWER_PROFILE_V1** — 応答長・モード・枠の裁定レイヤー導入（answerLength / answerMode / answerFrame）

---

# 2. 変更ファイル

| 順 | ファイル | 役割 |
|----|----------|------|
| 1 | api/src/planning/responsePlanCore.ts | 型定義の追加、buildResponsePlan の入出力拡張（answerMode / answerFrame） |
| 2 | api/src/engines/persona/tenmonCoreEngine.ts | enforceTenmonPersona の第 2 引数 options.maxLength の追加 |
| 3 | api/src/routes/chat.ts | パラメータ取得・既定値補完・各所への受け渡し、decisionFrame.ku への記録 |

**触らないファイル**: 根拠束（Notion/KOKUZO/threadCenter/thoughtGuide/personaConstitution）の取得・組み立て、gates_impl、safeGeneralRoute、既存の routeReason 分岐ロジックの変更は行わない。

---

# 3. 変更内容要約

## 3.1 responsePlanCore.ts

- **型**: AnswerLength / AnswerMode / AnswerFrame / AnswerProfile を定義（同一ファイル先頭または型のみ別 export）。
- **buildResponsePlan**: 入力に `answerMode?: AnswerMode | null`, `answerFrame?: AnswerFrame | null` を追加。ResponsePlan に `answerFrame?: AnswerFrame | null` を追加。渡されたらそのまま plan に載せ、既存の responseKind / mode の既定値ロジックは変更しない（後方互換）。

## 3.2 tenmonCoreEngine.ts

- **enforceTenmonPersona**: シグネチャを `(text: string, options?: { maxLength?: number | null }) => string` に拡張。`options?.maxLength` が数値のときのみその値を上限に slice。未指定時は現行どおり 350。既存の呼び出し（引数 1 つ）はそのまま動作する。

## 3.3 chat.ts

- **取得**: POST ハンドラの早い段階で req.body から `answerLength` / `answerMode` / `answerFrame` を取得。有効値以外は null 扱い。
- **補完**: answerMode 既定値表（support→short+one_step/statement_plus_one_question, define→medium+statement_plus_one_question, analysis→medium+statement_plus_one_question（long 時のみ d_delta_s_one_step 許容）, worldview→medium+statement_plus_one_question, continuity→short+one_step）に従い、未指定の answerLength / answerFrame を補う。**long でないときに answerFrame が d_delta_s_one_step の場合は、既定値表に従って statement_plus_one_question に落とす**（long 時のみ d_delta_s_one_step を有効化）。
- **渡す**: (1) 既存の buildResponsePlan 呼び出しに answerMode / answerFrame を渡す。(2) GEN_SYSTEM / __GEN_SYSTEM_CLEAN 等の system 組み立て直前に、answerLength / answerFrame に応じた 1 文を追加（getLengthInstruction / getFrameInstruction 相当）。(3) enforceTenmonPersona 呼び出しに `{ maxLength }` を渡す（answerLength から short=180, medium=350, long=600 等で算出、未指定は 350）。
- **記録**: 返却する decisionFrame.ku に `answerLength` / `answerMode` / `answerFrame` をそのまま記録する。既存の ku のキーは変更しない（追加のみ）。

---

# 4. Acceptance

- [ ] **A1** req.body に `answerLength: "short"` を渡したとき、応答が短め（目安 80〜180 字）に収まり、enforceTenmonPersona の maxLength が 180 で効いている（またはプロンプト指示で短く返る）。
- [ ] **A2** req.body に `answerMode: "define"` を渡したとき、answerLength 未指定なら medium、answerFrame 未指定なら statement_plus_one_question が使われる。
- [ ] **A3** req.body に `answerLength: "long"` かつ `answerFrame: "d_delta_s_one_step"` を渡したとき、長文かつ「D/ΔS骨格 → 裁定 → ONE_STEP」の指示が system に含まれ、maxLength が 600（または指定値）で効く。
- [ ] **A4** answerLength が long でないときに `answerFrame: "d_delta_s_one_step"` が渡されても、内部で statement_plus_one_question に落ち、d_delta_s_one_step は使われない。
- [ ] **A5** いずれの変更後も、既存のルート（scripture / katakamuna / general / TRUTH_GATE 等）で、body に answerLength/answerMode/answerFrame を渡さない場合は **現行と同様の応答** になる（後方互換）。
- [ ] **A6** 返却 JSON の `decisionFrame.ku` に `answerLength` / `answerMode` / `answerFrame` が含まれる（body で渡した値または補完後の値）。

---

# 5. Rollback

- **コード**: 本カードで追加した変更のみを revert する（3 ファイルの該当 diff を元に戻す）。
- **データ**: 本カードでは DB スキーマや永続データの変更は行わない。rollback 時にデータの整合性作業は不要。
- **手順**: (1) chat.ts の answerProfile 取得・補完・buildResponsePlan/system/enforceTenmonPersona への渡しと ku 記録を削除。(2) responsePlanCore の型・buildResponsePlan の引数と ResponsePlan.answerFrame を削除。(3) tenmonCoreEngine の enforceTenmonPersona の第 2 引数を削除し、350 固定に戻す。その後、既存の E2E / 受入テストで応答が現行どおりであることを確認する。

---

# 6. リスク

| リスク | 内容 | 対策 |
|--------|------|------|
| **既存ルートの挙動変化** | answerProfile の補完や system への 1 文追加が、body 未指定時にも影響し、応答が変わる可能性がある。 | body 未指定時は「既定値表を適用しない」または「answerMode を推論しない」で、現行のプロンプト・350 字制限をそのまま使う。answerLength/answerMode/answerFrame がすべて未指定なら、変更前と同じ文字列を LLM と enforceTenmonPersona に渡す。 |
| **型の重複** | AnswerLength 等を responsePlanCore と chat の両方で参照するため、型定義の置き場所を誤ると import の循環や重複が起きる。 | 型は responsePlanCore.ts にのみ定義し、chat.ts はそこから import する。必要なら後から types/answerProfile.ts に切り出し可能。 |
| **long + d_delta_s_one_step の品質** | 長文かつ D/ΔS 骨格指示を初めて有効にした場合、LLM が指示に従わない・冗長になる可能性がある。 | 初回はプロンプト 1 文追加のみとし、骨格テンプレートや後処理は別カードで拡張する。本カードでは「指示を渡す」「maxLength を緩める」までに留める。 |
| **enforceTenmonPersona の呼び出し漏れ** | chat.ts 内で enforceTenmonPersona を呼んでいる箇所が複数あり、maxLength を渡し忘れると long 指定が効かない。 | 本カード実装時に、enforceTenmonPersona の呼び出しを grep で洗い出し、すべてに options を渡す。未渡しの場合は 350 のままなので既存挙動は維持される。 |

---

# 7. 実装順

1. **responsePlanCore.ts**: 型（AnswerLength / AnswerMode / AnswerFrame / AnswerProfile）の定義。buildResponsePlan の入力に answerMode / answerFrame を追加、ResponsePlan に answerFrame を追加。既存の responseKind 既定はそのまま。
2. **tenmonCoreEngine.ts**: enforceTenmonPersona に第 2 引数 `options?: { maxLength?: number | null }` を追加。長さ制限部分のみ `(options?.maxLength ?? 350)` に変更。既存の 1 引数呼び出しはそのまま動作することを確認。
3. **chat.ts**: (a) ハンドラ冒頭で body から answerLength / answerMode / answerFrame を取得し、既定値表で補完（long 以外では d_delta_s_one_step を statement_plus_one_question に落とす）。(b) buildResponsePlan 呼び出しに answerMode / answerFrame を渡す。(c) system 組み立て直前に getLengthInstruction / getFrameInstruction を 1 文追加。(d) enforceTenmonPersona 呼び出しに maxLength を渡す。(e) 返却直前の decisionFrame.ku に answerLength / answerMode / answerFrame をセット。
4. **受入**: A1〜A6 を確認。body 未指定で既存ルートが現行どおりであることを確認。
5. **本番反映**: デプロイ後、必要に応じてモニタリングで ku の 3 項目を確認。

---

**以上。コードは本カードでは書かず、仕様のみとする。**
