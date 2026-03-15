# TENMON-ARK IME/Enter 本番実装点 完全特定レポート（観測のみ）

**目的**: web/src の本番メッセージ入力・送信口を特定し、client の useImeGuard を安全移植できるか判定する。  
**方針**: 修正は行わず、観測と列挙のみ。

---

# 1. 本番入力口の候補ファイル一覧

| 優先度 | ファイル | 役割 | 本番で使用されるか |
|--------|----------|------|---------------------|
| **1（本番）** | **web/src/components/gpt/Composer.tsx** | PWA チャットの入力欄。textarea + Enter送信 + composition あり。 | **はい**（ChatRoute → ChatLayout → Composer） |
| 2 | web/src/components/ChatInput.tsx | 別画面用入力。input + Enter送信 + composition あり。 | いいえ（ChatPage で使用。GptShell のメインは ChatRoute のため Composer のみ） |
| 3 | web/src/pages/KoshikiConsole.tsx | 古式コンソール。textarea、Enter=送信 / Shift+Enter=改行。 | 別画面（koshiki ルート） |
| 4 | web/src/pages/TrainPage.tsx | 訓練用。textarea、Enter && !shiftKey で送信。 | 別画面（/train） |
| 5 | web/src/pages/TrainingPage.tsx | 訓練用。onKeyDown で Enter 処理。 | 別画面 |
| 6 | web/src/pages/KanagiPage.tsx | textarea のみ（Enter送信の有無は未確認）。 | 別画面 |

**結論**: 本番のメッセージ入力・送信口は **Composer.tsx 1 ファイル**。ChatInput は ChatPage 用で、GptShell の「チャット」タブでは使われていない。

---

# 2. Enter送信関連コードの抜粋

## 本番: Composer.tsx（30–39 行付近）

```tsx
onCompositionStart={() => { composingRef.current = true; }}
onCompositionEnd={() => { composingRef.current = false; }}
onKeyDown={(e) => {
  if (e.key !== "Enter") return;
  const composing = composingRef.current || (e.nativeEvent as unknown as { isComposing?: boolean }).isComposing;
  if (composing) return;
  if (e.shiftKey) return;
  e.preventDefault();
  submit();
}}
```

- Enter 単独かつ「変換中でない」かつ「Shift なし」のときのみ `submit()`。
- 送信は `submit()` → `onSend(v)` → useChat の `sendMessage(input)`。

## 参考: ChatInput.tsx（35–42 行付近）

```tsx
onCompositionStart={() => { composingRef.current = true; }}
onCompositionEnd={() => { composingRef.current = false; }}
onKeyDown={(e) => {
  const isComposing = composingRef.current || (e.nativeEvent as any).isComposing;
  if (e.key === "Enter" && !e.shiftKey && !isComposing) {
    e.preventDefault();
    submit();
  }
}}
```

- ロジックは Composer と同等（input のため改行は不可。本番チャットでは未使用）。

---

# 3. composition / isComposing の有無

| ファイル | onCompositionStart | onCompositionEnd | composingRef | nativeEvent.isComposing |
|----------|-------------------|------------------|--------------|--------------------------|
| **Composer.tsx** | あり（30行） | あり（31行） | あり（11行 useRef） | あり（34行） |
| ChatInput.tsx | あり | あり | あり | あり |
| KoshikiConsole.tsx | なし | なし | なし | なし |
| TrainPage.tsx | なし | なし | なし | なし |
| TrainingPage.tsx | なし | なし | なし | なし |

- **本番の Composer には既に IME ガードがある**（composingRef + isComposing、変換中は送信しない）。
- client の useImeGuard にある **compositionupdate** や **200ms Grace Period** は web にはない。

---

# 4. /api/chat 呼び出し元の特定

