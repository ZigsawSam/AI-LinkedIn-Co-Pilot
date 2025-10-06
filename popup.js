document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const apiProviderSelect = document.getElementById('apiProvider');
  const generateBtn = document.getElementById('generateBtn');
  const regenerateBtn = document.getElementById('regenerateBtn');
  const copyBtn = document.getElementById('copyBtn');
  const toneSelect = document.getElementById('tone');
  const topicInput = document.getElementById('topic');
  const customProfessionInput = document.getElementById('customProfession');
  const lengthSelect = document.getElementById('length');
  const statusDiv = document.getElementById('status');
  const resultContent = document.getElementById('postContent');
  const resultContainer = document.getElementById('result-container');

  let lastProfileData = null;

  // ---------------- Prompt Builder ----------------
// This is the only function you need to replace in popup.js

const buildPrompt = (profileData) => {
    const profession = customProfessionInput.value.trim() || profileData.profession;
    const topic = topicInput.value.trim();
    
    // --- THE FIX IS HERE ---
    // First, we determine the word count instruction string.
    let wordCountInstruction;
    switch (lengthSelect.value) {
      case 'short': wordCountInstruction = 'Strictly adhere to a word count of 30–50 words.'; break;
      case 'long': wordCountInstruction = 'Strictly adhere to a word count of 80–120 words.'; break;
      default: wordCountInstruction = 'Strictly adhere to a word count of 50–80 words.'; break;
    }

    // The core rules are now more general, without the word count.
    const coreRules = `
      You are a world-class LinkedIn content strategist for the brand 'Crumenaa', specializing in culturally-aware content. Your mission is to craft an original, human-like LinkedIn post.
      **Core Rules:**
      - Start with a strong, scroll-stopping hook.
      - Deliver one single, memorable insight.
      - End with an engaging question.
      - Include 3–5 relevant hashtags.
      - Adopt the user's voice based on their profile.
    `;

    const desiToneMasterclass = `
      **Masterclass on "Subtle Desi & Witty" Tone:** This tone is about shared professional experiences with a cultural twist. Use relatable desi analogies (like 'jugaad' or 'chai breaks') and light Hinglish professionally. The vibe is warm, clever, and knowing.
      **Example:** *"In the corporate world, they call it 'agile innovation'. Growing up, we just called it 'jugaad'. The spirit is the same: resourcefulness. What's the best example of jugaad you've seen at work? #Jugaad #Innovation"*
    `;

    // --- AND THE FIX IS APPLIED HERE ---
    // The word count instruction is now part of the final, specific task.
    let taskPrompt;
    if (topic) {
      taskPrompt = `
        **Your Specific Task:**
        Write a post specifically about the topic: **"${topic}"**.
        The core insight MUST be about this topic, written from the user's perspective.
        Strictly adhere to their selected tone.
        ${wordCountInstruction}
      `;
    } else {
      taskPrompt = `
        **Your Specific Task:**
        Write a general insightful post based on the user's professional profile.
        Find an interesting angle from their profession or "About" section.
        Strictly adhere to their selected tone.
        ${wordCountInstruction}
      `;
    }

    const finalPrompt = (toneSelect.value === 'Subtle Desi & Witty')
      ? coreRules + desiToneMasterclass + taskPrompt
      : coreRules + taskPrompt;

    return finalPrompt + `
      **User Profile Data:**
      - Profession / Headline: "${profession}"
      - About Section: "${profileData.about}"
      - Selected Tone: "${toneSelect.value}"
    `;
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
