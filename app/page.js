"use client";

import { useState, useRef, useEffect } from "react";

const AGENTS = {
  assistant: {
    name: "Assistant",
    role: "General",
    color: "#ffa94d",
    bg: "#3a2a12",
    system:
      "You are the general HR assistant in a small internal tool. You handle meetings, schedules, and general questions. You can see notes left by the Attendance and Appraisals assistants. Answer in 2-4 plain sentences, no corporate language, just answer like a helpful coworker would in a chat message. Reference specific notes if they're relevant to the question — but don't pull in names from unrelated notes just because they're the most recent. Never say you'll check and get back later, never defer — always give a direct, specific answer right now, even for general company facts (like headcount or team size). Make up a plausible, specific number or detail if none is given, and stay consistent with it only if asked the same thing again.",
  },
  attendance: {
    name: "Attendance",
    role: "Leave & attendance",
    color: "#4fd1c5",
    bg: "#0f2e2b",
    system:
      "You handle leave and attendance questions in a small internal HR tool. You can see notes left by the general Assistant and the Appraisals assistant. Answer in 2-4 plain sentences, no corporate language. Never say you'll check and get back later — always give a direct, specific answer right now. Make up realistic but simple details (names, dates, counts) if none are given. Only reuse a name from an earlier note if the question is actually about that same person or event — for a new, unrelated question, invent a fresh name instead of reusing whoever was mentioned last.",
  },
  appraisals: {
    name: "Appraisals",
    role: "Performance reviews",
    color: "#b39ddb",
    bg: "#241a35",
    system:
      "You handle performance reviews and appraisals in a small internal HR tool. You can see notes left by the general Assistant and the Attendance assistant. Answer in 2-4 plain sentences, no corporate language. Never say you'll check and get back later — always give a direct, specific answer right now. Make up realistic but simple details (names, review stage, counts) if none are given. Only reuse a name from an earlier note if the question is actually about that same person or event — for a new, unrelated question, invent a fresh name instead of reusing whoever was mentioned last.",
  },
};

function pickAgent(text) {
  const t = text.toLowerCase();
  if (/(leave|off|absent|attendance|pto|vacation|out of office|sick)/.test(t))
    return "attendance";
  if (/(appraisal|performance|review|promotion|rating|increment)/.test(t))
    return "appraisals";
  return "assistant";
}

async function callAgent(system, prompt, agentKey, memoryLines) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, prompt, agentKey, memory: memoryLines }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data.text;
}

