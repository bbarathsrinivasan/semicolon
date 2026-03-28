/** Initial template for global build instructions (markdown). Users edit in the sidebar. */
export const DEFAULT_BUILD_INSTRUCTIONS_MARKDOWN = `# How I want projects built

These notes apply to **every** Semicolon build unless something in the architecture clearly overrides them.

## Stack & frameworks
- **Language / runtime:** (e.g. TypeScript on Node.js)
- **API style:** (e.g. REST, minimal GraphQL)
- **Frontend:** (e.g. React, Next.js App Router)
- **Database & ORM:** (e.g. PostgreSQL + Prisma, SQLite for local dev)

## Engineering preferences
- Prefer small modules, predictable folder layout, and environment-based config.
- Use the stack you chose consistently across services.

## What to avoid
- (e.g. No MongoDB if I standardize on SQL; no jQuery; no untyped JS)

## Anything else
Add testing, linting, Docker, or deployment expectations here.
`;

export const BUILD_INSTRUCTIONS_SETTING_KEY = "global_build_instructions";
