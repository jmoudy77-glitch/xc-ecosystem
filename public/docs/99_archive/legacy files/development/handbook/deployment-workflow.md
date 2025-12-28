# Deployment Workflow

## 1. Branching
- `main` — prod
- `dev` — staging
- Feature branches: `feature/<name>`

## 2. CI/CD
- GitHub Actions:
  - Type checking
  - Linting
  - Tests
  - Build verification

## 3. Vercel Deployments
- Preview deployments for all PRs.
- Prod deploy only from `main`.

## 4. Database Migrations
- Applied automatically on deploy
- Never break existing queries
