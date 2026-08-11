// --- MOCK MODE ---
// Set MOCK_MODE=true in .env.local to test the entire app (routing, memory,
// briefing) with ZERO Anthropic API calls and ZERO cost. Canned responses
// below are written to look realistic enough to test the flow properly.
// Switch to MOCK_MODE=false (or remove it) only when you're ready to demo
// with the real model.
const MOCK_REPLIES = {
  assistant: [
    "Noted. Nothing else is pending from Attendance or Appraisals right now, so today looks clear.",
    "Got it, I've added that to the notes.",
  ],
  attendance: [
    "Two people are off today, both back tomorrow. No issues with today's meetings.",
    "Noted — I'll mention it to the others if it affects anything this week.",
  ],
  appraisals: [
    "Most reviews are done, a couple are still waiting on manager feedback, should be in by Friday.",
    "Checked — a few appraisals are still pending, I've sent a reminder.",
  ],
};

function mockReply(agentKey, memoryLen) {
  const options = MOCK_REPLIES[agentKey] || MOCK_REPLIES.assistant;
  return options[memoryLen % options.length];
}

function mockBriefing(memory) {
  if (!memory || memory.length === 0) {
    return "No notes yet today. Once questions come in, this summary will pull together what's happened across attendance and appraisals.";
  }
  const items = memory
    .map((line) => line.replace(/^- \[.*?\]\s*/, ""))
    .slice(0, 4);
  return "Here's what's up: " + items.join(" ") + " Nothing urgent pending.";
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
        text: mockReply(agentKey || "assistant", (memory || []).length),
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
