const languages = [
  { code: "ar", label: "لغة عربية", button: "تم" },
  { code: "en", label: "English",   button: "Select" },
  { code: "fr", label: "Français",  button: "Sélectionner" },
  { code: "es", label: "Español",   button: "Seleccionar" },
  { code: "it", label: "Italiano",  button: "Seleziona" },
  { code: "de", label: "Deutsch",   button: "Auswählen" },
  { code: "ru", label: "Русский",   button: "Выбрать" },
  { code: "zh", label: "中文",       button: "选择" }
];

const API_BASE = "http://localhost:8000";
const AGENT_API_URL = `${API_BASE}/chat`;
const MENU_API_URL  = `${API_BASE}/menu`;

// ---------- Theme toggle ----------
const themeToggle = document.querySelector("#themeToggle");
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("captainOrderTheme", theme);
  if (themeToggle) {
    themeToggle.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
    );
  }
}
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(current === "dark" ? "light" : "dark");
  });
  applyTheme(document.documentElement.getAttribute("data-theme") || "light");
}

// ---------- Element refs ----------
const splashScreen   = document.querySelector("#splashScreen");
const languageScreen = document.querySelector("#languageScreen");
const languageWheel  = document.querySelector("#languageWheel");
const selectButton   = document.querySelector("#selectButton");

const menuScreen   = document.querySelector("#menuScreen");
const menuTabs     = document.querySelector("#menuTabs");
const menuList     = document.querySelector("#menuList");
const menuSearch   = document.querySelector("#menuSearch");

const cartPanel    = document.querySelector("#cartPanel");
const cartLinesEl  = document.querySelector("#cartLines");
const cartSubtotalEl = document.querySelector("#cartSubtotal");
const confirmOrderBtn = document.querySelector("#confirmOrderBtn");
const openCartBtn  = document.querySelector("#openCartBtn");
const openCartCount = document.querySelector("#openCartCount");
const cartCloseBtn = document.querySelector("#cartCloseBtn");

const chatFab      = document.querySelector("#chatFab");
const chatOverlay  = document.querySelector("#chatOverlay");
const chatCloseBtnModal = chatOverlay.querySelector(".chat-close");
const chatMessages = document.querySelector("#chatMessages");
const chatTyping   = document.querySelector("#chatTyping");
const chatForm     = document.querySelector("#chatForm");
const chatInput    = document.querySelector("#chatInput");
const chatSend     = document.querySelector("#chatSend");


// ---------- Image lightbox ----------
let _lightboxEl = null;
function ensureLightbox() {
  if (_lightboxEl) return _lightboxEl;
  const overlay = document.createElement("div");
  overlay.className = "lightbox is-hidden";
  overlay.innerHTML = `
    <button class="lightbox-close" type="button" aria-label="Close">&times;</button>
    <figure class="lightbox-figure">
      <img class="lightbox-img" alt="" />
      <figcaption class="lightbox-caption"></figcaption>
    </figure>`;
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.classList.contains("lightbox-close")) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.classList.contains("is-hidden")) closeLightbox();
  });
  document.body.appendChild(overlay);
  _lightboxEl = overlay;
  return overlay;
}
function openLightbox(src, caption) {
  const overlay = ensureLightbox();
  overlay.querySelector(".lightbox-img").src = src;
  overlay.querySelector(".lightbox-img").alt = caption || "";
  overlay.querySelector(".lightbox-caption").textContent = caption || "";
  overlay.classList.remove("is-hidden");
}
function closeLightbox() {
  if (_lightboxEl) _lightboxEl.classList.add("is-hidden");
}

// ---------- State ----------
let selectedIndex = 1;
let startY = 0;
let isDragging = false;

let menuData = null;
let activeCategoryId = null;
const cart = new Map();                    // itemId -> line
const itemCustomizations = new Map();      // itemId -> Set of removed ingredient names

let conversationHistory = [];
let selectedLanguageCode = "en";
let chatHasBeenOpened = false;

// ---------- Language picker ----------
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

languageWheel.addEventListener("pointerup", () => { isDragging = false; });

document.addEventListener("keydown", (event) => {
  if (languageScreen.classList.contains("is-hidden")) return;
  if (event.key === "ArrowDown") moveSelection(1);
  if (event.key === "ArrowUp")   moveSelection(-1);
  if (event.key === "Enter")     selectButton.click();
});

