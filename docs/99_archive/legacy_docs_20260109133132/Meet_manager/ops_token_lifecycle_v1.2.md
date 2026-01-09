# Meet Manager — Ops Token Lifecycle v1.2 (LOCKED)

**File:** `/docs/Meet_manager/ops_token_lifecycle_v1.2.md`  
**Status:** Canonical (v1.2)

---

## 0) Purpose

Ops tokens provide **scoped, revocable, time-bound authority** for non-primary users and devices to perform meet operations without granting full coach or program credentials.

They are required for:
- Timer consoles
- Field event scoring (QR)
- Check-in stations
- Delegated ops staff
- Device-bound displays (future)

---

## 1) Core Principles

1. **Least Privilege**
   - Tokens grant the minimum permissions required for a task.

2. **Time-Bound**
   - All tokens expire automatically.

3. **Meet-Scoped**
   - Tokens are valid for exactly one meet.

4. **Optionally Event-Scoped**
   - Some tokens may be restricted to a single event or event group.

5. **Revocable**
   - Hosts can revoke tokens immediately.

6. **Auditable**
   - All token usage is logged.

---

## 2) Token Types

### 2.1 OPS_TIMER
- Purpose: Run timing console for running events
- Scope:
  - meet_id (required)
  - event_ids (optional; null = all running events)
- Permissions:
  - start_event
  - stop_event
  - record_splits
  - finalize_times

### 2.2 OPS_FIELD_SCORING
- Purpose: Enter field event attempts via QR
- Scope:
  - meet_id
  - event_id (required)
- Permissions:
  - record_attempt
  - edit_attempt (within revision window)

### 2.3 OPS_CHECKIN
- Purpose: Athlete check-in station
- Scope:
  - meet_id
- Permissions:
  - check_in_athlete
  - undo_check_in

### 2.4 OPS_SCRATCH
- Purpose: Scratch management
- Scope:
  - meet_id
- Permissions:
  - scratch_athlete
  - undo_scratch

### 2.5 OPS_DISPLAY (Reserved)
- Purpose: Feed stadium / display systems
- Scope:
  - meet_id
- Permissions:
  - read_live_state
- Locked for later rollout.

---

## 3) Token Lifecycle States

| State      | Description |
|-----------|-------------|
| ISSUED    | Token created but not yet used |
| ACTIVE    | Token has been used at least once |
| EXPIRED   | Token expired by time |
| REVOKED   | Token manually revoked |
| INVALID   | Token failed validation |

State transitions are irreversible except ISSUED → ACTIVE.

---

## 4) Token Creation

- Only HOST role may create ops tokens.
- Creation requires:
  - token_type
  - scope (meet_id, optional event_id)
  - expiration timestamp
- Token value is generated server-side and shown **once**.

---

## 5) Token Distribution

### 5.1 Manual
- Copy token string (timer consoles, staff)

### 5.2 QR-Based
- Encoded short-lived token for:
  - Field event scoring
  - Check-in stations

QR tokens may:
- Wrap a parent ops token
- Have shorter expiration (recommended ≤ 2 hours)

---

## 6) Validation Rules

On every request using an ops token:

1. Token exists
2. Token not revoked
3. Token not expired
4. Token scope matches meet_id
5. Token scope matches event_id (if required)
6. Requested action is permitted by token type

Failure at any step results in **hard denial**.

---

## 7) Revocation

- Hosts may revoke tokens at any time.
- Revocation immediately invalidates:
  - The token
  - Any derived QR tokens

Revocation is logged with:
- actor
- timestamp
- reason (optional)

---

## 8) Auditing & Logging

Each token usage records:
- token_id
- token_type
- meet_id
- event_id (if applicable)
- action
- timestamp
- client fingerprint (device/session)

Audit logs are immutable.

---

## 9) Security Constraints

- Tokens are never stored in plaintext after creation.
- Only hashed values persist server-side.
- Tokens must be transmitted via HTTPS only.
- Tokens must never be embedded in long-lived URLs except QR flows.

---

## 10) Versioning

This ops token lifecycle is **v1.2** and must remain consistent with:
- `canonical_spec_v1.2.md`
- `state_machines_v1.2.md`
- `routing_contracts_v1.2.md`

Any changes require a version bump and explicit governance promotion.
