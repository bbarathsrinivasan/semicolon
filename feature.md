# Semicolon Feature Backlog

This file tracks features we want to implement later.
Do not treat items here as implemented until they are marked done.

## Status Legend
- [ ] Planned
- [~] In progress
- [x] Done

## Feature List

### Editor Integration
- [ ] Add `Open in VS Code` button on the project page.
- [ ] Add `Open in Cursor` button on the project page.
- [ ] Add `Copy local build path` action for quick terminal usage.

### Build Efficiency and Token Control
- [ ] Add build profiles (e.g. `fast`, `balanced`, `full`) to control max turns and verbosity.
- [ ] Allow configurable `maxTurns` for coding-agent runs.
- [ ] Reduce prompt payload size for architecture/build spec generation.
- [ ] Add lightweight mode for test runs (fewer services/endpoints).

### Multi-Agent Orchestration
- [ ] Add provider abstraction for coding agents (Claude, Codex, Cursor CLI, etc.).
- [ ] Add per-project/provider selection in settings or build options.
- [ ] Normalize logs/events across providers into one UI stream format.
- [ ] Add fallback policy (retry with a secondary provider on failure).
- [ ] Allow per-service/per-block agent assignment after architecture generation.
- [ ] Support mixed-agent builds where different nodes can be built by different providers in one run.

### UX and Project Workflow
- [ ] Add clear local/remote path messaging so users know where generated code lives.
- [ ] Add optional one-click open-folder action after build completion.
- [ ] Improve build progress visibility by service and phase.

### Authentication and Agent Onboarding
- [ ] Add user login/signup flows.
- [ ] After signup, add guided onboarding to connect selected coding-agent accounts/providers.
- [ ] Add credential management UI for multiple CLI-based coding agents.
- [ ] Add seamless session management for connected agents (reauth, token expiry handling).

### Git and Project Collaboration
- [ ] Add Git provider integration at project level.
- [ ] Add repository initialization/linking flow for each project.
- [ ] Add feature-branch workflow support (create branch per feature/task).
- [ ] Add branch merge flow support (PR/open/merge lifecycle guidance).
- [ ] Add branch strategy templates (e.g., trunk-based vs feature branches).
- [ ] Add commit and change history visibility in the project workspace.

### Integrations and Reliability
- [ ] Add provider credential health checks before starting a build.
- [ ] Add preflight validation (required env vars, write permissions, disk space).
- [ ] Add resumable build option for interrupted sessions.

### Deployment and Infrastructure
- [ ] Add deployment path for AWS EC2 (app server + worker setup).
- [ ] Add deployment path for Kubernetes cluster (app + queue + workers).
- [ ] Add infrastructure templates/docs for EC2 and K8s environments.

## Notes
- Keep this file as the single source of truth for planned features.
- When we decide priorities, we can add owner, priority, and target milestone fields.
