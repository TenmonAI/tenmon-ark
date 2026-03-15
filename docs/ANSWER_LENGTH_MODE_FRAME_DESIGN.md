# answerLength / answerMode / answerFrame 最小 diff 導入 設計案（修正はまだ行わない）

**前提**: 根拠束は既存のまま活かす。前面人格は軽く、裏方根拠は重く。support / define / analysis / worldview / continuity で応答長と構成を変える。長文時は D/ΔS骨格 → 裁定 → ONE_STEP の構造を候補にする。

---

# 1. answerLength / answerMode / answerFrame の型案

## 1.1 answerLength

```ts
/** 応答の長さ指定。プロンプト指示と事後 maxLength の両方に効かせる。 */
export type AnswerLength = "short" | "medium" | "long";
```

| 値 | 目安字数（案） | 用途 |
|----|----------------|------|
| short | 80〜180 字 | 一点に絞る・継続・挨拶・確認 |
| medium | 140〜260 字 | 定義・説明・相談の一手 |
| long | 260〜600 字（上限は maxLength で可変） | 分析・骨格（D/ΔS）→ 裁定 → ONE_STEP |

## 1.2 answerMode

```ts
/** 応答のモード。support / define / analysis / worldview / continuity で既定の長さ・枠を変える。 */
export type AnswerMode = "support" | "define" | "analysis" | "worldview" | "continuity";
```

- 既存の `mode: "greeting" | "canon" | "general"` とは別軸。**意図・相談種別**に近い。
- req.body や thread から取る。未指定時は routeReason 等から **推論** して既定値にする（後述の表を参照）。

## 1.3 answerFrame

```ts
/** 応答の構成枠。質問の有無と長文時の骨格を指定。 */
export type AnswerFrame =
  | "one_step"                    // 言い切り or 一手のみ。質問なし or 0〜1
  | "statement_plus_one_question" // 受け止め＋質問1つ（現行の多く）
  | "d_delta_s_one_step";         // 長文用: D/ΔS骨格 → 裁定 → ONE_STEP（質問は1つまで）
```

- `one_step`: 短文・継続向け。「2〜4文、80〜180文字」「質問は任意（0〜1）」に相当。
- `statement_plus_one_question`: 現行の「2〜4行、140〜260字」「質問は1つ」に相当。
- `d_delta_s_one_step`: 長文時のみ選択可能。プロンプトで「まず D/ΔS の骨格を簡潔に → 裁定（一点）→ 次の一手 or 一問」と指示する。

## 1.4 まとめ型（chat で渡す用）

```ts
/** 応答の長さ・モード・枠。未指定の場合は answerMode から既定値を補う。 */
export type AnswerProfile = {
  answerLength?: AnswerLength | null;
  answerMode?: AnswerMode | null;
  answerFrame?: AnswerFrame | null;
};
```

- `chat.ts` では、req.body の `answerLength` / `answerMode` / `answerFrame` を正規化したうえで、**answerMode 既定値表** で欠けているものを補い、`AnswerProfile` として保持してから buildResponsePlan / system 組み立て / enforceTenmonPersona に渡す。

---

# 2. chat.ts での最小差し込み位置

## 2.1 パラメータ取得（1 箇所）

- **位置**: `router.post("/chat", async (req, res) => { ... })` の、**HEART 観測の直後** など、既存の `message` / `threadId` を読んでいるブロックのすぐ後。
- **処理**:
  - `const body = (req.body || {}) as any;`
  - `answerLength = body.answerLength ?? null`（有効値以外は null）
  - `answerMode = body.answerMode ?? null`
  - `answerFrame = body.answerFrame ?? null`
  - 必要なら **routeReason や message から answerMode を推論** するヘルパを 1 つ用意し、`answerMode ?? inferAnswerMode(routeReason, message)` で補う。
  - **answerMode 既定値表**（下記 §5）で `answerLength` / `answerFrame` が未指定のときだけ上書きし、**AnswerProfile** を 1 オブジェクトにまとめる。
- **渡し方**: このオブジェクトを **ハンドラ内で参照できるスコープ**（例: クロージャでキャプチャされた `answerProfile`）に置き、以下で参照する。

## 2.2 buildResponsePlan に渡す

