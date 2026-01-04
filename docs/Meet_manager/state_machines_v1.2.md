XC-Ecosystem — Meet Manager Module
Canonical State Machines + Status Enums v1.2 (LOCKED)

====================================================================
CANONICAL ENUMS
====================================================================

MEET_TYPE
- xc
- tf

MEET_VISIBILITY
- open
- invitational
- private

MEET_JOIN_POLICY
- auto_join
- request_approval
- invite_only

MEET_STATUS
- draft
- published
- completed
- cancelled

PUBLICATION_MODE
- disabled
- live
- official

PARTICIPATION_STATUS
- invited
- requested
- approved
- joined
- rejected
- withdrawn

SUBMISSION_STATUS
- draft
- submitted
- locked

ATTENDANCE_STATE
- attending
- tentative
- not_attending

CHECKIN_STATE
- not_checked_in
- checked_in

SCRATCH_STATE
- not_scratched
- scratched

XC_RACE_STATUS
- not_started
- in_progress
- paused
- completed

TF_EVENT_STATUS
- not_started
- in_progress
- paused
- completed

TF_EVENT_KIND
- track
- field
- relay

TF_ENTRY_STATE
- entered
- scratched
- dns
- dnf
- finished

FIELD_EVENT_STATE
- open
- closed

FIELD_ATTEMPT_RESULT
- valid
- foul
- pass

LEG_READINESS_STATUS
- ready
- not_ready

OPS_TOKEN_ROLE
- meet_director
- field_scorer
- flag_worker
- timer_operator
- public_view

OPS_TOKEN_STATUS
- active
- revoked
- expired

RESULTS_REVISION_STATUS
- draft
- published_live
- published_official
- superseded

PAYMENT_STATUS
- unpaid
- partial
- paid
- refunded
- waived

DISPLAY_CHANNEL_STATUS
- enabled
- disabled

====================================================================
STATE MACHINES
====================================================================

MEET LIFECYCLE
draft -> published
published -> completed
published -> cancelled
draft -> cancelled

PROHIBITED
completed -> *
cancelled -> *
published -> draft

--------------------------------------------------------------------

PARTICIPATION (program ↔ meet)
NONE -> invited
NONE -> requested
NONE -> joined (auto_join)

invited -> joined
invited -> withdrawn

requested -> approved
requested -> rejected
requested -> withdrawn

approved -> joined
approved -> withdrawn

joined -> withdrawn

Terminal: rejected, withdrawn

--------------------------------------------------------------------

ROSTER STATUS (per participation)
draft -> submitted
submitted -> draft
submitted -> locked
draft -> locked

locked -> submitted (host override only)

--------------------------------------------------------------------

ENTRIES STATUS (per participation)
draft -> submitted
submitted -> draft
submitted -> locked
draft -> locked

locked -> submitted (host override only)

--------------------------------------------------------------------

ROSTER ATHLETE STATES
attendance_state: attending | tentative | not_attending

checkin_state:
not_checked_in <-> checked_in

scratch_state:
not_scratched <-> scratched

Rules:
- coach may scratch pre-lock
- host/ops may scratch at any time with reason

--------------------------------------------------------------------

XC RACE STATUS
not_started -> in_progress
in_progress -> paused
paused -> in_progress
in_progress -> completed

completed is terminal

--------------------------------------------------------------------

TF EVENT STATUS
not_started -> in_progress
in_progress -> paused
paused -> in_progress
in_progress -> completed

completed is terminal

--------------------------------------------------------------------

FIELD EVENT SCORING
open -> closed
closed -> open (host override)

--------------------------------------------------------------------

LEG FLAG STATUS
not_ready <-> ready

--------------------------------------------------------------------

RESULTS REVISION
draft -> published_live
published_live -> published_official
published_live -> superseded
draft -> superseded

published_official is terminal

--------------------------------------------------------------------

DISPLAY CHANNEL
disabled -> enabled
enabled -> disabled

--------------------------------------------------------------------

PAYMENT STATE
unpaid -> partial
unpaid -> paid
partial -> paid
paid -> refunded
unpaid -> waived
partial -> waived
paid -> waived

refunded and waived are terminal