selectButton.addEventListener("click", () => {
  const selectedLanguage = languages[selectedIndex];
  selectedLanguageCode = selectedLanguage.code;
  localStorage.setItem("captainOrderLanguage", selectedLanguage.code);
  showMenuScreen();
});

// ---------- Menu ----------
async function showMenuScreen() {
  languageScreen.classList.add("is-hidden");
  menuScreen.classList.remove("is-hidden");
  menuScreen.dir = selectedLanguageCode === "ar" ? "rtl" : "ltr";

  if (!menuData) {
    try {
      const response = await fetch(MENU_API_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      menuData = await response.json();
    } catch (error) {
      console.error("Failed to load menu:", error);
      menuList.innerHTML = `<div class="menu-loading">
        Couldn't reach the kitchen right now. Make sure the backend is running on ${API_BASE}.
      </div>`;
      return;
    }
    activeCategoryId = menuData.categories[0]?.id ?? null;
  }

  renderMenuTabs();
  renderMenu();
  renderCart();
  setupSearch();
  setupScrollSpy();
  setupHero();
}

function renderMenuTabs() {
  menuTabs.innerHTML = "";
  menuData.categories.forEach((cat) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = `menu-tab${cat.id === activeCategoryId ? " is-active" : ""}`;
    tab.textContent = cat.name;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", cat.id === activeCategoryId ? "true" : "false");
    tab.addEventListener("click", () => {
      activeCategoryId = cat.id;
      renderMenuTabs();
      const target = menuList.querySelector(`[data-category="${cat.id}"]`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    menuTabs.appendChild(tab);
  });
}

function fmtMoney(n) {
  const cur = menuData?.currency || "$";
  return `${cur}${n.toFixed(2)}`;
}

function renderMenu() {
  menuList.innerHTML = "";
  let n = 0;
  menuData.categories.forEach((cat) => {
    const heading = document.createElement("div");
    heading.className = "menu-category-heading reveal";
    heading.textContent = cat.name;
    heading.dataset.category = cat.id;
    heading.style.animationDelay = `${n * 45}ms`;
    n++;
    menuList.appendChild(heading);
    cat.items.forEach((item) => {
      const card = renderItem(item);
      card.classList.add("reveal");
      card.style.animationDelay = `${n * 45}ms`;
      n++;
      menuList.appendChild(card);
    });
  });
}

function renderItem(item) {
  const el = document.createElement("article");
  el.className = "menu-item" + (item.recommended ? " is-feature" : "");
  el.dataset.itemId = item.id;

  // Hero image as CSS background (avoids <img> load quirks)
  if (item.image_url) {
    const figure = document.createElement("div");
    figure.className = "menu-item-figure";
    figure.style.backgroundImage = `url("${item.image_url}")`;
    figure.setAttribute("role", "button");
    figure.setAttribute("tabindex", "0");
    figure.setAttribute("aria-label", `View photo of ${item.name}`);
    figure.title = "Click to enlarge";
    figure.addEventListener("click", () => openLightbox(item.image_url, item.name));
    figure.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLightbox(item.image_url, item.name); }
    });
    if (item.recommended) {
      const ribbon = document.createElement("span");
      ribbon.className = "chef-ribbon";
      ribbon.textContent = "Chef's Pick";
      figure.appendChild(ribbon);
    }
    el.appendChild(figure);

    // Pre-load so the shimmer stops when it arrives
    const preload = new Image();
    preload.addEventListener("load",  () => figure.classList.add("is-loaded"));
    preload.addEventListener("error", () => figure.classList.add("is-error"));
    preload.src = item.image_url;
  }

  const body = document.createElement("div");
  body.className = "menu-item-body";

  const info = document.createElement("div");
  info.className = "menu-item-info";

  const header = document.createElement("div");
  header.className = "menu-item-header";
  const name  = document.createElement("span"); name.className  = "menu-item-name";  name.textContent  = item.name;
  const price = document.createElement("span"); price.className = "menu-item-price"; price.textContent = fmtMoney(item.price);
  header.append(name, price);

  const desc = document.createElement("div");
  desc.className = "menu-item-desc";
  desc.textContent = item.description || "";

  info.append(header, desc);

  // Dietary tags
  if (Array.isArray(item.tags) && item.tags.length) {
    const tagRow = document.createElement("div");
    tagRow.className = "diet-tags";
    const LABELS = {
      v:  { t: "V",  full: "Vegetarian" },
      vg: { t: "VG", full: "Vegan" },
      gf: { t: "GF", full: "Gluten-free" },
      nuts: { t: "Nuts", full: "Contains nuts" },
      spicy: { t: "Spicy", full: "Spicy" }
    };
    item.tags.forEach((code) => {
      const info2 = LABELS[code];
      if (!info2) return;
      const chip = document.createElement("span");
      chip.className = `diet-tag diet-${code}`;
      chip.textContent = info2.t;
      chip.title = info2.full;
      tagRow.appendChild(chip);
    });
    info.appendChild(tagRow);
  }

  if (Array.isArray(item.ingredients) && item.ingredients.length) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "menu-item-toggle";
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = `Ingredients <span class="caret" aria-hidden="true">▾</span>`;

    const ingWrap = document.createElement("div");
    ingWrap.className = "ingredients-list is-collapsed";

    const hint = document.createElement("span");
    hint.className = "ingredients-hint";
    hint.textContent = "Tap any ingredient to remove it from this dish.";
    ingWrap.appendChild(hint);

    const removedSet = itemCustomizations.get(item.id) || new Set();

    item.ingredients.forEach((ing) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "ing-chip" + (removedSet.has(ing) ? " is-removed" : "");
      chip.textContent = ing;
      chip.setAttribute("aria-pressed", removedSet.has(ing) ? "true" : "false");
      chip.addEventListener("click", () => toggleIngredient(item, ing, chip));
      ingWrap.appendChild(chip);
    });

    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", expanded ? "false" : "true");
      ingWrap.classList.toggle("is-collapsed", expanded);
    });

    info.append(toggle, ingWrap);
  }

  const stepper = document.createElement("div");
  stepper.className = "qty-stepper";
  const minus = document.createElement("button");
  minus.type = "button"; minus.className = "qty-btn qty-minus"; minus.textContent = "−";
  minus.setAttribute("aria-label", `Remove one ${item.name}`);
  const qty = document.createElement("span"); qty.className = "qty-value"; qty.textContent = "0";
  const plus = document.createElement("button");
  plus.type = "button"; plus.className = "qty-btn qty-plus"; plus.textContent = "+";
  plus.setAttribute("aria-label", `Add one ${item.name}`);
  minus.addEventListener("click", () => changeQty(item, -1));
  plus.addEventListener("click",  () => changeQty(item, +1));
  stepper.append(minus, qty, plus);

  body.append(info, stepper);
  el.appendChild(body);
  return el;
}

