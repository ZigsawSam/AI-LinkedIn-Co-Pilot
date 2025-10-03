document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const apiProviderSelect = document.getElementById('apiProvider');
  const generateBtn = document.getElementById('generateBtn');
  const regenerateBtn = document.getElementById('regenerateBtn');
  const copyBtn = document.getElementById('copyBtn');
  const toneSelect = document.getElementById('tone');
  const topicInput = document.getElementById('topic');
  const customProfessionInput = document.getElementById('customProfession');
  const statusDiv = document.getElementById('status');
  const resultContent = document.getElementById('postContent');
  const resultContainer = document.getElementById('result-container');

  let lastProfileData = null;

  // ---------------- Prompt Builder ----------------
  const buildPrompt = (profileData, topic) => {
    const profession = customProfessionInput.value.trim() || profileData.profession;

    const coreRules = `
You are a world-class LinkedIn content strategist. Write a natural, human-like LinkedIn post for the user.

**Guidelines:**
- Use a conversational, authentic tone.
- Keep it concise (60–100 words), but don’t force word count.
- Start with a relatable thought, story, or question.
- Write in first-person shaped by user’s profession and About section.
- Follow selected tone: ${toneSelect.value}.
- End with an open-ended thought or question.
- Include 2–4 relevant hashtags naturally.
`;

    let taskPrompt;
    if (topic && topic.trim().length > 0) {
      taskPrompt = `
**Task:** Write a LinkedIn post about "${topic}" based on:

- Profession / Headline: "${profession}"
- About: "${profileData.about}"
`;
    } else {
      taskPrompt = `
**Task:** Write a general LinkedIn post inspired by:

- Profession / Headline: "${profession}"
- About: "${profileData.about}"
`;
    }

    return coreRules + taskPrompt;
  };

  // ---------------- API Calls ----------------
  async function callOpenAI(apiKey, prompt) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.8
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
  }

  async function callGemini(apiKey, prompt) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
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
  }

  async function getAIPost(profileData) {
    const apiKey = apiKeyInput.value;
    if (!apiKey) {
      updateStatus('Please enter your API key first.', 'error');
      return null;
    }

    const provider = apiProviderSelect.value;
    const prompt = buildPrompt(profileData, topicInput.value);

    if (provider === 'openai') return await callOpenAI(apiKey, prompt);
    if (provider === 'gemini') return await callGemini(apiKey, prompt);
    throw new Error('Unsupported provider selected.');
  }

  // ---------------- UI Helpers ----------------
  function setLoadingState(isLoading) {
    generateBtn.disabled = isLoading;
    regenerateBtn.disabled = isLoading;
    statusDiv.style.display = isLoading ? 'block' : 'none';
    statusDiv.className = isLoading ? 'info' : '';
    statusDiv.innerHTML = isLoading ? '<div class="loader"></div> Generating...' : '';
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
      if (!tab.url.includes('linkedin.com')) throw new Error('Open a LinkedIn profile page first.');

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['injector.js']
      });

      lastProfileData = results[0].result;
      if (!lastProfileData) throw new Error('Could not extract profile data.');

      const post = await getAIPost(lastProfileData);
      if (!post || post.trim().length < 20) throw new Error('AI did not return a valid post.');

      resultContent.value = post;
      resultContainer.style.display = 'block';
      updateStatus('Post generated successfully!', 'success');

    } catch (err) {
      console.error(err);
      updateStatus(err.message, 'error');
      resultContainer.style.display = 'none';
    } finally {
      setLoadingState(false);
    }
  }

  generateBtn.addEventListener('click', handleGeneration);
  regenerateBtn.addEventListener('click', handleGeneration);

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(resultContent.value)
      .then(() => updateStatus('Copied to clipboard!', 'success'))
      .catch(() => updateStatus('Could not copy to clipboard.', 'error'));
  });

  apiKeyInput.addEventListener('change', () => {
    chrome.storage.sync.set({ apiKey: apiKeyInput.value }, () => updateStatus('API Key saved.', 'success'));
  });

  chrome.storage.sync.get('apiKey', (data) => {
    if (data.apiKey) apiKeyInput.value = data.apiKey;
  });
});
