const languages = [
  { code: "ar", label: "لغة عربية", button: "تم" },
  { code: "en", label: "English", button: "Select" },
  { code: "fr", label: "Français", button: "Sélectionner" },
  { code: "es", label: "Español", button: "Seleccionar" },
  { code: "it", label: "Italiano", button: "Seleziona" },
  { code: "de", label: "Deutsch", button: "Auswählen" },
  { code: "ru", label: "Русский", button: "Выбрать" },
  { code: "zh", label: "中文", button: "选择" }
];

// Point this at your backend. Change it once you deploy the FastAPI server.
const AGENT_API_URL = "http://localhost:8000/chat";

const splashScreen = document.querySelector("#splashScreen");
const languageScreen = document.querySelector("#languageScreen");
const languageWheel = document.querySelector("#languageWheel");
const selectButton = document.querySelector("#selectButton");

const agentScreen = document.querySelector("#agentScreen");
const chatMessages = document.querySelector("#chatMessages");
const chatTyping = document.querySelector("#chatTyping");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");
const chatSend = document.querySelector("#chatSend");

let selectedIndex = 1;
let startY = 0;
let isDragging = false;

// Conversation state for the AI agent
let conversationHistory = []; // [{ role: "user" | "assistant", content: string }]
let selectedLanguageCode = "en";

function showLanguageScreen() {
  splashScreen.classList.add("is-hidden");
  languageScreen.classList.remove("is-hidden");
  renderWheel();
}

function circularDistance(index) {
  const total = languages.length;
  let distance = index - selectedIndex;

  if (distance > total / 2) distance -= total;
  if (distance < -total / 2) distance += total;

  return distance;
}

function renderWheel() {
  languageWheel.innerHTML = "";
  selectButton.textContent = languages[selectedIndex].button;

  languages.forEach((language, index) => {
    const distance = circularDistance(index);
    const option = document.createElement("button");
    const absDistance = Math.abs(distance);
    const opacity = Math.max(0, 1 - absDistance * 0.2);
    const scale = Math.max(0.5, 1 - absDistance * 0.11);
    const rotateX = distance * -18;
    const translateY = distance * 66;
    const translateZ = 80 - absDistance * 26;

    option.type = "button";
    option.className = `language-option${distance === 0 ? " is-active" : ""}`;
    option.textContent = language.label;
    option.dataset.code = language.code;
    option.style.transform = `translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) scale(${scale})`;
    option.style.opacity = opacity.toString();
    option.style.zIndex = String(20 - absDistance);
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", distance === 0 ? "true" : "false");

    option.addEventListener("click", () => {
      selectedIndex = index;
      renderWheel();
    });

    languageWheel.appendChild(option);
  });
}

function moveSelection(direction) {
  const total = languages.length;
  selectedIndex = (selectedIndex + direction + total) % total;
  renderWheel();
}

languageWheel.addEventListener("wheel", (event) => {
  event.preventDefault();
  moveSelection(event.deltaY > 0 ? 1 : -1);
});

languageWheel.addEventListener("pointerdown", (event) => {
  isDragging = true;
  startY = event.clientY;
  languageWheel.setPointerCapture(event.pointerId);
});

languageWheel.addEventListener("pointermove", (event) => {
  if (!isDragging) return;

  const difference = event.clientY - startY;
  if (Math.abs(difference) < 38) return;

  moveSelection(difference > 0 ? -1 : 1);
  startY = event.clientY;
});

languageWheel.addEventListener("pointerup", () => {
  isDragging = false;
});

document.addEventListener("keydown", (event) => {
  if (languageScreen.classList.contains("is-hidden")) return;

  if (event.key === "ArrowDown") moveSelection(1);
  if (event.key === "ArrowUp") moveSelection(-1);
  if (event.key === "Enter") selectButton.click();
});

selectButton.addEventListener("click", () => {
  const selectedLanguage = languages[selectedIndex];
  selectedLanguageCode = selectedLanguage.code;

  localStorage.setItem("captainOrderLanguage", selectedLanguage.code);

  showAgentScreen();
});

// ---------- AI agent chat ----------

function showAgentScreen() {
  languageScreen.classList.add("is-hidden");
  agentScreen.classList.remove("is-hidden");

  // Right-align the chat for Arabic
  agentScreen.dir = selectedLanguageCode === "ar" ? "rtl" : "ltr";

  requestWelcomeMessage();
  chatInput.focus();
}

function addBubble(role, text) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = text;
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return bubble;
}

function setTyping(isTyping) {
  chatTyping.classList.toggle("is-hidden", !isTyping);
  chatSend.disabled = isTyping;
  chatInput.disabled = isTyping;
  if (isTyping) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

async function callAgent() {
  setTyping(true);

  try {
    const response = await fetch(AGENT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: selectedLanguageCode,
        messages: conversationHistory
      })
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const data = await response.json();
    conversationHistory.push({ role: "assistant", content: data.reply });
    addBubble("assistant", data.reply);
  } catch (error) {
    console.error("Agent request failed:", error);
    addBubble(
      "assistant",
      "Sorry, I couldn't reach the assistant right now. Please make sure the backend server is running."
    );
  } finally {
    setTyping(false);
    chatInput.focus();
  }
}

function requestWelcomeMessage() {
  // No history yet — the backend will make the model open the conversation.
  callAgent();
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = chatInput.value.trim();
  if (!text) return;

  conversationHistory.push({ role: "user", content: text });
  addBubble("user", text);
  chatInput.value = "";

  callAgent();
});

setTimeout(showLanguageScreen, 3000);
