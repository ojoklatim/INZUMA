import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { insforge } from '../lib/insforge';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Logo from '../components/ui/Logo';

export default function ProfessionalDashboard() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState(null);
  const [directory, setDirectory] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch current practitioner's profile
        const { data: profile } = await insforge.database
          .from('professional_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profile) setMyProfile(profile);

        // Fetch directory profiles
        const { data: allProfiles } = await insforge.database
          .from('professional_profiles')
          .select('*');

        if (allProfiles) {
          // Fetch names from users table
          const { data: usersList } = await insforge.database
            .from('users')
            .select('id, name');

          const usersMap = {};
          if (usersList) {
            usersList.forEach(u => {
              usersMap[u.id] = u;
            });
          }

          const resolvedList = allProfiles.map(p => ({
            ...p,
            userName: usersMap[p.user_id]?.name || 'Practitioner',
            userEmail: usersMap[p.user_id]?.email || ''
          }));

          setDirectory(resolvedList);
        }
      } catch (err) {
        console.error("Error loading directory:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="admin-shell" style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="admin-shell">
      {/* Topbar */}
      <div className="admin-topbar">
        <div className="admin-topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Logo size={24} />
          <span className="admin-brand">Inzuma</span>
          <span className="admin-brand-role pro">Professional</span>
          {myProfile?.verified ? (
            <span className="status-pill verified">Verified</span>
          ) : (
            <span className="status-pill pending">Pending Verification</span>
          )}
        </div>
        <div className="admin-topbar-right">
          <span className="admin-user-email">{user?.email}</span>
          <button className="admin-signout-btn" onClick={signOut}>Sign Out</button>
        </div>
      </div>

      {/* Main content */}
      <div className="admin-content">
        <h1 className="admin-page-title">Professional Workspace</h1>
        <p className="admin-page-sub">Your credentials, profile details, and the Inzuma practitioner network.</p>

        <div className="admin-grid">
          {/* Left: Profile Credentials */}
          <div className="admin-panel">
            <div className="admin-panel-header">
              <h3 className="admin-panel-title">Your Profile Credentials</h3>
              <p className="admin-panel-sub">Registered professional details</p>
            </div>
            <div className="admin-panel-body">
              <div className="pro-credentials-grid">
                <div className="pro-credential-item">
                  <span className="pro-credential-lbl">Specialty</span>
                  <span className="pro-credential-val">{myProfile?.specialty || 'General Practitioner'}</span>
                </div>
                <div className="pro-credential-item">
                  <span className="pro-credential-lbl">License Number</span>
                  <span className="pro-credential-val mono">{myProfile?.license_number || 'N/A'}</span>
                </div>
                <div className="pro-credential-item">
                  <span className="pro-credential-lbl">Phone Number</span>
                  <span className="pro-credential-val">{myProfile?.phone || 'N/A'}</span>
                </div>
                <div className="pro-credential-item">
                  <span className="pro-credential-lbl">Clinic / Hospital</span>
                  <span className="pro-credential-val">{myProfile?.clinic || 'N/A'}</span>
                </div>
                <div className="pro-credential-item">
                  <span className="pro-credential-lbl">Location</span>
                  <span className="pro-credential-val">
                    {myProfile?.city && myProfile?.country
                      ? `${myProfile.city}, ${myProfile.country}`
                      : myProfile?.clinic_address || 'N/A'}
                  </span>
                </div>
                <div className="pro-credential-item">
                  <span className="pro-credential-lbl">Member Since</span>
                  <span className="pro-credential-val">
                    {myProfile?.created_at
                      ? new Date(myProfile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {myProfile?.bio && (
                <div className="pro-bio-block">
                  <span className="pro-credential-lbl">Biography</span>
                  <p className="pro-bio-text">{myProfile.bio}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Practitioner Directory */}
          <div className="admin-panel">
            <div className="admin-panel-header">
              <h3 className="admin-panel-title">Practitioner Directory</h3>
              <p className="admin-panel-sub">Registered Inzuma medical network ({directory.length} members)</p>
            </div>
            <div className="admin-panel-body">
              {directory.length === 0 ? (
                <div className="admin-empty-state">No other professionals registered yet.</div>
              ) : (
                <div className="admin-log-list">
                  {directory.map((prof, idx) => (
                    <div key={idx} className="pro-directory-card">
                      <div className="pro-directory-top">
                        <div>
                          <div className="pro-directory-name">{prof.userName}</div>
                          <div className="pro-directory-email">{prof.userEmail}</div>
                        </div>
                        <Badge variant="specialist">{prof.specialty}</Badge>
                      </div>
                      <div className="pro-directory-details">
                        <div><strong>Clinic:</strong> {prof.clinic || 'N/A'}</div>
                        <div><strong>Location:</strong> {prof.city || 'N/A'}, {prof.country || 'N/A'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
