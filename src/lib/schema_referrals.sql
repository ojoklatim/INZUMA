-- Referrals table for tracking user directory and specialist link clicks

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  specialist_type TEXT NOT NULL,
  action_taken TEXT NOT NULL, -- e.g., 'saved_card', 'crisis_called', 'near_you_searched', 'viewed_professional'
  professional_id UUID REFERENCES professional_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
