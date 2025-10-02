document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const apiProviderSelect = document.getElementById('apiProvider');
  const generateBtn = document.getElementById('generateBtn');
  const regenerateBtn = document.getElementById('regenerateBtn');
  const copyBtn = document.getElementById('copyBtn');
  const toneSelect = document.getElementById('tone');
  const statusDiv = document.getElementById('status');
  const resultContent = document.getElementById('postContent');
  const resultContainer = document.getElementById('result-container');

  let lastProfileData = null;

  // ---------------- Core Prompt Logic ----------------
  function buildPrompt(profileData) {
    return `
You are a world-class LinkedIn content strategist and ghostwriter. Your mission: craft an **original, human-like LinkedIn post** that is insightful, relatable, and highly engaging.

**User Profile Data:**
- Profession / Headline: "${profileData.profession}"
- About Section: "${profileData.about}"
- Selected Tone: "${toneSelect.value}"

**Rules:**
- Word count: 50–80 words
- Hook readers immediately
- Deliver one memorable insight
- Strictly maintain the selected tone and first-person voice
- End with a question to boost engagement
- Include 3–5 contextually relevant hashtags
`;
  }

  // ---------------- API Calls ----------------
  async function callOpenAI(apiKey, prompt) {
    const API_URL = 'https://api.openai.com/v1/chat/completions';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 250,
          temperature: 0.75
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `OpenAI error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  async function callGemini(apiKey, prompt) {
    const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `Gemini error: ${response.status}`);
      }

      const data = await response.json();
      const first = data.candidates?.[0];
      return first?.content?.parts?.[0]?.text?.trim() || '';
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  async function getAIPost(profileData) {
    const apiKey = apiKeyInput.value;
    if (!apiKey) {
      updateStatus('Please enter your API key first.', 'error');
      return null;
    }

    const provider = apiProviderSelect.value;
    const prompt = buildPrompt(profileData);

    if (provider === 'openai') {
      return await callOpenAI(apiKey, prompt);
    } else if (provider === 'gemini') {
      return await callGemini(apiKey, prompt);
    } else {
      throw new Error('Unsupported provider selected.');
    }
  }

  // ---------------- UI Helpers ----------------
  function setLoadingState(isLoading) {
    generateBtn.disabled = isLoading;
    regenerateBtn.disabled = isLoading;
    if (isLoading) {
      statusDiv.style.display = 'block';
      statusDiv.className = 'info';
      statusDiv.innerHTML = '<div class="loader"></div> Generating...';
    } else {
      statusDiv.style.display = 'none';
      statusDiv.innerHTML = '';
    }
  }

  function updateStatus(message, type) {
    statusDiv.style.display = 'block';
    statusDiv.className = type;
    statusDiv.textContent = message;
  }

  // ---------------- Event Handlers ----------------
  async function handleGeneration() {
    setLoadingState(true);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.url || !tab.url.includes('linkedin.com')) {
        throw new Error('Please open a LinkedIn profile page first.');
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['injector.js']
      });

      lastProfileData = results[0].result;
      if (!lastProfileData || !lastProfileData.profession) {
        throw new Error('Could not extract profile data. Please ensure you are on a LinkedIn profile page.');
      }

      const post = await getAIPost(lastProfileData);
      if (post) {
        resultContent.value = post;
        resultContainer.style.display = 'block';
        updateStatus('Post generated successfully!', 'success');
      }
    } catch (error) {
      console.error('Generation failed:', error);
      updateStatus(error.message, 'error');
      resultContainer.style.display = 'none';
    } finally {
      setLoadingState(false);
    }
  }

  regenerateBtn.addEventListener('click', handleGeneration);
  generateBtn.addEventListener('click', handleGeneration);

  copyBtn.addEventListener('click', () => {
    resultContent.select();
    navigator.clipboard.writeText(resultContent.value)
      .then(() => updateStatus('Copied to clipboard!', 'success'))
      .catch(() => updateStatus('Could not copy to clipboard.', 'error'));
  });

  // ---------------- API Key Storage ----------------
  apiKeyInput.addEventListener('change', () => {
    chrome.storage.sync.set({ apiKey: apiKeyInput.value }, () => {
      updateStatus('API Key saved.', 'success');
    });
  });

  chrome.storage.sync.get('apiKey', (data) => {
    if (data.apiKey) {
      apiKeyInput.value = data.apiKey;
    }
  });
});
