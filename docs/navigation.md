(If Mermaid doesn’t render in your environment, you can keep this section as a conceptual diagram description.)

---

## 4. Navigation Structure (App Navigation)

You can either drop this into `system-architecture.md` or a new `/docs/navigation.md`.

```md
# Application Navigation Structure

## Global Layout

- **Top Bar**
  - Org selector (if user belongs to multiple orgs)
  - Sport / Season selector
  - User menu (Profile, Billing, Logout)

- **Left Sidebar Navigation**
  - Dashboard
  - Recruiting
  - Roster & Teams
  - Athlete Database
  - Coach Tools (HS-focused but visible conditionally)
  - Analytics
  - AI Assistant
  - Settings

---

## Primary Sections

### 1. Dashboard
- High-level KPIs:
  - Upcoming events
  - Athlete alerts
  - Recruiting pipeline snapshot
  - Training readiness summary
  - AI “top 3 suggested actions”

---

### 2. Recruiting
- **Board View**
  - Columns = stages
  - Cards = recruits
  - Drag & drop
- **Lists**
  - Searchable table of recruits
- **Pipeline**
  - Class size vs target
  - Scholarship impact
  - AI commit probability rollups

---

### 3. Roster & Teams
- **Teams Index**
  - Sprints, Distance, Throws, Jumps, etc.
- **Roster View**
  - Filters: event, grad year, status
  - Depth chart drag & drop
- **Athlete Detail**
  - Bio
  - PRs
  - Performance charts
  - Notes

---

### 4. Athlete Database
- Global list of athletes (HS + college context).
- Search by:
  - Name, grad year, event, tags, school.
- Quick actions:
  - Add to board
  - Open profile
  - Tagging via batch actions

---

### 5. Coach Tools (HS Coaching Pillar)
- Visible for:
  - HS coaches by default
  - College coaches in “development mode”
- Subsections:
  - Season Planner
  - Practice Planner
  - Training Library
  - Attendance & Load
  - Knowledge Base

---

### 6. Analytics
- **Team Analytics**
  - PR progression charts
  - Performance distribution by event
- **Recruiting Analytics**
  - ROI by region / event / grad year
  - Stage conversion
- **Scholarship Analytics**
  - Allocation vs budget
  - Class-by-class projections

---

### 7. AI Assistant
- Chat-like UI with context:
  - “Ask about an athlete”
  - “Generate a practice plan”
  - “Summarize my recruiting board”
- Suggestions:
  - Next actions
  - Evaluation summaries
  - Training critique

---

### 8. Settings
- **Profile**
  - Name, photo, default org
- **Organization**
  - Teams, branding
- **Billing**
  - Subscription details (Stripe portal link)
- **Integrations** (future)
  - Video hosting, external data sources