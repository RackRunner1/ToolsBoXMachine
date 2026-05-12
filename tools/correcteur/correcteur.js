const checkBtns = document.querySelectorAll(".check-btn");
const clearBtns = document.querySelectorAll(".clear-btn");
const editBtn = document.getElementById("edit-btn");
const copyBtn = document.getElementById("copy-btn");
const textInput = document.getElementById("text-input");
const correctedTextDiv = document.getElementById("corrected-text");
const inputView = document.getElementById("input-view");
const resultView = document.getElementById("result-view");
const alternativesMenu = document.getElementById("alternatives-menu");
const copyFeedback = document.getElementById("copy-feedback");
const langRadios = document.querySelectorAll('input[name="langMode"]');

let currentMatches = [];

// Load saved language
const savedLang = localStorage.getItem("tbxm_corrector_lang");
if (savedLang) {
  const radio = document.querySelector(
    `input[name="langMode"][value="${savedLang}"]`,
  );
  if (radio) radio.checked = true;
}

langRadios.forEach((radio) => {
  radio.addEventListener("change", (e) => {
    localStorage.setItem("tbxm_corrector_lang", e.target.value);
  });
});

clearBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    textInput.value = "";
    textInput.focus();
  });
});

editBtn.addEventListener("click", () => {
  inputView.style.display = "flex";
  resultView.style.display = "none";
  alternativesMenu.classList.remove("active");
});

copyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(correctedTextDiv.innerText);
  copyFeedback.classList.add("show");
  setTimeout(() => copyFeedback.classList.remove("show"), 2000);
});

checkBtns.forEach((btn) => {
  btn.addEventListener("click", async () => {
    const text = textInput.value.trim();
    if (!text) return;

    // Set loading state for ALL check buttons
    const originalBtnHTMLs = Array.from(checkBtns).map((b) => b.innerHTML);
    checkBtns.forEach((b) => {
      b.innerHTML =
        '<svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg> Checking...';
      b.disabled = true;
    });

    try {
      const lang = document.querySelector(
        'input[name="langMode"]:checked',
      ).value;
      const params = new URLSearchParams({ language: lang, text: text });

      const response = await fetch("https://api.languagetool.org/v2/check", {
        method: "POST",
        body: params,
      });

      const data = await response.json();
      currentMatches = data.matches || [];

      processAndDisplay(text, currentMatches);

      inputView.style.display = "none";
      resultView.style.display = "flex";
    } catch (err) {
      alert("Error connecting to API. Please try again.");
    } finally {
      // Restore state for ALL check buttons
      checkBtns.forEach((b, i) => {
        b.innerHTML = originalBtnHTMLs[i];
        b.disabled = false;
      });
    }
  });
});

function processAndDisplay(originalText, matches) {
  // Sort matches backwards to replace without breaking offsets
  const sortedMatches = [...matches].sort((a, b) => b.offset - a.offset);

  let resultHTML = originalText;

  // We need to handle overlapping or sequential matches carefully.
  // To avoid HTML injection issues and simplify, we'll build the DOM parts.

  const segments = [];
  let lastIndex = originalText.length;

  sortedMatches.forEach((match, index) => {
    // Text after the match (up to the next match or end)
    const after = originalText.substring(
      match.offset + match.length,
      lastIndex,
    );
    if (after) segments.unshift(document.createTextNode(after));

    // The corrected word (using the first replacement)
    const replacement =
      match.replacements && match.replacements.length > 0
        ? match.replacements[0].value
        : originalText.substring(match.offset, match.offset + match.length);

    const span = document.createElement("span");
    span.className = "corrected-word";
    span.textContent = replacement;

    // Store alternatives in a data attribute
    const alts = match.replacements
      ? match.replacements.map((r) => r.value)
      : [];
    span.dataset.alts = JSON.stringify(alts);

    span.addEventListener("click", (e) => showAlternatives(e, span));

    segments.unshift(span);
    lastIndex = match.offset;
  });

  // Text before the first match
  const before = originalText.substring(0, lastIndex);
  if (before) segments.unshift(document.createTextNode(before));

  correctedTextDiv.innerHTML = "";
  segments.forEach((seg) => correctedTextDiv.appendChild(seg));
}

function showAlternatives(event, element) {
  event.stopPropagation();
  const alts = JSON.parse(element.dataset.alts);

  if (alts.length <= 1) return; // No other options

  alternativesMenu.innerHTML = '<div class="alt-header">Alternatives</div>';

  alts.slice(1, 10).forEach((alt) => {
    const item = document.createElement("div");
    item.className = "alt-item";
    item.textContent = alt;
    item.onclick = () => {
      element.textContent = alt;
      alternativesMenu.classList.remove("active");
    };
    alternativesMenu.appendChild(item);
  });

  // Position the menu
  const rect = element.getBoundingClientRect();
  alternativesMenu.style.top = `${rect.bottom + window.scrollY + 5}px`;
  alternativesMenu.style.left = `${rect.left + window.scrollX}px`;
  alternativesMenu.classList.add("active");
}

// Close menu on click outside
document.addEventListener("click", () => {
  alternativesMenu.classList.remove("active");
});
