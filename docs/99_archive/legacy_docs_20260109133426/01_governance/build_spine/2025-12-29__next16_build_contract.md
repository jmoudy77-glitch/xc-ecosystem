---
# Next 16 Build Contract (Non-Constitutional Build Spine)
**Effective date:** 2025-12-29  
**Scope:** Toolchain/build stability for xc-ecosystem (Next.js 16 App Router)  
**Status:** Active

## 1) Purpose
This document records build-stability contracts caused by framework/toolchain constraints.
It is explicitly **non-constitutional**: it does not define product semantics, runtime truth laws, or UI governance.
It defines mechanical rules required for deterministic builds.

## 2) Build Command Contract
### 2.1 Production build
**Required command:**
- `next build --webpack`

**Implementation:**
- `package.json` must keep:
  - `"build": "next build --webpack"`

**Rationale (factual)**
- Turbopack builds encountered “Operation not permitted” write failures in this repo environment.
- Webpack build completes successfully and is the stable baseline.

## 3) Next 16 Async Params Contract (App Router)
Next 16 type generation in this repo expects `params` (and often `searchParams`) to be Promise-wrapped.

### 3.1 Pages (page.tsx)
For any `app/**/page.tsx` using typed props:
- `params` must be typed as `Promise<...>`:
  - `params: Promise<{ ... }>`
- The page must `await params` before reading fields:
  - `const { programId } = await params;`

If used and typed:
- `searchParams` should be typed as a Promise:
  - `searchParams?: Promise<Record<string, string | string[] | undefined>>`
- `await searchParams` before reading.

This contract is type-safety / build compliance only; runtime behavior must remain unchanged.

### 3.2 Route Handlers (route.ts)
For any `app/**/route.ts` handler (`GET`, `POST`, etc.):
- The context `params` must be typed as a Promise:
  - `type Ctx = { params: Promise<Record<string, string>> }`
  - or a typed Promise shape (preferred for clarity).
- The handler must `await params` before reading fields:
  - `const p = await params;`

Avoid unions like `{...} | Promise<{...}>` in handler ctx types.

## 4) Route Module Export Hygiene
Files named `route.ts` are Route Handler modules and must export only:
- HTTP method handlers (`GET`, `POST`, `PATCH`, `DELETE`, etc.)
- allowed Next route config exports (e.g., `runtime`, `dynamic`, `revalidate`, `preferredRegion`, etc.)

No helper exports (e.g., `export function getX()`).
Move helpers to adjacent modules and import them.

## 5) Validation Procedure
From repo root:
- `pnpm -s exec tsc --noEmit`
- `pnpm exec next build --webpack`

Build is considered conforming when both pass.

---
