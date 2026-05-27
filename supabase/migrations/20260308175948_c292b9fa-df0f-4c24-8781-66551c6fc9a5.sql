
-- Table to track blocked users
CREATE TABLE public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_at timestamp with time zone NOT NULL DEFAULT now(),
  reason text DEFAULT 'Your access has been suspended. Contact your school administrator.',
  UNIQUE(user_id)
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Only admins (via edge function with service role) can manage blocked_users
-- Students can check if they are blocked
CREATE POLICY "Users can check own block status"
  ON public.blocked_users FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
