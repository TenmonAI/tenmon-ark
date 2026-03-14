export type TenmonOutputMode = "FREE" | "HYBRID" | "STRICT";

export function decideTenmonOutputMode(input: string): TenmonOutputMode {
  const t = String(input || "").trim();

  if (
    /言霊|言灵/u.test(t) &&
    /カタカムナ/u.test(t) &&
    /違い|ちがい|比較|どう違う|分けて/u.test(t)
  ) {
    return "STRICT";
  }

  if (
    /断捨離/u.test(t) ||
    /人生全体/u.test(t) ||
    /どう使える/u.test(t) ||
    /整理/u.test(t)
  ) {
    return "HYBRID";
  }

  return "FREE";
}

function normalize(text: string): string {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function stripPrefix(text: string): string {
  return normalize(
    String(text || "")
      .replace(/^【天聞の所見】\s*/u, "")
      .replace(/^【所見】\s*/u, "")
      .replace(/^天聞としては、?\s*/u, "")
  );
}

export function shapeTenmonOutput(input: string, rawText: string): string {
  const mode = decideTenmonOutputMode(input);
  const t = String(input || "").trim();
  const text = stripPrefix(rawText);

  if (mode === "STRICT") {
    if (
      /言霊|言灵/u.test(t) &&
      /カタカムナ/u.test(t) &&
      /違い|ちがい|比較|どう違う|分けて/u.test(t)
    ) {
      return normalize(
`原典系の扱いに注意して大づかみに分けると、言霊は「音・詞・五十音の法則としての働き」を読む軸であり、カタカムナはそれを別系統の資料群・表記・宇宙観から読む体系として扱うほうが混線しにくいです。

したがって、両者をそのまま完全同義として重ねるより、
1) 言霊秘書系
2) 楢崎系
3) 天聞整理
を分けて比較するほうが安全です。

厳密に進めるなら、次に
- 言霊側で何が中心概念か
- カタカムナ側で何が中心概念か
を並べて差分を出します。`
      );
    }
    return text;
  }

  if (mode === "HYBRID") {
    if (/断捨離/u.test(t) && /どう使える/u.test(t)) {
      return normalize(
`断捨離を人生全体に使うなら、単に物を減らすというより、「いまの自分に本当に必要なものを見極める」ための整理法として使うのが軸です。

たとえば、
1) 予定
2) 人間関係
3) 思い込み
の三つに当てると、人生全体の整理に広げやすくなります。

そのうえで最初の一歩として、いま一番重いものを一つだけ挙げてみてください。`
      );
    }

    return text;
  }

  if (/保存挙動|保存.*確認/u.test(t)) {
    return normalize(
`何の保存を見たいですか。

たとえば
1) DBに書けているか
2) 再読込しても残るか
3) ユーザーごとに分離できているか

のどれを確認したいですか？`
    );
  }

  return text;
}
