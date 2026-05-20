const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'inflection/inflection-3-pi';

/**
 * Inzuma system prompt — CBT-informed mental health companion.
 */
export const SYSTEM_PROMPT = `You are Inzuma, a warm and emotionally intelligent mental health companion. You practice CBT-informed conversation — helping users identify thought patterns, reframe negative thinking, and feel genuinely heard.

You are NOT a replacement for professional care. If you detect signs of crisis, severe depression, trauma, or suicidal ideation, gently acknowledge the user's pain and strongly encourage professional support.

Rules:
- Never diagnose formally
- Always validate before advising
- Ask one follow-up question per response
- Keep responses under 120 words unless the user asks for more
- Mirror the user's tone and energy
- Never use clinical jargon
- End every 5th message with a soft reflection prompt`;

/**
 * Streams chat completion from OpenRouter API using inflection-3-pi model.
 * 
 * @param {Object} options
 * @param {Array} options.messages - Chat messages: [{ role: 'user', content: 'text' }]
 * @param {Function} options.onChunk - Callback for streaming chunks: (text) => void
 * @param {Function} [options.onDone] - Callback when done: (fullText) => void
 * @param {Function} [options.onError] - Callback on error: (error) => void
 * @param {string} [options.apiKey] - Optional custom API key
 * @param {string} [options.model] - Optional custom model override
 * @param {boolean} [options.includeSystemPrompt] - Whether to prepend system prompt (default true)
 */
export async function streamCompletion({
  messages,
  onChunk,
  onDone,
  onError,
  apiKey = import.meta.env.VITE_OPENROUTER_API_KEY,
  model = DEFAULT_MODEL,
  includeSystemPrompt = true
}) {
  try {
    // Prepend system prompt
    const fullMessages = includeSystemPrompt
      ? [{ role: 'system', content: SYSTEM_PROMPT }, ...messages]
      : messages;

    if (!apiKey) {
      console.warn("OpenRouter API key (VITE_OPENROUTER_API_KEY) is missing. Streaming a simulated response.");
      await simulateStreamingResponse(messages, onChunk, onDone);
      return;
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Inzuma',
      },
      body: JSON.stringify({
        model: model,
        messages: fullMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    if (!response.body) {
      throw new Error('ReadableStream is not supported by the response body.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Keep the last partial line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const cleanedLine = line.trim();
        if (!cleanedLine) continue;
        if (cleanedLine === 'data: [DONE]') continue;

        if (cleanedLine.startsWith('data: ')) {
          const dataStr = cleanedLine.slice(6).trim();
          try {
            const parsed = JSON.parse(dataStr);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              fullText += content;
              if (onChunk) onChunk(content);
            }
          } catch (e) {
            console.debug('JSON parse error on SSE stream line:', cleanedLine, e);
          }
        }
      }
    }

    // Flush final buffer line if any
    if (buffer && buffer.startsWith('data: ')) {
      const dataStr = buffer.slice(6).trim();
      try {
        const parsed = JSON.parse(dataStr);
        const content = parsed.choices?.[0]?.delta?.content || '';
        if (content) {
          fullText += content;
          if (onChunk) onChunk(content);
        }
      } catch (e) {}
    }

    if (onDone) onDone(fullText);
  } catch (error) {
    console.error('Streaming error:', error);
    if (onError) {
      onError(error);
    } else {
      throw error;
    }
  }
}

/**
 * Classifies the emotional mood from recent messages.
 * Returns { mood: string, score: number } or null on failure.
 * 
 * @param {Array} recentMessages - Last ~3 messages [{ role, content }]
 * @param {string} [apiKey] - API key
 */
export async function classifyMood(recentMessages, apiKey = import.meta.env.VITE_OPENROUTER_API_KEY) {
  const moodPrompt = `Classify the emotional state in these messages as one of: calm, anxious, sad, distressed, crisis. Return JSON only: {"mood": string, "score": 1-10}`;

  const messages = [
    ...recentMessages.slice(-3),
    { role: 'user', content: moodPrompt }
  ];

  if (!apiKey) {
    // Simulated mood response
    const moods = ['calm', 'anxious', 'sad'];
    const mood = moods[Math.floor(Math.random() * moods.length)];
    return { mood, score: Math.floor(Math.random() * 5) + 3 };
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Inzuma',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: messages,
        stream: false,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    const match = content.match(/\{[^}]+\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        mood: parsed.mood || 'calm',
        score: Math.min(10, Math.max(1, parseInt(parsed.score) || 5))
      };
    }

    return null;
  } catch (err) {
    console.error('Mood classification error:', err);
    return null;
  }
}

