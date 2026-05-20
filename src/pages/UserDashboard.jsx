import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { insforge } from '../lib/insforge';
import Sidebar from '../components/layout/Sidebar';
import ChatView from '../components/chat/ChatView';
import VoiceMode from '../components/voice/VoiceMode';
import AnalysisModal from '../components/referral/AnalysisModal';
import MetricsDashboard from '../components/dashboard/MetricsDashboard';
import Spinner from '../components/ui/Spinner';

export default function UserDashboard() {
  const { user, signOut } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [emptyStateInput, setEmptyStateInput] = useState('');
  const [voiceActive, setVoiceActive] = useState(false);
  const [analyzingSession, setAnalyzingSession] = useState(null);
  const [activeTab, setActiveTab] = useState('reflect'); // 'reflect' | 'metrics'
  const [userProfile, setUserProfile] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('inzuma-theme') || 'light');

  // Handle dark mode toggle
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('inzuma-theme', 'dark');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('inzuma-theme', 'light');
    }
  }, [theme]);

  // Auto open/close sidebar on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch user profile metadata
  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      try {
        const { data } = await insforge.database
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        if (data) {
          setUserProfile(data);
        }
      } catch (err) {
        console.warn('Failed to load user metadata:', err);
      }
    };
    loadProfile();
  }, [user]);

  // Voice state
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Fetch user sessions on mount
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const { data, error } = await insforge.database
          .from('sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (data) {
          setSessions(data);
        }
      } catch (err) {
        console.error('Failed to load sessions:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  // Get the currently active session object
  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Create a new session
  const handleNewSession = async () => {
    try {
      const newSession = {
        user_id: user.id,
        title: 'New session',
        mood_score: 0,
        mood_label: 'calm',
        duration_seconds: 0,
        messages: JSON.stringify([]),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        summary: null
      };

      const { data, error } = await insforge.database
        .from('sessions')
        .insert([newSession])
        .select();

      if (error) {
        console.error('Insert session error:', error);
        // Fallback: create local session
        const localSession = { ...newSession, id: crypto.randomUUID() };
        setSessions(prev => [localSession, ...prev]);
        setActiveSessionId(localSession.id);
      } else if (data?.[0]) {
        setSessions(prev => [data[0], ...prev]);
        setActiveSessionId(data[0].id);
      }

      setSidebarOpen(false);
    } catch (err) {
      console.error('Create session error:', err);
    }
  };

  // Delete a session
  const handleDeleteSession = async (sessionId) => {
    try {
      await insforge.database
        .from('sessions')
        .delete()
        .eq('id', sessionId);
    } catch (err) {
      console.error('Delete session error:', err);
    }

    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
    }
  };

  // Select a session
  const handleSelectSession = (sessionId) => {
    setActiveSessionId(sessionId);
    setSidebarOpen(false);
  };

  // Update session (from ChatView save/persist)
  const handleUpdateSession = useCallback(async (updatedSession) => {
    // Update in local state
    setSessions(prev =>
      prev.map(s => s.id === updatedSession.id ? updatedSession : s)
    );

    // Persist to DB
    try {
      const { id, ...fields } = updatedSession;
      await insforge.database
        .from('sessions')
        .update({
          title: fields.title,
          messages: typeof fields.messages === 'string'
            ? fields.messages
            : JSON.stringify(fields.messages),
          mood_score: fields.mood_score,
          mood_label: fields.mood_label,
          duration_seconds: fields.duration_seconds,
          updated_at: fields.updated_at || new Date().toISOString(),
          summary: fields.summary
        })
        .eq('id', id);
    } catch (err) {
      console.error('Session update error:', err);
    }
  }, []);

  // STT: Speech-to-Text toggle
  const handleToggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by your browser.');
      return;
    }
    
    if (isListening) {
      if (window.activeRecognition) {
        window.activeRecognition.stop();
      }
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    window.activeRecognition = recognition;
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      if (activeSessionId) {
        window.dispatchEvent(new CustomEvent('inzuma-voice-result', { detail: text }));
      } else {
        setEmptyStateInput(prev => prev + (prev ? ' ' : '') + text);
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
      window.activeRecognition = null;
    };
    recognition.onend = () => {
      setIsListening(false);
      window.activeRecognition = null;
    };
    recognition.start();
  };

  // Starter prompt handler: create session + inject first message directly into state & database
  const handleStarterPrompt = async (promptText) => {
    try {
      const firstMsg = { role: 'user', content: promptText };
      const newSession = {
        user_id: user.id,
        title: promptText.slice(0, 40),
        mood_score: 0,
        mood_label: 'calm',
        duration_seconds: 0,
        messages: JSON.stringify([firstMsg]),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        summary: null
      };

      const { data, error } = await insforge.database
        .from('sessions')
        .insert([newSession])
        .select();

      let created;
      if (error || !data?.[0]) {
        created = { ...newSession, id: crypto.randomUUID() };
      } else {
        created = data[0];
      }

      setSessions(prev => [created, ...prev]);
      setActiveSessionId(created.id);

      // Save user message to messages table
      if (created.id) {
        try {
          await insforge.database
            .from('messages')
            .insert([{
              session_id: created.id,
              role: 'user',
              content: promptText
            }]);
        } catch (err) {
          console.error('Failed to save starter prompt to messages table:', err);
        }
      }
    } catch (err) {
      console.error('Starter prompt error:', err);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--accent)'
      }}>
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className={`shell ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
      {voiceActive && activeSession && (
        <VoiceMode
          session={activeSession}
          onUpdateSession={handleUpdateSession}
          onClose={() => setVoiceActive(false)}
          onEndSession={(id) => {
            setVoiceActive(false);
            setAnalyzingSession(activeSession);
          }}
        />
      )}

      {analyzingSession && (
        <AnalysisModal
          session={analyzingSession}
          userProfile={userProfile}
          onClose={() => setAnalyzingSession(null)}
        />
      )}

      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        userName={userName}
        userEmail={user?.email}
        onSignOut={signOut}
        onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
      />

      <div className="main-area">
        {activeSession ? (
          <div className="chat-view">
            <ChatView
              session={activeSession}
              onUpdateSession={handleUpdateSession}
              ttsEnabled={ttsEnabled}
              isListening={isListening}
              onToggleVoice={handleToggleVoice}
              onEnterVoiceMode={() => setVoiceActive(true)}
              onToggleSidebar={() => setSidebarOpen(prev => !prev)}
              onEndSession={() => setAnalyzingSession(activeSession)}
              userName={userName}
            />
          </div>
        ) : (
          <>
            {/* Top bar for empty state */}
            <div className="topbar">
              <div className="topbar-left">
                <button
                  className="topbar-hamburger"
                  onClick={() => setSidebarOpen(prev => !prev)}
                >
                  <svg viewBox="0 0 24 24">
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <line x1="3" y1="12" x2="21" y2="12"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                  </svg>
                </button>
                <div style={{ display: 'flex', gap: '16px', marginLeft: '24px' }}>
                  <button
                    className={`tab-btn ${activeTab === 'reflect' ? 'active' : ''}`}
                    onClick={() => setActiveTab('reflect')}
                  >
                    Reflect
                  </button>
                  <button
                    className={`tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
                    onClick={() => setActiveTab('metrics')}
                  >
                    My Insights
                  </button>
                </div>
              </div>
              <div className="topbar-right">
                <label className="text-xs text-secondary flex items-center gap-xs" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={ttsEnabled}
                    onChange={(e) => setTtsEnabled(e.target.checked)}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  Voice responses
                </label>
              </div>
            </div>

            {/* Content Tab Toggle */}
            {activeTab === 'reflect' ? (
              <div className="empty-state">
                <div className="empty-state-content-wrapper">
                  <h1 className="empty-state-heading">
                    {getGreeting()}, {userName}
                  </h1>
                  <p className="empty-state-sub">
                    How can I help you find emotional clarity and reflect today?
                  </p>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (emptyStateInput.trim()) {
                        handleStarterPrompt(emptyStateInput.trim());
                        setEmptyStateInput('');
                      }
                    }} 
                    className="empty-state-input-box"
                  >
                    <textarea
                      className="empty-state-textarea"
                      placeholder="How are you feeling right now? Describe it in your own words..."
                      value={emptyStateInput}
                      onChange={(e) => setEmptyStateInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (emptyStateInput.trim()) {
                            handleStarterPrompt(emptyStateInput.trim());
                            setEmptyStateInput('');
                          }
                        }
                      }}
                    />
                    <div className="empty-state-input-footer">
                      <div className="empty-state-footer-left">
                        <button type="button" className="empty-state-action-btn" title="Cognitive Reframing">
                          <svg viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="16" />
                            <line x1="8" y1="12" x2="16" y2="12" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="empty-state-footer-right">
                        <span className="empty-state-model-badge">Inzuma Pi</span>
                        <button 
                          type="button" 
                          className={`empty-state-mic-btn ${isListening ? 'listening' : ''}`}
                          onClick={handleToggleVoice}
                          title="Voice reflection"
                        >
                          <svg viewBox="0 0 24 24">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                            <line x1="12" y1="19" x2="12" y2="23"/>
                            <line x1="8" y1="23" x2="16" y2="23"/>
                          </svg>
                        </button>
                        <button 
                          type="submit" 
                          className={`empty-state-submit-btn ${emptyStateInput.trim() ? 'active' : ''}`}
                          disabled={!emptyStateInput.trim()}
                          title="Send reflection"
                        >
                          <svg viewBox="0 0 24 24">
                            <line x1="22" y1="2" x2="11" y2="13"/>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </form>

                  <div className="empty-state-pills">
                    <button type="button" className="empty-state-pill" onClick={() => handleStarterPrompt("I want to do a breathing exercise")}>
                      Breathe
                    </button>
                    <button type="button" className="empty-state-pill" onClick={() => handleStarterPrompt("I want to journal my thoughts")}>
                      Journal
                    </button>
                    <button type="button" className="empty-state-pill" onClick={() => handleStarterPrompt("I need cognitive reframing")}>
                      Reframe
                    </button>
                    <button type="button" className="empty-state-pill" onClick={() => handleStarterPrompt("Guide me through a grounding exercise")}>
                      Ground
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <MetricsDashboard
                user={user}
                onSelectSession={(id) => {
                  handleSelectSession(id);
                  setActiveTab('reflect'); // switch back to show the active session
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
