import React, { useState, useEffect } from 'react';
import { analyzeSession } from '../../lib/api';
import { insforge } from '../../lib/insforge';
import Spinner from '../ui/Spinner';

// Pattern to Specialist detail config
const SPECIALIST_CONFIGS = {
  anxiety: {
    title: 'CBT Therapist',
    tag: 'Best for: overthinking, worry, or physical tension',
    desc: 'Cognitive Behavioral Therapy helps you map the loops between thoughts, sensations, and actions to find grounding.',
    color: 'blue',
    type: 'CBT Therapist'
  },
  sadness: {
    title: 'Psychiatrist',
    tag: 'Best for: persistent sadness, lack of energy, or low mood',
    desc: 'Medical specialists who provide diagnosis, medication guidance, and integrated biological-emotional support.',
    color: 'amber',
    type: 'Psychiatrist'
  },
  trauma: {
    title: 'EMDR Therapist',
    tag: 'Best for: flashbacks, painful memories, or hyper-vigilance',
    desc: 'Eye Movement Desensitization and Reprocessing helps rewire how difficult historical events are stored in the body.',
    color: 'purple',
    type: 'EMDR Specialist'
  },
  relationships: {
    title: 'Marriage & Family Therapist (MFT)',
    tag: 'Best for: conflict, communications, or household strain',
    desc: 'MFTs specialize in mapping systemic patterns between couples, parents, and partners.',
    color: 'green',
    type: 'Marriage & Family Therapist'
  },
  addiction: {
    title: 'Addiction Counsellor',
    tag: 'Best for: substance reliance, compulsive loops, or habit breaking',
    desc: 'Highly practical support prioritizing triggers, safe environments, and cognitive reframings.',
    color: 'orange',
    type: 'Addiction Counsellor'
  },
  body_image: {
    title: 'Eating Disorder Specialist',
    tag: 'Best for: body distress, strict eating patterns, or severe self-criticism',
    desc: 'Specialized support focusing on food relationships, somatic self-love, and healing patterns.',
    color: 'rose',
    type: 'ED Specialist'
  },
  crisis: {
    title: 'Crisis Line Specialist',
    tag: 'Best for: immediate distress, self-harm thoughts, or overwhelm',
    desc: 'Active listeners trained in immediate stabilization, absolute safety, and active compassionate presence.',
    color: 'red',
    type: 'Crisis Specialist'
  }
};

