# Next 16 Dev Artifacts Outside Drive (Build Spine Addendum)
**Effective date:** 2025-12-29  
**Scope:** Next.js 16 dev server outputs under Google Drive File Provider paths  
**Status:** Active

## Symptom
Intermittent dev failures with missing `.next/dev/*` manifests and missing vendor chunks (e.g., `vendor-chunks/@supabase.js`) when the repo is located under a Google Drive File Provider path.

## Cause
Drive File Provider does not reliably handle high-churn build outputs. The dev server writes many small artifacts rapidly under `.next/`, and the sync layer can drop or delay these writes, leading to `ENOENT` and `MODULE_NOT_FOUND` errors.

## Fix A (preferred): develop from a non-synced clone
Run the dev server from a local, non-synced clone outside any Drive/Dropbox/OneDrive file provider path.

## Fix B: symlink `.next` to a non-Drive directory
Use a stable local directory for dev artifacts and link it into the repo. This isolates `.next` from Drive file provider churn.

### Commands
```
pkill -f "next dev" || true
rm -rf .next
mkdir -p ~/dev/.next-xc-ecosystem
ln -s ~/dev/.next-xc-ecosystem .next
pnpm dev -- --webpack
```

## Notes
- This is a build stability measure only; it does not change runtime semantics or app behavior.
- If the symlink approach is used, ensure the target path is on a local filesystem with stable write behavior.
