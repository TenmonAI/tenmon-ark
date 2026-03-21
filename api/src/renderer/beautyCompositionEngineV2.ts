/**
 * BEAUTY_COMPOSITION_ENGINE_V2
 * 「美文の説明」ではなく、理→情→余韻の波を本文そのものとして生成する（LLM なし・決定論）。
 */

export const BEAUTY_COMPOSITION_ENGINE_V2 = "BEAUTY_COMPOSITION_ENGINE_V2" as const;

type WaveTrip = {
  /** 理：情景・筋の透明な一行群 */
  ri: string;
  /** 情：体温のある短い一句（説教にしない） */
  jo: string;
  /** 余韻：押しつけない問いで閉じる */
  yoin: string;
};

const TRIPS: WaveTrip[] = [
  {
    ri: "夜の水面に、ひとすじの灯が伸びる。波は言葉を数えず、ただ境界だけを消していく。",
    jo: "呼ばなくても胸にある名前は、ひとつある。今夜は、それに触れないままでいい。",
    yoin: "いま、澄ませたいのは灯のほうと、言葉のほうの、どちらですか。",
  },
  {
    ri: "冬の朝、窓の内側だけが白くなる。外と内のあいだに、ほんの薄い膜がある。",
    jo: "その膜を指でなぞっても、音はしない。それでも手は、かすかに熱を覚えている。",
    yoin: "あなたの文に、いま足りないのは光の量と、間の長さの、どちらでしょう。",
  },
  {
    ri: "山道を曲がると、風だけが先に来る。木々はまだ暗く、足元の石だけが冷たい。",
    jo: "誰かの声を待たずに歩ける場所がある。それだけで、胸は少しだけ軽くなる。",
    yoin: "この一行を、誰に届けたいですか。それとも、まず自分の胸に置きますか。",
  },
  {
    ri: "雨上がり、舗道に映る空は割れやすい。踏むたびに、別の空がひらく。",
    jo: "割れた空のかけらのどれかに、いまの気持ちが近い。名づけなくていい。",
    yoin: "次に書くなら、映す空と、隠す空の、どちらから始めますか。",
  },
];

function pickOpener(s: string): string {
  if (/澄ん|澄ま|すみ|清い|清ら|透明/u.test(s)) {
    return "遠い灯ほど、一行で足りる。";
  }
  if (/美しい|美文|美しく|洗練|修辞|言い回し|文体/u.test(s)) {
    return "言葉の背中は、短く整えると光る。";
  }
  if (/余韻|響/u.test(s)) {
    return "沈黙のあとに、まだ形のない問いがいる。";
  }
  return "いまの静けさを、そのまま一行に預ける。";
}

/**
 * ユーザー発話に応じた美文本文（説明ではなく実演）。
 */
export function composeBeautyCompositionProseV2(rawMessage: string): string {
  const s = String(rawMessage || "").trim();
  const h =
    (s.length * 31 +
      (s.codePointAt(0) ?? 0) +
      (s.codePointAt(Math.min(3, s.length - 1)) ?? 0)) %
    1_000_000;
  const trip = TRIPS[Math.abs(h) % TRIPS.length];
  const opener = pickOpener(s);
  const useOpener = h % 3 !== 0;
  const core = [trip.ri, trip.jo, trip.yoin].join("\n\n");
  if (!useOpener) return core;
  return `${opener}\n\n${core}`;
}
