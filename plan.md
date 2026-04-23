# Semicolon Implementation Plan

This document converts `feature.md` into an execution-ready roadmap with implementation details, dependencies, and recommended order.

## Planning Principles

- Functionality-first for MVP: prioritize core product capabilities over hardening.
- Deliver user-visible workflows quickly (editor handoff, agent selection, auth, git flow).
- Defer reliability/platform hardening work until post-MVP.
- Keep each active phase releasable with clear acceptance criteria.

## MVP Focus (Updated)

- **Deferred for post-MVP:** Phase 1 (Integrations & Reliability Foundations), Phase 2 (Build Efficiency & Token Control), Phase 3 (UX & Project Workflow Core).
- **Active for MVP:** Editor Integration, Multi-Agent Orchestration, Authentication & Agent Onboarding, Git Collaboration, Deployment basics.

## Recommended Implementation Order (High Level)

1. Editor Integration
2. Multi-Agent Orchestration (Phase 1: Single-agent abstraction)
3. Authentication and Agent Onboarding
4. Git and Project Collaboration
5. Multi-Agent Orchestration (Phase 2: Mixed-agent execution)
6. Deployment and Infrastructure
7. Post-MVP Hardening (former Phases 1-3)

---

## Phase 1: Integrations and Reliability Foundations

### 1.1 Provider credential health checks before build
- **Why now:** Prevents avoidable build failures and supports future multi-provider flows.
- **Implementation**
  - Add a pre-build credential validation service per provider type.
  - Define normalized health states (`ok`, `warning`, `error`) with actionable messages.
  - Show health status in build setup UI and block start on hard errors.
- **Dependencies:** none
- **Output:** health-check API + UI status display + structured error mapping.

### 1.2 Preflight validation (env vars, permissions, disk)
- **Why now:** Guarantees execution preconditions before expensive build operations.
- **Implementation**
  - Build a preflight runner with checks for required env variables, writable paths, and minimum disk.
  - Return consolidated report with severity and remediation steps.
  - Persist preflight report to build metadata for debugging.
- **Dependencies:** none
- **Output:** preflight engine + UI gate + diagnostics persistence.

### 1.3 Resumable build option for interrupted sessions
- **Why now:** Improves reliability and protects long-running generation work.
- **Implementation**
  - Introduce checkpoint model by service/phase.
  - Persist run state and artifacts; mark idempotent steps.
  - Add resume action in build history and conflict handling if workspace changed.
- **Dependencies:** 1.2 strongly recommended
- **Output:** checkpoint storage, resume API, resume UI action.

---

## Phase 2: Build Efficiency and Token Control

### 2.1 Build profiles (`fast`, `balanced`, `full`)
- **Implementation**
  - Create profile schema controlling verbosity, max turns, test scope, and retry policy.
  - Add profile selector in project/build configuration.
  - Log selected profile in run metadata for observability.
- **Dependencies:** 1.x reliability checks

### 2.2 Configurable `maxTurns` for coding-agent runs
- **Implementation**
  - Add project-level default + per-run override.
  - Enforce validation ranges and safe defaults by profile.
  - Surface token/turn usage in run summary.
- **Dependencies:** 2.1 recommended

### 2.3 Reduce prompt payload size for architecture/build spec generation
- **Implementation**
  - Add prompt compaction layer: deduplicate repeated context, truncate non-critical logs, summarize long histories.
  - Track token estimate pre-send and warn when near limits.
  - A/B test output quality for compact vs full prompts.
- **Dependencies:** none

### 2.4 Lightweight mode for test runs
- **Implementation**
  - Add a reduced integration-test matrix (critical endpoints/services only).
  - Make mode selectable via profile or explicit toggle.
  - Report skipped components to avoid false confidence.
- **Dependencies:** 2.1

---

## Phase 3: UX and Project Workflow (Core)

### 3.1 Clear local/remote path messaging
- **Implementation**
  - Standardize path model (`workspace path`, `generated output path`, `remote path`).
  - Display path provenance at build start/end and in logs.
  - Add copy-to-clipboard on all path labels.
- **Dependencies:** none

