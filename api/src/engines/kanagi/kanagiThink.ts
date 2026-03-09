export type KanagiThinkResult = {
  reception:string
  focus:string
  step:string
}

function detectTopic(message:string){
  const m = message || ""
  if(/人間関係|上司|部下|同僚/.test(m)) return "人間関係"
  if(/仕事|職場|会社|残業/.test(m)) return "仕事"
  if(/家族|子供|夫|妻|家庭/.test(m)) return "家族"
  if(/お金|収入|支出/.test(m)) return "お金"
  if(/時間|忙しい|余裕/.test(m)) return "時間"
  if(/迷|決められない/.test(m)) return "迷い"
  if(/不安|怖/.test(m)) return "不安"
  if(/体|体調|眠|疲/.test(m)) return "体"
  return ""
}

export function kanagiThink(
  state:string,
  phase:"SENSE"|"NAME"|"ONE_STEP"|"NEXT_DOOR",
  message:string=""
):KanagiThinkResult{

  const topic = detectTopic(message)

  if(phase==="SENSE"){

    let reception="少し疲れが溜まっているようですね。"

    if(topic){
      reception = topic+"のことで少し疲れが溜まっているようですね。"
    }

    return{
      reception:reception,
      focus:"いま重いのは体でしょうか。それとも気持ちでしょうか。",
      step:""
    }
  }

  if(phase==="NAME"){
    return{
      reception:"その疲れには理由がありそうです。",
      focus:"いま一番影響しているのは何でしょう。",
      step:""
    }
  }

  if(phase==="ONE_STEP"){
    return{
      reception:"まず一つ軽くしましょう。",
      focus:"",
      step:"今日やらないことを一つ決められますか。"
    }
  }

  return{
    reception:"ここで一度整えます。",
    focus:"",
    step:"ゆっくり一呼吸してみてください。"
  }
}
