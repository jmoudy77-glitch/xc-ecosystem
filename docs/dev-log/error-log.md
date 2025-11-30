# Recruiting Ecosystem — Error Log

This document tracks significant errors, root causes, and resolutions.  
Purpose: prevent repeated debugging loops and track architectural decisions.

---

## [2025-11-29] Supabase RLS — Cannot insert into "users"

**Context**
- Endpoint: `/api/me`
- First-time user login attempted to create user row
- Error thrown by Supabase: RLS violation

**Error Message**
`new row violates row-level security policy for table "users"`

**Root Cause**
- Insert attempted with incorrect field: used `id` instead of `auth_id`
- RLS required `auth.uid() = new.auth_id`
- `id` field was mismatched with auth ID

**Fix**
- Updated insert: `auth_id = auth.uid()`
- Updated RLS insert policy to allow `auth.uid() = new.auth_id`

**Status**
✅ Resolved

---

## [PLACEHOLDER ENTRY – COPY FOR NEW ERRORS]

**Context**
- What were we doing?

**Error Message**
`...`

**Root Cause**
- ...

**Fix**
- ...

**Status**
⬜ Investigating  
⚠️ Workaround  
✅ Resolved

---