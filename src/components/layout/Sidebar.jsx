import Logo from '../ui/Logo';

// Helpers for date grouping
function getDateGroup(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return 'Last 7 days';
  if (diffDays <= 30) return 'Last 30 days';
  return 'Older';
}

function groupSessions(sessions) {
  const groups = {};
  const order = ['Today', 'Yesterday', 'Last 7 days', 'Last 30 days', 'Older'];

  for (const s of sessions) {
    const group = getDateGroup(s.created_at);
    if (!groups[group]) groups[group] = [];
    groups[group].push(s);
  }

  return order.filter(g => groups[g]?.length).map(g => ({ label: g, items: groups[g] }));
}

function formatRelativeTime(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMin = Math.floor((now - d) / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function getMoodDotClass(label) {
  switch (label) {
    case 'positive':
    case 'calm':
    case 'happy':
      return 'green';
    case 'anxious':
    case 'neutral':
    case 'mixed':
      return 'amber';
    case 'distressed':
    case 'angry':
    case 'sad':
      return 'red';
    default:
      return 'blue';
  }
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  userName,
  userEmail,
  onSignOut,
  onToggleSidebar,
  theme,
  onToggleTheme
}) {
  const grouped = groupSessions(sessions);
  const initials = (userName || userEmail || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="sidebar">
      <div className="sidebar-overlay" onClick={onToggleSidebar} />
      {/* Header */}
        <div className="sidebar-header" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Logo size={24} />
              <span className="sidebar-brand">Inzuma</span>
            </div>
            <button 
              className="sidebar-toggle-close-btn" 
              onClick={onToggleSidebar}
              title="Collapse sidebar"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-input)',
                transition: 'all 0.2s',
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </button>
          </div>
          <button className="sidebar-new-btn" onClick={onNewSession}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New session
          </button>
        </div>

        {/* Session list */}
        <div className="sidebar-sessions">
          {grouped.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center' }}>
              <p className="text-xs text-muted">No sessions yet.</p>
              <p className="text-xs text-muted" style={{ marginTop: '4px' }}>Start a new session to begin.</p>
            </div>
          )}

          {grouped.map(group => (
            <div key={group.label}>
              <div className="sidebar-group-label">{group.label}</div>
              {group.items.map(session => (
                <button
                  key={session.id}
                  className={`sidebar-session-item ${activeSessionId === session.id ? 'active' : ''}`}
                  onClick={() => onSelectSession(session.id)}
                >
                  <span className={`sidebar-session-dot ${getMoodDotClass(session.mood_label)}`} />
                  <div className="sidebar-session-info">
                    <div className="sidebar-session-title">
                      {(session.title || 'Untitled session').slice(0, 40)}
                    </div>
                    <div className="sidebar-session-meta">
                      {formatRelativeTime(session.updated_at || session.created_at)}
                    </div>
                  </div>
                  <button
                    className="sidebar-session-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    title="Delete session"
                  >
                    <svg viewBox="0 0 24 24">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                  </button>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-avatar">{initials}</div>
          <span className="sidebar-user-name">{userName || userEmail || 'User'}</span>
          <button 
            className="sidebar-theme-btn" 
            onClick={onToggleTheme} 
            title={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-input)',
              transition: 'all 0.2s',
              marginLeft: 'auto',
              marginRight: '8px'
            }}
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}>
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}>
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          <button className="sidebar-settings-btn" onClick={onSignOut} title="Sign out">
            <svg viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>
  );
}
