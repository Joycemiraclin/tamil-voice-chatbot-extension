// =====================================================
// content.js — FINAL DEMO-STABLE
// Phase 1: UNTOUCHED
// Phase 2: FIXED & SIMPLIFIED
// =====================================================

// -----------------------------------------------------
// 1. GOVERNMENT SITE CHECK
// -----------------------------------------------------
function isGovernmentSite() {
  return window.location.hostname.endsWith(".gov.in");
}

// -----------------------------------------------------
// 2. CHATBOT IFRAME INJECTION
// -----------------------------------------------------
function injectChatbot() {
  if (document.getElementById("chatbotContainer")) return;

  const iframe = document.createElement("iframe");
  iframe.src = chrome.runtime.getURL("popup.html");
  iframe.id = "chatbotContainer";
  iframe.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 350px;
    height: 500px;
    z-index: 2147483647;
    border: none;
  `;
  document.body.appendChild(iframe);
}

if (isGovernmentSite()) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectChatbot);
  } else {
    injectChatbot();
  }
}

// -----------------------------------------------------
// 3. FORM DETECTION ANNOUNCEMENT (ONCE)
// -----------------------------------------------------
let formAnnounced = false;

function detectAndAnnounceForm() {
  const fields = document.querySelectorAll("input, textarea, select");
  if (fields.length > 0 && !formAnnounced) {
    formAnnounced = true;
    speakTamil(
      "இந்த பக்கத்தில் படிவம் உள்ளது. மைக் பட்டனை அழுத்தி படிவம் நிரப்பு என்று சொல்லுங்கள்."
    );
  }
}

const observer = new MutationObserver(detectAndAnnounceForm);
observer.observe(document.body, { childList: true, subtree: true });
setTimeout(detectAndAnnounceForm, 2000);

// -----------------------------------------------------
// 4. TEXT TO SPEECH (TAMIL)
// -----------------------------------------------------
function speakTamil(text) {
  if (!text) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ta-IN";
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

// -----------------------------------------------------
// 5. SPEECH TO TEXT
// -----------------------------------------------------
function listenOnce(lang = "ta-IN", timeout = 8000) {
  return new Promise((resolve) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return resolve(null);

    const r = new SR();
    r.lang = lang;
    r.interimResults = false;
    r.maxAlternatives = 1;

    r.onresult = e => resolve(e.results[0][0].transcript || null);
    r.onerror = () => resolve(null);

    r.start();
    setTimeout(() => {
      try { r.stop(); } catch {}
      resolve(null);
    }, timeout);
  });
}

// -----------------------------------------------------
// 6. FORM FIELD COLLECTION
// -----------------------------------------------------
function getFormFields() {
  return Array.from(document.querySelectorAll("input, textarea"))
    .filter(el =>
      el.offsetParent !== null &&
      !el.disabled &&
      !["hidden", "submit", "button", "password"].includes(el.type)
    );
}

// -----------------------------------------------------
// 7. CLEAN TAMIL PROMPTS
// -----------------------------------------------------
function getTamilLabel(field) {
  const t = (
    field.placeholder ||
    field.getAttribute("aria-label") ||
    field.name ||
    field.id ||
    ""
  ).toLowerCase();

  if (t.includes("name")) return "பெயரை சொல்லுங்கள்";
  if (t.includes("mobile") || t.includes("phone")) return "மொபைல் எண்ணை சொல்லுங்கள்";
  if (t.includes("email")) return "மின்னஞ்சலை சொல்லுங்கள்";
  if (t.includes("otp")) return "OTP எண்ணை சொல்லுங்கள்";

  return "இந்த தகவலை சொல்லுங்கள்";
}

// -----------------------------------------------------
// 8. NUMBER CONVERSION (SINGLE SOURCE OF TRUTH)
// -----------------------------------------------------
function convertSpokenToDigits(text) {
  if (!text) return "";

  const tamilNumbers = {
    "பூஜ்யம்": "0", "சுழியம்": "0",
    "ஒன்று": "1", "ஒரு": "1",
    "இரண்டு": "2", "ரெண்டு": "2",
    "மூன்று": "3", "மூணு": "3",
    "நான்கு": "4", "நாலு": "4",
    "ஐந்து": "5", "அஞ்சு": "5",
    "ஆறு": "6", "ஆரு": "6",
    "ஏழு": "7",
    "எட்டு": "8",
    "ஒன்பது": "9"
  };

  const englishNumbers = {
    "zero": "0", "one": "1", "two": "2", "three": "3",
    "four": "4", "five": "5", "six": "6",
    "seven": "7", "eight": "8", "nine": "9"
  };

  let result = text.toLowerCase();

  Object.keys(tamilNumbers).forEach(w => {
    result = result.replace(new RegExp(w, "g"), tamilNumbers[w]);
  });

  Object.keys(englishNumbers).forEach(w => {
    result = result.replace(new RegExp("\\b" + w + "\\b", "g"), englishNumbers[w]);
  });

  return result.replace(/[^0-9]/g, "");
}

// -----------------------------------------------------
// 9. VOICE FORM FILLING (FIXED)
// -----------------------------------------------------
async function startVoiceFormFilling() {
  const field = document.activeElement;

  if (!field || field.tagName !== "INPUT") {
    speakTamil("முதலில் ஒரு புலத்தை கிளிக் செய்யுங்கள்");
    return;
  }

  field.style.border = "3px solid orange";
  speakTamil("சொல்லுங்கள்");

  let speech;

  // 🔢 NUMBER FIELD
  if (field.type === "tel" || field.type === "number") {
    speech = await listenOnce("ta-IN", 8000);
    speech = convertSpokenToDigits(speech);

    if (!speech) {
      speakTamil("எண் புரியவில்லை. மீண்டும் சொல்லுங்கள்");
      return;
    }
  }
  // 🔤 TEXT / NAME FIELD
  else {
    speech = await listenOnce("en-IN", 8000);

    if (!speech) {
      speakTamil("கேட்கவில்லை. மீண்டும் சொல்லுங்கள்");
      return;
    }
  }

  field.focus();
  field.value = speech;

  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));

  
}

// -----------------------------------------------------
// 10. MESSAGE HANDLER (PHASE 1 UNTOUCHED)
// -----------------------------------------------------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

    // -----------------------------------------------------
  // FIX: SEND CURRENT PAGE URL TO AI
  // -----------------------------------------------------
 if (msg.action === "getCurrentUrl") {
  const url = document.location.href || window.location.href;
  const title = document.title || "";

  const bodyText = document.body ? document.body.innerText.slice(0, 2000) : "";

  sendResponse({
    url: url,
    pageTitle: title,
    pageText: bodyText
  });

  return true;
}

  if (msg.action === "startFormFilling") {
    startVoiceFormFilling();
    sendResponse({ started: true });
    return true;
  }

  if (msg.action === "startListening") {
    listenOnce("ta-IN", 8000).then(text => {
      sendResponse(text ? { text } : { error: true });
    });
    return true;
  }

  if (msg.action === "speak") {
    speakTamil(msg.text || msg.segments?.join(" "));
    sendResponse({ ok: true });
    return true;
  }

  if (msg.action === "stopListening") {
    speechSynthesis.cancel();
    sendResponse({ stopped: true });
    return true;
  }

  if (msg.action === "closeIframe") {
    document.getElementById("chatbotContainer")?.remove();
    sendResponse({ closed: true });
    return true;
  }
});