- **位置**: 既存の `buildResponsePlan({ ... })` を呼んでいる **すべての箇所**（例: 4257, 5614, 7749 行付近）。
- **変更**: 引数に `answerMode?: AnswerMode | null`, `answerFrame?: AnswerFrame | null` を追加。既存の `mode` / `responseKind` は、**answerFrame が渡されていれば** それに合わせて解釈する（responsePlanCore 側で対応）。渡されていなければ現行どおり。

## 2.3 system プロンプト組み立てに渡す

- **位置**: `GEN_SYSTEM` / `__GEN_SYSTEM_CLEAN` / TRUTH_STYLE 等の **system 文字列を組み立てている直前**。
- **変更**: `answerProfile` から `answerLength` / `answerFrame` を渡し、**1 文だけ追加**するヘルパを用意する。
  - 例: `getLengthInstruction(answerLength): string` → "応答は 80〜180 字、2〜4 文で。" など。
  - 例: `getFrameInstruction(answerFrame): string` → "質問は 1 つだけ。" / "質問は 0 または 1 つ。" / "構成: まず D/ΔS の骨格を簡潔に → 裁定（一点）→ 次の一手 or 一問。" など。
  - 既存の GEN_SYSTEM 等の **末尾に `\n` + 上記** を連結するだけにし、既存文字列の編集は最小にする。

## 2.4 enforceTenmonPersona に渡す

- **位置**: `enforceTenmonPersona(payload.response)` を呼んでいる箇所（現状は引数 1 つのみ）。
- **変更**: 第 2 引数で `options?: { maxLength?: number | null }` を渡す。`answerProfile.answerLength` に応じて chat.ts 側で maxLength を決め（short: 180, medium: 350, long: 600 など）、`enforceTenmonPersona(text, { maxLength })` とする。未指定の場合は **現行どおり 350**。

## 2.5 __ku への記録（任意・observability）

- **位置**: `decisionFrame.ku` を組み立てている箇所で、既存の `routeReason` 等の隣に、`answerLength` / `answerMode` / `answerFrame` をそのまま載せてもよい。返却契約を変えずにデバッグ用として。

---

# 3. responsePlanCore への最小追加案

## 3.1 型の追加

- **ResponsePlan** に optional で追加:
  - `answerFrame?: AnswerFrame | null;`
- 既存の `responseKind` は維持。`answerFrame` が渡されたときは、**responseKind の解釈を answerFrame に合わせる**（後述）。

## 3.2 buildResponsePlan の入力に追加

- 引数に `answerMode?: AnswerMode | null`, `answerFrame?: AnswerFrame | null` を追加。
- **既定値の決め方**:
  - `answerFrame` が渡されていれば、それをそのまま `ResponsePlan.answerFrame` にセット。
  - 渡されていなければ、既存どおり `responseKind` から構成を決める（変更なし）。
- **responseKind との対応**（互換性のため）:
  - `answerFrame === "one_step"` → responseKind は `"statement"` を推奨（質問なしに近い）。
  - `answerFrame === "statement_plus_one_question"` → `"statement_plus_question"`。
  - `answerFrame === "d_delta_s_one_step"` → `"statement_plus_question"` または新規 `"instruction"` 的扱い（長文骨格用）。

## 3.3 戻り値

- `ResponsePlan` の `answerFrame` に上記を入れて返す。chat.ts の system 組み立てでは、**buildResponsePlan の戻り値の answerFrame** を参照して getFrameInstruction に渡してもよい（body 由来と plan 由来を揃えるなら、chat で answerProfile を優先してよい）。

---

# 4. tenmonCoreEngine の maxLength 可変化案

## 4.1 シグネチャ案

```ts
// 現行
export function enforceTenmonPersona(text: string): string;

// 案（後方互換）
export function enforceTenmonPersona(
  text: string,
  options?: { maxLength?: number | null }
): string;
```

- `options?.maxLength` が **数値** のときだけ、その値を上限に `t.slice(0, maxLength)` する。
- `null` / `undefined` / 未渡しのときは **現行どおり 350** とする。

## 4.2 挙動

- 一般論除去・語尾・プレフィックスは **変更しない**。
- 変更するのは「長さ制限」の 1 箇所のみ: `if (t.length > (options?.maxLength ?? 350)) { t = t.slice(0, options!.maxLength ?? 350); }` のような形。

---

# 5. support / define / analysis / worldview / continuity ごとの既定値表

