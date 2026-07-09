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

const splashScreen = document.querySelector("#splashScreen");
const languageScreen = document.querySelector("#languageScreen");
const languageWheel = document.querySelector("#languageWheel");
const selectButton = document.querySelector("#selectButton");

let selectedIndex = 1;
let startY = 0;
let isDragging = false;

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

  localStorage.setItem("captainOrderLanguage", selectedLanguage.code);

  // Your colleague can replace this line with:
  // window.location.href = `menu.html?lang=${selectedLanguage.code}`;
  alert(`Selected language: ${selectedLanguage.label}`);
});

setTimeout(showLanguageScreen, 3000);
