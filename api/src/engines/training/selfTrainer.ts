import { runSelfDialogue } from "./selfDialogue.js"
import { evaluateTenmon } from "./tenmonEvaluator.js"

export async function runSelfTraining() {

  const questions = [
    "魂とは何？",
    "言霊とは何？",
    "水火とは何？",
    "迷いとは何？",
    "断捨離とは何？"
  ]

  const results = []

  for (const q of questions) {

    const answer = await runSelfDialogue(q)

    const evalResult = evaluateTenmon(answer)

    results.push({
      question: q,
      answer,
      pass: evalResult.pass,
      errors: evalResult.errors
    })

    if (!evalResult.pass) {
      throw new Error("TENMON_EVALUATION_FAIL")
    }
  }

  return results
}
