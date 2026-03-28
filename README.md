<div align="center">

<!-- Brand strip — matches globals.css -->
<table role="presentation"><tr>
<td width="72" height="8" bgcolor="#0a0a0a"></td>
<td width="72" height="8" bgcolor="#6366f1"></td>
<td width="72" height="8" bgcolor="#818cf8"></td>
<td width="72" height="8" bgcolor="#141414"></td>
<td width="72" height="8" bgcolor="#2a2a2a"></td>
</tr></table>

<br/>

<h1>Semicolon<span style="color:#6366f1">;</span></h1>

<p><strong>Architecture native development environment</strong></p>

<p><em style="color:#737373">Describe it. Diagram it. Build it.</em></p>

<p>
  <img src="https://img.shields.io/badge/Next.js-16-6366f1?style=for-the-badge&logo=nextdotjs&logoColor=white&labelColor=141414" alt="Next.js" />
  &nbsp;
  <img src="https://img.shields.io/badge/React-19-6366f1?style=for-the-badge&logo=react&logoColor=white&labelColor=141414" alt="React" />
  &nbsp;
  <img src="https://img.shields.io/badge/TypeScript-5-6366f1?style=for-the-badge&logo=typescript&logoColor=white&labelColor=141414" alt="TypeScript" />
  &nbsp;
  <img src="https://img.shields.io/badge/React_Flow-12-6366f1?style=for-the-badge&logo=react&logoColor=white&labelColor=141414" alt="React Flow" />
  &nbsp;
  <img src="https://img.shields.io/badge/Claude_Code-Agent-6366f1?style=for-the-badge&logo=anthropic&logoColor=white&labelColor=141414" alt="Claude Code" />
  &nbsp;
  <img src="https://img.shields.io/badge/SQLite-better--sqlite3-6366f1?style=for-the-badge&logo=sqlite&logoColor=white&labelColor=141414" alt="SQLite" />
</p>

</div>

---

<div align="center">

**Brand colors** (same as the app UI)

| Role | Hex |
|:---|:---|
| Background | `#0a0a0a` |
| **Accent** (logo **;**) | `#6366f1` |
| Accent hover | `#818cf8` |
| Surface | `#141414` |
| Border | `#2a2a2a` |
| Muted text | `#737373` |
| Foreground | `#ededed` |

</div>

<details>
<summary><strong>Palette preview</strong> — click to expand swatches</summary>

<div align="center">

| Swatch | Token | Hex |
|:---:|:---|:---|
| ![](https://img.shields.io/badge/%20-0a0a0a?style=for-the-badge) | `--background` | `#0a0a0a` |
| ![](https://img.shields.io/badge/%20-6366f1?style=for-the-badge) | `--accent` (logo **;**) | `#6366f1` |
| ![](https://img.shields.io/badge/%20-818cf8?style=for-the-badge) | `--accent-hover` | `#818cf8` |
| ![](https://img.shields.io/badge/%20-141414?style=for-the-badge) | `--surface` | `#141414` |
| ![](https://img.shields.io/badge/%20-2a2a2a?style=for-the-badge) | `--border` | `#2a2a2a` |
| ![](https://img.shields.io/badge/%20-737373?style=for-the-badge) | `--muted` | `#737373` |
| ![](https://img.shields.io/badge/%20-ededed?style=for-the-badge) | `--foreground` | `#ededed` |

</div>

</details>

---

Semicolon turns a short product description into a **live architecture diagram**, lets you **edit services and contracts** (or **refine with AI**), then **generates a runnable monorepo** with Claude Code. One UI: spec → diagram → build log → **Open in VS Code**.

### What judges can try

| | |
|:---|:---|
| 💬 **Spec → diagram** | Chat-style flow → typed nodes (API, DB, workers…), edges, endpoint contracts. |
| 🗺️ **Diagram-first** | Click a service: deployment stage, manual **Edit service**, or **✨ Refine with AI** + **Edit architecture** chat. |
| 🔨 **Build** | Streamed log, per-service status, safe interrupt; output `~/semicolon-builds/<projectId>`. |
| 🔗 **Integrations** | **Open in VS Code** (`vscode://`), SQLite projects, collapsible sidebar + recents. |

### Run locally

```bash
# .env.local — ANTHROPIC_API_KEY=... (Claude API + build agent)

npm install
npm run dev
```

<p align="center">
  <a href="http://localhost:3000">
    <img src="https://img.shields.io/badge/Open-localhost:3000-6366f1?style=for-the-badge&logo=googlechrome&logoColor=white&labelColor=141414" alt="Open localhost:3000" />
  </a>
</p>
