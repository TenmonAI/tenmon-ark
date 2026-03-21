# SUPREME_POST_ASCENT_ROADMAP_V1

- **モード:** DOCS_ONLY（**runtime ロジック変更なし**）  
- **前提:** `FINAL_ASCENT_READY_REAUDIT_V1` — **supreme ascent ready = YES**（must 追跡済み・build 再現性成立）。**会話主線・補助 runtime・client の completed 判定は変更しない。**  
- **記録時 HEAD（参考）:** `1b665874be63e9752cff81dfd4e8f3fc26a8d167`  
- **目的:** 完成到達**後**のツリー整理を **optional / archive / quarantine / discard** に分け、**後処理順**を固定する。

---

## 1. 四分類（確定）

| ラベル | 定義 | 扱い |
|--------|------|------|
| **optional** | ビルド必須ではないが、**憲章・ゲート記録・分類表・運用スクリプト**としてリポに残す価値があるもの | **git 追跡推奨**。コミットは **小分けバッチ**（下記順）。`chat.ts` / `kokuzo_schema.sql` / `client/**` に触れない。 |
| **archive** | 分析・設計カード・レポート等の**参照専用資料**（ルート配下に置きっぱなしだと `routes/` がノイズになるもの） | **パス移動のみ**で `api/docs/_archive/` または `api/docs/sealing/` 配下へ集約。内容改変は不要。 |
| **quarantine** | **未マウント**・境界未確定（誤配線リスク） | **別ディレクトリ**（例: `api/src/experimental/founder/`）へ移す **または** 追跡しない方針を README で固定。**本体 completed には影響させない。** |
| **discard** | 重複・ローカル救済・意図しない差分 | **コミットしない**。`git restore`・ワークスペース削除・`.gitignore` 維持。 |

---

## 2. optional の中身（代表パス）

| 種別 | パス例 |
|------|--------|
| 憲章・ゲート | `api/docs/constitution/FINAL_SUPREME_ASCENT_GATE_V1.md`、`FINAL_ASCENT_READY_REAUDIT_V1.md`、`SUPREME_POSTLOCK_ROADMAP_V1.md`、**本ファイル** |
| 分類 | `api/UNTRACKED_EXPERIMENTAL_ROUTES_CLASSIFY_V1.md` |
| 手動カード TS | `api/src/scripts/card_DB_REALITY_CHECK_AND_SEED_V1.ts` |
| **api/scripts** | `acceptance_test.sh`、`check_tenmon_core_seed.sh` — **差分の扱いは §3** |

---

## 3. `api/scripts` 未コミット差分の扱い（確定）

1. **`git diff`** で内容確認。  
2. **意図した修正**（acceptance / seed チェックの改善）→ **optional** として **単独または憲章バッチ直後**のコミットに含める。  
3. **意図しない改変・改行のみ・環境差分** → **discard**（`git restore api/scripts/acceptance_test.sh api/scripts/check_tenmon_core_seed.sh`）。  
4. 本番 `npm start` の依存にしない限り、**本体 completed を再定義しない**。

---

## 4. archive / quarantine / discard の対象例

| ラベル | 代表 |
|--------|------|
| **archive** | `CARD_*.md`、`FINAL_REPORT_V1/**`、`RECONCILE_AUDIT_V1/**`、`WORLD_CLASS_ANALYSIS_V2/**`、`CONVERSATION_QUALITY_VPS_ANALYSIS_V1.md` |
| **quarantine** | `api/src/routes/founderRequest.ts`、`api/src/founder/requestTriageSchemaV1.ts`（未配線のまま `routes/` に置かない方針を推奨） |
| **discard** | `**/*.bak_*`（既存 gitignore）、重複の `WORLD_CLASS_ANALYSIS_V1/**`（V2 を正とする合意時）、§3 のノイズ差分 |

---

## 5. 後処理順（固定・本体判定を揺らさない）

**原則:** 各ステップ後に **`api` build / `client` vite build / health** を実行しても **completed 判定に変更がない**ことのみ確認（ゲート再定義はしない）。

| 順 | アクション | 分類 |
|----|------------|------|
| **0** | フリーズ宣言: **mainline（`chat.ts` 等）非接触** | — |
| **1** | 憲章・ゲート・分類 MD + **本 POST_ASCENT ロードマップ** を **optional 単独コミット** | optional |
| **2** | `api/scripts` トリアージ（§3）→ **コミット or restore** | optional / discard |
| **3** | `api/src/scripts/card_DB_*.ts` を optional コミット | optional |
| **4** | レポート・CARD を **archive パスへ移動**（import なしのため build 非影響） | archive |
| **5** | founder 系を **quarantine パスへ移動** + `README.md` | quarantine |
| **6** | V1 重複・bak・ノイズを **discard** | discard |

※ 順 **4–5** は **別コミット**に分割可。順 **1** だけでも可。

---

## 6. 本体 completed 判定（不動条項）

- **会話主線 completed**、**補助 runtime / memory**、**client**、**clone 再現性（must）** は **既に YES**。  
- 本ロードマップの後処理は **「リポジトリの見た目と監査資料の所在」** のみを整理し、**機能 completed の再審査を要求しない**。

---

## 7. 次カード（1 本）

**`POST_ASCENT_OPTIONAL_SEAL_V1`** — 上記 **順 1（+ 任意で順 2）** を実行: 憲章・ゲート・分類・POSTLOCK/REAUDIT/本ロードマップの追跡化、`api/scripts` の意図確認とコミットまたは restore。**`chat.ts` / `client/**` / `kokuzo_schema.sql` 禁止維持。**
