// Training Chat: Minimal UI for Personality Formation

import { useState, useEffect } from "react";

type TrainingIntent = "teach" | "question" | "verify" | "correct";

export function TrainPage() {
  const [message, setMessage] = useState("");
  const [intent, setIntent] = useState<TrainingIntent>("teach");
  const [importance, setImportance] = useState(3);
  const [response, setResponse] = useState<string | null>(null);
  const [thinkingAxis, setThinkingAxis] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sessionId] = useState(() => `train_${Date.now()}`);

  const sendMessage = async () => {
    if (!message.trim() || sending) return;

    setSending(true);
    setResponse(null);

    try {
      const res = await fetch("/api/train/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          intent,
          importance,
          session_id: sessionId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResponse(data.response);
        setThinkingAxis(data.thinkingAxis);
        setMessage(""); // Clear input after sending
      } else {
        setResponse(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("[TRAIN] Send error", error);
      setResponse("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const commitSession = async (policy: "save" | "compress" | "discard") => {
    try {
      const res = await fetch("/api/train/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          commit_policy: policy,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message || `Committed as ${policy}`);
        // Reset after commit
        setResponse(null);
        setThinkingAxis(null);
      } else {
        alert(`Commit failed: ${data.error}`);
      }
    } catch (error) {
      console.error("[TRAIN] Commit error", error);
      alert("Failed to commit session");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Training Chat</h1>
        <p className="text-sm text-gray-600 mb-6">
          Session ID: {sessionId}
        </p>

        {/* Input Area */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Training Message</h2>

          <textarea
            className="w-full border border-gray-300 rounded p-3 text-sm resize-none focus:outline-none focus:border-gray-400 mb-4"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Enter training message..."
            rows={4}
          />

          <div className="flex items-center gap-6 mb-4">
            {/* Intent Selector */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Intent:</label>
              <select
                className="border border-gray-300 rounded px-3 py-1 text-sm"
                value={intent}
                onChange={(e) => setIntent(e.target.value as TrainingIntent)}
              >
                <option value="teach">Teach</option>
                <option value="question">Question</option>
                <option value="verify">Verify</option>
                <option value="correct">Correct</option>
              </select>
            </div>

            {/* Importance Slider */}
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Importance: {importance}
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={importance}
                onChange={(e) => setImportance(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
              </div>
            </div>
          </div>

          <button
            className="px-6 py-2 bg-gray-900 text-white rounded text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={sendMessage}
            disabled={sending || !message.trim()}
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>

        {/* Response Area */}
        {response && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">TENMON-ARK Response</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{response}</p>
            </div>
            {thinkingAxis && (
              <p className="text-xs text-gray-500">Thinking Axis: {thinkingAxis}</p>
            )}
          </div>
        )}

        {/* Commit Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Commit Session</h2>
          <div className="flex gap-4">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              onClick={() => commitSession("save")}
            >
              Commit as Seed
            </button>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              onClick={() => commitSession("compress")}
            >
              Compress & Commit
            </button>
            <button
              className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              onClick={() => commitSession("discard")}
            >
              Discard Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

