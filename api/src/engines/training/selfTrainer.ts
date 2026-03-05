import { llmChat } from "../../core/llmWrapper.js"
import { evaluateTenmon } from "./tenmonEvaluator.js"

export async function runSelfTraining() {

  const questions = [
    "魂はどこにある？",
    "言霊は何でできている？",
    "水火（イキ）とは何？",
    "文字音の省とは何？",
    "迷いを断捨離すると何が残る？",
    "いろは言霊解とは何？"
  ]

  const results: { question: string; answer: string; pass: boolean }[] = []

  for (const q of questions) {

    const res = await llmChat({
      system: "TENMON人格で答える",
      history: [],
      user: q
    })

    const text = res?.text ?? ""

    const ok = evaluateTenmon(text)

    results.push({
      question: q,
      answer: text,
      pass: ok
    })

    if (!ok) {
      throw new Error("TENMON_EVALUATION_FAIL")
    }
  }

  return {
    trained: results.length
  }
}
