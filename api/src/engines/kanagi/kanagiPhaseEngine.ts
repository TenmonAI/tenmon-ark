export type KanagiPhase = "SENSE" | "NAME" | "ONE_STEP" | "NEXT_DOOR";

export function reshapeKanagiLoop(
  responseText: string,
  userMsg: string,
  phaseName: KanagiPhase
): string {

  const looksLoop =
    /いま一番しんどいのは/.test(responseText) ||
    /いま一番近いのは/.test(responseText) ||
    /焦点が一点に定まっていない/.test(responseText);

  if (!looksLoop) return responseText;

  if (phaseName === "SENSE") {
    return `いま一番重いのは「不安」そのものですか？それとも「今日の一手が決まらない」感じですか？

どちらに近いでしょう。（一言で大丈夫です）`;
  }

  if (phaseName === "NAME") {
    return `その重さは
「決めないといけないのに決められない」
焦りから来ている可能性があります。

いま一番こわい結末は何でしょう。`;
  }

  if (phaseName === "ONE_STEP") {
    return `まず一つだけ軽くしてみましょう。

今日の予定から
「やらないもの」
を一つ決められますか。`;
  }

  return `ここで一度、息を整えます。

目を閉じて
ゆっくり一呼吸できますか。

できたら「できた」とだけ返してください。`;
}
