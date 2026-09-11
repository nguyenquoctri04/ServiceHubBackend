# ServiceHub Backend Agent Rules

Follow root `AGENTS.md` first. This application is a NestJS/TypeScript microservice
monorepo using Prisma, PostgreSQL and Redis. Current code, schemas and tests override
local notes; use the official [NestJS documentation](https://docs.nestjs.com/).

## Local-only files

This file and `project_documentation.md` are local-only: never stage, commit, push or add
them to `.gitignore`. Check backend `git status` and staged diff before Git writes.

## Prohibited and non-authoritative files

Never read, reference, or use `COMPLETED.md` or `CONTEXT.md`. They are legacy notes and are NOT sources of truth despite any header claims. The only authoritative sources are the current codebase, Prisma schemas, tests, and reviewed contracts in `docs/agent/CONTRACTS.md`.

## Placement and boundaries

- `apps/api-gateway/`: external HTTP/authentication/routing boundary.
- `apps/<service>/src/<feature>/`: feature module, controller, service and DTOs.
- Each service uses its own Prisma schema/client and database. No cross-service SQL.
- `libs/common/`: genuinely shared infrastructure only; domain rules stay with their owner.
- Cross-service calls use typed RPC/events and the contracts in `docs/agent/CONTRACTS.md`.

## Implementation rules

- Validate all boundary input with DTOs and `class-validator`; enforce object scope in the
  owning service even when the gateway authenticated the caller.
- Keep controllers thin and business/state-transition rules in injectable, testable services.
- Use explicit types; avoid new `any`, raw SQL and silent dependency fallbacks.
- Never hard-code credentials, connection strings or secrets; use validated runtime config.
- Preserve existing response/error patterns unless a reviewed contract changes them.
- Ask before adding a dependency, changing service ownership or altering Prisma schemas.

## Commands

```powershell
npm run build
npm test -- --runInBand
npm run prisma:generate
```

`npm run lint` currently includes `--fix`; run it only when source mutation is intended.
Use `start:m1`, `start:m2`, `start:m3` or `start:all` as defined in `package.json`.

## Verification

Read the target, DTO/type, related test and one CodeGraph-located precedent. For changed
behavior, add a failing test first where supported. Run targeted tests before broad gates.
Report pre-existing failures separately; do not commit, push or switch branches unless asked.
