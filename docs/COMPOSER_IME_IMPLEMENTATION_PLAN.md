# Composer IME 修正 実装案（編集なし・案のみ）

**前提**: 本番 IME 修正は `web/src/components/gpt/Composer.tsx` を中心に、1 ファイル最小 diff を優先する。  
**要件**: Enter=送信・Shift+Enter=改行は維持。IME 変換中は送信しない。compositionend 直後 200ms は Enter 送信を抑止。useChat / submit / onSend の契約は変えない。

---

# 第一案: Composer.tsx 単体で完結

## 概要

Composer 内だけで「compositionend 直後 200ms の送信抑止」を追加する。既存の `composingRef` に加え、Grace Period 用の ref とタイマーを 1 ファイル内に閉じる。

## 変更対象

- **ファイル**: `web/src/components/gpt/Composer.tsx` のみ。
- **diff 範囲**:
  - 追加: 1 本の ref（例: `gracePeriodRef` または `imeGuardRef`）。`composingRef` と同様に boolean で「200ms 中か」を保持。
  - 追加: 1 本の ref（例: `graceTimerRef`）。`number | null` で `setTimeout` の ID を保持し、クリーンアップ用に使う。
  - 変更: `onCompositionEnd`。`composingRef.current = false` のあと、`gracePeriodRef.current = true` にし、`setTimeout(..., 200)` で 200ms 後に `gracePeriodRef.current = false` と `graceTimerRef.current = null` を実行。既存タイマーがあれば `clearTimeout` してから新タイマーをセット。
  - 変更: `onKeyDown`。Enter の送信判定に「`gracePeriodRef.current === true` のときは送信しない」を追加。既存の `composing` と `e.shiftKey` の判定の前に置く（例: `if (gracePeriodRef.current) return;`）。
  - クリーンアップ: コンポーネントの useEffect で return 時に `clearTimeout(graceTimerRef.current)` を行うか、または unmount 時にタイマーを止める手段を 1 箇所で行う（ref のみで完結させる場合は、次の compositionstart で前回タイマーを clear するだけでも可）。
- **触らない**: `submit` のシグネチャ・中身、`onSend` の呼び方、props（`onSend`, `loading`）、useChat 側、api/chat 側。

## ロジック（疑似）

- `onCompositionStart`: 現状どおり `composingRef.current = true`。必要なら `graceTimerRef` を clear。
- `onCompositionEnd`: `composingRef.current = false` → `gracePeriodRef.current = true` → 既存タイマー clear → `setTimeout` 200ms で `gracePeriodRef.current = false`。
- `onKeyDown` (Enter 時):  
  - `composingRef.current || gracePeriodRef.current || e.nativeEvent.isComposing` のいずれかが true → 何もしない（送信しない。必要なら `e.preventDefault()` で Enter のデフォルトも抑止し、変換確定専用にすることは可）。  
  - `e.shiftKey` → 改行のため何もしない（現状どおり）。  
  - 上記以外の Enter → `e.preventDefault()` して `submit()`。

## 利点

- 変更が 1 ファイルに限られ、影響範囲が読みやすい。
- useChat / submit / onSend に一切手を入れず、既存契約を維持できる。
- 既存の「変換中は送信しない」「Shift+Enter は改行」をそのまま活かしつつ、200ms だけ足す形で済む。
- テストも Composer 単体で完結しやすい。

## リスク

- タイマーのクリーンアップを忘れると、strict mode の二重マウントや unmount 後に setState 相当（ref 更新）が走る可能性がある。ref のみの更新なので setState ほどではないが、タイマーは必ず clear する実装にする。
- Composer の行数が少し増えるが、増加分は 10 行前後程度に収まる想定。

## Acceptance（受入条件）

1. 日本語 IME で変換中に Enter を押すと、送信されず変換確定のみ行われる。
2. 変換確定（compositionend）直後に Enter を押しても、200ms 以内なら送信されない。
3. 変換確定から 200ms 以上経ってから Enter を押すと、送信される。
4. Shift+Enter では常に改行のみで、送信されない。
5. 送信ボタンや既存の Enter 送信フロー（useChat.sendMessage → postChat）は従来どおり動作する。
6. 他画面（ChatInput 等）や useChat の仕様は変更されない。

---

