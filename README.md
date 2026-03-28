<div align="center">

# Semicolon;

**Architecture native development environment**

*Describe it. Diagram it. Build it.*

</div>

---

### The problem

Turning an idea into software usually splits across docs, diagrams, tickets, and repos. The **architecture** (services, APIs, data, dependencies) drifts from what you actually build, and going from “description” to **runnable code** takes many manual steps.

### How Semicolon helps

You **describe** what you want in natural language. Semicolon **infers an architecture** as an interactive diagram, lets you **correct and extend** it (by hand or with AI), then **runs an agentic build**. That output is wired for **version control (Git)**—an initial repo and commit—so you can **see what changed and how** as the build (and later edits) land, without leaving one workspace. The loop is: **spec → diagram → refine → build**.

### Features

- **Spec to diagram** — Guided flow turns your description into typed services, connections, and endpoint contracts on a canvas.
- **Diagram as source of truth** — Inspect each service (status, description, endpoints, env, dependencies); edit fields and persist to the project.
- **AI-assisted architecture** — Refine a single service or the whole graph via chat; changes feed back into the same diagram and stored project state.
- **Build & observe** — Start a build from the diagram; stream logs, track per-service build state, and interrupt safely when needed.
- **Git on the output** — The monorepo the agent creates is initialized with Git (including an initial commit) so you can track what changed in generated code over time.
- **Project memory** — Projects and architecture are stored locally (SQLite); sidebar lists recent work; rename projects in place.
- **Open in VS Code** — Jump from the app to the generated folder on your machine (`~/semicolon-builds/<projectId>`) when you want to hack on the output.

### Run locally

```bash
# .env.local — ANTHROPIC_API_KEY=... (Claude API + build agent)

npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

**Stack:** Next.js, React Flow, Anthropic (Claude API + Claude Code), SQLite (better-sqlite3).
