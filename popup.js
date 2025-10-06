document.addEventListener('DOMContentLoaded', () => {

  // ---------------------------------------------------------------
  // 1️⃣ TAB SWITCHING – 100 % reliable
  // ---------------------------------------------------------------
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.panel;               // “createPanel” or “commentaryPanel”

      // deactivate all tabs
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // hide all panels
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

      // show the selected panel
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  // ---------------------------------------------------------------
  // 2️⃣ UI helpers (loader / status)
  // ---------------------------------------------------------------
  const statusDiv = document.getElementById('status');

  function setLoading(isLoading, btn) {
    btn.disabled = isLoading;
    if (isLoading) {
      statusDiv.style.display = 'block';
      statusDiv.className = 'info';
      statusDiv.innerHTML = '<div class="loader"></div> Generating…';
    } else {
      statusDiv.style.display = 'none';
      statusDiv.className = '';
      statusDiv.innerHTML = '';
    }
  }

  function updateStatus(msg, type) {
    statusDiv.style.display = 'block';
    statusDiv.className = type;   // info | error | success
    statusDiv.textContent = msg;
  }

  // ---------------------------------------------------------------
  // 3️⃣ SCRAPINGBEE – fixed (GET request, no body, no atob)
  // ---------------------------------------------------------------
  async function fetchArticleContent(url, scraperKey) {
    if (!url) throw new Error('Article URL is required.');
    if (!scraperKey) throw new Error('ScrapingBee API key is required.');

    updateStatus('Extracting article content…', 'info');

    const apiUrl =
      `https://app.scrapingbee.com/api/v1/` +
      `?api_key=${encodeURIComponent(scraperKey)}` +
      `&url=${encodeURIComponent(url)}` +
      `&extract_rules=${encodeURIComponent(JSON.stringify({ text: "body" }))}`;

    const resp = await fetch(apiUrl, { method: 'GET' });
    if (!resp.ok) throw new Error(`ScrapingBee error: ${resp.statusText}`);

    const data = await resp.json();
    // Plain text is returned under `content` or `text`.
    return data.content || data.text || '';
  }

  // ---------------------------------------------------------------
  // 4️⃣ PROFILE EXTRACTOR (injector.js)
  // ---------------------------------------------------------------
  async function getLinkedInProfile(tabId) {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      files: ['injector.js']
    });
    if (!result) throw new Error('Could not extract profile data. Reload the LinkedIn page.');
    return result;
  }

  // ---------------------------------------------------------------
  // 5️⃣ PROMPT BUILDER (shared)
  // ---------------------------------------------------------------
  const buildPrompt = (profile, cfg) => {
  const profession = cfg.customProfession || profile.profession;

  // ---- word‑count instruction -------------------------------------------------
  let wordInstr;
  switch (cfg.length) {
    case 'short': wordInstr = 'Strictly adhere to a word count of 30–50 words.'; break;
    case 'long':  wordInstr = 'Strictly adhere to a word count of 80–120 words.'; break;
    default:      wordInstr = 'Strictly adhere to a word count of 50–80 words.'; break;
  }

  // ---- generic post rules ------------------------------------------------------
  const postCore = `You are a world‑class LinkedIn content strategist. **Core Rules:** - Hook the reader instantly. - Deliver one clear insight. - End with an engaging question. - Add 3‑5 relevant hashtags.`;

  // ---- comment‑style rules (new) ------------------------------------------------
  const commentCore = `You are writing a LinkedIn **comment**. **Core Rules:** - Keep it under 60 words. - Start with a friendly greeting or a quick acknowledgment of the author/content. - Share ONE concise insight or opinion. - End with a short question or an invitation to discuss. - (Optional) add 1‑2 relevant hashtags.`;

  // ---- “Subtle Desi & Witty” tone masterclass (unchanged) ----------------------
  const desiToneMasterclass = `**Masterclass on "Subtle Desi & Witty" Tone:** Use relatable desi analogies (jugaad, chai breaks) and light Hinglish. Warm, clever, professional.`;

  // ---- task specific part -------------------------------------------------------
  let task;
  if (cfg.mode === 'commentary') {
    // NEW: use comment‑style core rules instead of the generic post rules
    task = `**Your Specific Task:** Write a LinkedIn comment on the article below. ${wordInstr} ${commentCore} **Article (for context):** """${cfg.articleText.substring(0, 2000)}"""`;
  } else {
    // CREATE‑POST flow (unchanged)
    if (cfg.topic) {
      task = `**Your Specific Task:** Write a post about **"${cfg.topic}"** from the user's perspective. ${wordInstr}`;
    } else {
      task = `**Your Specific Task:** Write a general insightful post based on the user's professional profile. ${wordInstr}`;
    }
  }

  // ---- compose final prompt -----------------------------------------------------
  const toneBlock = cfg.tone === 'Subtle Desi & Witty' ? postCore + desiToneMasterclass + task
                                                      : postCore + task;

  // ---- add user profile for voice & perspective ----------------------------------
  return toneBlock +
    `**User Profile:** - Profession/Headline: "${profession}" - About: "${profile.about}" - Selected Tone: "${cfg.tone}"`;
};

  // ---------------------------------------------------------------
  // 6️⃣ AI CALLERS
  // ---------------------------------------------------------------
  async function callOpenAI(key, prompt) {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 30_000);
    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300,
          temperature: 0.75
        }),
        signal: ctrl.signal
      });
      clearTimeout(timeout);
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error?.message || `OpenAI error: ${resp.status}`);
      }
      const data = await resp.json();
      return data.choices[0].message.content.trim();
    } finally {
      clearTimeout(timeout);
    }
  }

  async function callGemini(key, prompt) {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 30_000);
    try {
      const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key
        },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: ctrl.signal
      });
      clearTimeout(timeout);
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Gemini error: ${resp.status}`);
      }
      const data = await resp.json();
      const txt = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!txt) throw new Error('Gemini returned empty text.');
      return txt;
    } finally {
      clearTimeout(timeout);
    }
  }

  // ---------------------------------------------------------------
  // 7️⃣ CREATE‑POST FLOW
  // ---------------------------------------------------------------
  const createGenerateBtn   = document.getElementById('createGenerateBtn');
  const createResultBtn    = document.getElementById('createRegenerateBtn');
  const createCopyBtn      = document.getElementById('createCopyBtn');
  const createResultBox    = document.getElementById('createResultContainer');
  const createResultArea   = document.getElementById('createResult');

  async function runCreatePost(isRegeneration = false) {
    setLoading(isRegeneration, createGenerateBtn);
    try {
      const provider = document.getElementById('createProvider').value;
      const apiKey   = document.getElementById('createApiKey').value.trim();
      if (!apiKey) throw new Error('Enter API key for the chosen provider.');

      // ---------- First run – get LinkedIn profile ----------
      if (!isRegeneration) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.url?.includes('linkedin.com')) throw new Error('Open a LinkedIn profile page first.');
        const profile = await getLinkedInProfile(tab.id);

        // store for regeneration
        window._createCache = {
          profile,
          config: {
            mode: 'post',
            customProfession: document.getElementById('createProfession').value.trim(),
            topic: document.getElementById('createTopic').value.trim(),
            length: document.getElementById('createLength').value,
            tone: document.getElementById('createTone').value
          }
        };
      }

      const { profile, config } = window._createCache;
      const prompt = buildPrompt(profile, config);
      const result = provider === 'openai' ? await callOpenAI(apiKey, prompt) : await callGemini(apiKey, prompt);
      if (!result) throw new Error('AI returned empty output.');

      createResultArea.value = result;
      createResultBox.style.display = 'block';
      updateStatus('Post generated!', 'success');
    } catch (e) {
      console.error(e);
      updateStatus(e.message, 'error');
      createResultBox.style.display = 'none';
    } finally {
      setLoading(false, createGenerateBtn);
    }
  }

  createGenerateBtn.addEventListener('click', () => runCreatePost(false));
  createResultBtn.addEventListener('click', () => runCreatePost(true));
  createCopyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(createResultArea.value)
      .then(() => updateStatus('Copied!', 'success'))
      .catch(() => updateStatus('Copy failed.', 'error'));
  });

  // ---------------------------------------------------------------
  // 8️⃣ COMMENTARY FLOW
  // ---------------------------------------------------------------
  const commentGenerateBtn = document.getElementById('commentGenerateBtn');
  const commentResultBtn   = document.getElementById('commentRegenerateBtn');
  const commentCopyBtn     = document.getElementById('commentCopyBtn');
  const commentResultBox   = document.getElementById('commentResultContainer');
  const commentResultArea  = document.getElementById('commentResult');

  async function runCommentary(isRegeneration = false) {
    setLoading(isRegeneration, commentGenerateBtn);
    try {
      const provider   = document.getElementById('commentProvider').value;
      const apiKey     = document.getElementById('commentApiKey').value.trim();
      const scraperKey = document.getElementById('commentScraperKey').value.trim();

      if (!apiKey) throw new Error('Enter AI provider API key.');
      if (!scraperKey) throw new Error('Enter ScrapingBee API key.');

      // ---------- First run – profile + article ----------
      if (!isRegeneration) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.url?.includes('linkedin.com')) throw new Error('Open a LinkedIn profile page first.');
        const profile = await getLinkedInProfile(tab.id);

        const articleUrl  = document.getElementById('commentArticleUrl').value.trim();
        if (!articleUrl) throw new Error('Article URL is required.');
        const articleText = await fetchArticleContent(articleUrl, scraperKey);

        window._commentCache = {
          profile,
          config: {
            mode: 'commentary',
            articleUrl,
            articleText,
            customProfession: document.getElementById('commentProfession').value.trim(),
            length: document.getElementById('commentLength').value,
            tone: document.getElementById('commentTone').value
          }
        };
      }

      const { profile, config } = window._commentCache;
      const prompt = buildPrompt(profile, config);
      const result = provider === 'openai' ? await callOpenAI(apiKey, prompt) : await callGemini(apiKey, prompt);
      if (!result) throw new Error('AI returned empty output.');

      commentResultArea.value = result;
      commentResultBox.style.display = 'block';
      updateStatus('Commentary generated!', 'success');
    } catch (e) {
      console.error(e);
      updateStatus(e.message, 'error');
      commentResultBox.style.display = 'none';
    } finally {
      setLoading(false, commentGenerateBtn);
    }
  }

  commentGenerateBtn.addEventListener('click', () => runCommentary(false));
  commentResultBtn.addEventListener('click', () => runCommentary(true));
  commentCopyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(commentResultArea.value)
      .then(() => updateStatus('Copied!', 'success'))
      .catch(() => updateStatus('Copy failed.', 'error'));
  });

  // ---------------------------------------------------------------
  // 9️⃣ INITIAL LOAD – restore any saved keys (optional)
  // ---------------------------------------------------------------
  chrome.storage.sync.get(['openAIKey', 'geminiKey', 'scraperApiKey'], data => {
    if (data.openAIKey)  document.getElementById('createApiKey').value   = data.openAIKey;
    if (data.geminiKey)  document.getElementById('createApiKey').value   = data.geminiKey; // same field used for both panels
    if (data.scraperApiKey) document.getElementById('commentScraperKey').value = data.scraperApiKey;
  });
});
