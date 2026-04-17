/**
 * TENMON_CURSOR_CARD_KOTODAMA_CONNECT_V1
 * 宿曜継続対話向けの言霊補助 clause（断定しない・空でも安全）
 */

import { getKotodamaOneSoundEntry } from "../core/kotodamaOneSoundLawIndex.js";

function firstIndexedSoundFromMessage(userMessage: string): string {
  const t = String(userMessage ?? "").trim();
  for (let i = 0; i < t.length && i < 160; i++) {
    const ch = t[i];
    if (!ch) continue;
    if (/[\s　\n\r\t\[\]【】「」（）()｜|]/.test(ch)) continue;
    if (getKotodamaOneSoundEntry(ch)) return ch;
  }
  return "";
}

/**
 * ユーザー文の先頭付近の一音と、任意の本命宿名から補助 system 節を組む。
 * 索引に無い音でも例外にしない（空文字のまま返すか、短い注意のみ）。
 */
export function buildKotodamaClause(userMessage: string, shukuName?: string): string {
  const chunks: string[] = [];
  const key = firstIndexedSoundFromMessage(userMessage);
  const shuku = shukuName && String(shukuName).trim() ? String(shukuName).trim() : "";

  if (key) {
    const entry = getKotodamaOneSoundEntry(key);
    chunks.push("【言霊位相・補助参照】");
    if (entry) {
      const pm0 = String(entry.preferredMeaning || "").split("。")[0]?.trim() || "";
      const wf = String(entry.waterFireHint || "").trim();
      chunks.push(
        `ユーザー語りに現れた音「${entry.sound}」を、一音法則索引では補助的に当てはめる余地がある（断定は避ける）。`,
        pm0 ? `索引上の意味の核（参考）: ${pm0}。` : "",
        wf ? `水火の読み（参考）: ${wf.slice(0, 220)}${wf.length > 220 ? "…" : ""}` : "",
      );
    } else {
      chunks.push(
        `語りの先頭付近に「${key}」があるが、一音索引の当該行は薄いか未整備の可能性がある。言霊は補助線としてのみ触れ、断定しないこと。`,
      );
    }
  }

  if (shuku) {
    chunks.push(`宿曜との接点（補助）: ${shuku}。本命宿の鑑定データを主軸にし、言霊は水ひょうとして添える。`);
  }

  const body = chunks.filter(Boolean).join("\n").trim();
  if (!body) return "";
  return `\n\n${body}`;
}
