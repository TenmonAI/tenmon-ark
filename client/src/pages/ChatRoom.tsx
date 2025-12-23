import { useState } from "react";

export default function ChatRoom() {
  const [text, setText] = useState("");

  return (
    <div style={{ padding: 40 }}>
      <h1>TENMON-ARK</h1>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        cols={40}
      />
    </div>
  );
}
