-- Inzuma Database Migration Schema v2 (Complete)

-- 1. Users Profile (Extended metadata table referencing auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user','professional','admin')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ
);

-- 2. Professional Profiles
CREATE TABLE IF NOT EXISTS professional_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  specialty TEXT NOT NULL,
  license_number TEXT,
  phone TEXT,
  clinic TEXT,
  country TEXT,
  city TEXT,
  bio TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Invite Tokens
CREATE TABLE IF NOT EXISTS invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  specialty TEXT,
  token TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  title TEXT,
  mood_score NUMERIC(3,1),
  mood_label TEXT,
  duration_seconds INTEGER DEFAULT 0,
  summary TEXT,
  themes JSONB,
  crisis_flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  mood_score NUMERIC(3,1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  specialist_type TEXT,
  professional_id UUID REFERENCES professional_profiles(id) ON DELETE SET NULL,
  action_taken TEXT,
  saved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Admin Logs
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_id UUID,
  target_type TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) Configuration
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles
CREATE POLICY user_profile_policy ON user_profiles
  FOR ALL USING (auth.uid() = id);

-- Policies for professional_profiles
CREATE POLICY professional_profile_policy ON professional_profiles
  FOR ALL USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Policies for sessions
CREATE POLICY sessions_policy ON sessions
  FOR ALL USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Policies for messages
CREATE POLICY messages_policy ON messages
  FOR ALL USING (EXISTS (
    SELECT 1 FROM sessions WHERE id = messages.session_id AND user_id = auth.uid()
  ));

-- Policies for referrals
CREATE POLICY referrals_user_policy ON referrals
  FOR ALL USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY referrals_professional_policy ON referrals
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM professional_profiles WHERE id = referrals.professional_id AND user_id = auth.uid()
  ));

-- Policies for invite_tokens
CREATE POLICY invite_tokens_admin_policy ON invite_tokens
  FOR ALL USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Policies for admin_logs
CREATE POLICY admin_logs_policy ON admin_logs
  FOR ALL USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
  ));
