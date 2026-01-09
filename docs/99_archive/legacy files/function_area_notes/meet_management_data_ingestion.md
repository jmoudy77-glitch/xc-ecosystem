# Meet Management & Data Ingestion — Consolidated Notes

**Generated:** 2025-12-27
**Area:** Meet Management & Data Ingestion

## Purpose
Support meet operations and results ingestion so coaches can seed athletes intelligently, track outcomes, and feed performance analytics—without manual data cleanup.

## What this area covers
Meet manager concepts, seeding strategies (including universal seeding), check-in workflows, and ingestion of external results where applicable.

## Current state captured in snapshots
Dedicated notes mention meet-manager and universal seeding strategy, with an emphasis on reducing dependency on user-initiated seeding and speeding value creation.

## UX and interaction patterns
Meet workflows should be operationally fast: clear event lists, rapid entry/adjustment of seeds, and unambiguous check-in status. The UX must support high-tempo meet-day use, likely with compact views and minimal navigation overhead.

## Data, entities, and integration points
Core entities include meets, events, entries/seeds, results, and links to athletes/teams. External ingestion (e.g., results sources) should map into a consistent internal schema so performance modules can consume it reliably.

## AI and advanced analytics hooks
AI opportunities include smarter seeding recommendations and anomaly detection in imported results, but these must remain auditable and overrideable in meet-day contexts.

## Next steps and open items
Specify the meet data schema and ingestion mapping. Decide the default seeding workflow (universal vs user-initiated). Then implement meet-day UX with speed, offline tolerance assumptions, and clear state transitions.

## Source files included
- marketing-positioning.md
- meet-manager.md
- patenting-overview.md
- session-snapshot-2025-12-03.md
- universal-seeding-strategy.md

## Extracted notes (verbatim-ish)
- Universal seeding solves adoption friction
- Universal seeding strategy
- **Meet creation & scheduling** (venue, host, timing integration, weather auto‑pull)
- 2. **Universal athlete seeding system**
- realtime results ingestion (via CSV, integration, or direct entry)
- Public TFRRS/Milesplit data (legally accessible exports)
- 5. **Meet manager + weather intelligence hybrid engine**
- Build a universal athlete seed layer from:
- **Live meet-day dashboard** with:
- Multi-team shared meet panels
- **Post‑meet analytics**:
- check-in tracking
- Meet Manager
- Combines **team management + recruiting + athlete development**
- **Performance history auto-suggestions** for event selections
- **Integration with athlete profiles** and recruiting datasets
- “The first system built for how coaches actually work.”
- Profile image rendering & uploader integration
- Dynamic routing fixes (`params` promise issue)
- Consider provisional patents to lock priority
- Coaches onboard in minutes — no data entry
- AI-driven projections no competitor offers
- Slug unification ([memberId] everywhere)
- AI models have baseline data for scoring
- 3. **Dynamic recruiting board workflow**
- 1. **AI scouting & projection pipeline**
- Staff avatar upload (Supabase Storage)
- Dashboard migrated to server component
- 4. **Holistic athlete profile engine**
- True multi-sport expansion potential
- “Recruiting clarity powered by AI.”
- Athlete & program billing alignment
- Weather forecasting for practices
- Recruit boards have instant value
- Stripe return-after-checkout fix
- Separation into multiple filings
- Each athlete record tagged with:
- **Roster & event entry builder**
- Prior art review (USPTO search)
- NFHS/FinishLynx/HyTek data sync
