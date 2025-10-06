# AI LinkedIn Co‑Pilot

Generate **professional, human‑like LinkedIn posts** (or short comments) with the power of **OpenAI GPT‑4o** **or** **Google Gemini 2.5 Flash** – directly from a LinkedIn profile page.

---

## 🚀 Features

| ✅ | What it does |
|---|--------------|
| **🔍 Auto‑extract profile** | Pulls headline & “About” section from the LinkedIn page you have open. |
| **🖋️ Multi‑tone generation** | Choose among *Professional & Insightful*, *Inspirational & Story‑driven*, *Technical & Data‑driven*, *Witty & Humorous*, **or** *Subtle Desi & Witty*. |
| **🧩 Two independent sections** | **Create Post** – a full‑blown LinkedIn post.<br>**Commentary** – a concise, comment‑style reply to any article URL. |
| **♻️ Regenerate** | One‑click “Regenerate” to get a fresh version with the same settings. |
| **📋 Copy to clipboard** | Instantly copy the generated text for pasting into LinkedIn. |
| **🔑 API‑key persistence** | Your OpenAI / Gemini key (and ScrapingBee key for commentary) are saved in Chrome sync storage – you never have to re‑type them. |
| **⚡ Modern UI** | Card‑style layout, gradient background, tab navigation, spinner while the model is thinking. |
| **🛠️ Provider selection** | Switch between **OpenAI (GPT‑4o)** and **Google Gemini 2.5 Flash** with a single dropdown. |
| **🔐 No external telemetry** | All data stays in the browser; only the chosen AI provider is contacted. |

---

## 🛠️ Installation

1. **Clone or download** this repository

   ```bash
   git clone https://github.com/your‑username/ai‑linkedin‑co‑pilot.git
   cd ai-linkedin-co-pilot
   ```

2. Open Chrome (or Edge) and navigate to the extensions page  

   ```
   chrome://extensions/
   ```

3. Turn **Developer mode** **ON** (top‑right toggle).

4. Click **Load unpacked** → select the folder that contains `manifest.json`, `popup.html`, `popup.js`, `injector.js`, and the `icons/` directory.

5. The LinkedIn‑styled icon appears next to the address bar – you’re ready to go! 🎉

---

## 📚 Usage

### 1️⃣ Open a LinkedIn profile  
The extension needs a LinkedIn page in order to read your headline and “About” text.

### 2️⃣ Click the extension icon  

Two tabs appear:

#### **Create Post**  
| Input | Description |
|-------|-------------|
| **Topic (optional)** | Write a specific subject you want the post to focus on (e.g., “The future of AI”). |
| **Your Profession (optional)** | Override the automatically detected headline. |
| **Post Length** | Short (30‑50 words) • Medium (50‑80 words) • Long (80‑120 words) |
| **Tone** | Pick one of the five tone options. |
| **AI Provider** | OpenAI (GPT‑4o) or Google (Gemini 2.5 Flash). |
| **API Key** | Paste your OpenAI **or** Gemini API key. |
| **Generate** | Press to let the AI craft the post. |
| **Result** | The generated post appears in a read‑only textarea – use **Copy** or **Regenerate** as needed. |

#### **Commentary** (short LinkedIn comment)  
| Input | Description |
|-------|-------------|
| **Article URL** | Public URL of the article you want to comment on. |
| **Your Profession (optional)** | Same as above – overrides auto‑detected headline. |
| **Post Length** | Same three size options; default is *Medium*. |
| **Tone** | Same five tone options. |
| **AI Provider** | OpenAI or Gemini. |
| **API Key** | Your AI provider key. |
| **ScrapingBee API Key** | Required to fetch article text (the extension uses ScrapingBee’s free tier). |
| **Generate** | Generates a concise, comment‑style reply (≈ 50 words). |
| **Result** | Copy or Regenerate just as with the post tab. |

### 3️⃣ Paste the generated text into LinkedIn  
Switch back to LinkedIn, start a new post or a comment, and paste. Done!

---

## 🔑 API Keys Required

| Service | Where to obtain | What it’s used for |
|---------|-----------------|--------------------|
| **OpenAI** (GPT‑4o) | <https://platform.openai.com/account/api-keys> | AI generation (if you select OpenAI). |
| **Google Gemini** (Gemini 2.5 Flash) | <https://ai.google.dev/> → “Get API key” | AI generation (if you select Gemini). |
| **ScrapingBee** | <https://app.scrapingbee.com/> → “API Key” | Retrieves article text for the Commentary tab. |

**Security note:** The keys are stored only in your browser’s `chrome.storage.sync`. They are never transmitted to any server other than the chosen AI provider or ScrapingBee.

---

## 🐞 Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| **“Article extraction failed: BAD REQUEST”** | Old code sent a POST request with a body; ScrapingBee only accepts GET with query parameters. | The bug is fixed – the extension now builds a proper GET URL. Make sure the ScrapingBee key is correct and the article URL is publicly accessible. |
| **“Could not extract profile data”** | Not on a LinkedIn profile page, or LinkedIn changed its DOM selectors. | Open any public LinkedIn profile and try again. If LinkedIn updates its layout, edit `injector.js` selectors accordingly. |
| **Empty response from the AI** | Invalid/expired API key, or the prompt exceeded model limits. | Verify the API key, ensure you have quota, and try a shorter length option. |
| **Tabs don’t switch** | An older version of `popup.js` is still loaded. | Reload the extension after replacing `popup.js` with the latest version (look for the *Fixed Tab Switching* code). |
| **Copy to clipboard does nothing** | Browser blocked clipboard write (usually the first time). | Click inside the popup, then press **Copy** again; Chrome will ask for permission. |

For any other issues, open an **Issue** on the repository or contact the maintainer.

---

## 👩‍💻 Development

### Prerequisites
- **Node.js** (optional – only if you want to bundle/minify).  
- **Chrome** / **Edge** (Manifest V3 supported).

### Workflow
1. Edit `popup.html`, `popup.js`, `injector.js`, or style rules.  
2. Open `chrome://extensions/`, enable **Developer mode**, and click **Reload** on the extension.  
3. Test on a LinkedIn profile page.

### Packaging
The extension is pure static assets, so you can zip the folder for distribution:

```bash
zip -r ai-linkedin-co-pilot.zip manifest.json popup.html popup.js injector.js icons/
```

Upload the zip to the Chrome Web Store (after creating a developer account) if you wish to publish.

---

## 📄 License

MIT License – feel free to fork, modify, and use it in commercial or personal projects. See the `LICENSE` file for full legal text.

---

**Enjoy smarter LinkedIn posting!** 🎉