### 3.2 Improve build progress by service and phase
- **Implementation**
  - Define canonical phases (preflight, architecture, generate, test, finalize).
  - Emit structured progress events with service scope.
  - Render timeline/progress UI with in-progress, blocked, failed states.
- **Dependencies:** 1.3 and 5.3 strongly recommended for best results

### 3.3 One-click open-folder action after build completion
- **Implementation**
  - Add post-build CTA with workspace safety checks.
  - Handle OS-specific open commands and failure fallbacks.
  - Record event for adoption analytics.
- **Dependencies:** 3.1

---

## Phase 4: Editor Integration

### 4.1 Add `Open in VS Code` button
- **Status:** Implemented
- **Implementation**
  - Use URI/deep-link with local path verification.
  - Gracefully handle missing installation.
  - Add inline tooltip/help for first-time users.
- **Dependencies:** 3.1

### 4.2 Add `Open in Cursor` button
- **Status:** Implemented
- **Implementation**
  - Mirror VS Code flow with Cursor protocol handling.
  - Add compatibility checks per OS.
  - Reuse shared editor-launch utility.
- **Dependencies:** 3.1, 4.1 shared utility

### 4.3 Add `Copy local build path` action
- **Status:** Implemented
- **Implementation**
  - Add copy action in project page and build summary.
  - Confirm copy success with transient toast.
  - Support path normalization (escaping spaces, etc.).
- **Dependencies:** 3.1

---

## Phase 5: Multi-Agent Orchestration (Phase 1)

### 5.1 Provider abstraction for coding agents
- **Status:** Implemented
- **Implementation**
  - Create provider interface (`prepare`, `run`, `streamEvents`, `cancel`, `healthCheck`).
  - Add adapters for initial providers.
  - Build adapter test harness with contract tests.
- **Dependencies:** 1.1

### 5.2 Per-project/provider selection in settings/build options
- **Status:** Implemented
- **Implementation**
  - Add provider config model with default provider resolution rules.
  - Provide run-time override in build modal.
  - Validate provider availability using health checks.
- **Dependencies:** 5.1, 1.1

### 5.3 Normalize logs/events across providers into one UI stream
- **Implementation**
  - Define canonical event envelope (timestamp, provider, service, phase, severity, message, raw payload).
  - Build mapper per provider and centralized event bus.
  - Implement UI renderer based on normalized schema.
- **Dependencies:** 5.1

### 5.4 Fallback policy (retry secondary provider on failure)
- **Implementation**
  - Add fallback rules (`on-timeout`, `on-auth-error`, `on-rate-limit`, `on-unknown`).
  - Capture provenance showing primary failure and fallback outcome.
  - Add circuit breaker to avoid retry storms.
- **Dependencies:** 5.1, 5.2, 5.3

---

## Phase 6: Authentication and Agent Onboarding

### 6.1 User login/signup flows
- **Status:** Implemented
- **Implementation**
  - Build auth endpoints, session cookies/tokens, and secure password flow.
  - Add basic account settings and session revocation.
  - Instrument auth events for onboarding metrics.
- **Dependencies:** none (but should align with provider credential model)

### 6.2 Guided onboarding after signup for agent account connection
- **Status:** Partial (default coding agent preference in sidebar; full wizard deferred)
- **Implementation**
  - Implement onboarding wizard with provider selection and connection checks.
  - Offer skip/resume behavior.
  - Save onboarding state and completion milestones.
- **Dependencies:** 6.1, 1.1, 5.2

### 6.3 Credential management UI for multiple CLI-based agents
- **Implementation**
  - Add secure credential storage references (never plain-text in UI/state).
  - Provide add/edit/remove flows with scope and status indicators.
  - Add test-connection action per credential.
- **Dependencies:** 6.1, 5.1, 1.1

### 6.4 Seamless session management (reauth, token expiry)
- **Implementation**
  - Add proactive expiry detection and refresh prompts.
  - Queue/retry safe operations around reauthentication.
  - Provide non-destructive error recovery in active runs.
- **Dependencies:** 6.1, 6.3, 1.3

---

## Phase 7: Git and Project Collaboration

