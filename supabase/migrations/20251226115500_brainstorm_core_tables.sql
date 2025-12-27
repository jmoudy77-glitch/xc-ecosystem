-- Brainstorm Module: Core persistence tables (sessions, messages, index, pages, objects)
-- Generated: 2025-12-26
-- Notes:
-- - Append-friendly design (messages/index/items are insert-first).
-- - RLS enforced via program membership (program_members + users.auth_id = auth.uid()).
-- - This migration assumes:
--     public.programs(id) exists
--     public.users(id, auth_id) exists
--     public.program_members(program_id, user_id) exists
-- - This migration uses gen_random_uuid() (pgcrypto). Ensure extension is enabled in your environment.

BEGIN;

-- 1) brainstorm_sessions ------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.brainstorm_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,

  -- Context scoping (where the session was launched from)
  scope_type text NOT NULL CHECK (scope_type IN ('program', 'team', 'team_season', 'athlete', 'recruit')),
  scope_id uuid,

  created_by_user_id uuid NOT NULL REFERENCES public.users(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),

  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,

  -- Optional AI-maintained snapshot of the “index spine” for fast list views
  summary_index_json jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Optional general metadata for future-proofing
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brainstorm_sessions_program_id_idx ON public.brainstorm_sessions(program_id);
CREATE INDEX IF NOT EXISTS brainstorm_sessions_scope_idx ON public.brainstorm_sessions(program_id, scope_type, scope_id);
CREATE INDEX IF NOT EXISTS brainstorm_sessions_created_at_idx ON public.brainstorm_sessions(created_at);

-- 2) brainstorm_messages ------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.brainstorm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.brainstorm_sessions(id) ON DELETE CASCADE,

  -- Single stream; role determines rendering style
  role text NOT NULL CHECK (role IN ('coach', 'ai', 'system')),

  content text NOT NULL DEFAULT '',
  sequence_index bigint NOT NULL,

  -- Optional structural references (e.g., links to board objects or index items)
  refs_json jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_by_user_id uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS brainstorm_messages_session_seq_uq
  ON public.brainstorm_messages(session_id, sequence_index);

CREATE INDEX IF NOT EXISTS brainstorm_messages_session_created_at_idx
  ON public.brainstorm_messages(session_id, created_at);

-- 3) brainstorm_index_items ---------------------------------------------------

CREATE TABLE IF NOT EXISTS public.brainstorm_index_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.brainstorm_sessions(id) ON DELETE CASCADE,

  index_type text NOT NULL CHECK (index_type IN ('decision', 'assumption', 'constraint', 'question', 'risk', 'event')),
  label text NOT NULL,
  details text,

  confidence numeric CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),

  -- Link back to the conversational record and/or whiteboard objects
  source_message_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  related_object_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],

  created_by text NOT NULL DEFAULT 'ai' CHECK (created_by IN ('ai', 'coach')),
  created_by_user_id uuid REFERENCES public.users(id),

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brainstorm_index_items_session_idx
  ON public.brainstorm_index_items(session_id);

CREATE INDEX IF NOT EXISTS brainstorm_index_items_type_idx
  ON public.brainstorm_index_items(session_id, index_type);

CREATE INDEX IF NOT EXISTS brainstorm_index_items_created_at_idx
  ON public.brainstorm_index_items(created_at);

-- 4) brainstorm_pages ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.brainstorm_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.brainstorm_sessions(id) ON DELETE CASCADE,

  page_index integer NOT NULL,
  title text,

  is_archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS brainstorm_pages_session_page_index_uq
  ON public.brainstorm_pages(session_id, page_index);

CREATE INDEX IF NOT EXISTS brainstorm_pages_session_idx
  ON public.brainstorm_pages(session_id);

-- 5) brainstorm_objects -------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.brainstorm_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.brainstorm_pages(id) ON DELETE CASCADE,

  object_type text NOT NULL CHECK (object_type IN ('text_note', 'image', 'file', 'shape', 'graph_snapshot')),
  z_index integer NOT NULL DEFAULT 0,

  -- Positioning/sizing on the whiteboard canvas
  position_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  size_json jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Content payload (text, file refs, image refs, shape props, graph config, etc.)
  content_json jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_by_user_id uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brainstorm_objects_page_idx
  ON public.brainstorm_objects(page_id);

CREATE INDEX IF NOT EXISTS brainstorm_objects_type_idx
  ON public.brainstorm_objects(object_type);

-- ---------------------------------------------------------------------------
-- RLS
-- Policy model: user must be a member of the session's program
-- Membership check: exists program_members row where program_id matches and users.auth_id = auth.uid()
-- ---------------------------------------------------------------------------

ALTER TABLE public.brainstorm_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brainstorm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brainstorm_index_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brainstorm_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brainstorm_objects ENABLE ROW LEVEL SECURITY;

-- Sessions: SELECT/INSERT/UPDATE limited to program members
DROP POLICY IF EXISTS brainstorm_sessions_select ON public.brainstorm_sessions;
CREATE POLICY brainstorm_sessions_select
  ON public.brainstorm_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.program_members pm
      JOIN public.users u ON u.id = pm.user_id
      WHERE pm.program_id = brainstorm_sessions.program_id
        AND u.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS brainstorm_sessions_insert ON public.brainstorm_sessions;
CREATE POLICY brainstorm_sessions_insert
  ON public.brainstorm_sessions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.program_members pm
      JOIN public.users u ON u.id = pm.user_id
      WHERE pm.program_id = brainstorm_sessions.program_id
        AND u.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS brainstorm_sessions_update ON public.brainstorm_sessions;
