/**
 * 天津金木思考ロジック（最小核）
 * 
 * 単独関数として実装
 * - 状態を持たない
 * - ask4o を使用
 * - 必ず文字列を返す（Promise<string>）
 */

import { ask4o } from "../llm/ask4o.js";

/**
 * 天津金木の基本思考プロセス
 * 
 * 段階構造（将来拡張用）:
 * 1. 受信（入力の受容）
 * 2. 内省（内部での振り返り）
 * 3. 構文化（構造として整理）
 * 4. 応答（出力の生成）
 */
export async function kanagiThink(input: string): Promise<string> {
  try {
    // ask4o を呼び出すだけ
    return await ask4o(input);
  } catch (err: any) {
    // エラー時も必ず string を返す
    console.error("[KANAGI-THINK-ERROR]", err);
    return `思考中にエラーが発生しましたが、処理を続行します。あなたの問いかけ「${input.substring(0, 50)}${input.length > 50 ? "..." : ""}」について、改めて考えさせてください。`;
  }
}
