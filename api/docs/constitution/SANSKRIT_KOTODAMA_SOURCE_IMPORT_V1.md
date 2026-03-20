# SANSKRIT_KOTODAMA_SOURCE_IMPORT_V1

**MODE:** `DOCS_ONLY`（runtime 改修なし）  
**カード束:** `SANSKRIT_KOTODAMA_SOURCE_IMPORT_V1` の **憲法・配置契約** 固定。実ファイル配置・検証は同カードの **runtime** コミット（registry JSON + import スクリプト）。  
**上位原則:** `SELF_BUILD_GOVERNOR_V1.md`（**docs / runtime 分離**、**no-touch** `api/src/db/kokuzo_schema.sql`）。  
**読解原則:** 文法・言語層の観測を先に固定し、神秘解釈・任意の宗教断定へ飛ばない（観測ログと rule index は別カード）。

---

## 1. 目的

Sanskrit / BHS（Buddhist Hybrid Sanskrit）/ Kotodama を **会話主線から切り離した source 層**として載せる。  
PDF を置くだけでなく、**source id・層・ページアンカー・抽出導線**が後段の `SANSKRIT_RULE_INDEX_V1` / `KOTODAMA_RULE_INDEX_V1` にそのまま渡せる形で固定する。

---

## 2. 原本保存先（VPS・固定）

環境変数 `TENMON_DATA_DIR` を優先。未設定時は `/opt/tenmon-ark-data`。

**ルート（固定）:**

```text
${TENMON_DATA_DIR:-/opt/tenmon-ark-data}/sources/sanskrit_kotodama/v1/
```

**各 source のディレクトリ契約（runtime スクリプトが生成）:**

```text
.../v1/<layer>/<source_id>/
  original/           # ユーザー提供 PDF / 画像原本（読み取り専用想定）
  extracted/
    text/             # pdftotext 等のプレーンテキスト（ページ単位または連結）
    ocr/              # OCR 中間・出力（将来）
    meta/             # printed page 対応表など（将来・任意）
```

**層ラベル（固定・混在禁止）:**

| `layer`              | 意味 |
|----------------------|------|
| `classical_sanskrit` | 古典サンスクリット文法・参照 |
| `bhs`                | BHS 文法・BHS 系辞書 |
| `kotodama`           | 言霊・天聞体系側の原資料（日本語・混在可、**別 layer**） |

Sanskrit・BHS・Kotodama の論理結合は **rule index カード**で行い、**source 層のディレクトリでは混ぜない**。

---

## 3. メタデータ・レジストリ

**機械可読の正:** リポジトリ内  
`api/data/sources/sanskrit_kotodama_sources_v1.json`  
（フィールドは JSON 先頭の `schema` 宣言に従う）

**VPS 上のツリー生成・検証:**  
`api/scripts/sanskrit_kotodama_source_import_v1.sh init|verify`  
（`TENMON_DATA_DIR` 未設定時は `default_base_dir` と同じ `/opt/tenmon-ark-data` を使用）

各エントリ最低限:

- `source_id` — 安定 id（スネークケース、`layer` 内一意）
- `title` — 人間可読題名（版情報は `edition` 等で分離可）
- `layer` — 上表のいずれか
- `language` — 例: `sa` / `sa-en` / `pi` / `ja` / `mixed`（辞典・注釈の主言語）
- `page_count` — PDF 総ページ数。**未確定は `null`**（投入後に更新）
- `storage_relative_path` — `v1` ルートからの相対パス（通常 `<layer>/<source_id>`）

---

## 4. page anchor（採番方針・固定）

**正規アンカー形式（rule index・ログ共通）:**

```text
{source_id}#p{pdf_page}
```

- `pdf_page`: **PDF の物理ページ 1 始まり**（先頭ページ = 1）。  
- 書籍の**刷上页码**と一致しない場合は、別カードで `extracted/meta/printed_page_map.json` 等の **sidecar** を定義する（本カードでは「将来」に留める）。

**引用時の禁止:** アンカーなしの断片だけを「原典」と呼ばない（観測契約）。

---

## 5. OCR / テキスト抽出の入口（固定）

優先順（**文法観測向け**）:

1. **テキスト層あり PDF:** `pdftotext`（Poppler）で `extracted/text/` へ。レイアウト維持のため `-layout` をデフォルト推奨（カード外の具体操作は運用メモで可）。
2. **画像のみ / テキスト層不良:** リポジトリ既存の PDF→ページ画像系（例: `api/tools/nas_pdf_pages_ingest_poppler_v1.py`）を **ページ画像生成**に使い、OCR エンジンは別途バインド（**本カードではエンジン固定しない**）。
3. 既存 `api/scripts/ocr_page.sh` は **KHS 専用**のため、本 source 列では **そのまま流用しない**（将来レイヤ別ラッパで接続）。

抽出ログ・ハッシュは将来 `artifact_manifest` 等へ接続可能なことを前提にし、本カードでは **ディレクトリ契約のみ**固定する。

---

## 6. 後段 rule index へ渡す結合点

- **入力:** `sanskrit_kotodama_sources_v1.json` の `sources[]` + 各 `original/` の実ファイル有無（import スクリプトの `verify`）。
- **安定キー:** `source_id` と `{source_id}#p{n}`。
- **言語処理:** 「混在禁止」は **storage layer** の話。索引上で Sanskrit 条項と Kotodama 条項を対応づけるのは **別 ID 空間**で行う（本カードでは定義しない）。

---

## 7. 受入条件（本カード）

- 原本ルート・層分離・ディレクトリ契約が明確
- メタデータ項目と page anchor 方針が明確
- 抽出の優先順序が固定（神秘解釈への先行ジャンプを禁止する **観測順**）
- `api/src/db/kokuzo_schema.sql` を触らない
- runtime コミット側: `npm run build` を壊さない（JSON/シェルのみ）

---

## 8. 次カード候補（1 つのみ）

`SANSKRIT_RULE_INDEX_V1`

---

## 9. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | VPS 保存先・層・anchor・抽出入口・registry 契約を固定 |
