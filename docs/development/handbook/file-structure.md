# File Structure Standards

Root folders:

- `/app` — Next.js routes
- `/components` — shared UI elements
- `/lib` — utilities, external integrations
- `/db` — Supabase helpers
- `/docs` — documentation
- `/schema` — DB schema (generated)

Rules:
- No feature logic inside components.
- Feature folders live under `/app/(feature)/...`.
- Complex features get a `/features/<name>/` folder.