| answerMode | answerLength（既定） | answerFrame（既定） | 備考 |
|------------|----------------------|----------------------|------|
| support | short | one_step または statement_plus_one_question | 相談・一点に整える。短文で一手 or 一問。 |
| define | medium | statement_plus_one_question | 定義・説明。140〜260字、質問1つ。 |
| analysis | medium（long は明示時のみ） | statement_plus_one_question（long 時は d_delta_s_one_step を許容） | 分析は中〜長。長文時は D/ΔS 骨格候補。 |
| worldview | medium | statement_plus_one_question | 世界観・理由の説明。中位で一問。 |
| continuity | short | one_step | 継続・フォロー。短文で一手に寄せる。 |

- **上書きルール**: req.body で `answerLength` / `answerFrame` が明示されていれば、表の既定値より **body を優先** する。
- **推論**: `answerMode` が未指定のとき、routeReason や message から `inferAnswerMode()` で support / define / analysis / worldview / continuity のいずれかを返し、その行の既定値で answerLength / answerFrame を補う。

---

# 6. 最小 diff で触るファイル（3 つ以内）

| 順 | ファイル | 変更内容 |
|----|----------|----------|
| 1 | **api/src/routes/chat.ts** | 冒頭で answerLength / answerMode / answerFrame を取得し、answerMode 既定値表で補完して AnswerProfile を生成。buildResponsePlan 呼び出しに answerMode / answerFrame を渡す。system 組み立て直前に getLengthInstruction / getFrameInstruction を追加。enforceTenmonPersona 呼び出しに `{ maxLength }` を渡す。__ku に 3 項目を載せるかは任意。 |
| 2 | **api/src/planning/responsePlanCore.ts** | AnswerLength / AnswerMode / AnswerFrame / AnswerProfile 型を定義（または別ファイルに型だけ切り出し）。buildResponsePlan の入力に answerMode / answerFrame を追加。ResponsePlan に answerFrame を追加。既定値ロジックは上記 §3 のとおり。 |
| 3 | **api/src/engines/persona/tenmonCoreEngine.ts** | enforceTenmonPersona の第 2 引数に `options?: { maxLength?: number | null }` を追加。長さ制限部分だけ `(options?.maxLength ?? 350)` を使用。 |

- **型だけ別ファイルにする場合**: `api/src/types/answerProfile.ts` のような 1 ファイルを新設し、responsePlanCore と chat から import する。その場合は **触るファイルは 4 つ** になるが、型の再利用とテストがしやすい。

---

# 7. 実装順（まだコードは当てない）

1. **型の定義**  
   - AnswerLength / AnswerMode / AnswerFrame / AnswerProfile を responsePlanCore.ts の先頭か、types/answerProfile.ts に定義する。

2. **tenmonCoreEngine の maxLength 可変**  
   - enforceTenmonPersona に第 2 引数 options を追加し、maxLength 未指定時は 350 のままにする。既存呼び出しはそのまま動く。

3. **responsePlanCore の拡張**  
   - buildResponsePlan の入力に answerMode / answerFrame を追加。ResponsePlan に answerFrame を追加。中身は「渡されていればそのまま plan に載せる」だけにし、既存の responseKind 既定値は変えない。

4. **chat.ts の差し込み**  
   - ハンドラ冒頭で body から answerLength / answerMode / answerFrame を読み、answerMode 既定値表で補完して answerProfile を生成。  
   - 既存の buildResponsePlan 呼び出しに answerMode / answerFrame を渡す。  
   - GEN_SYSTEM / __GEN_SYSTEM_CLEAN 等を組み立てる直前に、getLengthInstruction(answerProfile.answerLength) と getFrameInstruction(answerProfile.answerFrame) を 1 文ずつ追加。  
   - enforceTenmonPersona を呼ぶ箇所で、answerProfile.answerLength に応じた maxLength を計算して第 2 引数で渡す。  
   - （任意）decisionFrame.ku に answerLength / answerMode / answerFrame を格納。

5. **inferAnswerMode（任意）**  
   - routeReason や message から answerMode を推論するヘルパを chat.ts 内に 1 つ用意し、body.answerMode が無いときだけ使う。

6. **受入確認**  
   - body で answerLength=short / long、answerMode=support / analysis、answerFrame=d_delta_s_one_step を渡して、応答長・構成・maxLength が意図どおりになることを確認する。

---

**以上は設計のみ。まだコードは当てていない。**