# 第二案: useImeGuard 新設 + Composer.tsx の利用

## 概要

`web/src/hooks/useImeGuard.ts` を新設し、「IME 状態 + compositionend 後 200ms の送信抑止」を hook に寄せる。Composer は ref を textarea に渡し、`useImeGuard(ref, submit, options)` のように呼ぶ。送信キー仕様（Enter=送信 / Shift+Enter=改行）は **web 側の仕様として hook に渡す**（client の useImeGuard とは送信キーが逆なので、hook のオプションで制御する）。

## 変更対象

- **新規**: `web/src/hooks/useImeGuard.ts`
  - 引数: `textareaRef: RefObject<HTMLTextAreaElement | null>`, `onSend: () => void`, 必要なら `options?: { graceMs?: number }`。
  - 内部: compositionstart / compositionupdate / compositionend をネイティブ `addEventListener` で購読（または React の onComposition* を呼び元に任せる場合は、hook 内で state/ref のみ管理し、keydown は呼び元に残す設計も可）。  
  - **web 仕様**: Enter 単独で送信、Shift+Enter は改行。つまり「key === 'Enter' && !shiftKey && !composing && !grace → onSend()」「key === 'Enter' && (composing || grace) → preventDefault のみ」を hook 内で行う。
  - compositionend で 200ms タイマーをセットし、その間は `grace` として Enter 送信を抑止。
  - cleanup で removeEventListener と clearTimeout。
- **変更**: `web/src/components/gpt/Composer.tsx`
  - textarea に `ref={textareaRef}` を追加（`useRef<HTMLTextAreaElement>(null)`）。
  - `useImeGuard(textareaRef, submit, { graceMs: 200 })` を呼ぶ。
  - 既存の `onCompositionStart` / `onCompositionEnd` / `onKeyDown` は **削除**し、keydown と composition の扱いを hook に一本化する。  
    - 実装方針により、**A)** hook がネイティブで keydown まで購読する場合: Composer からは onKeyDown/onComposition* を削除。**B)** hook は「composing + grace の ref だけ」を返し、Composer の onKeyDown でその ref を参照する場合: Composer の onKeyDown は残し、判定だけ ref に委譲。  
  - 第一案と同様、`submit` / `onSend` の契約は変えない。

## diff 範囲（第二案）

| ファイル | 種別 | 内容 |
|----------|------|------|
| `web/src/hooks/useImeGuard.ts` | 新規 | IME ref + 200ms grace + Enter/Shift+Enter 判定（web 仕様）。ref と onSend を受け取り、textarea のネイティブ購読または ref 返却のどちらかで Composer と結合。 |
| `web/src/components/gpt/Composer.tsx` | 変更 | textarea に ref 追加、useImeGuard 呼び出し、既存 onComposition* / onKeyDown の削除または ref 参照への置き換え。 |

## 利点

- IME と Grace Period のロジックが hook にまとまり、他画面（ChatInput 等）でも同じ挙動を再利用しやすい。
- Composer は「ref と submit を渡す」だけになり、見通しが良くなる。
- テストは useImeGuard を単体でテストし、Composer は「hook を呼んでいる」ことだけ確認する形にしやすい。

## リスク

- ファイルが 2 つになり、変更箇所が増える。
- hook の API（特に「Enter=送信 / Shift+Enter=改行」をどう渡すか）を決める必要がある。web は client と逆なので、オプションで明示した方が安全。
- ref のライフサイクル（null の期間や、strict mode の二重マウント）で、hook 内の addEventListener の付け外しが正しく動くようにする必要がある。

## Acceptance（受入条件）

第一案の 1〜6 に加え、以下を満たすこと。

7. `useImeGuard` は Composer から「ref と submit と graceMs」を渡すだけで、Enter=送信・Shift+Enter=改行が維持される。
8. （任意）ChatInput 等で同じ hook を利用する場合、同じ IME/grace 挙動になる。

---

# 推奨

- **まず第一案（Composer.tsx 単体）**で 200ms Grace Period を入れ、挙動と受入条件を確認する。
- 問題なければそのまま本番適用し、必要になった時点で **第二案（useImeGuard 新設）** にリファクタし、Composer と他画面で共有する。

**まだコードは当てず、上記を実装案としてのみ整理した。**
