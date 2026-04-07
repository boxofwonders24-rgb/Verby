-- Issue Reports table
CREATE TABLE issue_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Setup', 'Transcription', 'App Behavior', 'Account', 'Other')),
  severity TEXT NOT NULL CHECK (severity IN ('annoying', 'blocking', 'crashed')),
  description TEXT NOT NULL CHECK (char_length(description) >= 10 AND char_length(description) <= 2000),
  screenshot_url TEXT,
  app_version TEXT NOT NULL,
  os_info TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}',
  settings_snapshot JSONB NOT NULL DEFAULT '{}',
  error_logs JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved', 'wont_fix')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying by user and status
CREATE INDEX idx_issue_reports_user_id ON issue_reports(user_id);
CREATE INDEX idx_issue_reports_status ON issue_reports(status);
CREATE INDEX idx_issue_reports_created_at ON issue_reports(created_at DESC);

-- RLS
ALTER TABLE issue_reports ENABLE ROW LEVEL SECURITY;

-- Users can insert their own reports
CREATE POLICY "Users can insert own reports"
  ON issue_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own reports
CREATE POLICY "Users can read own reports"
  ON issue_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can do everything (for admin)
CREATE POLICY "Service role full access"
  ON issue_reports FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Storage bucket for screenshots (run in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('issue-screenshots', 'issue-screenshots', false);

-- Storage RLS: users upload to their own folder
-- CREATE POLICY "Users upload own screenshots"
--   ON storage.objects FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     bucket_id = 'issue-screenshots' AND
--     (storage.foldername(name))[1] = auth.uid()::text
--   );

-- Storage RLS: users read own screenshots
-- CREATE POLICY "Users read own screenshots"
--   ON storage.objects FOR SELECT
--   TO authenticated
--   USING (
--     bucket_id = 'issue-screenshots' AND
--     (storage.foldername(name))[1] = auth.uid()::text
--   );
