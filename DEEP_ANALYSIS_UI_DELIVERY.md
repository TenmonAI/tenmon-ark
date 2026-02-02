# 深層解析UI実装 - 納品物

## 目的

TENMON-ARKのUIで「会話しながら言霊秘書を深層解析→学習（LawCommit）」できるようにする。

## 変更差分

### client/src/pages/ChatRoom.tsx

**変更内容**: 深層解析トグル、candidates表示、学習機能を追加

#### 1. 深層解析トグル

- 送信UIにトグル（通常 / 深層解析）を追加
- 深層解析ONのとき、送信文字列の末尾に " #詳細" を付ける

```tsx
<div className="flex items-center gap-2">
  <Switch
    id="deep-analysis"
    checked={deepAnalysis}
    onCheckedChange={setDeepAnalysis}
  />
  <Label htmlFor="deep-analysis" className="text-sm cursor-pointer">
    深層解析
  </Label>
</div>
```

#### 2. /api/chat レスポンスの candidates[] を表示

- 深層解析ONのとき、通常の `/api/chat` エンドポイントを使用
- レスポンスの `candidates` をカード形式で表示
- doc / pdfPage / snippet / tags を表示

```tsx
{candidates.length > 0 && (
  <div className="max-w-4xl mx-auto px-4 py-3 space-y-3">
    <h3 className="text-sm font-medium text-foreground mb-2">検索候補</h3>
    {candidates.map((candidate, idx) => (
      <Card key={idx} className="p-3">
        {/* カード内容 */}
      </Card>
    ))}
  </div>
)}
```

#### 3. 各カードに「このページで深掘り」ボタン

- クリックで `message="doc=<doc> pdfPage=<pdfPage>"` を送信

```tsx
<Button
  size="sm"
  variant="outline"
  onClick={() => {
    const pinMessage = `doc=${candidate.doc} pdfPage=${candidate.pdfPage}`;
    setInputMessage(pinMessage);
    setDeepAnalysis(true);
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  }}
>
  <BookOpen className="w-3 h-3 mr-1" />
  深掘り
</Button>
```

#### 4. 各カードに「学習（保存）」ボタン

- POST /api/law/commit {threadId, doc, pdfPage}
- 成功したら GET /api/law/list?threadId=... を再取得して学習一覧を更新

```tsx
<Button
  size="sm"
  variant="outline"
  onClick={async () => {
    const response = await fetch("/api/law/commit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        threadId: `room-${currentRoomId || 0}`,
        doc: candidate.doc,
        pdfPage: candidate.pdfPage,
      }),
    });
    // 成功時に学習一覧を再取得
    await fetchLaws();
  }}
>
  <Save className="w-3 h-3 mr-1" />
  学習
</Button>
```

#### 5. 学習一覧（laws）をUIのサイドに表示

- lawのdoc/pdfPage/tags/quote
- クリックで再度 `message="doc=<doc> pdfPage=<pdfPage>"` を送信（復習）

```tsx
{currentRoomId && (
  <div className="w-64 border-l border-border hidden lg:block overflow-y-auto">
    <div className="p-4 border-b border-border">
      <h3 className="text-sm font-medium text-foreground">学習一覧</h3>
    </div>
    <div className="p-2 space-y-2">
      {laws.map((law) => (
        <Card
          key={law.id}
          className="p-2 cursor-pointer hover:bg-muted transition-colors"
          onClick={() => {
            const pinMessage = `doc=${law.doc} pdfPage=${law.pdfPage}`;
            setInputMessage(pinMessage);
            setDeepAnalysis(true);
            setTimeout(() => {
              handleSendMessage();
            }, 100);
          }}
        >
          {/* 学習内容表示 */}
        </Card>
      ))}
    </div>
  </div>
)}
```

## 実装確認

### 深層解析トグル

- ✅ 送信UIにトグル（通常 / 深層解析）を追加
- ✅ 深層解析ONのとき、送信文字列の末尾に " #詳細" を付ける

### Candidates表示

- ✅ /api/chat レスポンスの candidates[] を表示
- ✅ doc / pdfPage / snippet / tags をカードで表示
- ✅ 各カードに「このページで深掘り」ボタン
- ✅ 各カードに「学習（保存）」ボタン

### 学習機能

- ✅ POST /api/law/commit で学習を保存
- ✅ GET /api/law/list で学習一覧を取得
- ✅ 学習一覧をUIのサイドに表示
- ✅ 学習一覧から復習できる（クリックで再送信）

## 期待される結果

1. 深層解析ONで「言霊とは？」を送ると candidates が表示される
2. 候補から深掘りできる（doc/pdfPageピンが送れる）
3. 学習ボタンで /api/law/commit が成功し、学習一覧に反映される
4. 学習一覧から復習できる（クリックで再送信）

## 検証方法

```bash
# 開発サーバーを起動
cd client
pnpm dev

# ブラウザで http://localhost:5173 を開く
# 1. 深層解析トグルをONにする
# 2. 「言霊とは？」を送信
# 3. candidates が表示されることを確認
# 4. 「深掘り」ボタンをクリックして、doc/pdfPageピンが送信されることを確認
# 5. 「学習」ボタンをクリックして、学習一覧に反映されることを確認
# 6. 学習一覧から復習できることを確認
```

## 注意事項

- 深層解析ONのとき、通常の `/api/chat` エンドポイントを使用（ストリーミングと併用）
- 学習一覧はルーム単位で管理（threadId = `room-${currentRoomId}`）
- 学習一覧は右サイドバーに表示（lg以上で表示）
