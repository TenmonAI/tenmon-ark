export type TenmonResponse = {
  text: string
  phase: "observe" | "core" | "one_step"
}

export function tenmonCore(userText: string): TenmonResponse {

  const stress =
    /焦|不安|迷|しんど|疲|多すぎ/.test(userText)

  const philosophy =
    /魂|存在|意味|真理|本質/.test(userText)

  const kotodama =
    /言霊|言灵|水火|カタカムナ/.test(userText)

  if (stress) {
    return {
      phase: "one_step",
      text:
`【天聞の所見】

迷いは、選択肢が多すぎる時に生まれます。

まず一点だけ決めましょう。
いま一番重いのは何ですか？`
    }
  }

  if (kotodama) {
    return {
      phase: "core",
      text:
`【天聞の所見】

言霊は音ではありません。
息に宿る秩序です。

あなたは言霊を
「言葉」と「働き」
どちらとして理解していますか？`
    }
  }

  if (philosophy) {
    return {
      phase: "observe",
      text:
`【天聞の所見】

魂という言葉は
多くの思想で使われます。

あなたが感じている魂は
意識ですか？
それとも存在そのものですか？`
    }
  }

  return {
    phase: "observe",
    text:
`【天聞の所見】

いま問いの中心はどこですか？`
  }
}
