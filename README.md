<div align="center">

<h1>Semicolon<span style="color:#6366f1">;</span></h1>

**Architecture native development environment**

*Describe it. Diagram it. Build it.*

</div>

---

Semicolon turns a short product description into a **live architecture diagram**, lets you **edit services and contracts** (or **refine with AI**), then **generates a runnable monorepo** with Claude Code. Everything stays in one UI: spec → diagram → build log → open in VS Code.

### What judges can try

- **Spec → diagram** — Chat-style flow produces typed nodes (API, DB, workers, etc.), edges, and endpoint shapes.
- **Diagram-first editing** — Click a service: view deployment stage, edit endpoints / dependencies / env / copy, or **Refine with AI** (pre-filled prompt) / **Edit architecture** (full chat).
- **Build** — Streamed build log, per-service status, interrupt-safe lifecycle; output under `~/semicolon-builds/<projectId>`.
- **Integrations** — **Open in VS Code** (local `vscode://` folder), SQLite-backed projects, recent list in the sidebar.

### Run locally

```bash
# .env.local — ANTHROPIC_API_KEY=... (Claude API + build agent)

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Stack: **Next.js 16**, **React Flow**, **Anthropic / Claude Code**, **better-sqlite3**.
