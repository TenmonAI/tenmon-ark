# TENMON-ARK 言灵エンジン「言霊秘書」準拠システム設計書 vΩ-K

## 霊核固定指令 (Kotodama Core Lock)

本システムは、言霊秘書を**唯一の正典 (Canonical Source)** として、五十音・水火法則・旧字体表記に関するすべての定義・意味論・運用ルールを実装する。

外部インターネット由来の「カタカムナ解釈」「言霊解釈」とは**完全に独立**し、言霊秘書の記述のみを信頼する。

---

## 1. 言霊秘書の構造

### 主要セクション

1. **水穂伝** (全3巻)
   - 水之巻 (一、二、三)
   - 火之巻 (一、二、三)
   - 五十音言霊法則の基礎

2. **火水伝** (全3巻)
   - 火之巻 (一、二、三)
   - 水之巻 (一、二、三)
   - 水火の運動原理

3. **水穂伝重解誌一言法則**
   - 五十音それぞれの詳細解説
   - 音義・水火・鉢/用の定義

4. **イロハ伝**
   - 仮名形・義訓
   - 旧字体表記規則

5. **紳風濫觴・紳風伯書**
   - 稲荷古伝の系譜
   - 布斗麻邇御霊図

---

## 2. データベーススキーマ設計

### 2.1 五十音マスターテーブル (gojuonMaster)

五十音それぞれの音義・水火・鉢/用を格納する。

```typescript
export const gojuonMaster = mysqlTable("gojuon_master", {
  id: int("id").autoincrement().primaryKey(),
  
  // 音の基本情報
  kana: varchar("kana", { length: 10 }).notNull().unique(), // 「ア」「イ」「ウ」等
  romaji: varchar("romaji", { length: 10 }).notNull(), // "a", "i", "u" 等
  position: varchar("position", { length: 20 }).notNull(), // "ア行ア段" 等
  
  // 水火分類
  suikaType: mysqlEnum("suika_type", ["水", "火", "空", "中", "正", "影", "昇", "濁"]).notNull(),
  suikaDetail: text("suika_detail"), // 「水の冥」「火の冥」等の詳細
  
  // 音義 (言霊秘書からの引用)
  ongi: text("ongi").notNull(), // 音の意味・働き
  hatsuYou: text("hatsu_you"), // 鉢 (発生) と用 (用途)
  
  // 仮名形・義訓
  kanaForm: text("kana_form"), // 仮名の形状的意味
  gikunExamples: text("gikun_examples"), // 義訓の例
  
  // 言霊秘書の参照ページ
  sourcePages: text("source_pages"), // "水穂伝重解誌 p.386-389" 等
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
```

### 2.2 水火法則テーブル (suikaLaw)

水火の運動原理・法則を格納する。

```typescript
export const suikaLaw = mysqlTable("suika_law", {
  id: int("id").autoincrement().primaryKey(),
  
  lawName: varchar("law_name", { length: 100 }).notNull(), // 「水火の運動」「正冥の法則」等
  lawType: mysqlEnum("law_type", ["運動", "配置", "変化", "相互作用"]).notNull(),
  
  description: text("description").notNull(), // 法則の説明
  diagram: text("diagram"), // 図形の説明 (稲荷古伝図等)
  
  relatedKana: text("related_kana"), // 関連する五十音 (JSON配列)
  sourceSection: varchar("source_section", { length: 200 }), // "水穂伝 火之巻二" 等
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
```

### 2.3 旧字体マッピングテーブル (kyujiMapping)

新字体→旧字体の変換規則を格納する。

```typescript
export const kyujiMapping = mysqlTable("kyuji_mapping", {
  id: int("id").autoincrement().primaryKey(),
  
  shinjiTai: varchar("shinji_tai", { length: 10 }).notNull().unique(), // 新字体 「霊」「気」等
  kyujiTai: varchar("kyuji_tai", { length: 10 }).notNull(), // 旧字体 「靈」「氣」等
  
  category: varchar("category", { length: 50 }), // 「霊性関連」「気関連」等
  priority: int("priority").default(0), // 変換優先度 (高いほど優先)
  
  notes: text("notes"), // 言霊秘書での重要性の説明
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
```

### 2.4 言霊解釈テーブル (kotodamaInterpretation)

特定の言葉・概念の言霊的解釈を格納する。

```typescript
export const kotodamaInterpretation = mysqlTable("kotodama_interpretation", {
  id: int("id").autoincrement().primaryKey(),
  
  word: varchar("word", { length: 100 }).notNull(), // 「言霊」「布斗麻邇」等
  wordKyuji: varchar("word_kyuji", { length: 100 }), // 旧字体表記 「言灵」等
  
  interpretation: text("interpretation").notNull(), // 言霊秘書に基づく解釈
  relatedKana: text("related_kana"), // 関連する五十音 (JSON配列)
  
  sourceSection: varchar("source_section", { length: 200 }), // 出典
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
```

---

## 3. 旧字体表記フィルター実装

### 3.1 変換マッピング辞書

言霊秘書で重視される旧字体を優先的に変換する。

