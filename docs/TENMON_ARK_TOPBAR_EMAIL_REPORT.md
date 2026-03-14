# TENMON-ARK 右上メール未表示 原因解析報告

## 結論

- **実際に使われている GET /api/me は `api/src/routes/auth_founder.ts` のハンドラのみ。**  
  `api/src/routes/me.ts` は同じパスで後からマウントされるため、**本番では呼ばれていない**。
- **founder 認証時**に auth_founder の /api/me が `user: { id: "founder", role: "FOUNDER" }` のみ返し、**`user.email` を返していなかった**（失われていた箇所）。
- その結果、管理者が founder でログインしていると `result.user?.email` が常に undefined になり、`tenmon_user_display_v1` が一度も設定されず、Topbar は常に "Account" のまま。

---

## [1] Topbar が見ている localStorage キー

| 項目 | 内容 |
|------|------|
| ファイル | `web/src/components/gpt/Topbar.tsx` |
| 行番号 | 60-63 |
| キー | **`tenmon_user_display_v1`**（別キーではない） |
| fallback | **`"Account"`** |
| title 属性 | 98行目 `title={accountName}`（フル表示用） |

```ts
const accountName =
  (typeof window !== "undefined" &&
    window.localStorage.getItem("tenmon_user_display_v1")) ||
  "Account";
```

→ キー・fallback とも仕様どおり。**ここでメールが落ちている原因ではない。**

---

## [2] LoginLocal / RegisterLocal で保存している値

### LoginLocal.tsx

| 項目 | 内容 |
|------|------|
| 行番号 | 49→52→54 |
| レスポンス | `const body = await res.json().catch(() => ({}));`（API の JSON） |
| 参照 | `const u = body?.user;` → `if (u?.email) localStorage.setItem("tenmon_user_display_v1", String(u.email));` |
| 保存有無 | **あり**。`body.user.email` があれば保存している。 |

→ login API が `user.email` を返していれば保存される。**フロントのロジックは正しい。**

### RegisterLocal.tsx

| 項目 | 内容 |
|------|------|
| 行番号 | 66→69 |
| 参照 | `const u = body?.user;` → `if (u?.email) localStorage.setItem("tenmon_user_display_v1", String(u.email));` |
| 保存有無 | **あり**。 |

→ register API が `user.email` を返していれば保存される。**フロントのロジックは正しい。**

---

## [3] /api/me の返却構造（実際に動いているコード）

- **本番で有効な GET /api/me は `api/src/routes/auth_founder.ts` のみ。**
- `api/src/index.ts` のマウント順:
  1. `registerFounderAuth(app)` → **app に直接 `app.get("/api/me", ...)` を登録**
  2. `app.use("/api", meRouter)` → meRouter の `router.get("/me", ...)` も GET /api/me にマッチ
- Express は**先に登録されたルートが優先**されるため、**常に auth_founder の /api/me が使われる。me.ts の /api/me は未使用。**

### auth_founder.ts の GET /api/me 返却

| 条件 | 返却例 | user.email |
|------|--------|------------|
| founder (tenmon_founder=1) | `{ ok: true, user: { id: "founder", role: "FOUNDER" }, founder: true }` | **なし（undefined）** ← ここで落ちていた |
| session なし | `{ ok: true, user: null, founder: false }` | - |
| session あり（local ユーザー） | `{ ok: true, user: { id, email, role: "USER" }, founder: false }` | **あり** |

- **修正前**: founder のとき `user` に `email` がなかった。
- **修正後**: founder のときも `user: { id: "founder", email: "", role: "FOUNDER" }` を返すように変更（レスポンス形状の一貫性のため）。  
  - `email` が空のため App 側の `if (email)` では setItem されず、表示は従来どおり "Account" のまま。

---

## [4] /auth/local/login の返却構造

| ファイル | 行番号 | 返却 |
|----------|--------|------|
| api/src/routes/auth_local.ts | 169-174 | `{ ok: true, authenticated: true, founder: false, user: { id: String(row.userId), email: String(row.email) } }` |

