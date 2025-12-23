// Training Chat: Learning Material Storage UI

import { useState, useEffect } from "react";
import { API_BASE_URL } from "../config/api.js";

type TrainingSession = {
  id: string;
  title: string;
  created_at: number;
};

type TrainingMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: number;
};

type TrainingRule = {
  id: string;
  type: "vocabulary" | "policy" | "behavior" | "other";
  title: string;
  rule_text: string;
  tags: string[];
  evidence_message_ids: string[];
  confidence: number;
  created_at: number;
};

export function TrainingPage() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<{
    session: TrainingSession | null;
    messages: TrainingMessage[];
  } | null>(null);
  const [rules, setRules] = useState<TrainingRule[]>([]);
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [dumpText, setDumpText] = useState("");
  const [ingesting, setIngesting] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      loadSession(selectedSession);
      loadRules(selectedSession);
    }
  }, [selectedSession]);

  const loadSessions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/training/sessions`);
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error("[TRAINING] Failed to load sessions", error);
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/training/session/${sessionId}`);
      const data = await res.json();
      if (data.success) {
        setSessionData({ session: data.session, messages: data.messages });
      }
    } catch (error) {
      console.error("[TRAINING] Failed to load session", error);
    }
  };

  const loadRules = async (sessionId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/training/rules?session_id=${sessionId}`);
      const data = await res.json();
      if (data.success) {
        setRules(data.rules);
      }
    } catch (error) {
      console.error("[TRAINING] Failed to load rules", error);
    }
  };

  const createSession = async () => {
    if (!newSessionTitle.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/training/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newSessionTitle.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        setNewSessionTitle("");
        await loadSessions();
        setSelectedSession(data.session.id);
      } else {
        alert(`Failed to create session: ${data.error}`);
      }
    } catch (error) {
      console.error("[TRAINING] Create session error", error);
      alert("Failed to create session");
    }
  };

  const ingestDump = async () => {
    if (!selectedSession || !dumpText.trim()) return;

    setIngesting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/training/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: selectedSession,
          dump_text: dumpText.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Ingested: ${data.messagesCount} messages, ${data.rulesCount} rules extracted`);
        setDumpText("");
        await loadSession(selectedSession);
        await loadRules(selectedSession);
      } else {
        alert(`Failed to ingest: ${data.error}`);
      }
    } catch (error) {
      console.error("[TRAINING] Ingest error", error);
      alert("Failed to ingest conversation");
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Training Chat</h1>

        {/* Create Session */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Session</h2>
          <div className="flex gap-4">
            <input
              type="text"
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
              placeholder="Session title..."
              value={newSessionTitle}
              onChange={(e) => setNewSessionTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  createSession();
                }
              }}
            />
            <button
              className="px-4 py-2 bg-gray-900 text-white rounded text-sm hover:bg-gray-800"
              onClick={createSession}
            >
              Create
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Sessions List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sessions</h2>
            <div className="space-y-2">
              {sessions.length === 0 ? (
                <p className="text-sm text-gray-500">No sessions yet</p>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    className={`w-full text-left p-3 rounded border ${
                      selectedSession === session.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedSession(session.id)}
                  >
                    <p className="text-sm font-medium text-gray-900">{session.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(session.created_at).toLocaleString()}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Ingest Dump */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ingest Conversation</h2>
            {selectedSession ? (
              <>
                <textarea
                  className="w-full border border-gray-300 rounded p-3 text-sm resize-none mb-4"
                  rows={8}
                  placeholder="Paste conversation dump here..."
                  value={dumpText}
                  onChange={(e) => setDumpText(e.target.value)}
                />
                <button
                  className="w-full px-4 py-2 bg-gray-900 text-white rounded text-sm hover:bg-gray-800 disabled:opacity-50"
                  onClick={ingestDump}
                  disabled={ingesting || !dumpText.trim()}
                >
                  {ingesting ? "Ingesting..." : "Ingest"}
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-500">Select a session first</p>
            )}
          </div>
        </div>

        {/* Messages */}
        {sessionData && sessionData.messages.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Messages</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {sessionData.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded ${
                    msg.role === "user"
                      ? "bg-blue-50 text-blue-900"
                      : msg.role === "assistant"
                        ? "bg-gray-50 text-gray-900"
                        : "bg-yellow-50 text-yellow-900"
                  }`}
                >
                  <p className="text-xs font-medium mb-1 uppercase">{msg.role}</p>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rules */}
        {rules.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Extracted Rules</h2>
            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule.id} className="border border-gray-200 rounded p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-700">
                        {rule.type}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">
                        Confidence: {rule.confidence}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{rule.title}</h3>
                  <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">{rule.rule_text}</p>
                  {rule.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {rule.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

