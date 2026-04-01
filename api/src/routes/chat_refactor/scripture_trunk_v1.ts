export type CenterKeyV1 = "HOKEKYO" | "KUKAI" | "kotodama_hisho" | "katakamuna" | null;

export function detectCenterKeyV1(message: string): CenterKeyV1 {
  const q = String(message || "");
  if (/法華経/.test(q)) return "HOKEKYO";
  if (/(空海|声字実相義|三密|真言)/.test(q)) return "KUKAI";
  if (/言霊|言灵/.test(q)) return "kotodama_hisho";
  if (/カタカムナ/.test(q)) return "katakamuna";
  return null;
}

export function shouldUseLongformFallbackV1(message: string): boolean {
  const q = String(message || "");
  if (!q) return false;
  return /(長文|詳しく|詳細|核心|とは何か|説明せよ)/.test(q);
}

export function LONGFORM_FALLBACK_V1(centerKey: CenterKeyV1, message: string, current = ""): string {
  if (String(current || "").length >= 360) return String(current);

  if (centerKey === "HOKEKYO") {
    return [
      "法華経とは、全ての存在に仏となる可能性があるという視点を、譬喩と実践の両面で示す大乗経典です。",
      "要点は、教えを段階的に示す方便と、最終的に一つの乗り物へ統合されるという見取り図にあります。",
      "ここでの方便はごまかしではなく、受け手の理解段階に応じて入口を変える配慮として位置づけられます。",
      "そのため法華経の読解では、章ごとの主張だけでなく、なぜその順番で語られるかを追うことが重要です。",
      "実践面では、自己と他者を分断せず、苦の現場で働く慈悲と智慧を同時に鍛える方向が中心になります。",
      "要するに法華経は、教理の優劣を競うためではなく、迷いの現場を変えるための統合的な実践フレームです。",
    ].join("\n\n");
  }

  if (centerKey === "KUKAI") {
    return [
      "空海の文脈でいう声字実相義の核心は、音声・文字・実在が切り離された記号ではなく、修行と認識の場で連動するという点にあります。",
      "声は単なる音ではなく働きであり、字は単なる表記ではなく働きを固定し伝達可能にする器です。",
      "この対応を三密の実践へ接続すると、身口意を分離せず統合的に調えることで、理解が観念から体験へ移行する設計が見えてきます。",
      "つまり核心は、概念説明の巧拙ではなく、言葉を行に変換して現実の変化へ接続する点にあります。",
    ].join("\n\n");
  }

  if (centerKey === "kotodama_hisho") {
    return "言霊とは、語が意味を運ぶだけでなく、発話者と受け手の関係や行為の方向を動かす働きまで含めて捉える見方です。";
  }

  if (centerKey === "katakamuna") {
    return [
      "カタカムナとは何かを整理するときは、神秘化だけでなく、語彙体系・図像・解釈史を分けて確認するのが安全です。",
      "まず語彙体系としては、音と形の対応を通じて世界把握を記述しようとする試みとして読まれます。",
      "次に図像面では、文様の配列や反復が意味生成のルールとして扱われ、単語単位より構造単位で解釈されます。",
      "さらに解釈史では、時代ごとに実践論・宇宙論・言語論へ比重が移っており、一次資料と二次解釈を分ける必要があります。",
      "したがって実務上は、断定よりも出典・定義・適用範囲を明示して扱うのが妥当です。",
    ].join("\n\n");
  }

  return [
    "ご指定の主題は長文説明の要求として受け取りました。",
    "現時点では推定を避け、定義・背景・実践上の含意を分けて整理する方針で回答するのが安全です。",
    `対象: ${String(message || "").trim()}`,
  ].join("\n\n");
}