| 段階 | ファイル | 内容 |
|------|----------|------|
| 1 | **web/src/components/gpt/ChatLayout.tsx** | `const { messages, sendMessage, loading } = useChat();` → `<Composer onSend={sendMessage} ... />` |
| 2 | **web/src/hooks/useChat.ts** | `async function sendMessage(input: string)` 内で `await postChat({ message: text, sessionId: threadId });`（138–153行付近） |
| 3 | **web/src/api/chat.ts** | `postChat()` 内で `fetch(getChatApiUrl(), { method: "POST", ... })` |
| 4 | **web/src/config/api.ts** | `getChatApiUrl()` は `API_CHAT_URL` = `"/api/chat"` を返す |

**呼び出しチェーン**:  
Composer（submit）→ onSend(text) → useChat.sendMessage(input) → postChat() → fetch("/api/chat")。

**結論**: /api/chat を叩いているのは **useChat.ts の sendMessage**。UI 上のトリガーは **Composer.tsx の submit()**（Enter または送信ボタン）のみが本番経路。

---

# 5. client/useImeGuard 移植可否

| 観点 | 内容 |
|------|------|
| **移植先** | **Composer.tsx**（本番入力はここだけ）。必要なら ChatInput / Koshiki / Train は別対応。 |
| **そのまま移植** | **不可**。client は「Enter = 改行のみ」「Ctrl/Cmd+Enter = 送信」。web は「Enter = 送信」「Shift+Enter = 改行」で仕様が逆。 |
| **移植方針** | useImeGuard の **IME まわりだけ** を流用する形が現実的。例: compositionstart/update/end + 200ms Grace Period で「変換確定直後の Enter」を送信しないようにしつつ、**送信トリガーは web 仕様のまま**（Enter = 送信、Shift+Enter = 改行）にする。 |
| **技術的な互換** | client は `textareaRef` + ネイティブ addEventListener。web の Composer は textarea を直接 JSX で持っているので、ref を付与し、useImeGuard を「送信抑制用」にだけ使う形にすれば移植可能。送信キー判定（Enter / Ctrl+Enter）は web 側で維持する必要あり。 |

**結論**: **移植は「IME ガード部分のみ」として可能。送信キー仕様は web に合わせて維持する必要がある。**

---

# 6. 最小 diff で触るべきファイル（3 つ以内）

| 順 | ファイル | 役割 |
|----|----------|------|
| 1 | **web/src/components/gpt/Composer.tsx** | 本番入力口。ここに IME 強化（Grace Period または useImeGuard の考え方）を入れる。ref 付与、必要なら hook 化。 |
| 2 | **web/src/hooks/useImeGuard.ts**（新規） | client の useImeGuard から IME 部分（composition + Grace Period）を移植し、**Enter = 送信 / Shift+Enter = 改行** は web 側で制御する版を作る。 |
| 3 | （オプション） web/src/components/ChatInput.tsx | 同じ IME 仕様を揃えたい場合のみ。本番チャットは Composer のみなので必須ではない。 |

**最小 diff で済ませるなら**: 新規 hook を作らず **Composer.tsx 内だけで**、composingRef + 200ms Grace Period を追加する方法でもよい。その場合は **Composer.tsx 1 ファイルのみ** で完結可能。

---

# 7. 結論（修正はまだしない）

- **本番のメッセージ入力・送信口**: **web/src/components/gpt/Composer.tsx** のみ。ChatLayout → useChat.sendMessage → postChat → /api/chat。
- **現状**: Composer は既に composition + isComposing で IME 中は送信しない。ただし **compositionend 直後の Enter** や **Grace Period** は未実装。
- **client/useImeGuard**: 送信キー仕様が web と逆のためそのまま移植は不可。**IME ガード（composition + Grace Period）だけ** を web に合わせて移植する形なら可。
- **最小変更**: まず **Composer.tsx 1 ファイル** に 200ms Grace Period を足すだけで、本番の IME/Enter 問題はかなり抑えられる。必要なら後から useImeGuard 相当の hook に切り出し可能。
- **修正はまだ行わない。** 上記を踏まえ、次の実装フェーズで Composer.tsx（と必要なら新規 useImeGuard）にのみ手を入れることを推奨する。
