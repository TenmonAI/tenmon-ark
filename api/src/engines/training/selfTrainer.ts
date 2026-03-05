import { runSelfDialogue } from "./selfDialogue.js"
import { evaluateTenmon } from "./tenmonEvaluator.js"

export async function runSelfTraining() {

  const questions = [
    "魂はどこにある？（一般論禁止）",
    "言霊は何でできている？",
    "水火（イキ）とは何？",
    "文字音の省とは何？",
    "迷いを断捨離すると何が残る？"
  ]

  const results = []

  for (const q of questions) {

    const answer = await runSelfDialogue(q)

    const pass = evaluateTenmon(answer)

    results.push({
      question: q,
      answer,
      pass,
      errors: pass ? [] : ["evaluateTenmon score < 3"]
    })

    if (!pass) {
      throw new Error("TENMON_EVALUATION_FAIL")
    }
  }

  return results
}
