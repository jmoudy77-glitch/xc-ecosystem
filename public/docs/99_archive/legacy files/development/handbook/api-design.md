# API Design Guidelines

## 1. Principles
- Predictable, consistent structure
- RLS-first: DB enforces authorization
- Return minimal required fields

## 2. Methods
- Use REST via Next.js Route Handlers.
- Avoid unnecessary nesting:
  - `/api/programs/[id]/recruits`
  - `/api/athletes/[id]/training`

## 3. Validation
- Use Zod for request validation.
- Fail early with clear messages.

## 4. Pagination
- Cursor-based for large tables.
