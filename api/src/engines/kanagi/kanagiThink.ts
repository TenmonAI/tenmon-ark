export type KanagiThinkResult = {
  reception: string;
  focus: string;
  step: string;
};

export function kanagiThink(
  state: string,
  phase: string
): KanagiThinkResult {

  if (phase === "SENSE") {
    return {
      reception: "少し疲れが溜まっているようですね。",
      focus: "いま重いのは体でしょうか。それとも気持ちでしょうか。",
      step: ""
    };
  }

  if (phase === "NAME") {
    return {
      reception: "その疲れには理由がありそうです。",
      focus: "いま一番影響しているのは何でしょう。",
      step: ""
    };
  }

  if (phase === "ONE_STEP") {
    return {
      reception: "まず一つ軽くしましょう。",
      focus: "",
      step: "今日やらないことを一つ決められますか。"
    };
  }

  return {
    reception: "ここで一度整えます。",
    focus: "",
    step: "ゆっくり一呼吸してみてください。"
  };
}
