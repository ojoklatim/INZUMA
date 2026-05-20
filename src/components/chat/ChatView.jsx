import React, { useState, useEffect, useRef, useCallback } from 'react';
import { streamCompletion, classifyMood } from '../../lib/api';
import { insforge } from '../../lib/insforge';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';

// Contextual suggestion prompts
const SUGGESTION_POOL = [
  'Would you like to try a breathing exercise?',
  'Want to journal this feeling?',
  'Shall we explore this further?',
  'Would a grounding exercise help right now?',
  'Want to reframe that thought together?',
  'Should we pause and check in with your body?',
];

function pickSuggestions() {
  const shuffled = [...SUGGESTION_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2);
}

export default function ChatView({
  session,
  onUpdateSession,
  ttsEnabled,
  isListening,
  onToggleVoice,
  onToggleSidebar,
  onEndSession,
  userName,
  onEnterVoiceMode
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [suggestions, setSuggestions] = useState(null);
  const [suggestionsDismissing, setSuggestionsDismissing] = useState(false);

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const timerRef = useRef(null);
  const suggestTimerRef = useRef(null);
  const assistantMsgCount = useRef(0);

  // Sync from session prop
  useEffect(() => {
    if (session) {
      const parsed = typeof session.messages === 'string'
        ? JSON.parse(session.messages)
        : (session.messages || []);
      setMessages(parsed);
      setTitleValue(session.title || 'New session');
      setElapsed(session.duration_seconds || 0);
      assistantMsgCount.current = parsed.filter(m => m.role === 'assistant').length;

      // Auto-trigger first AI response if there is exactly 1 user message and no assistant messages yet!
      if (parsed.length === 1 && parsed[0].role === 'user' && !isStreaming) {
        triggerFirstResponse(parsed);
      }
    }
  }, [session?.id]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Session timer
  useEffect(() => {
    if (messages.length > 0 && session) {
      timerRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [messages.length > 0, session?.id]);

  // Listen for voice results from parent
  useEffect(() => {
    const handleVoice = (e) => {
      setInputText(prev => prev + (prev ? ' ' : '') + e.detail);
      textareaRef.current?.focus();
    };
    window.addEventListener('inzuma-voice-result', handleVoice);
    return () => window.removeEventListener('inzuma-voice-result', handleVoice);
  }, []);

  // Listen for starter prompts from parent
  useEffect(() => {
    const handleStarter = (e) => {
      setInputText(e.detail);
      // Auto-send after a tick
      setTimeout(() => {
        sendMessage(e.detail);
      }, 50);
    };
    window.addEventListener('inzuma-starter-prompt', handleStarter);
    return () => window.removeEventListener('inzuma-starter-prompt', handleStarter);
  }, [session?.id, messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + 'px';
    }
  }, [inputText]);

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const speakText = (text) => {
    if (!ttsEnabled) return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    synth.speak(utterance);
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  // Persist session to parent + DB
  const persistSession = useCallback((updatedMessages, extraFields = {}) => {
    if (!session) return;
    onUpdateSession({
      ...session,
      messages: updatedMessages,
      duration_seconds: elapsed,
      updated_at: new Date().toISOString(),
      ...extraFields
    });
  }, [session, elapsed, onUpdateSession]);

  // Dismiss suggestions
  const dismissSuggestions = useCallback(() => {
    setSuggestionsDismissing(true);
    setTimeout(() => {
      setSuggestions(null);
      setSuggestionsDismissing(false);
    }, 300);
    clearTimeout(suggestTimerRef.current);
  }, []);

  // Show suggestions after every 4th AI message
  const maybeShowSuggestions = useCallback((count) => {
    if (count > 0 && count % 4 === 0) {
      const picks = pickSuggestions();
      setSuggestions(picks);
      setSuggestionsDismissing(false);
      // Auto-dismiss after 8 seconds
      clearTimeout(suggestTimerRef.current);
      suggestTimerRef.current = setTimeout(() => {
        dismissSuggestions();
      }, 8000);
    }
  }, [dismissSuggestions]);

  // Mood detection
  const detectMood = useCallback(async (allMessages) => {
    const recent = allMessages.filter(m => m.role !== 'system').slice(-3);
    const result = await classifyMood(recent);
    if (result && session) {
      persistSession(allMessages, {
        mood_label: result.mood,
        mood_score: result.score
      });
    }
  }, [session, persistSession]);

  // Title editing
  const handleTitleBlur = () => {
    setEditingTitle(false);
    if (titleValue.trim() && titleValue !== session?.title) {
      persistSession(messages, { title: titleValue.trim() });
    }
  };

  // Send message
  const sendMessage = async (overrideText) => {
    const text = overrideText || inputText;
    if (!text.trim() || isStreaming) return;

    const userMsg = { role: 'user', content: text.trim() };
    const nextMessages = [...messages, userMsg];
    
    // Set both the user message and the blank assistant placeholder message in a single batch
    // to prevent race conditions during streaming responses!
    const assistantIdx = nextMessages.length;
    setMessages([...nextMessages, { role: 'assistant', content: '' }]);
    setInputText('');
    setIsStreaming(true);

    // Dismiss any active suggestions
    if (suggestions) dismissSuggestions();

    // Persist user message to the messages table
    try {
      await insforge.database
        .from('messages')
        .insert([{
          session_id: session.id,
          role: 'user',
          content: text.trim()
        }]);
    } catch (err) {
      console.error('Failed to save user message to messages table:', err);
    }

    // Auto-generate title from first user message
    let titleUpdate = {};
    if (messages.length === 0) {
      const autoTitle = text.trim().slice(0, 40);
      setTitleValue(autoTitle);
      titleUpdate = { title: autoTitle };
    }

    let streamedText = '';
    await streamCompletion({
      messages: nextMessages.filter(m => m.role !== 'system'),
      onChunk: (chunk) => {
        streamedText += chunk;
        setMessages(prev => {
          const updated = [...prev];
          if (updated[assistantIdx]) {
            updated[assistantIdx] = { role: 'assistant', content: streamedText };
          }
          return updated;
        });
      },
      onDone: async (fullText) => {
        setIsStreaming(false);
        const finalMessages = [...nextMessages, { role: 'assistant', content: fullText }];
        setMessages(finalMessages);
        persistSession(finalMessages, titleUpdate);
        speakText(fullText);

        // Persist AI response to messages table
        try {
          await insforge.database
            .from('messages')
            .insert([{
              session_id: session.id,
              role: 'assistant',
              content: fullText,
              mood_score: session?.mood_score || 0
            }]);
        } catch (err) {
          console.error('Failed to save AI response to messages table:', err);
        }

        // Track assistant message count and maybe show suggestions
        assistantMsgCount.current += 1;
        maybeShowSuggestions(assistantMsgCount.current);

        // Run mood detection in background
        detectMood(finalMessages);
      },
      onError: (err) => {
        setIsStreaming(false);
        const errorMsg = [...nextMessages, { role: 'assistant', content: `I'm having trouble connecting right now. Please try again in a moment.` }];
        setMessages(errorMsg);
        persistSession(errorMsg, titleUpdate);
      }
    });
  };

  // Auto-triggers AI response on new sessions created via reflection starter prompts
  const triggerFirstResponse = async (initialMessages) => {
    if (isStreaming) return;
    setIsStreaming(true);
    const assistantIdx = initialMessages.length;
    
    // Render user message and assistant placeholder message in a single batch
    setMessages([...initialMessages, { role: 'assistant', content: '' }]);

    let streamedText = '';
    await streamCompletion({
      messages: initialMessages.filter(m => m.role !== 'system'),
      onChunk: (chunk) => {
        streamedText += chunk;
        setMessages(prev => {
          const updated = [...prev];
          if (updated[assistantIdx]) {
            updated[assistantIdx] = { role: 'assistant', content: streamedText };
          }
          return updated;
        });
      },
      onDone: async (fullText) => {
        setIsStreaming(false);
        const finalMessages = [...initialMessages, { role: 'assistant', content: fullText }];
        setMessages(finalMessages);
        persistSession(finalMessages);
        speakText(fullText);

        // Persist AI response to messages table
        try {
          await insforge.database
            .from('messages')
            .insert([{
              session_id: session.id,
              role: 'assistant',
              content: fullText,
              mood_score: session?.mood_score || 0
            }]);
        } catch (err) {
          console.error('Failed to save AI response to messages table:', err);
        }

        assistantMsgCount.current += 1;
        maybeShowSuggestions(assistantMsgCount.current);
        detectMood(finalMessages);
      },
      onError: (err) => {
        setIsStreaming(false);
        const errorMsg = [...initialMessages, { role: 'assistant', content: `I'm having trouble connecting right now. Please try again in a moment.` }];
        setMessages(errorMsg);
        persistSession(errorMsg);
      }
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestionClick = (text) => {
    dismissSuggestions();
    setInputText(text);
    setTimeout(() => sendMessage(text), 50);
  };

  // Mood dot
  const moodDotClass = (() => {
    switch (session?.mood_label) {
      case 'positive': case 'calm': case 'happy': return 'green';
      case 'anxious': case 'neutral': case 'mixed': return 'amber';
      case 'distressed': case 'angry': case 'sad': return 'red';
      case 'crisis': return 'red';
      default: return 'blue';
    }
  })();

  return (
    <>
      {/* Streaming glow */}
      <div className={`chat-view-stream-glow ${isStreaming ? 'active' : ''}`} />

      {/* Top bar */}
      <div className="topbar">
        <div className="topbar-left">
          <button
            className="topbar-hamburger"
            onClick={onToggleSidebar}
          >
            <svg viewBox="0 0 24 24">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          {editingTitle ? (
            <input
              className="topbar-title"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
              autoFocus
            />
          ) : (
            <button
              className="topbar-title"
              onClick={() => setEditingTitle(true)}
              title="Click to rename session"
            >
              {titleValue || 'New session'}
            </button>
          )}
        </div>
        <div className="topbar-right">
          <button
            className="referral-btn"
            onClick={onEndSession}
            style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: 'var(--border)' }}
            title="End this session and see reflection analysis"
          >
            End Session
          </button>
          <span className="topbar-timer">{formatTimer(elapsed)}</span>
          <Badge variant="mood">
            <span
              className={`sidebar-session-dot ${moodDotClass}`}
              style={{ display: 'inline-block', marginRight: '5px', verticalAlign: 'middle' }}
            />
            {session?.mood_label || 'calm'}
          </Badge>
          <button
            className={`topbar-voice-btn ${isListening ? 'listening' : ''}`}
            onClick={onToggleVoice}
            title={isListening ? 'Listening…' : 'Voice input'}
          >
            <svg viewBox="0 0 24 24">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </button>
          <button
            className="topbar-voice-btn headset-btn"
            onClick={onEnterVoiceMode}
            title="Start immersive interactive voice session"
            style={{ marginLeft: '6px' }}
          >
            <svg viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}>
              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-view-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-view-msg ${msg.role}`}>
            <span className="chat-view-sender">
              {msg.role === 'assistant' ? 'Inzuma Pi' : (userName || 'You')}
            </span>
            <div className="chat-view-text">
              {msg.content === '' ? (
                <span className="flex items-center gap-sm" style={{ color: 'var(--text-muted)' }}>
                  <Spinner size={12} />
                  <span style={{ fontSize: '0.85rem' }}>Reflecting…</span>
                </span>
              ) : (
                <>
                  {msg.content}
                  {isStreaming && i === messages.length - 1 && msg.role === 'assistant' && (
                    <span className="stream-cursor" />
                  )}
                </>
              )}
            </div>

            {/* Copy button — only on completed messages */}
            {msg.content && !(isStreaming && i === messages.length - 1) && (
              <button
                className="chat-view-copy"
                onClick={() => copyText(msg.content)}
                title="Copy text"
              >
                <svg viewBox="0 0 24 24">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
              </button>
            )}
          </div>
        ))}

        {/* Suggestion chips */}
        {suggestions && !isStreaming && (
          <div className={`suggestion-chips ${suggestionsDismissing ? 'dismissing' : ''}`}>
            {suggestions.map((text, i) => (
              <button
                key={i}
                className="suggestion-chip"
                onClick={() => handleSuggestionClick(text)}
              >
                {text}
              </button>
            ))}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Floating input bar wrapper */}
      <div className="chat-view-input-area">
        <div className="chat-view-input-wrapper">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }} 
            className={`empty-state-input-box chat-view-input-box ${isStreaming ? 'disabled' : ''}`}
          >
            <textarea
              ref={textareaRef}
              className="empty-state-textarea chat-view-textarea"
              placeholder={isListening ? 'Listening to you…' : `Reply to ${(userName || 'You')}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              rows={1}
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
                  onClick={onToggleVoice}
                  title={isListening ? 'Listening…' : 'Voice input'}
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
                  className={`empty-state-submit-btn ${inputText.trim() ? 'active' : ''}`}
                  disabled={!inputText.trim() || isStreaming}
                  title="Send message"
                >
                  <svg viewBox="0 0 24 24">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