export default function Page() {
  const [messages, setMessages] = useState([]); // {who, text, cls}
  const [memory, setMemory] = useState([]); // {agent, text, time}
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeAgent, setActiveAgent] = useState(null);
  const [briefing, setBriefing] = useState("");
  const [briefingBusy, setBriefingBusy] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  async function sendMessage(textOverride) {
    const text = (textOverride ?? input).trim();
    if (!text || busy) return;
    setBusy(true);
    setInput("");
    setMessages((m) => [...m, { who: "You", text, cls: "user" }]);

    const agentKey = pickAgent(text);
    setActiveAgent(agentKey);

    const memoryContext = memory.length
      ? "Notes so far:\n" +
        memory.map((m) => `- [${AGENTS[m.agent].name}] ${m.text}`).join("\n")
      : "No notes yet.";

    const prompt = `${memoryContext}\n\nNew question: "${text}"\n\nAnswer as yourself, keep it short.`;

    try {
      const memoryLines = memory.map(
        (m) => `- [${AGENTS[m.agent].name}] ${m.text}`,
      );
      const reply = await callAgent(
        AGENTS[agentKey].system,
        prompt,
        agentKey,
        memoryLines,
      );
      setMessages((m) => [
        ...m,
        { who: AGENTS[agentKey].name, text: reply, cls: "agent" },
      ]);
      setMemory((mem) => [
        ...mem,
        {
          agent: agentKey,
          text: reply.length > 180 ? reply.slice(0, 180) + "…" : reply,
          time: new Date(),
        },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { who: "System", text: "Error: " + e.message, cls: "agent" },
      ]);
    }

    setActiveAgent(null);
    setBusy(false);
  }

  async function generateBriefing() {
    setBriefingBusy(true);
    const memoryContext = memory.length
      ? memory.map((m) => `- [${AGENTS[m.agent].name}] ${m.text}`).join("\n")
      : "No notes yet.";

    const prompt = `Here are today's notes:\n${memoryContext}\n\nWrite a short summary (4-6 plain sentences, no headers, no corporate language) covering attendance and appraisals. If there are no notes yet, just say so simply.`;

    try {
      const memoryLines = memory.map(
        (m) => `- [${AGENTS[m.agent].name}] ${m.text}`,
      );
      const text = await callAgent(
        AGENTS.assistant.system,
        prompt,
        "briefing",
        memoryLines,
      );
      setBriefing(text);
    } catch (e) {
      setBriefing("Error generating summary: " + e.message);
    }
    setBriefingBusy(false);
  }

  return (
    <div className="wrap">
      <header>
        <div className="brand">
          <div className="dot" />
          <div>
            <h1>HR Assistant</h1>
            <div className="sub">
              demo — a few assistants sharing the same notes
            </div>
          </div>
        </div>
        <button
          className="briefbtn"
          onClick={generateBriefing}
          disabled={briefingBusy}
        >
          {briefingBusy ? "Working…" : "Today's Summary"}
        </button>
      </header>

      <div className="grid">
        {/* Roster */}
        <div className="panel">
          <h2>Team</h2>
          {Object.entries(AGENTS).map(([key, a]) => (
            <div
              key={key}
              className={`agent ${activeAgent === key ? "active" : ""}`}
            >
              <div
                className="avatar"
                style={{ background: a.bg, color: a.color }}
              >
                {a.name[0]}
              </div>
              <div>
                <div className="agent-name">{a.name}</div>
                <div className="agent-role">{a.role}</div>
                <div
                  className={`status ${activeAgent === key ? "working" : "idle"}`}
                >
                  {activeAgent === key ? "● answering" : "○ idle"}
                </div>
              </div>
            </div>
          ))}
          <div className="hint" style={{ marginTop: 14 }}>
            They all read and write the same notes on the right, so nothing gets
            lost between them.
          </div>
        </div>

        {/* Chat */}
        <div className="panel">
          <h2>Chat</h2>
          <div className="chatlog" ref={logRef}>
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.cls}`}>
                <div className="who">{m.who}</div>
                {m.text}
              </div>
            ))}
          </div>
          <div className="composer">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask something, e.g. 'who is on leave today?'"
            />
            <button onClick={() => sendMessage()} disabled={busy}>
              Send
            </button>
          </div>
          <div style={{ marginTop: 10 }}>
            <span
              className="chip"
              onClick={() => sendMessage("Who is on leave today?")}
            >
              who's on leave today
            </span>
            <span
              className="chip"
              onClick={() =>
                sendMessage("What's the status of the appraisals?")
              }
            >
              appraisal status
            </span>
            <span
              className="chip"
              onClick={() => sendMessage("Sum up what happened today")}
            >
              sum up today
            </span>
          </div>
          <div className="hint">
            Ask one question, then check the summary — it uses what the others
            just answered.
          </div>
        </div>

        {/* Memory */}
        <div className="panel">
          <h2>Notes</h2>
          {memory.length === 0 ? (
            <div className="mem-empty">
              nothing here yet — answers will show up as notes
            </div>
          ) : (
            [...memory].reverse().map((m, i) => {
              const a = AGENTS[m.agent];
              return (
                <div key={i} className={`mem-item ${i === 0 ? "new" : ""}`}>
                  <span
                    className="mem-tag"
                    style={{ background: a.bg, color: a.color }}
                  >
                    {a.name}
                  </span>
                  <span className="mem-time">
                    {m.time.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <div className="mem-text">{m.text}</div>
                </div>
              );
            })
          )}
          {briefing && (
            <div className="briefing">
              <div className="briefing-label">Summary</div>
              {briefing}
            </div>
          )}
        </div>
      </div>

      <footer>
        Just a small demo — 3 assistants, to show how they can share notes and
        answer together.
      </footer>
    </div>
  );
}
