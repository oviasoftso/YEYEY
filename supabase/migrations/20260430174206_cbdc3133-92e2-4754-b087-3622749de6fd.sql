-- ============================================================
-- OVIA Prep — Security & cleanup migration
-- 1) user_roles + has_role (replaces hardcoded admin emails)
-- 2) Add ON DELETE CASCADE FKs for all per-user tables
-- 3) Indexes on user_id for query performance
-- 4) Tighten profiles RLS to authenticated only
-- 5) delete_my_account() helper
-- ============================================================

-- 1. Roles enum + table ----------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'student');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role);
$$;

-- RLS: users can read their own role; admins can read all; only admins can write
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Cascade FKs for per-user tables ---------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass::text AS tbl
    FROM pg_constraint
    WHERE conrelid IN (
      'public.assessments'::regclass,
      'public.flashcards'::regclass,
      'public.revision_notes'::regclass,
      'public.study_plan_items'::regclass,
      'public.topic_mastery'::regclass,
      'public.profiles'::regclass,
      'public.blocked_users'::regclass
    )
    AND contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;

ALTER TABLE public.assessments       ADD CONSTRAINT assessments_user_id_fkey       FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.flashcards        ADD CONSTRAINT flashcards_user_id_fkey        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.revision_notes    ADD CONSTRAINT revision_notes_user_id_fkey    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.study_plan_items  ADD CONSTRAINT study_plan_items_user_id_fkey  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.topic_mastery     ADD CONSTRAINT topic_mastery_user_id_fkey     FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.profiles          ADD CONSTRAINT profiles_user_id_fkey          FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.blocked_users     ADD CONSTRAINT blocked_users_user_id_fkey     FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Indexes ---------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_assessments_user      ON public.assessments(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_flashcards_user       ON public.flashcards(user_id, next_review);
CREATE INDEX IF NOT EXISTS idx_revision_notes_user   ON public.revision_notes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_plan_user       ON public.study_plan_items(user_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_topic_mastery_user    ON public.topic_mastery(user_id, subject);
CREATE INDEX IF NOT EXISTS idx_user_roles_user       ON public.user_roles(user_id);

-- 4. Tighten profiles policies (currently `public` role) -------
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to insert blocked_users / manage them
DROP POLICY IF EXISTS "Admins manage blocked users" ON public.blocked_users;
CREATE POLICY "Admins manage blocked users" ON public.blocked_users
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. delete_my_account (clean self-deletion) -------------------
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  -- Cascade FKs handle child rows; just delete the auth user.
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM public;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- 6. Auto-grant 'student' role on new user, 'admin' for Anesu --
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF lower(NEW.email) IN ('anesu.dzere@waterfallsacademy.co.zw', 'anesu@oviasoftware.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();
