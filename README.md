# Command Deck — Multi-Agent AI OS Prototype

Live working prototype: 3 specialized agents (Executive Assistant, Sales, Construction Ops)
sharing one organizational memory feed, plus a "Generate Daily Briefing" action that
synthesizes across all of them. Built to prove the architecture pattern behind the
25-agent AI OS pitch — not the final product.

---

## 0. Mock mode — test everything for ₹0 / $0

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

Open http://localhost:3000 and run through the full test checklist below (section 2).
Every response is a canned, realistic-looking reply served instantly by the API
route itself — **zero calls leave your machine, zero cost, no key needed.** This is
enough to verify routing, shared memory, the briefing logic, and the UI end to end.

Only when you're ready to actually demo with real model output do you flip the
switch. You have two options:

**Option A — free real model output (Google Gemini):**

Anthropic's auto trial credit doesn't apply to every account (some show $0.00
in Console — check yours at console.anthropic.com → Billing before assuming you
have any). Google's Gemini API, on the other hand, has a genuinely free,
no-card, no-expiry tier. Use it for testing _and_ for the actual client demo —
the whole point right now is proving the architecture pattern (routing +
shared memory + briefing), not which model powers it. Switch to Anthropic
later, once the client actually greenlights and funds the real build.

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

**Test checklist:**

- Type a task like "follow up with the Miller lead" → should route to Rex (Sales), roster shows him "working"
- Type "what's the status on the Riverside site permits?" → should route to Nova (Ops)
- Type anything scheduling/general → routes to Ava (EA)
- After 2-3 tasks, click "Generate Daily Briefing" → Ava should reference the actual
  logged items, not generic filler. This is the moment that proves shared memory works.
- Refresh the page → memory resets (it's session-only in this prototype, intentionally —
  real version would persist to a DB).

If a message fails, check the browser console and terminal — most common issue is a
missing/invalid `ANTHROPIC_API_KEY`.

---

## 2. Deploying to Vercel

**Option A — via GitHub (recommended):**

```bash
cd ai-os-prototype
git init
git add .
git commit -m "Command Deck AI OS prototype"
```

Push to a new GitHub repo (create it first on github.com, then):

```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
git branch -M main
git push -u origin main
```

Then:

1. Go to https://vercel.com/new
2. Import the repo
3. Framework preset: Next.js (auto-detected, don't change anything)
4. Before deploying, expand **Environment Variables** and add:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your key
5. Click Deploy

**Option B — Vercel CLI (faster, no GitHub needed):**

```bash
npm i -g vercel
cd ai-os-prototype
vercel
```

Follow prompts (link/create project). Then set the env var:

```bash
vercel env add ANTHROPIC_API_KEY
```

Paste the key when prompted, choose Production (and Preview if you want). Then:

```bash
vercel --prod
```

You'll get a live `https://your-project.vercel.app` URL.

**Important:** the API key must be added as an Environment Variable in Vercel project
settings either way — it's never committed to the repo (`.env.local` is gitignored).

---

## 3. How to demo this to a client (e.g. Rebekah)

**Don't lead with "here's a prototype."** Lead with the problem she raised.

**Opening line:**

> "You said you wanted to see it work, not just read about it — so here's a small
> working slice of the exact pattern: agents that share memory and hand off to each
> other. Three agents, live, calling the model in real time."

**Walkthrough sequence (2-3 minutes, don't rush):**

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

**When she asks "is this the real thing?" — be straight about it:**

> "No — this is the architecture proven at small scale, live, in about an hour.
> The real build replaces keyword routing with proper intent classification, adds
> your actual integrations (CRM, accounting, etc.), makes memory persistent instead
> of session-based, and scales from 3 agents to your full department list. This
> is here so you're not taking that on faith."

**Anticipate pushback:**

- _"Why only 3 agents?"_ → "Because proving the pattern matters more right now than
  breadth — Phase 1 in my original proposal was 3-5 agents plus your 2 most critical
  integrations, this is that in miniature."
- _"Why does it forget when I refresh?"_ → "Deliberate — this is a proof, not a
  deployed system. Persistent memory (proper database, not session state) is
  Phase 1 scope."
- _"How fast could Phase 1 actually be live?"_ → have your real timeline ready before
  the call, don't improvise a number live.

**Close by moving to commitment, not more demo:**

> "If this is the direction you want, next step is a call to map your actual stack —
> which CRM, which accounting tool — so I can turn this into a precise Phase 1 plan
> and timeline."

---

## 4. What's deliberately NOT in this prototype (say this proactively, don't wait to be asked)

- Routing is keyword-based, not LLM-classified (fast to build, not how the real
  version would route)
- Memory is in-browser session state, not a database — resets on refresh
- No real integrations (CRM, accounting, calendar) — agents invent plausible details
- No auth / multi-user support
- No voice

Naming these upfront builds more trust than letting her find them.