/**
 * Simulates a streaming response for local development when no API key is specified.
 */
async function simulateStreamingResponse(messages, onChunk, onDone) {
  const userPrompt = messages[messages.length - 1]?.content || '';
  
  const responses = [
    `I hear you, and it takes real courage to share that. "${userPrompt.slice(0, 60)}" — that sounds like it carries weight. Let's sit with that for a moment. What do you notice in your body when you think about this? Sometimes our physical sensations can tell us a lot about what we're really feeling underneath.`,
    `Thank you for opening up. What you're describing makes complete sense, and I want you to know there's no right or wrong way to feel about it. It sounds like there might be some tension between what you're experiencing and what you wish things looked like. Can you tell me more about what the ideal version of this situation would feel like for you?`,
    `I appreciate you sharing that with me. It's clear this is something you've been carrying for a while. One thing I've noticed in our conversation is a pattern of putting others' needs before your own — does that resonate with you? What would it look like to give yourself the same compassion you give to others?`,
  ];

  const responseText = responses[Math.floor(Math.random() * responses.length)];
  const words = responseText.split(' ');
  let currentText = '';
  
  for (const word of words) {
    const chunk = word + ' ';
    currentText += chunk;
    if (onChunk) onChunk(chunk);
    await new Promise((resolve) => setTimeout(resolve, 45));
  }
  
  if (onDone) onDone(currentText.trim());
}

/**
 * Analyzes full session transcript using OpenRouter API.
 * Returns themes, pattern text, and mood assessments.
 * 
 * @param {Array} messages - List of [{ role, content }]
 * @param {string} [apiKey] - API key
 */
export async function analyzeSession(messages, apiKey = import.meta.env.VITE_OPENROUTER_API_KEY) {
  const filtered = messages.filter(m => m.role !== 'system');
  const transcriptText = filtered.map(m => `${m.role === 'user' ? 'User' : 'Inzuma'}: ${m.content}`).join('\n');

  const analyzePrompt = `Analyze the following session transcript. Provide 3-5 bullet point themes, a gentle non-clinical pattern explanation (warm and human, e.g. "Across today's conversation, worry about the future came up several times..."), a pattern title, and identify a dominant mood and a mood score from 1 to 10.
  
Return JSON only:
{
  "themes": ["bullet 1", "bullet 2", "bullet 3"],
  "pattern_title": "string title",
  "pattern_description": "paragraph text",
  "dominant_mood": "anxious | sadness | trauma | relationships | addiction | body_image | crisis",
  "mood_score": 7
}

TRANSCRIPT:
${transcriptText}`;

  if (!apiKey) {
    // Simulated fallback
    return {
      themes: [
        "Desire for emotional balance and feeling heard",
        "Worry about upcoming changes in daily routines",
        "Habitual prioritizing of others' needs before self-care"
      ],
      pattern_title: "Over-extension & Anticipatory Worry",
      pattern_description: "Throughout our talk today, focus shifted several times to future responsibilities and caring for others first. Carrying that kind of quiet burden is something many navigate with dedicated care.",
      dominant_mood: "anxious",
      mood_score: 6
    };
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Inzuma',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [{ role: 'user', content: analyzePrompt }],
        stream: false,
      }),
    });

    if (!response.ok) throw new Error('Analysis request failed');

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const match = content.match(/\{[^}]+\}/s);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('No JSON matched in analysis output');
  } catch (err) {
    console.error('Session analysis error:', err);
    // Safe robust fallback
    return {
      themes: [
        "Exploring current lifestyle pressures",
        "Acknowledging emotional blockages"
      ],
      pattern_title: "Stress & Overthinking Patterns",
      pattern_description: "Throughout today's chat, overthinking patterns were highly visible. Taking a step back to breathe and seek guided clarity can be incredibly transformative.",
      dominant_mood: "anxious",
      mood_score: 5
    };
  }
}
