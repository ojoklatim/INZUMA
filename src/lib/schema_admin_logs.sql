-- Create admin_logs table for platform compliance auditing

CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- e.g., 'deactivate_user', 'toggle_verification', 'generate_invite', 'revoke_invite'
  target_id UUID,
  target_type TEXT, -- e.g., 'user', 'professional_profile', 'invite_token'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
