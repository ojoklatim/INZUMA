import React, { useState, useEffect, useRef } from 'react';
import { streamCompletion, classifyMood } from '../../lib/api';
import { insforge } from '../../lib/insforge';
import Spinner from '../ui/Spinner';

export default function VoiceMode({
  session,
  onUpdateSession,
  onClose,
  onEndSession
}) {
  const [state, setState] = useState('idle'); // idle | listening | thinking | speaking
  const [userSpeech, setUserSpeech] = useState('');
  const [lines, setLines] = useState([]);
  const [micActive, setMicActive] = useState(false);

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis || null);
  const activeUtteranceRef = useRef(null);
  const streamTextRef = useRef('');

  // Voice selection helper
  const getSelectedVoice = () => {
    if (!synthRef.current) return null;
    const voices = synthRef.current.getVoices();
    // Prefer "Google UK English Female" or "Samantha"
    const preferred = voices.find(
      (v) =>
        v.name.includes('Google UK English Female') ||
        v.name.includes('Samantha') ||
        v.name.includes('Google') ||
        v.name.includes('Natural')
    );
    return preferred || voices[0] || null;
  };

  // Pre-load voices (some browsers fetch async)
  useEffect(() => {
    if (synthRef.current && synthRef.current.onvoiceschanged !== undefined) {
      synthRef.current.onvoiceschanged = () => {};
    }
  }, []);

  // Web Speech API: Initialize SpeechRecognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition is not supported in this browser.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setState('listening');
      setUserSpeech('');
    };

    rec.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join('');
      setUserSpeech(transcript);
    };

    rec.onerror = (e) => {
      console.error('Speech recognition error:', e);
      setMicActive(false);
      setState('idle');
    };

    rec.onend = () => {
      // If mic is active and we didn't transit to thinking, restart or trigger answer
      if (state === 'listening') {
        const finalSpeech = streamTextRef.current; // temp buffer
        // Note: we will trigger sending when user finishes speaking (silence detected by API naturally)
        // Wait, onend triggers automatically when user stops speaking for a moment in non-continuous
        setMicActive(false);
        if (userSpeech.trim()) {
          triggerAISpeech(userSpeech.trim());
        } else {
          setState('idle');
        }
      }
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [userSpeech, state]);

  // Handle mic toggle button click
  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported or ready.');
      return;
    }

    if (micActive) {
      recognitionRef.current.stop();
      setMicActive(false);
    } else {
      // Cancel active speech if any
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      setState('listening');
      setMicActive(true);
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Recognition start issue:', err);
      }
    }
  };

  // Process text chunks to render maximum 3 lines
  const addTranscriptWord = (word) => {
    streamTextRef.current += word;
    // Chunk the text into segments of roughly 40-45 chars or 8-10 words
    const words = streamTextRef.current.split(' ');
    const newLines = [];
    let currentLine = '';

    for (const w of words) {
      if ((currentLine + ' ' + w).length > 40) {
        newLines.push(currentLine.trim());
        currentLine = w;
      } else {
        currentLine += (currentLine ? ' ' : '') + w;
      }
    }
    if (currentLine) {
      newLines.push(currentLine.trim());
    }

    // Keep last 3 lines
    setLines(newLines);
  };

  // Run CBT stream and TTS output
  const triggerAISpeech = async (userPromptText) => {
    setState('thinking');
    setMicActive(false);
    setLines([]);
    streamTextRef.current = '';

    // Retrieve previous messages
    const parsedMessages = typeof session.messages === 'string'
      ? JSON.parse(session.messages)
      : (session.messages || []);

    const userMsg = { role: 'user', content: userPromptText };
    const nextMessages = [...parsedMessages, userMsg];

    // Save user spoken input into sessions table
    try {
      await insforge.database
        .from('messages')
        .insert([{
          session_id: session.id,
          role: 'user',
          content: userPromptText
        }]);
    } catch (err) {
      console.error('Failed to save user spoken message to database:', err);
    }

    let fullAIResponse = '';
    await streamCompletion({
      messages: nextMessages.filter((m) => m.role !== 'system'),
      onChunk: (chunk) => {
        setState('speaking');
        fullAIResponse += chunk;
        addTranscriptWord(chunk);
      },
      onDone: async (finalText) => {
        const finalMessages = [...nextMessages, { role: 'assistant', content: finalText }];

        // Save AI response to DB
        try {
          await insforge.database
            .from('messages')
            .insert([{
              session_id: session.id,
              role: 'assistant',
              content: finalText,
              mood_score: session?.mood_score || 0
            }]);
        } catch (err) {
          console.error('Failed to save AI response to database:', err);
        }

        // Update shared session state
        onUpdateSession({
          ...session,
          messages: finalMessages,
          updated_at: new Date().toISOString()
        });

        // Background Mood Classify
        const recent = finalMessages.filter((m) => m.role !== 'system').slice(-3);
        classifyMood(recent).then((res) => {
          if (res) {
            onUpdateSession({
              ...session,
              messages: finalMessages,
              mood_label: res.mood,
              mood_score: res.score,
              updated_at: new Date().toISOString()
            });
          }
        });

        // Trigger TTS read out
        speakResponse(finalText);
      },
      onError: (err) => {
        console.error(err);
        setState('idle');
        setLines(['I had trouble reflecting. Please try again.']);
      }
    });
  };

  // Speech Synthesis speak response
  const speakResponse = (text) => {
    if (!synthRef.current) {
      setState('idle');
      return;
    }

    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = getSelectedVoice();
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setState('speaking');
    };

    utterance.onend = () => {
      setState('idle');
      // On TTS end, automatically reactive microphone toggle if still inside voice mode
      setTimeout(() => {
        toggleMic();
      }, 500);
    };

    utterance.onerror = (err) => {
      console.error('TTS error:', err);
      setState('idle');
    };

    activeUtteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  // Render line class list
  const getLineClass = (index, total) => {
    if (total > 3 && index < total - 3) return 'voice-transcript-line old';
    return 'voice-transcript-line';
  };

  return (
    <div className="voice-mode-takeover">
      {/* Background shifting wash */}
      <div className={`voice-wash ${state}`} />

      {/* Top Header */}
      <div className="voice-header">
        <span className="voice-header-title">Voice Session</span>
        <div className="voice-status-badge">
          {state === 'listening' && (
            <>
              <span className="sidebar-session-dot green" />
              listening
            </>
          )}
          {state === 'thinking' && (
            <>
              <Spinner size={10} />
              thinking
            </>
          )}
          {state === 'speaking' && (
            <>
              <span className="sidebar-session-dot blue" />
              speaking
            </>
          )}
          {state === 'idle' && (
            <>
              <span className="sidebar-session-dot amber" />
              idle
            </>
          )}
        </div>
      </div>

      {/* Center: Orb & previews */}
      <div className="voice-center-container">
        {/* User spoken preview */}
        <div className={`voice-user-text-preview ${userSpeech ? 'visible' : ''}`}>
          {userSpeech}
        </div>

        {/* Animated Orb wrapper */}
        <div className={`voice-orb-wrapper ${state === 'listening' ? 'listening' : ''}`}>
          <div className="voice-ripple voice-ripple-1" />
          <div className="voice-ripple voice-ripple-2" />
          <div className="voice-ripple voice-ripple-3" />
          <div className={`voice-orb ${state}`} />
        </div>

        {/* AI transcript (up to 3 visible lines) */}
        <div className="voice-transcript-container">
          <div
            className="voice-transcript-wrapper"
            style={{
              transform: lines.length > 3 ? `translateY(-${(lines.length - 3) * 25}px)` : 'none'
            }}
          >
            {lines.map((line, idx) => (
              <div key={idx} className={getLineClass(idx, lines.length)}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls panel */}
      <div className={`voice-controls ${state === 'speaking' ? 'fade-out' : ''}`}>
        {/* Switch to chat mode */}
        <button
          className="voice-action-btn"
          onClick={onClose}
          title="Switch to chat view"
        >
          <svg viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </button>

        {/* Main mic center button */}
        <button
          className={`voice-mic-main ${micActive ? 'active' : ''}`}
          onClick={toggleMic}
          title={micActive ? 'Mute' : 'Speak'}
        >
          <svg viewBox="0 0 24 24">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
            <path d="M19 10v2a7 7 0 01-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>

        {/* End voice session */}
        <button
          className="voice-action-btn"
          onClick={() => {
            if (synthRef.current) synthRef.current.cancel();
            if (recognitionRef.current) recognitionRef.current.abort();
            onEndSession(session.id);
          }}
          title="End session"
        >
          <svg viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
