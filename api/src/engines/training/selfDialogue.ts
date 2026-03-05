/** Uses global fetch (Node 18+). */
export async function runSelfDialogue(question: string) {

  const res = await fetch("http://127.0.0.1:3000/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: question,
      threadId: "tenmon-audit"
    })
  })

  const data = await res.json()

  return data.response
}