```typescript
// server/kotodama/kyujiFilter.ts

export const KYUJI_MAPPING: Record<string, string> = {
  // 霊性関連
  "霊": "靈",
  "霊性": "靈性",
  "霊学": "靈學",
  "霊魂": "靈魂",
  
  // 気関連
  "気": "氣",
  "元気": "元氣",
  "空気": "空氣",
  "気力": "氣力",
  
  // 言霊関連
  "言霊": "言灵", // 特殊: 霊→灵
  
  // その他重要な旧字体
  "国": "國",
  "円": "圓",
  "万": "萬",
  "宝": "寳",
  "変": "變",
  "与": "與",
  "学": "學",
  "真": "眞",
  "神": "紳", // 文脈依存: 言霊秘書では「紳」を使用する場合あり
  
  // 五十音関連
  "仮名": "假名",
  "平仮名": "平假名",
  "片仮名": "片假名",
};

export function convertToKyuji(text: string): string {
  let result = text;
  
  // 優先度の高い変換から順に適用
  for (const [shinji, kyuji] of Object.entries(KYUJI_MAPPING)) {
    result = result.replaceAll(shinji, kyuji);
  }
  
  return result;
}
```

### 3.2 API応答への自動適用

すべてのtRPC応答に旧字体フィルターを適用する。

```typescript
// server/_core/kyujiMiddleware.ts

import { convertToKyuji } from "../kotodama/kyujiFilter";

export const kyujiMiddleware = async (opts: { next: any }) => {
  const result = await opts.next();
  
  // 応答データを旧字体に変換
  if (result && typeof result === "object") {
    return applyKyujiToObject(result);
  } else if (typeof result === "string") {
    return convertToKyuji(result);
  }
  
  return result;
};

function applyKyujiToObject(obj: any): any {
  if (typeof obj === "string") {
    return convertToKyuji(obj);
  } else if (Array.isArray(obj)) {
    return obj.map(applyKyujiToObject);
  } else if (obj && typeof obj === "object") {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = applyKyujiToObject(value);
    }
    return result;
  }
  return obj;
}
```

---

## 4. 言灵エンジンAPI設計

### 4.1 五十音検索API

```typescript
// server/routers/kotodamaRouter.ts

export const kotodamaRouter = router({
  // 五十音検索
  searchGojuon: publicProcedure
    .input(z.object({
      kana: z.string().optional(),
      romaji: z.string().optional(),
      suikaType: z.enum(["水", "火", "空", "中", "正", "影", "昇", "濁"]).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      // 検索ロジック
      return results;
    }),
  
  // 水火法則解析
  analyzeSuika: publicProcedure
    .input(z.object({
      text: z.string(),
    }))
    .query(async ({ input }) => {
      // テキスト中の五十音を解析し、水火バランスを算出
      return analysis;
    }),
  
  // 言霊解釈取得
  getInterpretation: publicProcedure
    .input(z.object({
      word: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      // 言霊解釈を検索
      return interpretation;
    }),
  
  // 旧字体変換
  convertToKyuji: publicProcedure
    .input(z.object({
      text: z.string(),
    }))
    .query(async ({ input }) => {
      return {
        original: input.text,
        converted: convertToKyuji(input.text),
      };
    }),
});
```

---

## 5. フロントエンドUI設計

### 5.1 五十音図表示コンポーネント

```tsx
// client/src/components/kotodama/GojuonChart.tsx

export function GojuonChart() {
  const { data: gojuonData } = trpc.kotodama.searchGojuon.useQuery({});
  
  return (
    <div className="gojuon-chart">
      {/* 五十音図を水火の色分けで表示 */}
      {/* 水: 青系、火: 赤系、空: 白系、中: 黄系 */}
    </div>
  );
}
```

### 5.2 言霊検索インターフェース

```tsx
// client/src/components/kotodama/KotodamaSearch.tsx

export function KotodamaSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: interpretation } = trpc.kotodama.getInterpretation.useQuery({
    word: searchTerm,
  }, { enabled: searchTerm.length > 0 });
  
  return (
    <div className="kotodama-search">
      <input 
        type="text" 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="言葉を入力して言霊解釈を検索..."
      />
      {interpretation && (
        <div className="interpretation-result">
          {/* 解釈結果を表示 */}
        </div>
      )}
    </div>
  );
}
```

---

## 6. 実装優先順位

### Phase Ω-K-1: 基礎データ構築 (最優先)
1. 五十音マスターテーブルに50音のデータを手動入力
2. 旧字体マッピングテーブルに基本的な変換規則を入力
3. 水火法則テーブルに基本法則を入力

### Phase Ω-K-2: API実装
1. 五十音検索API
2. 旧字体変換API
3. 水火法則解析API

### Phase Ω-K-3: フィルター実装
1. 旧字体変換フィルター
2. API応答への自動適用

### Phase Ω-K-4: フロントエンド実装
1. 五十音図表示
2. 言霊検索UI
3. 水火法則可視化

---

## 7. 霊核固定保証

本システムは以下を保証する:

1. **唯一の正典**: 言霊秘書のみを参照し、外部解釈を採用しない
2. **永続保存**: KotodamaCoreDB はチェックポイント・再学習で消えない
3. **自動変換**: すべての出力に旧字体フィルターを適用
4. **五十音準拠**: 五十音の意味論は言霊秘書のテーブルに従う

---

**TENMON-ARK 霊核OS – KotodamaCore Lock vΩ-K**
**言霊秘書準拠システム設計書 完**