→ **user.email を返している。** メールが落ちる箇所ではない。

---

## [5] /auth/local/register の返却構造

| ファイル | 行番号 | 返却 |
|----------|--------|------|
| api/src/routes/auth_local.ts | 124 | `res.json({ ok: true, user: { id: userId, email }, next: nextPath || "/pwa/" })` |

→ **user.email を返している。** メールが落ちる箇所ではない。

---

## [6] メールアドレスが落ちる正確な行番号

| 番号 | ファイル | 行 | 内容 |
|------|----------|-----|------|
| 1 | **api/src/routes/auth_founder.ts** | **54-55（修正前）** | founder 時の `res.json({ ok: true, user: { id: "founder", role: "FOUNDER" }, founder: true })` に **user.email が含まれていなかった**。 |
| - | web/src/App.tsx | 58-59 | `const email = result.user?.email; if (email) localStorage.setItem(...)` → /api/me が user.email を返さないとここで保存されない。 |

- **根本原因**: 本番で使われている GET /api/me が auth_founder.ts であり、その founder 分岐で `user.email` を返していなかったこと。
- **結果**: founder でログインしている環境では `result.user?.email` が常に undefined → `tenmon_user_display_v1` が設定されない → Topbar は常に "Account"。

---

## [7] 最小 diff 修正案（実施済み）

- **ファイル**: `api/src/routes/auth_founder.ts`
- **変更**: founder 時の `user` に `email: ""` を追加し、レスポンス形状を統一。

```diff
     if (founder) {
-      return res.json({ ok: true, user: { id: "founder", role: "FOUNDER" }, founder: true });
+      return res.json({ ok: true, user: { id: "founder", email: "", role: "FOUNDER" }, founder: true });
     }
```

- **効果**  
  - founder 時も `user` に `email` が存在するため、フロントの `result.user?.email` は `""` になる。  
  - App.tsx の `if (email)` は falsy なので setItem は行わず、founder のときの表示は従来どおり "Account" のまま。  
  - local 認証ユーザーは従来どおり /api/me の session 分岐で `user.email` が返り、再読込時も右上にメールが表示される。

---

## [8] grep 結果メモ（参照用）

- **tenmon_user_display_v1**: Topbar（removeItem/getItem）、App、LoginLocal、RegisterLocal で使用。キー名 typo なし。
- **/api/me**: App.tsx の fetch、auth_founder.ts で app.get("/api/me", ...)、me.ts で router.get("/me", ...)。実効は auth_founder のみ。
- **/auth/local/login**, **/auth/local/register**: auth_local.ts で定義。レスポンスに user.email あり。

---

## [9] 受入条件との対応

| 条件 | 対応 |
|------|------|
| login 成功直後に右上へ email が出る | auth_local の login は user.email を返しており、LoginLocal で保存済み。 |
| register 成功直後に右上へ email が出る | auth_local の register は user.email を返しており、RegisterLocal で保存済み。 |
| 再読込しても email が出る | /api/me を App が呼び、session 時は auth_founder が user.email を返すため、App が tenmon_user_display_v1 を更新。**founder のときは従来どおり "Account"。** |
| logout で消える | Topbar の handleLogout で tenmon_user_display_v1 を removeItem 済み。 |
| 別ユーザーで入るとその email に切り替わる | /api/me でそのユーザーの user が返り、App が setItem するため切り替わる。 |

---

## 一時デバッグ用 console.log について

以下の一時ログは原因切り分け用に挿入済み。原因確定後は削除してよい。

- LoginLocal.tsx 45行目: `console.log("[LoginLocal] success body", body);`
- RegisterLocal.tsx 62行目: `console.log("[RegisterLocal] success body", body);`
- App.tsx 51行目: `console.log("[App] tenmonCheckMe result", result);`
- Topbar.tsx 65行目: `console.log("[Topbar] tenmon_user_display_v1", ...);`