function toggleIngredient(item, ingredient, chipEl) {
  let set = itemCustomizations.get(item.id);
  if (!set) { set = new Set(); itemCustomizations.set(item.id, set); }
  if (set.has(ingredient)) set.delete(ingredient);
  else set.add(ingredient);

  const removed = set.has(ingredient);
  chipEl.classList.toggle("is-removed", removed);
  chipEl.setAttribute("aria-pressed", removed ? "true" : "false");

  // If item is already in cart, refresh its modifiers there
  if (cart.has(item.id)) {
    const line = cart.get(item.id);
    line.removed = Array.from(set);
    renderCart();
  }
}

function changeQty(item, delta) {
  const existing = cart.get(item.id);
  const currentQty = existing ? existing.quantity : 0;
  const nextQty = Math.max(0, currentQty + delta);

  if (nextQty === 0) {
    cart.delete(item.id);
  } else {
    const removed = Array.from(itemCustomizations.get(item.id) || []);
    cart.set(item.id, {
      id: item.id, name: item.name, price: item.price,
      quantity: nextQty, removed
    });
  }

  updateItemQuantityUI(item.id, nextQty);
  renderCart();
  if (delta > 0) pulseCart();
}

function pulseCart() {
  // Desktop: pulse the panel; mobile: pulse the floating cart button.
  const targets = [cartPanel, openCartBtn].filter(Boolean);
  targets.forEach((t) => {
    t.classList.remove("cart-pulse");
    void t.offsetWidth;            // restart animation
    t.classList.add("cart-pulse");
  });
}

function updateItemQuantityUI(itemId, quantity) {
  const el = menuList.querySelector(`[data-item-id="${itemId}"]`);
  if (!el) return;
  el.querySelector(".qty-value").textContent = String(quantity);
  el.querySelector(".qty-minus").disabled = quantity === 0;
}

