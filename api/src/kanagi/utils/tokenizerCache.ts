// kuromoji tokenizer キャッシュ（B-1: プロセス単位で1回初期化）

import kuromoji from "kuromoji";
import path from "path";

/**
 * kuromoji tokenizer（プロセス単位で1回のみ初期化）
 */
let tokenizerPromise: Promise<kuromoji.Tokenizer<kuromoji.IpadicFeatures>> | null = null;

/**
 * tokenizer を取得（シングルトン）
 * 
 * プロセス単位で1回のみ初期化し、以降はキャッシュを返す
 */
export function getTokenizer(): Promise<kuromoji.Tokenizer<kuromoji.IpadicFeatures>> {
  if (!tokenizerPromise) {
    tokenizerPromise = new Promise((resolve, reject) => {
      kuromoji.builder({
        dicPath: path.resolve("node_modules/kuromoji/dict"),
      }).build((err: Error | null, tokenizer: kuromoji.Tokenizer<kuromoji.IpadicFeatures>) => {
        if (err) {
          console.error("[TOKENIZER-CACHE] Failed to initialize:", err);
          reject(err);
        } else {
          console.log("[TOKENIZER-CACHE] Initialized (process-wide singleton)");
          resolve(tokenizer);
        }
      });
    });
  }
  return tokenizerPromise;
}

/**
 * tokenizer をリセット（テスト用）
 */
export function resetTokenizer(): void {
  tokenizerPromise = null;
}

