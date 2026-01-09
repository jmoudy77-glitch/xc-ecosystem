# Supabase Integration Standards

## 1. Auth
- Use `createClient(cookies())` for server routes.
- Use `createBrowserClient()` for client components.

## 2. RLS
- Never bypass RLS except with service role (webhooks only).
- All API routes must use authenticated Supabase client.

## 3. Schema Sync
- Use `supabase/migrations` for consistent DB evolution.
- Never manually edit tables directly in dashboard.

## 4. Queries
- Prefer `.select()` with explicit columns.
- Avoid fetching entire rows blindly.
