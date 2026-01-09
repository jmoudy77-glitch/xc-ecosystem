# Knowledge Base Patch (Docs Portal)

This patch adds an internal, easily-updatable **Knowledge Base** that renders your `/docs/*.md` files inside the app.

## What it adds
- `/app/knowledge`:
  - Bucketed Knowledge Home
  - Bucket listing pages
  - Markdown doc viewer (`/knowledge/...slug`)
- `/lib/docs`:
  - Doc indexing + categorization (auto-scans `/docs`)
  - Bucket mapping rules

## Required dependency
The doc viewer uses `react-markdown` + `remark-gfm`:

```bash
npm i react-markdown remark-gfm
```

## Milestone Map integration
Add a link from your Milestone Map surface to:

- `/knowledge`

Optionally add a "Pinned Docs" panel later (stored via localStorage or server-side).

## Updating docs
Just add/edit `.md` files in `/docs`. The Knowledge Base auto-picks them up on the next reload/build.
