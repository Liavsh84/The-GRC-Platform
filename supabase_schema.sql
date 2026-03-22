-- GRC Platform Database Schema
-- Run this entire script in your Supabase project:
--   Dashboard → SQL Editor → New query → paste this → Run

CREATE TABLE IF NOT EXISTS app_data (
  key        text        PRIMARY KEY,
  value      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Allow the anonymous (public) key full access
-- Your data is protected by keeping the anon key secret in Netlify
ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON app_data
  FOR ALL
  USING (true)
  WITH CHECK (true);