function renderCart() {
  let totalCount = 0;
  let totalPrice = 0;

  cartLinesEl.innerHTML = "";

  if (cart.size === 0) {
    cartLinesEl.innerHTML = `
      <div class="cart-empty">
        <span class="cart-empty-ornament" aria-hidden="true">&#10086;</span>
        <p>Your order is empty.</p>
        <p class="cart-empty-hint">Tap the <span class="pill">+</span> next to any dish to add it here.</p>
      </div>`;
  } else {
    cart.forEach((line, id) => {
      totalCount += line.quantity;
      totalPrice += line.quantity * line.price;
      cartLinesEl.appendChild(renderCartLine(id, line));
    });
  }

  cartSubtotalEl.textContent = fmtMoney(totalPrice);
  confirmOrderBtn.disabled = cart.size === 0;

  openCartCount.textContent = String(totalCount);
  openCartCount.classList.toggle("is-empty", totalCount === 0);
}

function renderCartLine(id, line) {
  const lineEl = document.createElement("article");
  lineEl.className = "cart-line";

  const top = document.createElement("div");
  top.className = "cart-line-top";
  const name  = document.createElement("span"); name.className  = "cart-line-name";
  name.textContent = `${line.quantity}× ${line.name}`;
  const price = document.createElement("span"); price.className = "cart-line-price";
  price.textContent = fmtMoney(line.quantity * line.price);
  top.append(name, price);
  lineEl.appendChild(top);

  if (line.removed && line.removed.length) {
    const mods = document.createElement("div");
    mods.className = "cart-line-modifiers";
    mods.textContent = `No ${line.removed.join(", ")}`;
    lineEl.appendChild(mods);
  }

  const controls = document.createElement("div");
  controls.className = "cart-line-controls";

  const stepper = document.createElement("div");
  stepper.className = "qty-stepper";
  const minus = document.createElement("button");
  minus.type = "button"; minus.className = "qty-btn"; minus.textContent = "−";
  const qtyEl = document.createElement("span"); qtyEl.className = "qty-value"; qtyEl.textContent = line.quantity;
  const plus = document.createElement("button");
  plus.type = "button"; plus.className = "qty-btn"; plus.textContent = "+";

  const itemProxy = { id: line.id, name: line.name, price: line.price };
  minus.addEventListener("click", () => changeQty(itemProxy, -1));
  plus.addEventListener("click",  () => changeQty(itemProxy, +1));
  stepper.append(minus, qtyEl, plus);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "cart-line-remove";
  removeBtn.textContent = "Remove";
  removeBtn.addEventListener("click", () => {
    cart.delete(id);
    updateItemQuantityUI(id, 0);
    renderCart();
  });

  controls.append(stepper, removeBtn);
  lineEl.appendChild(controls);
  return lineEl;
}

// ---------- Cart drawer (mobile) ----------
if (openCartBtn) {
  openCartBtn.addEventListener("click", () => cartPanel.classList.add("is-open"));
}
if (cartCloseBtn) {
  cartCloseBtn.addEventListener("click", () => cartPanel.classList.remove("is-open"));
}

// ---------- Chat overlay ----------
function orderLines() {
  return Array.from(cart.values()).map((line) => ({
    id: line.id, name: line.name, quantity: line.quantity,
    price: line.price, removed: line.removed || []
  }));
}

function openChat({ presetMessage = null } = {}) {
  chatOverlay.classList.remove("is-hidden");
  chatOverlay.dir = selectedLanguageCode === "ar" ? "rtl" : "ltr";

  if (!chatHasBeenOpened) {
    chatHasBeenOpened = true;
    if (presetMessage) {
      conversationHistory.push({ role: "user", content: presetMessage });
      addBubble("user", presetMessage);
    }
    callAgent();
  } else if (presetMessage) {
    conversationHistory.push({ role: "user", content: presetMessage });
    addBubble("user", presetMessage);
    callAgent();
  }
  setTimeout(() => chatInput.focus(), 250);
}

function closeChat() { chatOverlay.classList.add("is-hidden"); }

chatFab.addEventListener("click", () => openChat());
chatCloseBtnModal.addEventListener("click", closeChat);
chatOverlay.addEventListener("click", (event) => {
  if (event.target === chatOverlay) closeChat();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !chatOverlay.classList.contains("is-hidden")) {
    closeChat();
  }
});

