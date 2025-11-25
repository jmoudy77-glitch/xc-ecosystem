# XC Ecosystem – Architecture Overview

## High-Level Structure

- **Frontend**: Next.js (React) app hosted on Vercel
- **Backend**: Next.js API routes (serverless functions on Vercel)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password, magic links later)
- **Payments**: Stripe (subscriptions for college, HS, athletes)
- **AI**: OpenAI (training plans, scouting reports, recruiting pipeline projections)

## Core User Types

- **College Coach**
  - Team management
  - Recruiting board
  - Recruiting pipeline projections (AI upgrade)
- **High School Coach**
  - Team management
  - Training plans (AI assistant)
- **Athlete**
  - Profile + training access
  - Recruiting résumé and visibility

## Hosting

- **App hosting**: Vercel
- **Supabase**: Managed Postgres + auth + storage
- **Stripe**: Billing + subscriptions
- **OpenAI**: AI logic via API
