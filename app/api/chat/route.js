// --- MOCK MODE ---
// Set MOCK_MODE=true in .env.local to test the entire app (routing, memory,
// briefing) with ZERO Anthropic API calls and ZERO cost. Canned responses
// below are written to look realistic enough to test the flow properly.
// Switch to MOCK_MODE=false (or remove it) only when you're ready to demo
// with the real model.
const MOCK_REPLIES = {
  ava: [
    "Got it — I've noted that for your schedule. Based on what's in the shared log, I'd suggest tackling the Riverside permit follow-up before end of day since Nova flagged it as time-sensitive.",
    "Noted and logged. Nothing else urgent is queued from Sales or Ops right now, so this is a good window to knock it out.",
  ],
  rex: [
    "Logged. The Miller lead is currently at 'site visit scheduled' stage — I've queued a follow-up call for tomorrow morning and will update the deal status once we hear back.",
    "On it — I'll follow up with them today and flag it back to Ava if it needs to move up the priority list.",
  ],
  nova: [
    "Riverside site permits are currently under county review — expected clearance in 3-4 business days. Subcontractor schedule is holding for now, no blockers to report.",
    "Checked the timeline — inspection is booked for Thursday, no conflicts with the current build schedule.",
  ],
};

function mockReply(agentKey, memoryLen) {
  const options = MOCK_REPLIES[agentKey] || MOCK_REPLIES.ava;
  return options[memoryLen % options.length];
}

function mockBriefing(memory) {
  if (!memory || memory.length === 0) {
    return "No activity has been logged yet today. Once agents start handling tasks, this briefing will summarize what happened across Sales, Ops, and your schedule — in a few short lines, every morning.";
  }
  const items = memory
    .map((line) => line.replace(/^- \[.*?\]\s*/, ""))
    .slice(0, 4);
  return (
    "Here's where things stand: " +
    items.join(" ") +
    " Nothing urgent is blocked — happy to go deeper on any of these."
  );
}
// --- END MOCK MODE ---

export async function POST(req) {
  try {
    const { system, prompt, agentKey, memory } = await req.json();

    if (process.env.MOCK_MODE === "true") {
      // Simulate a little latency so the UI feels real during testing.
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
      if (agentKey === "briefing") {
        return Response.json({ text: mockBriefing(memory || []) });
      }
      return Response.json({
        text: mockReply(agentKey || "ava", (memory || []).length),
      });
    }

    // --- GEMINI PROVIDER (real model, genuinely free tier via Google AI Studio) ---
    // Set PROVIDER=gemini and GEMINI_API_KEY in .env.local to test with a real
    // model at zero cost. Get a free key (no card needed) at
    // https://aistudio.google.com/apikey
    if (process.env.PROVIDER === "gemini") {
      if (!process.env.GEMINI_API_KEY) {
        return Response.json(
          {
            error:
              "GEMINI_API_KEY is not set. Get a free key (no card needed) at https://aistudio.google.com/apikey",
          },
          { status: 500 },
        );
      }
      const geminiModel = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
      const gRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 300 },
          }),
        },
      );
      const gData = await gRes.json();
      if (!gRes.ok) {
        return Response.json(
          { error: gData?.error?.message || "Gemini API error" },
          { status: gRes.status },
        );
      }
      const gText =
        gData?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ||
        "(no response)";
      return Response.json({ text: gText });
    }
    // --- END GEMINI PROVIDER ---

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        {
          error:
            "ANTHROPIC_API_KEY is not set on the server. Add it in Vercel Project Settings -> Environment Variables. (Or set MOCK_MODE=true, or PROVIDER=gemini, to test for free.)",
        },
        { status: 500 },
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 300,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        { error: data?.error?.message || "Anthropic API error" },
        { status: response.status },
      );
    }

    const textBlock = (data.content || []).find((b) => b.type === "text");
    return Response.json({
      text: textBlock ? textBlock.text : "(no response)",
    });
  } catch (err) {
    return Response.json(
      { error: err.message || "Unknown server error" },
      { status: 500 },
    );
  }
}
