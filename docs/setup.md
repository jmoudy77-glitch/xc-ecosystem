# Day 1 Setup Guide

## 1. Install Tools
- Install VS Code
- Install Node.js (via Homebrew)
- Install Git
- Install GitHub Desktop (optional)
- Install VS Code extensions: ESLint, Prettier, Tailwind CSS IntelliSense

## 2. Create Accounts
- GitHub
- Vercel
- Supabase
- Stripe
- OpenAI

## 3. Project Repo
- Create GitHub repo `xc-ecosystem`
- Create local folder `~/dev/xc-ecosystem`
- Initialize Git and connect to GitHub

## 4. Initialize Next.js App
- `npx create-next-app@latest .`
- Install: `@supabase/supabase-js stripe openai zod @headlessui/react`

## 5. Supabase Setup
- Create project
- Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`
- Create `lib/supabaseClient.ts`
- Add `/api/supabase-test` route

## 6. Stripe Setup
- Create test product(s)
- Add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY` to `.env.local`
- Create `lib/stripe.ts`
- Add `/api/stripe-test` route

## 7. OpenAI Setup
- Create API key
- Add `OPENAI_API_KEY` to `.env.local`
- Create `lib/openai.ts`
- Add `/api/ai-test` route

## 8. Deployment
- Import repo into Vercel
- Add env vars to Vercel project
- Deploy

## 9. Docs
- Create `/docs` folder and core documentation files.
