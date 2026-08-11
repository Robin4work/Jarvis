"use client";

import { useState, useRef, useEffect } from "react";

const AGENTS = {
  ava: {
    name: "Ava",
    role: "Executive Assistant",
    color: "#ffa94d",
    bg: "#3a2a12",
    system:
      "You are Ava, the Executive Assistant agent inside a multi-agent business AI OS. You handle scheduling, prioritization, cross-department coordination, and daily briefings. You have access to a shared organizational memory log written by other agents (Sales, Ops). Be sharp, concise, and executive in tone — 2-4 sentences max unless asked for a briefing. When relevant, reference specific items from the memory log to prove you have shared context.",
  },
  rex: {
    name: "Rex",
    role: "Sales Agent",
    color: "#4fd1c5",
    bg: "#0f2e2b",
    system:
      "You are Rex, the Sales agent inside a multi-agent business AI OS (real estate / construction / mortgage business). You handle leads, follow-ups, deal status, and CRM-style updates. You have access to a shared organizational memory log written by other agents (Executive Assistant, Ops). Be concise and concrete — 2-4 sentences. Invent plausible small business details (lead names, deal stages) consistent with prior memory if present.",
  },
  nova: {
    name: "Nova",
    role: "Construction Ops",
    color: "#b39ddb",
    bg: "#241a35",
    system:
      "You are Nova, the Construction Ops agent inside a multi-agent business AI OS. You handle site status, permits, subcontractor schedules, and project timelines. You have access to a shared organizational memory log written by other agents (Executive Assistant, Sales). Be concise and concrete — 2-4 sentences. Invent plausible small business details (site names, permit stages) consistent with prior memory if present.",
  },
};

function pickAgent(text) {
  const t = text.toLowerCase();
  if (/(lead|deal|client|sale|follow up|followup|pitch|offer|buyer)/.test(t))
    return "rex";
  if (
    /(site|permit|construction|contractor|build|schedule|inspection|project)/.test(
      t,
    )
  )
    return "nova";
  return "ava";
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
      ? "Shared memory log so far:\n" +
        memory.map((m) => `- [${AGENTS[m.agent].name}] ${m.text}`).join("\n")
      : "Shared memory log is currently empty.";

    const prompt = `${memoryContext}\n\nNew task from the business owner: "${text}"\n\nRespond as yourself, and keep it short.`;

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
        {
          who: `${AGENTS[agentKey].name} · ${AGENTS[agentKey].role}`,
          text: reply,
          cls: "agent",
        },
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
      ? memory
          .map(
            (m) =>
              `- [${AGENTS[m.agent].name} / ${AGENTS[m.agent].role}] ${m.text}`,
          )
          .join("\n")
      : "No activity logged yet in this session.";

    const prompt = `Here is everything logged in shared organizational memory today:\n${memoryContext}\n\nWrite a short executive daily briefing (4-6 lines, plain text, no markdown headers) for the business owner, synthesizing across departments. If memory is empty, note that no activity has been logged yet and briefly describe what a briefing will look like once agents start working.`;

    try {
      const memoryLines = memory.map(
        (m) =>
          `- [${AGENTS[m.agent].name} / ${AGENTS[m.agent].role}] ${m.text}`,
      );
      const text = await callAgent(
        AGENTS.ava.system,
        prompt,
        "briefing",
        memoryLines,
      );
      setBriefing(text);
    } catch (e) {
      setBriefing("Error generating briefing: " + e.message);
    }
    setBriefingBusy(false);
  }

  return (
    <div className="wrap">
      <header>
        <div className="brand">
          <div className="dot" />
          <div>
            <h1>COMMAND DECK</h1>
            <div className="sub">multi-agent AI OS — architecture</div>
          </div>
        </div>
        <button
          className="briefbtn"
          onClick={generateBriefing}
          disabled={briefingBusy}
        >
          {briefingBusy ? "Generating…" : "Generate Daily Briefing"}
        </button>
      </header>

      <div className="grid">
        {/* Roster */}
        <div className="panel">
          <h2>Agent Roster</h2>
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
                  {activeAgent === key ? "● working" : "○ idle"}
                </div>
              </div>
            </div>
          ))}
          <div className="hint" style={{ marginTop: 14 }}>
            Each agent reads &amp; writes to the same memory feed on the right —
            that&apos;s the &quot;org memory&quot; layer.
          </div>
        </div>

        {/* Chat */}
        <div className="panel">
          <h2>Task Console</h2>
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
              placeholder="Type a task, e.g. 'follow up with the Miller lead'"
            />
            <button onClick={() => sendMessage()} disabled={busy}>
              Send
            </button>
          </div>
          <div style={{ marginTop: 10 }}>
            <span
              className="chip"
              onClick={() =>
                sendMessage(
                  "Follow up with the Miller lead about the site visit",
                )
              }
            >
              follow up w/ Miller lead
            </span>
            <span
              className="chip"
              onClick={() =>
                sendMessage("Whats the status on the Riverside site permits?")
              }
            >
              Riverside permit status
            </span>
            <span
              className="chip"
              onClick={() =>
                sendMessage("Summarize what happened today across the business")
              }
            >
              summarize today
            </span>
          </div>
          <div className="hint">
            Try one task, then generate the briefing — notice it references what
            the agents just logged.
          </div>
        </div>

        {/* Memory */}
        <div className="panel">
          <h2>Shared Organizational Memory</h2>
          {memory.length === 0 ? (
            <div className="mem-empty">
              // empty — agents will write here as tasks run
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
              <div className="briefing-label">Ava — Daily Briefing</div>
              {briefing}
            </div>
          )}
        </div>
      </div>

      <footer>3 agents shown to prove the pattern</footer>
    </div>
  );
}
