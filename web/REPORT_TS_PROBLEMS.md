# TypeScript Problems レポート (useChat.ts)

## 1. VSCode Problems 一覧（13件）

| # | 行 | 列 | code | メッセージ全文 |
|---|---|---|------|----------------|
| 1 | 4 | 24 | ts2305 | モジュール '"../lib/db"' にエクスポートされたメンバー 'addMessage' がありません。 |
| 2 | 4 | 36 | ts2305 | モジュール '"../lib/db"' にエクスポートされたメンバー 'listThreads' がありません。 |
| 3 | 4 | 49 | ts2305 | モジュール '"../lib/db"' にエクスポートされたメンバー 'listMessages' がありません。 |
| 4 | 4 | 68 | ts2305 | モジュール '"../lib/db"' にエクスポートされたメンバー 'Thread' がありません。 |
| 5 | 4 | 81 | ts2305 | モジュール '"../lib/db"' にエクスポートされたメンバー 'Message' がありません。 |
| 6 | 49 | 65 | ts7006 | パラメーター 'm' の型は暗黙的に 'any' になります。 |
| 7 | 98 | 44 | ts7006 | パラメーター 't' の型は暗黙的に 'any' になります。 |
| 8 | 103 | 13 | ts2353 | オブジェクト リテラルは既知のプロパティのみ指定できます。'createdAt' は型 'PersistThread' に存在しません。 |
| 9 | 110 | 13 | ts2353 | オブジェクト リテラルは既知のプロパティのみ指定できます。'createdAt' は型 'PersistThread' に存在しません。 |
| 10 | 110 | 38 | ts7006 | パラメーター 't' の型は暗黙的に 'any' になります。 |
| 11 | 123 | 9 | ts2353 | オブジェクト リテラルは既知のプロパティのみ指定できます。'sessionId' は型 'ChatRequest' に存在しません。 |
| 12 | 144 | 48 | ts7006 | パラメーター 't' の型は暗黙的に 'any' になります。 |
| 13 | 148 | 13 | ts2353 | オブジェクト リテラルは既知のプロパティのみ指定できます。'createdAt' は型 'PersistThread' に存在しません。 |

- **ファイルパス**: `web/src/hooks/useChat.ts`

---

## 2. コマンド結果

### A) rg -n "from \"../lib/db\"|addMessage|listThreads|listMessages|upsertThread|tenmon-ark\.sessionId" web/src/hooks/useChat.ts

```
4:import { upsertThread, addMessage, listThreads, listMessages, type Thread, type Message as DBMessage } from "../lib/db";
7:  const key = "tenmon-ark.sessionId";
43:        const threads = await listThreads();
47:          const dbMessages = await listMessages(latestThread.id);
88:        await addMessage({
97:        const threads = await listThreads();
100:          await upsertThread({
107:          await upsertThread({
134:          await addMessage({
143:          const threads = await listThreads();
145:          await upsertThread({
```

*(注: 環境で rg が無いため grep で同等結果を記載)*

### B) nl -ba web/src/hooks/useChat.ts | sed -n '1,220p'

