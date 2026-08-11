# Command Deck — Multi-Agent AI OS Prototype

Live working prototype: 3 specialized agents (Executive Assistant, Sales, Construction Ops)
sharing one organizational memory feed, plus a "Generate Daily Briefing" action that
synthesizes across all of them. Built to prove the architecture pattern behind the
25-agent AI OS pitch — not the final product.

---

## 0. Mock mode

Before touching the real API, test the whole app for free:

```bash
cd ai-os-prototype
npm install
cp .env.local.example .env.local
```

`.env.local.example` already ships with `MOCK_MODE=true` — leave it as is for now
(you can leave `ANTHROPIC_API_KEY` blank, it's not read in mock mode).

```bash
npm run dev
```

1. Go to https://aistudio.google.com/apikey and generate a key (just needs a
   Google account, no card, no billing setup)
2. In `.env.local`, set:
   ```
   MOCK_MODE=false
   PROVIDER=gemini
   GEMINI_API_KEY=your_key_here
   ```
3. `npm run dev` and test as normal — real, non-canned responses, zero cost.
   This is safe to demo to the client as-is.

**Option B — Anthropic, once the project is actually funded:**

```
MOCK_MODE=false
ANTHROPIC_API_KEY=sk-ant-...
```

(Leave `PROVIDER` blank or remove it — the code only checks it for `gemini`.)

Get a key from https://console.anthropic.com/settings/keys. Check your Console
Billing page first in case you do have trial credit sitting there unused.

**Same MOCK_MODE=true trick works on Vercel too** — just don't set `ANTHROPIC_API_KEY`
at all and set the `MOCK_MODE` env var to `true` in Vercel project settings. Useful
if you want to share a live link with a teammate to sanity-check the UI without
spending a single token.

---

## 1. Local testing with the real model (once you're ready to spend real tokens)

Make sure `.env.local` has `MOCK_MODE=false` and a real `ANTHROPIC_API_KEY` set (see
section 0 above), then:

```bash
npm run dev
```

Open http://localhost:3000


**Walkthrough sequence:**

1. Point at the roster: _"These three map to your Executive Assistant, Sales, and
   Construction Ops roles. In the full build this is 25, same pattern."_
2. Type a Sales-flavored task live, in front of her. Let her watch it route to Rex
   and respond.
3. Type an Ops task. Point out it routed to a _different_ agent automatically —
   no manual switching.
4. Point at the memory panel updating: _"This is the shared organizational memory
   you asked about — every agent reads and writes to the same log, so nothing gets
   siloed."_
5. Click **Generate Daily Briefing** last, as the payoff. Read it out loud. This is
   the "wow" moment — it references specific things the agents just did, proving the
   memory layer isn't cosmetic.


**Anticipate pushback:**

- _"Why only 3 agents?"_ → "Because proving the pattern matters more right now than
  breadth — Phase 1 in my original proposal was 3-5 agents plus your 2 most critical
  integrations, this is that in miniature."
- _"Why does it forget when I refresh?"_ → "Deliberate — this is a proof, not a
  deployed system. Persistent memory (proper database, not session state) is
  Phase 1 scope."
- _"How fast could Phase 1 actually be live?"_ → have your real timeline ready before
  the call, don't improvise a number live.
