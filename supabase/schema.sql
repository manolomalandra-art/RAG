-- Supabase SQL Schema for Industrial Report
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  lang TEXT NOT NULL DEFAULT 'pt',
  financial_rows INTEGER DEFAULT 0,
  tribology_rows INTEGER DEFAULT 0,
  items JSONB DEFAULT '[]'::jsonb
);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Allow anon read/write for demo purposes
CREATE POLICY "Allow all for anon" ON reports
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
