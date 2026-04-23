<div align="center">
<img
  src="https://img.shields.io/badge/Semicolon-%3B-7C3AED?style=for-the-badge&labelColor=111827"
  alt="Semicolon Logo"
  height="56"
/>

![Status](https://img.shields.io/badge/Status-MVP%20Build-22C55E?style=flat-square)
![Architecture First](https://img.shields.io/badge/Architecture-First-6366F1?style=flat-square)
![Multi-Agent](https://img.shields.io/badge/Multi--Agent-Roadmap-F59E0B?style=flat-square)
![Stack](https://img.shields.io/badge/Next.js-React%20Flow%20SQLite-0EA5E9?style=flat-square)

**Most AI tools help you generate files. Semicolon keeps your system model and code in sync.**

*Describe it once -> get a diagram -> build runnable code from the same source of truth.*

</div>

---

## What It Is (One Sentence) 🎯

Semicolon is an architecture-aware build workspace that turns a plain-language system description into an editable service graph and then generates working code from that graph.

## Why This Exists 🧩

Most AI coding workflows break into disconnected artifacts:

- a prompt in chat
- a diagram in a whiteboard tool
- code in a repo
- deployment steps in docs

Those artifacts drift fast. Semicolon treats architecture as a living model, then uses it to drive generation.

## Demo Flow (30 seconds) ⚡

1. **Prompt** your system idea.
2. **Diagram** generated services, dependencies, and contracts.
3. **Refine** nodes/edges manually or with AI edits.
4. **Build** with coding agents into a runnable repo.
5. **Inspect** logs and service status in one place.

## The Three Core Jobs 🛠️

- **Model**: Convert intent into a concrete system graph.
- **Build**: Use coding agents to create runnable services from that graph.
- **Sync**: Keep project state, architecture, and build output traceable.

## How Semicolon Works 🗺️

```mermaid
flowchart LR
  U[User Prompt] --> C[Clarify + Spec]
  C --> A[Architecture JSON]
  A --> D[Interactive Diagram]
  D --> E[Edit/Refine]
  E --> B[Build Orchestrator]
  B --> G[Coding Agent SDK]
  G --> F[Generated Repo Files]
  B --> L[Build Log + Status Stream]
  A --> S[(SQLite Project State)]
  L --> S
```

## Product Comparison 📊

| Capability | Semicolon | Superset | Claude Code |
|---|---|---|---|
| System model | ✓ | ✗ | ✗ |
| Cross-svc contracts | ✓ | ✗ | ✗ |
| Bidirectional sync | ✓ | ✗ | ✗ |
| Agent agnostic | ✓ | ✓ | ✗ |
| Deploy sequencing | ✓ | ✗ | ✗ |
| Persistent memory | ✓ | ✗ | ✗ |
| Works on existing roadmap | ✓ | ✓ | ✗ |

## Why This Is Better ✅

- **System-aware, not file-aware**: decisions happen at service/contract level before code.
- **Less architecture drift**: one graph is reused for edits and generation.
- **Faster iteration**: change architecture, then regenerate intentionally.
- **Observable generation**: streamed events, build logs, and service state tracking.

## Current Capabilities 🚀

- Prompt-to-architecture generation
- Interactive graph visualization and node detail editing
- AI-assisted architecture refinement
- Build execution via coding-agent SDK
- Build logs and service-status tracking
- Local project persistence via SQLite

## Agent Compatibility 🤖

Current implementation uses Anthropic SDK + Claude Agent SDK.

Planned direction:

- provider abstraction layer
- per-project agent selection
- per-service mixed-agent builds (future)

## Quick Start 🏁

```bash
# required in .env.local
# ANTHROPIC_API_KEY=...

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack 🧱

- **Frontend**: Next.js (App Router), React, Tailwind
- **Diagram**: React Flow + Dagre layout
- **Backend**: Next.js route handlers + SSE streaming
- **AI**: `@anthropic-ai/sdk`, `@anthropic-ai/claude-agent-sdk`
- **Storage**: SQLite via `better-sqlite3`
- **Output**: local generated repos in `~/semicolon-builds/<projectId>`

## Visual Identity

- Primary accent: `#7C3AED` (Semicolon purple)
- Success: `#22C55E`
- Warning/roadmap: `#F59E0B`
- Info: `#0EA5E9`

## MVP Direction 🧪

Functionality-first roadmap focuses on:

1. editor integration (open in Cursor/VS Code)
2. auth + signup/login
3. multi-agent provider model
4. git workflow integration (branches/merge flow)
5. deploy path (EC2/K8s)

See `feature.md` and `plan.md` for detailed backlog and sequencing.
