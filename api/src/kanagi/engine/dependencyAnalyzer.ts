// B-1: kuromoji tokenizer は共通キャッシュを使用
import { getTokenizer } from "../utils/tokenizerCache.js";

export type DependencyRole =
  | "ACTOR"        // 動かす主体（火）
  | "RECEIVER"     // 動かされる対象（水）
  | "ACTION"       // 動作
  | "UNKNOWN";

export interface DependencyToken {
  surface: string;
  base: string;
  pos: string;
  role: DependencyRole;
}

/**
 * 「誰が」「何を」「どうするか」を抽出する
 * 天津金木：動かす＝火／動かされる＝水
 */
export async function analyzeDependency(
  text: string
): Promise<DependencyToken[]> {

  const tokenizer = await getTokenizer();
  const tokens = tokenizer.tokenize(text);

  const result: DependencyToken[] = [];
  const processedIndices = new Set<number>(); // 既に処理されたトークンのインデックス

  tokens.forEach((token, idx) => {
    let role: DependencyRole = "UNKNOWN";

    // 動詞そのもの
    if (token.pos === "動詞") {
      role = "ACTION";
    }

    // 助詞「が」「は」 → 主体（前のトークンが ACTOR）
    if (
      token.pos === "助詞" &&
      (token.surface_form === "が" || token.surface_form === "は")
    ) {
      const prev = tokens[idx - 1];
      if (prev && !processedIndices.has(idx - 1)) {
        result.push({
          surface: prev.surface_form,
          base: prev.basic_form,
          pos: prev.pos,
          role: "ACTOR",
        });
        processedIndices.add(idx - 1);
      }
      // 助詞自体は追加しない（役割情報は前のトークンに付与済み）
      return;
    }

    // 助詞「を」「に」 → 対象（前のトークンが RECEIVER）
    if (
      token.pos === "助詞" &&
      (token.surface_form === "を" || token.surface_form === "に")
    ) {
      const prev = tokens[idx - 1];
      if (prev && !processedIndices.has(idx - 1)) {
        result.push({
          surface: prev.surface_form,
          base: prev.basic_form,
          pos: prev.pos,
          role: "RECEIVER",
        });
        processedIndices.add(idx - 1);
      }
      // 助詞自体は追加しない（役割情報は前のトークンに付与済み）
      return;
    }

    // 既に処理済みのトークンはスキップ
    if (processedIndices.has(idx)) {
      return;
    }

    // その他トークン
    result.push({
      surface: token.surface_form,
      base: token.basic_form,
      pos: token.pos,
      role,
    });
  });

  return result;
}

