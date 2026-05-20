-- Sessions table for Inzuma conversation history

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New session',
  mood_score INT DEFAULT 0,
  mood_label TEXT DEFAULT 'calm',
  duration_seconds INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  summary TEXT,
  messages JSONB DEFAULT '[]'::jsonb
);