CREATE POLICY brainstorm_sessions_update
  ON public.brainstorm_sessions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.program_members pm
      JOIN public.users u ON u.id = pm.user_id
      WHERE pm.program_id = brainstorm_sessions.program_id
        AND u.auth_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.program_members pm
      JOIN public.users u ON u.id = pm.user_id
      WHERE pm.program_id = brainstorm_sessions.program_id
        AND u.auth_id = auth.uid()
    )
  );

-- Messages: access via parent session membership
DROP POLICY IF EXISTS brainstorm_messages_select ON public.brainstorm_messages;
CREATE POLICY brainstorm_messages_select
  ON public.brainstorm_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.brainstorm_sessions s
      JOIN public.program_members pm ON pm.program_id = s.program_id
      JOIN public.users u ON u.id = pm.user_id
      WHERE s.id = brainstorm_messages.session_id
        AND u.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS brainstorm_messages_insert ON public.brainstorm_messages;
CREATE POLICY brainstorm_messages_insert
  ON public.brainstorm_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.brainstorm_sessions s
      JOIN public.program_members pm ON pm.program_id = s.program_id
      JOIN public.users u ON u.id = pm.user_id
      WHERE s.id = brainstorm_messages.session_id
        AND u.auth_id = auth.uid()
    )
  );

-- Index items: access via parent session membership
DROP POLICY IF EXISTS brainstorm_index_items_select ON public.brainstorm_index_items;
CREATE POLICY brainstorm_index_items_select
  ON public.brainstorm_index_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.brainstorm_sessions s
      JOIN public.program_members pm ON pm.program_id = s.program_id
      JOIN public.users u ON u.id = pm.user_id
      WHERE s.id = brainstorm_index_items.session_id
        AND u.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS brainstorm_index_items_insert ON public.brainstorm_index_items;
CREATE POLICY brainstorm_index_items_insert
  ON public.brainstorm_index_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.brainstorm_sessions s
      JOIN public.program_members pm ON pm.program_id = s.program_id
      JOIN public.users u ON u.id = pm.user_id
      WHERE s.id = brainstorm_index_items.session_id
        AND u.auth_id = auth.uid()
    )
  );

-- Pages: access via parent session membership
DROP POLICY IF EXISTS brainstorm_pages_select ON public.brainstorm_pages;
CREATE POLICY brainstorm_pages_select
  ON public.brainstorm_pages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.brainstorm_sessions s
      JOIN public.program_members pm ON pm.program_id = s.program_id
      JOIN public.users u ON u.id = pm.user_id
      WHERE s.id = brainstorm_pages.session_id
        AND u.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS brainstorm_pages_insert ON public.brainstorm_pages;
CREATE POLICY brainstorm_pages_insert
  ON public.brainstorm_pages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.brainstorm_sessions s
      JOIN public.program_members pm ON pm.program_id = s.program_id
      JOIN public.users u ON u.id = pm.user_id
      WHERE s.id = brainstorm_pages.session_id
        AND u.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS brainstorm_pages_update ON public.brainstorm_pages;
CREATE POLICY brainstorm_pages_update
  ON public.brainstorm_pages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.brainstorm_sessions s
      JOIN public.program_members pm ON pm.program_id = s.program_id
      JOIN public.users u ON u.id = pm.user_id
      WHERE s.id = brainstorm_pages.session_id
        AND u.auth_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.brainstorm_sessions s
      JOIN public.program_members pm ON pm.program_id = s.program_id
      JOIN public.users u ON u.id = pm.user_id
      WHERE s.id = brainstorm_pages.session_id
        AND u.auth_id = auth.uid()
    )
  );

-- Objects: access via page -> session membership
DROP POLICY IF EXISTS brainstorm_objects_select ON public.brainstorm_objects;
CREATE POLICY brainstorm_objects_select
  ON public.brainstorm_objects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.brainstorm_pages p
      JOIN public.brainstorm_sessions s ON s.id = p.session_id
      JOIN public.program_members pm ON pm.program_id = s.program_id
      JOIN public.users u ON u.id = pm.user_id
      WHERE p.id = brainstorm_objects.page_id
        AND u.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS brainstorm_objects_insert ON public.brainstorm_objects;
CREATE POLICY brainstorm_objects_insert
  ON public.brainstorm_objects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.brainstorm_pages p
      JOIN public.brainstorm_sessions s ON s.id = p.session_id
      JOIN public.program_members pm ON pm.program_id = s.program_id
      JOIN public.users u ON u.id = pm.user_id
      WHERE p.id = brainstorm_objects.page_id
        AND u.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS brainstorm_objects_update ON public.brainstorm_objects;
CREATE POLICY brainstorm_objects_update
  ON public.brainstorm_objects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.brainstorm_pages p
      JOIN public.brainstorm_sessions s ON s.id = p.session_id
      JOIN public.program_members pm ON pm.program_id = s.program_id
      JOIN public.users u ON u.id = pm.user_id
      WHERE p.id = brainstorm_objects.page_id
        AND u.auth_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.brainstorm_pages p
      JOIN public.brainstorm_sessions s ON s.id = p.session_id
      JOIN public.program_members pm ON pm.program_id = s.program_id
      JOIN public.users u ON u.id = pm.user_id
      WHERE p.id = brainstorm_objects.page_id
        AND u.auth_id = auth.uid()
    )
  );

COMMIT;
