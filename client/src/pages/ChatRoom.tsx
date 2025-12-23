import { useState } from "react";

export default function ChatRoom() {
  const [text, setText] = useState("");

  async function send() {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const json = await res.json();
    console.log(json);
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>TENMON-ARK</h1>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        cols={40}
      />
      <br />
      <button onClick={send}>Send</button>
    </div>
  );
}
