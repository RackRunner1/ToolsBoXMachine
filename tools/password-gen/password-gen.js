const zxcvbn = window.zxcvbn;

const passwordOutput = document.getElementById("password-output");

const generateBtn = document.getElementById("generate-btn");
const copyBtn = document.getElementById("copy-btn");
const lengthInput = document.getElementById("password-length");
const lengthVal = document.getElementById("length-val");
const lengthLabel = document.getElementById("length-label");
const strengthBar = document.getElementById("strength-bar");
const strengthText = document.getElementById("strength-text");
const copyFeedback = document.getElementById("copy-feedback");

// History Setup
const historyContainer = document.getElementById("history-container");
const historyList = document.getElementById("history-list");
const clearHistoryBtn = document.getElementById("clear-history-btn");

let passwordHistory = JSON.parse(localStorage.getItem("tbxm_password_history")) || [];
let isInitialGen = true;

function updateHistoryUI() {
  if (!historyList) return;
  historyList.innerHTML = "";

  if (passwordHistory.length === 0) {
    if (historyContainer) historyContainer.style.display = "none";
    return;
  }

  if (historyContainer) historyContainer.style.display = "flex";

  passwordHistory.forEach((item) => {
    const historyItem = document.createElement("div");
    historyItem.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: rgba(30, 41, 59, 0.4); padding: 0.75rem 1rem; border-radius: 0.5rem; border: 1px solid var(--card-border); width: 100%; gap: 1rem;";

    const textWrapper = document.createElement("div");
    textWrapper.style.cssText = "font-family: var(--font-mono); font-size: 0.95rem; word-break: break-all; flex: 1;";
    
    const dotsText = "•".repeat(Math.min(item.length, 16));
    textWrapper.textContent = dotsText;
    textWrapper.style.color = "#94a3b8";

    const actionsWrapper = document.createElement("div");
    actionsWrapper.style.cssText = "display: flex; gap: 0.5rem; flex-shrink: 0;";

    const revealBtn = document.createElement("button");
    revealBtn.className = "btn btn-secondary";
    revealBtn.style.cssText = "padding: 0.25rem 0.5rem; font-size: 0.75rem;";
    revealBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    let isRevealed = false;
    revealBtn.onclick = () => {
      isRevealed = !isRevealed;
      if (isRevealed) {
        textWrapper.textContent = item;
        textWrapper.style.color = "var(--primary-color)";
        revealBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>`;
      } else {
        textWrapper.textContent = dotsText;
        textWrapper.style.color = "#94a3b8";
        revealBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
      }
    };

    const copyItemBtn = document.createElement("button");
    copyItemBtn.className = "btn btn-primary";
    copyItemBtn.style.cssText = "padding: 0.25rem 0.5rem; font-size: 0.75rem;";
    copyItemBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>`;
    copyItemBtn.onclick = () => {
      navigator.clipboard.writeText(item).then(() => {
        const copyFeedback = document.getElementById("copy-feedback");
        copyFeedback.classList.add("show");
        setTimeout(() => copyFeedback.classList.remove("show"), 2000);
      });
    };

    actionsWrapper.appendChild(revealBtn);
    actionsWrapper.appendChild(copyItemBtn);
    historyItem.appendChild(textWrapper);
    historyItem.appendChild(actionsWrapper);
    historyList.appendChild(historyItem);
  });
}

function addPasswordToHistory(pwd) {
  if (!pwd || pwd === "Select at least one option" || pwd === "Click Generate") return;
  if (passwordHistory[0] === pwd) return;
  passwordHistory.unshift(pwd);
  if (passwordHistory.length > 5) passwordHistory.pop();
  localStorage.setItem("tbxm_password_history", JSON.stringify(passwordHistory));
  updateHistoryUI();
}

if (clearHistoryBtn) {
  clearHistoryBtn.onclick = () => {
    passwordHistory = [];
    localStorage.setItem("tbxm_password_history", JSON.stringify(passwordHistory));
    updateHistoryUI();
  };
}

updateHistoryUI();

// Mode elements
const genModeRadios = document.querySelectorAll('input[name="genMode"]');
const passwordOptions = document.getElementById("password-options");
const passphraseOptions = document.getElementById("passphrase-options");

// Options
const includeUppercase = document.getElementById("include-uppercase");
const includeLowercase = document.getElementById("include-lowercase");
const includeNumbers = document.getElementById("include-numbers");
const includeSymbols = document.getElementById("include-symbols");
const excludeAmbiguous = document.getElementById("exclude-ambiguous");

// Passphrase options
const includeNumbersPhrase = document.getElementById("include-numbers-phrase");
const capitalizePhrase = document.getElementById("capitalize-phrase");
const phraseSeparator = document.getElementById("phrase-separator");

const chars = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()+?./-=",
  ambiguous: "l1Io0O",
};

// Simplified wordlist for passphrase mode
const words = [
  "apple",
  "beach",
  "brain",
  "bread",
  "brush",
  "chair",
  "chest",
  "chord",
  "click",
  "clock",
  "cloud",
  "dance",
  "diary",
  "drink",
  "earth",
  "feast",
  "field",
  "flame",
  "glass",
  "grass",
  "heart",
  "house",
  "juice",
  "light",
  "money",
  "music",
  "night",
  "ocean",
  "paint",
  "paper",
  "phone",
  "piano",
  "plane",
  "plant",
  "plate",
  "radio",
  "river",
  "robot",
  "shirt",
  "shoes",
  "smile",
  "snake",
  "space",
  "spoon",
  "storm",
  "table",
  "tiger",
  "toast",
  "touch",
  "train",
  "truck",
  "voice",
  "water",
  "watch",
  "whale",
  "world",
  "write",
  "youth",
  "zebra",
  "alpha",
  "bravo",
  "delta",
  "echo",
  "hotel",
  "india",
  "juliet",
  "kilo",
  "lima",
  "mike",
  "november",
  "oscar",
  "papa",
  "quebec",
  "romeo",
  "sierra",
  "tango",
  "uniform",
  "victor",
  "whiskey",
  "xray",
  "yankee",
  "zulu",
  "active",
  "bright",
  "calm",
  "dark",
  "early",
  "fast",
  "great",
  "happy",
  "iron",
  "jolly",
  "kind",
  "lucky",
  "magic",
  "noble",
  "open",
  "proud",
  "quick",
  "rare",
  "silent",
  "tough",
  "unique",
  "vivid",
  "wild",
  "young",
  "zen",
  "bold",
  "cool",
  "deep",
  "easy",
  "fair",
  "good",
  "high",
  "just",
  "keen",
  "loud",
  "main",
  "near",
  "odd",
  "pure",
  "real",
  "soft",
  "true",
  "used",
  "very",
  "wise",
  "zero",
];

function generatePassword() {
  const mode = document.querySelector('input[name="genMode"]:checked').value;
  let password = "";

  if (mode === "password") {
    let charSet = "";
    if (includeUppercase.checked) charSet += chars.uppercase;
    if (includeLowercase.checked) charSet += chars.lowercase;
    if (includeNumbers.checked) charSet += chars.numbers;
    if (includeSymbols.checked) charSet += chars.symbols;

    if (excludeAmbiguous.checked) {
      for (const amb of chars.ambiguous) {
        charSet = charSet.split(amb).join("");
      }
    }

    if (charSet === "") {
      passwordOutput.textContent = "Select at least one option";
      updateStrength("");
      return;
    }

    const length = parseInt(lengthInput.value);
    const randomValues = new Uint32Array(length);
    window.crypto.getRandomValues(randomValues);

    for (let i = 0; i < length; i++) {
      password += charSet.charAt(randomValues[i] % charSet.length);
    }
  } else {
    const length = parseInt(lengthInput.value);
    const separator = phraseSeparator.value;
    let chosenWords = [];

    for (let i = 0; i < length; i++) {
      let word = words[Math.floor(Math.random() * words.length)];
      if (capitalizePhrase.checked) {
        word = word.charAt(0).toUpperCase() + word.slice(1);
      }
      if (includeNumbersPhrase.checked) {
        word += Math.floor(Math.random() * 10);
      }
      chosenWords.push(word);
    }
    password = chosenWords.join(separator);
  }

  passwordOutput.textContent = password;
  updateStrength(password);
  if (!isInitialGen) {
    addPasswordToHistory(password);
  }
}

function updateStrength(password) {
  if (
    !password ||
    password === "Select at least one option" ||
    password === "Click Generate"
  ) {
    strengthBar.style.width = "0%";
    strengthText.textContent = "Strength: -";
    return;
  }

  // Analyse via zxcvbn
  const result = zxcvbn(password);
  const score = result.score; // 0 à 4

  // Définition des niveaux
  const levels = [
    { text: "Very Weak", color: "#ef4444", percent: 10 },
    { text: "Weak", color: "#f97316", percent: 30 },
    { text: "Medium", color: "#eab308", percent: 50 },
    { text: "Strong", color: "#22c55e", percent: 75 },
    { text: "Very Strong", color: "#10b981", percent: 100 },
  ];

  const level = levels[score];

  strengthBar.style.width = `${level.percent}%`;
  strengthBar.style.backgroundColor = level.color;
  strengthText.textContent = `Strength: ${level.text}`;
}

// Event Listeners
genModeRadios.forEach((radio) => {
  radio.addEventListener("change", (e) => {
    if (e.target.value === "password") {
      passwordOptions.style.display = "block";
      passphraseOptions.style.display = "none";
      lengthInput.min = 4;
      lengthInput.max = 50;
      lengthInput.value = 16;
      lengthLabel.textContent = "Characters";
    } else {
      passwordOptions.style.display = "none";
      passphraseOptions.style.display = "block";
      lengthInput.min = 2;
      lengthInput.max = 12;
      lengthInput.value = 4;
      lengthLabel.textContent = "Words";
    }
    lengthVal.textContent = lengthInput.value;
    generatePassword();
  });
});

[
  lengthInput,
  includeUppercase,
  includeLowercase,
  includeNumbers,
  includeSymbols,
  excludeAmbiguous,
  includeNumbersPhrase,
  capitalizePhrase,
  phraseSeparator,
].forEach((input) => {
  input.addEventListener("input", () => {
    lengthVal.textContent = lengthInput.value;
    generatePassword();
  });
});

generateBtn.addEventListener("click", generatePassword);

copyBtn.addEventListener("click", () => {
  const password = passwordOutput.textContent;
  if (
    password === "Click Generate" ||
    password === "Select at least one option"
  )
    return;

  navigator.clipboard.writeText(password).then(() => {
    copyFeedback.classList.add("show");
    setTimeout(() => {
      copyFeedback.classList.remove("show");
    }, 2000);
  });
});

// Initial generation
generatePassword();
isInitialGen = false;