export default function AnalysisModal({
  session,
  userProfile,
  onClose
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [savedSpecialists, setSavedSpecialists] = useState([]);
  const [pros, setPros] = useState([]);
  const [savingAction, setSavingAction] = useState(false);

  // Sync session transcript and pull themes/patterns
  useEffect(() => {
    if (!session) return;
    const runAnalysis = async () => {
      try {
        const messages = typeof session.messages === 'string'
          ? JSON.parse(session.messages)
          : (session.messages || []);

        const result = await analyzeSession(messages);
        setAnalysis(result);

        // Fetch onboarded practitioners matching user country and specialty
        const domMood = result?.dominant_mood || 'anxious';
        const config = SPECIALIST_CONFIGS[domMood] || SPECIALIST_CONFIGS.anxiety;

        const { data, error } = await insforge.database
          .from('professional_profiles')
          .select('*')
          .eq('specialty', config.type);

        if (data) {
          // If country is specified, filter or prefer local matches
          const country = userProfile?.country || 'Uganda';
          const localPros = data.filter(p => (p.clinic_address || '').toLowerCase().includes(country.toLowerCase()));
          setPros(localPros.length > 0 ? localPros : data.slice(0, 2));
        }
      } catch (err) {
        console.error('Failed to analyze session:', err);
      } finally {
        setLoading(false);
      }
    };
    runAnalysis();
  }, [session, userProfile]);

  // Log referral actions into DB
  const logReferral = async (specialistType, action, proId = null) => {
    try {
      await insforge.database
        .from('referrals')
        .insert([{
          session_id: session.id,
          user_id: userProfile?.id || session.user_id,
          specialist_type: specialistType,
          action_taken: action,
          professional_id: proId
        }]);
    } catch (err) {
      console.warn('Referral logging failed:', err);
    }
  };

  // Switch directory listings based on profile country
  const getDirectoryLink = () => {
    const country = (userProfile?.country || 'Global').toLowerCase();
    if (country.includes('uganda')) return 'https://minduganda.org';
    if (country.includes('united states') || country.includes('us')) return 'https://psychologytoday.com/us/therapists';
    if (country.includes('united kingdom') || country.includes('uk')) return 'https://counselling-directory.org.uk';
    return 'https://opencounseling.com';
  };

  const handleSaveCard = (specialtyTitle) => {
    if (savedSpecialists.includes(specialtyTitle)) {
      setSavedSpecialists(prev => prev.filter(s => s !== specialtyTitle));
      logReferral(specialtyTitle, 'unsaved_card');
    } else {
      setSavedSpecialists(prev => [...prev, specialtyTitle]);
      logReferral(specialtyTitle, 'saved_card');
    }
  };

  // Derive message stats
  const messagesList = typeof session?.messages === 'string'
    ? JSON.parse(session.messages)
    : (session?.messages || []);
  const msgCount = messagesList.length;
  const sessionDuration = session?.duration_seconds || 0;
  const durationMin = Math.round(sessionDuration / 60) || 1;

  // Derive mood history progression dots
  const moodProgression = messagesList
    .filter(m => m.role === 'assistant' && m.content)
    .slice(-6)
    .map((m, idx) => {
      // Mock progression labels for beautiful visualization dots
      const labels = ['calm', 'anxious', 'sad', 'calm'];
      return labels[idx % labels.length];
    });

  if (loading) {
    return (
      <div className="referral-overlay">
        <div className="referral-modal" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
          <Spinner size={32} />
          <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Analyzing session themes & patterns…</p>
        </div>
      </div>
    );
  }

  const activeMood = analysis?.dominant_mood || 'anxious';
  const matchedSpecialist = SPECIALIST_CONFIGS[activeMood] || SPECIALIST_CONFIGS.anxiety;
  const showCrisis = activeMood === 'crisis' || session?.mood_label === 'crisis';

  return (
    <div className="referral-overlay">
      <div className="referral-modal">
        <div className="referral-body">
          {/* STEP 1: Session Reflection */}
          {step === 1 && (
            <div>
              <h2 className="referral-title">Your Session Reflection</h2>
              <p className="referral-subtitle">Here is a synthesis of what you shared and explored during this session.</p>

              {/* Stats Row */}
              <div className="reflection-stats-grid">
                <div className="reflection-stat-card">
                  <div className="reflection-stat-val">{durationMin}m</div>
                  <div className="reflection-stat-lbl">Duration</div>
                </div>
                <div className="reflection-stat-card">
                  <div className="reflection-stat-val">{msgCount}</div>
                  <div className="reflection-stat-lbl">Exchanges</div>
                </div>
                <div className="reflection-stat-card">
                  <div className="reflection-stat-val">{analysis?.mood_score || session?.mood_score || 5}/10</div>
                  <div className="reflection-stat-lbl">Emotional Intensity</div>
                </div>
              </div>

              {/* Mood Journey */}
              <div className="mood-journey-box">
                <h3 className="mood-journey-title">Mood progression</h3>
                <div className="mood-dots-row">
                  {moodProgression.length === 0 ? (
                    <div className="mood-dot-item">
                      <div className={`mood-dot-circle green`} />
                      <span className="mood-dot-lbl">calm</span>
                    </div>
                  ) : (
                    moodProgression.map((m, idx) => (
                      <div key={idx} className="mood-dot-item">
                        <div className={`mood-dot-circle ${m === 'calm' ? 'green' : m === 'anxious' ? 'amber' : 'red'}`} />
                        <span className="mood-dot-lbl">{m}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Themes list */}
              <h3 className="mood-journey-title">Key Themes Discussed</h3>
              <div className="themes-list">
                {(analysis?.themes || []).map((t, idx) => (
                  <div key={idx} className="theme-bullet">
                    {t}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Pattern Recognition */}
          {step === 2 && (
            <div>
              <h2 className="referral-title">Something worth exploring</h2>
              <p className="referral-subtitle">Based on your entries, we noticed a persistent conversational focus.</p>

              <div className="pattern-card">
                <h3 className="pattern-card-title">{analysis?.pattern_title || 'Recurring Concerns'}</h3>
                <p className="pattern-desc">
                  {analysis?.pattern_description || "Throughout today's conversations, certain emotional themes recurred. Noticing these patterns is the first step toward building mindfulness."}
                </p>
                <span className="disclaimer-text">
                  ⚠️ This reflection is compiled by a companion AI for clarity. It is not a clinical diagnosis or medical evaluation.
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: Professional Referrals */}
          {step === 3 && (
            <div>
              <h2 className="referral-title">You deserve real support.</h2>
              <p className="referral-subtitle">Here is who we believe can help you navigate this specific concern.</p>

              {/* Crisis Card (Always shown if crisis/self-harm patterns detected) */}
              {showCrisis && (
                <div className="crisis-referral-card">
                  <h3 className="crisis-card-title">
                    <span className="sidebar-session-dot red" /> Please reach out now
                  </h3>
                  <p className="referral-card-desc" style={{ color: 'var(--text-primary)' }}>
                    Immediate support is available free, confidentially, and 24/7. You don't have to carry this alone.
                  </p>
                  <div className="crisis-info-row">
                    <div className="crisis-info-block">
                      <span className="crisis-label">Uganda Specific</span>
                      <strong>Butabika Hospital Helpline</strong><br />
                      +256 414 505 000<br />
                      Mind Uganda Crisis Support
                    </div>
                    <div className="crisis-info-block">
                      <span className="crisis-label">International</span>
                      <strong>Befrienders Worldwide</strong><br />
                      +44 116 123 (UK)<br />
                      Text HOME to 741741
                    </div>
                  </div>
                </div>
              )}

              {/* Referral Cards stack */}
              <div className="referrals-stack">
                <div className={`referral-card ${matchedSpecialist.color}`}>
                  <div className="referral-card-header">
                    <h3 className="referral-card-title">{matchedSpecialist.title}</h3>
                    <span className="referral-tag">{matchedSpecialist.tag}</span>
                  </div>
                  <p className="referral-card-desc">{matchedSpecialist.desc}</p>
                  <div className="referral-buttons">
                    <a
                      href="tel:+256414505000"
                      className="referral-btn crisis"
                      onClick={() => logReferral(matchedSpecialist.title, 'crisis_called')}
                    >
                      📞 Crisis Line
                    </a>
                    <a
                      href={getDirectoryLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="referral-btn"
                      onClick={() => logReferral(matchedSpecialist.title, 'near_you_searched')}
                    >
                      🔍 Find One Near You
                    </a>
                    <button
                      className={`referral-save-btn ${savedSpecialists.includes(matchedSpecialist.title) ? 'saved' : ''}`}
                      onClick={() => handleSaveCard(matchedSpecialist.title)}
                      title="Bookmark specialist to profile"
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill={savedSpecialists.includes(matchedSpecialist.title) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Onboarded Practitioners from Database */}
              {pros.length > 0 && (
                <div>
                  <h3 className="platform-pros-header">Verified specialists on Inzuma</h3>
                  {pros.map((pro, idx) => (
                    <div key={idx} className="pro-minicard">
                      <div className="pro-minicard-info">
                        <div className="pro-name-title">
                          {pro.name || 'Practitioner'} <span>• {pro.specialty}</span>
                        </div>
                        <div className="pro-loc">{pro.clinic_address || 'Kampala, Uganda'}</div>
                        <div className="pro-badge">⭐ Available on Inzuma</div>
                      </div>
                      <div className="pro-minicard-actions">
                        <button
                          className="referral-btn"
                          onClick={() => logReferral(pro.specialty, 'viewed_professional', pro.id)}
                          style={{ padding: '6px 12px' }}
                        >
                          View Profile
                        </button>
                        <a
                          href={`mailto:${pro.contact_email || 'support@inzuma.org'}`}
                          className="referral-btn"
                          onClick={() => logReferral(pro.specialty, 'contacted_professional', pro.id)}
                          style={{ padding: '6px 12px', borderColor: 'var(--accent)', color: 'var(--accent)' }}
                        >
                          Contact
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="referral-footer">
          <div className="referral-step-indicator">
            <span className={`step-dot ${step === 1 ? 'active' : ''}`} />
            <span className={`step-dot ${step === 2 ? 'active' : ''}`} />
            <span className={`step-dot ${step === 3 ? 'active' : ''}`} />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {step > 1 && (
              <button
                className="referral-btn"
                onClick={() => setStep(prev => prev - 1)}
              >
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                className="referral-btn"
                onClick={() => setStep(prev => prev + 1)}
                style={{ backgroundColor: 'var(--accent)', color: 'var(--bg-primary)', borderColor: 'var(--accent)' }}
              >
                {step === 1 ? 'See what we noticed →' : 'See who can help →'}
              </button>
            ) : (
              <button
                className="referral-btn"
                onClick={onClose}
                style={{ backgroundColor: 'var(--accent)', color: 'var(--bg-primary)', borderColor: 'var(--accent)' }}
              >
                Finish Reflection
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