confirmOrderBtn.addEventListener("click", () => {
  const lines = orderLines();
  if (lines.length === 0) return;
  const summary = lines.map((l) => {
    const mods = l.removed && l.removed.length ? ` (no ${l.removed.join(", ")})` : "";
    return `${l.quantity}× ${l.name}${mods}`;
  }).join(", ");
  const total = lines.reduce((sum, l) => sum + l.quantity * l.price, 0);
  const preset = `I'd like to confirm my order: ${summary}. (Subtotal ${fmtMoney(total)})`;
  cartPanel.classList.remove("is-open");
  openChat({ presetMessage: preset });
});

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
  chatSend.disabled  = isTyping;
  chatInput.disabled = isTyping;
  if (isTyping) chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function callAgent() {
  setTyping(true);
  try {
    const response = await fetch(AGENT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: selectedLanguageCode,
        messages: conversationHistory,
        order: orderLines()
      })
    });
    if (!response.ok) throw new Error(`Server responded with ${response.status}`);
    const data = await response.json();
    conversationHistory.push({ role: "assistant", content: data.reply });
    addBubble("assistant", data.reply);
  } catch (error) {
    console.error("Agent request failed:", error);
    addBubble(
      "assistant",
      "Sorry, I couldn't reach the concierge right now. Please make sure the backend server is running."
    );
  } finally {
    setTyping(false);
    chatInput.focus();
  }
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


// ---------- Search filter ----------
let _searchWired = false;
function setupSearch() {
  if (_searchWired || !menuSearch) return;
  _searchWired = true;
  menuSearch.addEventListener("input", () => {
    const q = menuSearch.value.trim().toLowerCase();
    let anyVisible = false;
    menuData.categories.forEach((cat) => {
      let catHasVisible = false;
      cat.items.forEach((item) => {
        const el = menuList.querySelector(`[data-item-id="${item.id}"]`);
        if (!el) return;
        const hay = (item.name + " " + (item.description || "") + " " +
                     (item.ingredients || []).join(" ")).toLowerCase();
        const match = !q || hay.includes(q);
        el.style.display = match ? "" : "none";
        if (match) { catHasVisible = true; anyVisible = true; }
      });
      const heading = menuList.querySelector(`.menu-category-heading[data-category="${cat.id}"]`);
      if (heading) heading.style.display = catHasVisible ? "" : "none";
    });
    let empty = menuList.querySelector(".menu-no-results");
    if (!anyVisible) {
      if (!empty) {
        empty = document.createElement("div");
        empty.className = "menu-no-results";
        empty.textContent = "No dishes match your search.";
        menuList.appendChild(empty);
      }
      empty.style.display = "";
    } else if (empty) {
      empty.style.display = "none";
    }
  });
}

// ---------- Scroll-spy: highlight the tab for the section in view ----------
let _spyWired = false;
function setupScrollSpy() {
  if (_spyWired) return;
  _spyWired = true;
  menuList.addEventListener("scroll", () => {
    const headings = [...menuList.querySelectorAll(".menu-category-heading")];
    const top = menuList.getBoundingClientRect().top + 80;
    let current = headings[0]?.dataset.category;
    for (const h of headings) {
      if (h.getBoundingClientRect().top <= top) current = h.dataset.category;
    }
    if (current && current !== activeCategoryId) {
      activeCategoryId = current;
      renderMenuTabs();
      // keep the active tab scrolled into view horizontally
      const activeTab = menuTabs.querySelector(".menu-tab.is-active");
      if (activeTab) activeTab.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, { passive: true });
}


// ---------- Hero band ----------
function setupHero() {
  const media = document.querySelector(".menu-hero-media");
  if (!media || !menuData) return;
  // Prefer a recommended dish for the hero image
  let hero = null;
  for (const cat of menuData.categories) {
    for (const it of cat.items) {
      if (it.recommended && it.image_url) { hero = it; break; }
    }
    if (hero) break;
  }
  if (!hero) {
    for (const cat of menuData.categories)
      for (const it of cat.items) if (it.image_url) { hero = it; break; }
  }
  if (hero) media.style.backgroundImage = `url("${hero.image_url}")`;
}

setTimeout(showLanguageScreen, 3000);
