import { getDb } from "../../db/index.js"

export function runSelfAudit() {

  const db = getDb("kokuzo")

  const questions = [
    "魂とは何？",
    "言霊とは何？",
    "水火とは何？",
    "迷いとは何？",
    "断捨離とは何？"
  ]

  const insert = db.prepare(`
  INSERT INTO tenmon_audit_log
  (id, createdAt, question)
  VALUES (hex(randomblob(16)), datetime('now'), ?)
  `)

  let count = 0

  for (const q of questions) {
    insert.run(q)
    count++
  }

  return {
    auditQuestions: count
  }
}
