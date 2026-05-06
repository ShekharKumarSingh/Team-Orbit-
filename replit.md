# Nexus — Team Task Manager

A full-stack team task manager where users create projects, assign tasks, and track progress with role-based access (Admin/Member).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/nexus run dev` — run the frontend (port 18245)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec (fix lib/api-zod/src/index.ts to only export from `./generated/api` afterward)
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind v4, shadcn/ui, wouter, TanStack Query
- Auth: Clerk (@clerk/react on client, @clerk/express on server)
- API: Express 5 + OpenAPI-first (Orval codegen)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (zod/v4), drizzle-zod
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas (server)
- `lib/db/src/schema/` — Drizzle DB schema (users, projects, tasks, activity)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/nexus/src/` — React frontend (pages, components)

## Architecture decisions

- OpenAPI-first: spec in `lib/api-spec/openapi.yaml` gates codegen → hooks → frontend
- Clerk auth proxied through Express: clerkProxyMiddleware forwards Clerk SDK calls, `clerkMiddleware` validates sessions on every request
- Role-based access: project members have `admin` or `member` role; only admins can delete projects, add/remove members, change roles
- Activity log: every task/project/member action writes to the `activity` table for the dashboard feed
- `lib/api-zod/src/index.ts` must only export from `./generated/api` (not `./generated/types` which codegen adds — remove it after every codegen run)

## Product

- Landing page with CTA for unauthenticated users
- Dashboard: stats summary, recent activity feed, overdue tasks
- Projects list: create, view, filter by status
- Project detail: kanban board (todo/in_progress/in_review/done), members panel, project stats
- My Tasks: all tasks assigned to me across projects, filterable by status/priority
- Task detail: description, comments, due date, assignee editing
- Settings: user profile management
- Role-based access: Admin can manage members/roles; Members can create/update tasks

## User preferences

- Creative app name: **Nexus** (connection point for teams)
- Deep indigo/violet color palette

## Gotchas

- After running codegen, `lib/api-zod/src/index.ts` gets extra exports (`./generated/types`, `./generated/api.schemas`) that break typecheck — always overwrite to only `export * from "./generated/api";`
- `clerkClient` from `@clerk/express` is a pre-initialized object — use `clerkClient.users.getUser()` directly, NOT `await clerkClient()`
- Express 5 wildcard routes need names: use `/{*splat}` not `/*`

## Pointers

- See `pnpm-workspace` skill for workspace structure
- See `clerk-auth` skill for Clerk setup details
