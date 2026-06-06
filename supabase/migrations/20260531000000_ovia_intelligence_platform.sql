-- ============================================================
-- OVIA Prep Intelligence Platform — Phase 1 Schema Expansion
-- Adds: schools, classrooms, FSRS-6 tracking, neglection,
--        notifications, streaks, sync queue, interaction logs,
--        assessment submissions, risk reports
-- Expands: profiles, flashcards, assessments
-- ============================================================

-- 1. SCHOOLS TABLE ------------------------------------------------
CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subscription_tier text NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'premium', 'enterprise')),
  max_students integer NOT NULL DEFAULT 100,
  syllabus_stream text NOT NULL DEFAULT 'all' CHECK (syllabus_stream IN ('sciences', 'commercials', 'arts', 'all')),
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage schools" ON public.schools
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own school" ON public.schools
  FOR SELECT TO authenticated
  USING (id IN (SELECT school_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. EXPAND PROFILES TABLE ----------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS language_pref text DEFAULT 'en' CHECK (language_pref IN ('en', 'sn', 'nd', 'nb')),
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS last_active timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_profiles_school ON public.profiles(school_id);

-- 3. TEACHER CLASSROOMS -------------------------------------------
CREATE TABLE public.teacher_classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject_ids text[] DEFAULT '{}',
  student_ids uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teacher_classrooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own classrooms" ON public.teacher_classrooms
  FOR ALL TO authenticated
  USING (auth.uid() = teacher_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = teacher_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students view assigned classrooms" ON public.teacher_classrooms
  FOR SELECT TO authenticated
  USING (auth.uid() = ANY(student_ids));

CREATE TRIGGER update_teacher_classrooms_updated_at
  BEFORE UPDATE ON public.teacher_classrooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_classrooms_teacher ON public.teacher_classrooms(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_school ON public.teacher_classrooms(school_id);

-- 4. EXPAND FLASHCARDS — FSRS-6 FIELDS ---------------------------
ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS difficulty numeric DEFAULT 0.3,
  ADD COLUMN IF NOT EXISTS stability numeric DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS retrievability numeric DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS response_time_ms integer;

-- 5. FLASHCARD REVIEWS — FSRS-6 HISTORY --------------------------
CREATE TABLE public.flashcard_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_id uuid NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  ease_rating text NOT NULL CHECK (ease_rating IN ('again', 'hard', 'good', 'easy')),
  response_time_ms integer,
  difficulty_before numeric,
  stability_before numeric,
  retrievability_before numeric,
  difficulty_after numeric,
  stability_after numeric,
  interval_days integer,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reviews" ON public.flashcard_reviews
  FOR ALL TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_student ON public.flashcard_reviews(student_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_card ON public.flashcard_reviews(flashcard_id);

-- 6. STREAK DATA --------------------------------------------------
CREATE TABLE public.streak_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_review_date date,
  achievements text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.streak_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own streak" ON public.streak_data
  FOR ALL TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE TRIGGER update_streak_data_updated_at
  BEFORE UPDATE ON public.streak_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. NEGLECTION LOG -----------------------------------------------
CREATE TABLE public.neglection_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id text NOT NULL,
  days_inactive integer NOT NULL DEFAULT 0,
  mastery_score numeric NOT NULL DEFAULT 0,
  intervention_level text NOT NULL DEFAULT 'nudge' CHECK (intervention_level IN ('nudge', 'critical')),
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.neglection_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own neglection" ON public.neglection_log
  FOR SELECT TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "System insert neglection" ON public.neglection_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE INDEX IF NOT EXISTS idx_neglection_student ON public.neglection_log(student_id, created_at DESC);

-- 8. OVI INTERACTIONS — CHAT LOGGING ------------------------------
CREATE TABLE public.ovi_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_text text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'ovi')),
  language text DEFAULT 'en',
  action_taken text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ovi_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own interactions" ON public.ovi_interactions
  FOR SELECT TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Users insert own interactions" ON public.ovi_interactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE INDEX IF NOT EXISTS idx_interactions_student ON public.ovi_interactions(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_session ON public.ovi_interactions(session_id);

-- 9. NOTIFICATIONS ------------------------------------------------
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  read boolean NOT NULL DEFAULT false,
  data jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read, created_at DESC);

-- 10. EXPAND ASSESSMENTS — TEACHER FEATURES -----------------------
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS time_limit_mins integer,
  ADD COLUMN IF NOT EXISTS total_marks integer,
  ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS due_date timestamptz,
  ADD COLUMN IF NOT EXISTS allow_offline_download boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS paper_type text DEFAULT 'paper2';

-- 11. ASSESSMENT SUBMISSIONS — TEACHER-SET ASSESSMENTS ------------
CREATE TABLE public.assessment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}',
  score numeric DEFAULT 0,
  max_score numeric DEFAULT 0,
  percentage numeric DEFAULT 0,
  feedback_json jsonb DEFAULT '{}',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  time_taken_secs integer,
  offline_created boolean DEFAULT false,
  UNIQUE(assessment_id, student_id)
);

ALTER TABLE public.assessment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own submissions" ON public.assessment_submissions
  FOR ALL TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers view submissions for own assessments" ON public.assessment_submissions
  FOR SELECT TO authenticated
  USING (assessment_id IN (
    SELECT id FROM public.assessments WHERE created_by = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_submissions_assessment ON public.assessment_submissions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.assessment_submissions(student_id, submitted_at DESC);

-- 12. STUDY PLANS — UPGRADED JSONB VERSION -----------------------
CREATE TABLE public.study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  plan_data jsonb NOT NULL DEFAULT '{}',
  ai_generated boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, week_start)
);

ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own study plans" ON public.study_plans
  FOR ALL TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE TRIGGER update_study_plans_updated_at
  BEFORE UPDATE ON public.study_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_study_plans_student ON public.study_plans(student_id, week_start DESC);

-- 13. SYNC QUEUE — OFFLINE SUPPORT --------------------------------
CREATE TABLE public.sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
  payload jsonb NOT NULL,
  created_offline_at timestamptz NOT NULL DEFAULT now(),
  synced_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed'))
);

ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sync queue" ON public.sync_queue
  FOR ALL TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE INDEX IF NOT EXISTS idx_sync_queue_pending ON public.sync_queue(student_id, status) WHERE status = 'pending';

-- 14. SCHOOL RISK REPORTS -----------------------------------------
CREATE TABLE public.school_risk_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  report_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.school_risk_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view risk reports" ON public.school_risk_reports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_risk_reports_school ON public.school_risk_reports(school_id, created_at DESC);

-- 15. CURRICULUM EFFECTIVENESS REPORTS ----------------------------
CREATE TABLE public.curriculum_effectiveness_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  subject_id text NOT NULL,
  report_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.curriculum_effectiveness_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view curriculum reports" ON public.curriculum_effectiveness_reports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_curriculum_reports_school ON public.curriculum_effectiveness_reports(school_id, created_at DESC);
