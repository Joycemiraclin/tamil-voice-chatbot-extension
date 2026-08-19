// popup.js — FINAL STABLE (PHASE 1 + PHASE 2)

document.addEventListener("DOMContentLoaded", async () => {
  const chat = document.getElementById("chat");
  const micBtn = document.getElementById("micBtn");
  const stopBtn = document.getElementById("stopBtn");
  const closeBtn = document.getElementById("closeBtn");

  const CHATBOT_API_ENDPOINT = "http://127.0.0.1:5000/api/ask-ai";

  let lastBotMessage = null;

  // ---------------- UI HELPERS ----------------

  function appendMessage(text, from = "bot") {
    const d = document.createElement("div");
    d.className = "msg " + from;
    d.innerHTML = text.replace(/\n/g, "<br>");
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
    return d;
  }

  function appendMessageWithLink(text, link) {
    const d = document.createElement("div");
    d.className = "msg bot";
    const p = document.createElement("div");
    p.innerHTML = text.replace(/\n/g, "<br>");
    p.style.marginBottom = "8px";
    d.appendChild(p);

    if (link) {
      const a = document.createElement("a");
      a.href = link;
      a.innerText = "👉 Apply / More Info";
      a.target = "_blank";
      a.style.display = "inline-block";
      a.style.padding = "6px 8px";
      a.style.borderRadius = "6px";
      a.style.background = "#fff";
      a.style.border = "1px solid #ccc";
      a.style.color = "#1a73e8";
      a.addEventListener("click", (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: link });
      });
      d.appendChild(a);
    }

    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
    return d;
  }

  // ------------- CONTENT SCRIPT MESSAGING -------------

  function sendMessageToActiveTab(message) {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) return resolve(null);
        chrome.tabs.sendMessage(tabs[0].id, message, resolve);
      });
    });
  }

  async function speakViaPage(text) {
    await sendMessageToActiveTab({
      action: "speak",
      segments: [text],
    });
  }

  async function getCurrentTabUrl() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolve(tabs && tabs[0] ? tabs[0].url : "");
      });
    });
  }

  // ---------------- WELCOME (PHASE 1) ----------------

  const greeting =
    "வணக்கம்! நான் அரசு திட்ட உதவியாளர். மைக் பட்டனை அழுத்தி தமிழில் பேசுங்கள்.";
  appendMessage(greeting, "bot");
  lastBotMessage = { text: greeting, segments: [greeting] };
  await speakViaPage(greeting);

  // ---------------- HANDLE USER TEXT ----------------

  async function handleUserText(userText) {
    appendMessage("👤 " + userText, "user");
    micBtn.disabled = true;

    // ---------------- REPEAT ----------------
    if (userText.includes("மீண்டும்") || userText.includes("repeat")) {
      if (lastBotMessage) {
        appendMessage("🔁 மீண்டும் சொல்கிறேன்...", "bot");
        await speakViaPage(lastBotMessage.text);
      }
      micBtn.disabled = false;
      return;
    }

    // ---------------- HELP / INTRO (PHASE 1) ----------------
    const helpTriggers = ["உதவி", "help", "எப்படி", "வழிகாட்டி"];
    if (helpTriggers.some(t => userText.includes(t))) {
      const helpText = `
நான் உங்களுக்கு உதவ முடியும்:

 1 அரசு திட்டங்கள் பற்றி கேளுங்கள்  
உதாரணம்: "மாணவர் உதவித்தொகை திட்டம் என்ன?"

2️ படிவம் நிரப்ப உதவி  
சொல்லுங்கள்: "படிவம் நிரப்பு"

3️ இந்த பக்கத்தை புரிந்து கொள்ள  
கேளுங்கள்: "இந்த பக்கம் என்ன?"

4️  கடைசி பதிலை மீண்டும் கேட்க  
சொல்லுங்கள்: "மீண்டும் சொல்லு"

5 படத்திலிருந்து தகவலைப் பிரித்தெடுக்க:
 "கீழே உள்ள பொத்தானைக் கிளிக் செய்து, தகவலைப் பிரித்தெடுப்பதைக் கிளிக் செய்யவும்"
      `.trim();

      appendMessage(helpText, "bot");
      lastBotMessage = { text: helpText, segments: [helpText] };
      await speakViaPage(helpText);
      micBtn.disabled = false;
      return;
    }

  // ------------------------
// PHASE 1: AI-BASED PAGE CONTEXT QUERY (RESTORED)
// ------------------------
const pageInfoTriggers = [
  "இந்த பக்கம் என்ன",
  "இந்த பக்கம் எதற்கு",
  "இந்த பக்கம் எதுக்காக",
  "what is this page"
];

if (pageInfoTriggers.some(t => userText.includes(t))) {
  micBtn.disabled = true;

  const loading = appendMessage("🤖 இந்த பக்கத்தை புரிந்துகொள்கிறேன்...", "bot");

  try {
    const currentUrl = await getCurrentTabUrl();

    const response = await fetch(CHATBOT_API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: userText,
        currentUrl: currentUrl
      }),
    });

    const data = await response.json();
    loading.remove();

    const botText =
      data.text ||
      "இந்த பக்கம் ஒரு அரசு சேவை இணையப் பக்கம். இதில் உள்ள தகவல்களை நான் உங்களுக்கு விளக்க உதவுவேன்.";

    appendMessage(botText, "bot");
    lastBotMessage = { text: botText, segments: [botText] };
    await speakViaPage(botText);

  } catch (e) {
    loading.remove();
    const err =
      "இந்த பக்கத்தை விளக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.";
    appendMessage(err, "bot");
    await speakViaPage(err);
  }

  micBtn.disabled = false;
  return;
}


    // ---------------- AI QUERY ----------------
    const loading = appendMessage("🤖 சிந்திக்கிறது...", "bot");

    try {
      const response = await fetch(CHATBOT_API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userText }),
      });

      const data = await response.json();
      loading.remove();

      lastBotMessage = { text: data.text, segments: [data.text] };

      if (data.link) {
        appendMessageWithLink(data.text, data.link);
      } else {
        appendMessage(data.text, "bot");
      }

      await speakViaPage(data.text);
    } catch {
      loading.remove();
      const err = "⚠️ AI பதிலளிக்கவில்லை.";
      appendMessage(err, "bot");
      await speakViaPage(err);
    }

    micBtn.disabled = false;
  }

  // ---------------- MIC BUTTON ----------------

  micBtn.onclick = async () => {
    await speakViaPage("கேட்கிறேன்");

    const resp = await sendMessageToActiveTab({ action: "startListening" });

    if (!resp || resp.error) {
      appendMessage("⚠️ குரல் கேட்கவில்லை.", "bot");
      return;
    }

    appendMessage("👤 " + resp.text, "user");

    const spokenText = resp.text.toLowerCase();
    const formTriggers = ["படிவம்", "நிரப்பு", "fill"];

    if (formTriggers.some(t => spokenText.includes(t))) {
      appendMessage("📝 படிவம் நிரப்ப தொடங்குகிறேன்...", "bot");
      await speakViaPage("படிவம் நிரப்ப தொடங்குகிறேன்");
      await sendMessageToActiveTab({ action: "startFormFilling" });
      return;
    }

    await handleUserText(resp.text);
  };

  // ---------------- STOP ----------------

  stopBtn.onclick = async () => {
    await sendMessageToActiveTab({ action: "stopListening" });
    appendMessage("⏸️ நிறுத்தப்பட்டது.", "bot");
  };

  // ---------------- CLOSE ----------------

  closeBtn.onclick = () => {
    sendMessageToActiveTab({ action: "closeIframe" });
    document.getElementById("app").style.display = "none";
  };
});
document.getElementById("extractText").addEventListener("click", async function () {

  const fileInput = document.getElementById("imageInput");
  const resultDiv = document.getElementById("ocrResult");
  resultDiv.innerHTML = "";

  if (fileInput.files.length === 0) {
    resultDiv.innerHTML = "<span style='color:red'>தயவு செய்து ஒரு படம் தேர்வு செய்யவும்</span>";
    return;
  }

  resultDiv.innerHTML = "<span style='color:#555'>📄 படத்தை படிக்கிறது...</span>";

  const formData = new FormData();
  formData.append("image", fileInput.files[0]);

  try {
    const response = await fetch("http://127.0.0.1:5000/ocr", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (data.error) {
      resultDiv.innerHTML = "<span style='color:red'>⚠️ " + data.error + "</span>";
      return;
    }

    let html = "";

    if (data.doc_type) {
      html += `<div style="display:inline-block;background:#ede9fe;color:#5b21b6;
        font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;
        margin-bottom:10px;text-transform:uppercase;">${data.doc_type}</div>`;
    }

    const fields = data.fields || {};
    const keys = Object.keys(fields);

    if (keys.length === 0) {
      html += "<p style='color:#888;font-size:13px'>எந்த தகவலும் கண்டறியப்படவில்லை.</p>";
    } else {
      html += `<table style="width:100%;border-collapse:collapse;font-size:13px;">`;
      keys.forEach((key, i) => {
        const bg = i % 2 === 0 ? "#fafafa" : "#ffffff";
        html += `<tr style="background:${bg}">
          <td style="padding:7px 8px;color:#888;font-weight:600;width:45%;
            border-bottom:1px solid #f0f0f0;vertical-align:top;">${key}</td>
          <td style="padding:7px 8px;color:#111;border-bottom:1px solid #f0f0f0;
            word-break:break-word;">${fields[key] || "—"}</td>
        </tr>`;
      });
      html += "</table>";
    }

    resultDiv.innerHTML = html;

  } catch (err) {
    resultDiv.innerHTML = "<span style='color:red'>⚠️ Server எட்டவில்லை. Flask server இயங்குகிறதா என சரிபார்க்கவும்.</span>";
  }
});