### 7.1 Git provider integration at project level
- **Implementation**
  - Add Git provider connector abstraction (GitHub first, extensible design).
  - Store provider link metadata per project.
  - Validate permissions and repository access.
- **Dependencies:** 6.1 recommended for per-user account linkage

### 7.2 Repository initialization/linking flow per project
- **Implementation**
  - Support create-new-repo and link-existing-repo paths.
  - Add branch default detection and initial commit guardrails.
  - Show sync status in project workspace.
- **Dependencies:** 7.1

### 7.3 Feature-branch workflow support
- **Implementation**
  - Add branch creation naming templates and conflict checks.
  - Support branch-per-task metadata and switching.
  - Associate build runs to branches.
- **Dependencies:** 7.2

### 7.4 Branch merge flow support (PR/open/merge lifecycle guidance)
- **Implementation**
  - Add PR creation assistance and status tracking.
  - Surface merge prerequisites (checks, conflicts, approvals).
  - Sync merged status back into project timeline.
- **Dependencies:** 7.3

### 7.5 Branch strategy templates (trunk-based vs feature branches)
- **Implementation**
  - Provide strategy presets with generated policy text.
  - Apply selected template to branch defaults and workflow hints.
  - Allow project-level override.
- **Dependencies:** 7.3

### 7.6 Commit/change history visibility in workspace
- **Implementation**
  - Build history panel with commit list, author, timestamp, and diff summary.
  - Link commits to generated tasks/services where possible.
  - Add filtering by branch and date.
- **Dependencies:** 7.2

---

## Phase 8: Multi-Agent Orchestration (Phase 2)

### 8.1 Per-service/per-block agent assignment after architecture generation
- **Implementation**
  - Extend architecture graph model with provider assignment field.
  - Add assignment UI with defaults and manual overrides.
  - Validate assignment compatibility before run start.
- **Dependencies:** 5.1, 5.2, 5.3

### 8.2 Mixed-agent builds across nodes/services in one run
- **Implementation**
  - Build orchestration scheduler to execute node-level tasks with provider-specific adapters.
  - Aggregate outputs into unified run state and normalized event stream.
  - Add rollback/retry logic per node to isolate failures.
- **Dependencies:** 8.1, 5.4, 1.3

---

## Phase 9: Deployment and Infrastructure

### 9.1 Deployment path for AWS EC2 (app server + worker)
- **Implementation**
  - Provide EC2 deployment generator (systemd/process manager, env setup, networking).
  - Add deploy prechecks and rollback instructions.
  - Include secure secret handling guidance.
- **Dependencies:** 7.x recommended for repository-driven deployment

### 9.2 Deployment path for Kubernetes (app + queue + workers)
- **Implementation**
  - Provide Kubernetes manifests/Helm templates for app, queue, workers, and config/secrets.
  - Add environment overlays (dev/staging/prod).
  - Include health probes, autoscaling baseline, and resource requests.
- **Dependencies:** 9.1 optional but useful operational foundation

### 9.3 Infrastructure templates/docs for EC2 and K8s
- **Implementation**
  - Publish infra templates and operator runbooks.
  - Add architecture diagrams and troubleshooting guides.
  - Version docs with deployment artifact changes.
- **Dependencies:** 9.1, 9.2

---

## Cross-Cutting Milestones

- **Milestone A (MVP Functional):** Editor Integration + Multi-Agent Phase 1 complete.
- **Milestone B (MVP Usable):** Authentication + Agent Onboarding complete.
- **Milestone C (MVP Collaborative):** Git collaboration flows complete.
- **Milestone D (MVP Advanced Build):** Multi-Agent Phase 2 complete.
- **Milestone E (MVP Deployable):** Deployment and infrastructure baseline complete.
- **Milestone F (Post-MVP Hardening):** Deferred hardening items (former Phases 1-3) complete.

## Suggested Execution Cadence

- Execute in 2-week sprints with a maximum of 6-8 backlog items per sprint.
- Reserve at least 20% sprint capacity for integration hardening and bug-fixing.
- Gate progression between phases with demo + acceptance checklist sign-off.