```
     1	import { useEffect, useState } from "react";
     2	import { postChat } from "../api/chat";
     3	import type { Message } from "../types/chat";
     4	import { upsertThread, addMessage, listThreads, listMessages, type Thread, type Message as DBMessage } from "../lib/db";
     5	
     6	function getOrCreateSessionId(): string {
     7	  const key = "tenmon-ark.sessionId";
     8	  const existing = window.localStorage.getItem(key);
     9	  if (existing && existing.trim().length > 0) return existing;
    10	
    11	  const created =
    12	    typeof crypto !== "undefined" && "randomUUID" in crypto
    13	      ? crypto.randomUUID()
    14	      : `${Date.now()}-${Math.random()}`;
    15	  window.localStorage.setItem(key, created);
    16	  return created;
    17	}
    18	
    19	function generateMessageId(threadId: string): string {
    20	  const ts = Date.now();
    21	  const rand = Math.random().toString(36).slice(2, 9);
    22	  return `${threadId}:${ts}:${rand}`;
    23	}
    24	
    25	export function useChat() {
    26	  const [sessionId, setSessionId] = useState<string>("");
    27	  const [messages, setMessages] = useState<Message[]>([]);
    28	  const [loading, setLoading] = useState(false);
    29	  const [dbReady, setDbReady] = useState(false);
    30	
    31	  // DB初期化と復元
    32	  useEffect(() => {
    33	    let mounted = true;
    34	
    35	    async function init() {
    36	      try {
    37	        // sessionId取得
    38	        const sid = getOrCreateSessionId();
    39	        setSessionId(sid);
    40	        if (!mounted) return;
    41	
    42	        // スレッド復元（最新のスレッドを使用）
    43	        const threads = await listThreads();
    44	        if (threads.length > 0 && mounted) {
    45	          const latestThread = threads[0];
    46	          // メッセージ復元
    47	          const dbMessages = await listMessages(latestThread.id);
    48	          if (mounted) {
    49	            const restoredMessages: Message[] = dbMessages.map((m) => ({
    50	              role: m.role,
    51	              content: m.content,
    52	            }));
    53	            setMessages(restoredMessages);
    54	          }
    55	        }
    56	
    57	        setDbReady(true);
    58	      } catch (e) {
    59	        console.error("[useChat] DB init failed:", e);
    60	        // DB失敗時も動作継続
    61	        const sid = getOrCreateSessionId();
    62	        setSessionId(sid);
    63	        setDbReady(true);
    64	      }
    65	    }
    66	
    67	    init();
    68	
    69	    return () => {
    70	      mounted = false;
    71	    };
    72	  }, []);
    73	
    74	  async function sendMessage(text: string) {
    75	    const content = text.trim();
    76	    if (!content) return;
    77	
    78	    const sid = sessionId || "default";
    79	    const now = Date.now();
    80	
    81	    // UI更新（送信）
    82	    setMessages((prev) => [...prev, { role: "user", content }]);
    83	
    84	    // DB保存（ユーザーメッセージ）
    85	    if (dbReady) {
    86	      try {
    87	        const userMsgId = generateMessageId(sid);
    88	        await addMessage({
    89	          id: userMsgId,
    90	          threadId: sid,
    91	          role: "user",
    92	          content,
    93	          createdAt: now,
    94	        });
    95	
    96	        // スレッドが無ければ作成/更新
    97	        const threads = await listThreads();
    98	        const threadExists = threads.some((t) => t.id === sid);
    99	        if (!threadExists) {
   100	          await upsertThread({
   101	            id: sid,
   102	            title: content.slice(0, 50),
   103	            createdAt: now,
   104	            updatedAt: now,
   105	          });
   106	        } else {
   107	          await upsertThread({
   108	            id: sid,
   109	            title: content.slice(0, 50),
   110	            createdAt: threads.find((t) => t.id === sid)?.createdAt || now,
   111	            updatedAt: now,
   112	          });
   113	        }
   114	      } catch (e) {
   115	        console.error("[useChat] DB save failed (user):", e);
   116	      }
   117	    }
   118	
   119	    try {
   120	      setLoading(true);
   121	      const res = await postChat({
   122	        message: content,
   123	        sessionId: sid,
   124	        persona: "tenmon",
   125	      });
   126	
   127	      // UI更新（受信）
   128	      setMessages((prev) => [...prev, { role: "assistant", content: res.response }]);
   129	
   130	      // DB保存（アシスタントメッセージ）
   131	      if (dbReady) {
   132	               try {
   133	          const assistantMsgId = generateMessageId(sid);
   134	          await addMessage({
   135	            id: assistantMsgId,
   136	            threadId: sid,
   137	            role: "assistant",
   138	            content: res.response,
   139	            createdAt: Date.now(),
   140	          });
   141	
   142	          // スレッド更新
   143	          const threads = await listThreads();
   144	          const existingThread = threads.find((t) => t.id === sid);
   145	          await upsertThread({
   146	            id: sid,
   147	            title: content.slice(0, 50),
   148	            createdAt: existingThread?.createdAt || now,
   149	            updatedAt: Date.now(),
   150	          });
   151	        } catch (e) {
   152	        console.error("[useChat] DB save failed (assistant):", e);
   153	        }
   154	      }
   155	    } catch (e) {
   156	      console.error("[useChat] sendMessage failed:", e);
   157	      // UI停止禁止: 何もしない
   158	    } finally {
   159	      setLoading(false);
   160	    }
   161	  }
   162	
   163	  return {
   164	    sessionId,
   165	    messages,
   166	    loading,
   167	    sendMessage,
   168	  };
   169	}
```

### C) rg -n "export async function upsertThread|replaceThreadMessages|listMessagesByThread|exportAll|importAll" web/src/lib/db.ts

```
41:export async function upsertThread(t: PersistThread): Promise<void> {
52:export async function replaceThreadMessages(threadId: string, msgs: PersistMessage[]): Promise<void> {
76:export async function listMessagesByThread(threadId: string): Promise<PersistMessage[]> {
97:export async function exportAll(): Promise<{ version: string; threads: PersistThread[]; messages: PersistMessage[] }> {
122:export async function importAll(data: any): Promise<void> {
```

*(注: db.ts には addMessage, listThreads, listMessages, Thread, Message の export は無い)*

---

## 3. 修正後（一括修正実施後）

### 修正後の Problems 件数

**0件**

### 仕上げ（Problems が残る場合）

- TypeScript: Restart TS Server
- それでも残るなら Developer: Reload Window

### pnpm -C web build の結果

```
> tenmon-ark-web@0.1.0 build /Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset/web
> vite build

vite v7.1.9 building for production...
transforming...
✓ 31 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.41 kB │ gzip:  0.28 kB
dist/assets/index-pGKTWOlu.css   12.08 kB │ gzip:  3.27 kB
dist/assets/index-DC9yEYtD.js   202.85 kB │ gzip: 63.86 kB
✓ built in 446ms
```

**成功**
