const WORDS = [
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for",
  "not", "on", "with", "he", "as", "you", "do", "at", "this", "but", "his",
  "by", "from", "they", "we", "say", "her", "she", "or", "an", "will", "my",
  "one", "all", "would", "there", "their", "what", "so", "up", "out", "if",
  "about", "who", "get", "which", "go", "me", "when", "make", "can", "like",
  "time", "no", "just", "him", "know", "take", "people", "into", "year",
  "your", "good", "some", "could", "them", "see", "other", "than", "then",
  "now", "look", "only", "come", "its", "over", "think", "also", "back",
  "after", "use", "two", "how", "our", "work", "first", "well", "way", "even",
  "new", "want", "because", "any", "these", "give", "day", "most", "us",
  "is", "are", "was", "were", "been", "has", "had", "did", "does", "done",
];

const textEl = document.getElementById("typing-text");
const caretEl = document.getElementById("typing-caret");
const cardEl = document.getElementById("typing-card");
const inputEl = document.getElementById("typing-input");
const restartBtn = document.getElementById("restart-btn");
const resultsModal = document.getElementById("results-modal");
const resultsClose = document.getElementById("results-close");
const resultsRestart = document.getElementById("results-restart");

const liveWpm = document.getElementById("live-wpm");
const liveAcc = document.getElementById("live-acc");
const liveTime = document.getElementById("live-time");

const resWpm = document.getElementById("res-wpm");
const resAcc = document.getElementById("res-acc");
const resTime = document.getElementById("res-time");
const resErrors = document.getElementById("res-errors");

let target = "";
let chars = [];
let spans = [];
let pos = 0;
let started = false;
let finished = false;
let startTime = 0;
let correctKeystrokes = 0;
let totalKeystrokes = 0;
let timerId = null;

function generateText() {
  const count = 45;
  const words = [];
  for (let i = 0; i < count; i++) {
    words.push(WORDS[Math.floor(Math.random() * WORDS.length)]);
  }
  return words.join(" ") + " ";
}

function renderText() {
  textEl.innerHTML = "";
  spans = chars.map((ch, i) => {
    const span = document.createElement("span");
    span.textContent = ch === " " ? "\u00A0" : ch;
    if (i < pos) span.classList.add("done");
    else if (i === pos) span.classList.add("current");
    textEl.appendChild(span);
    return span;
  });
  updateCaret();
}

function updateCaret() {
  if (pos >= spans.length) {
    caretEl.style.opacity = "0";
    return;
  }
  const span = spans[pos];
  const cardRect = cardEl.getBoundingClientRect();
  const spanRect = span.getBoundingClientRect();
  caretEl.style.left = spanRect.left - cardRect.left + "px";
  caretEl.style.top = spanRect.bottom - cardRect.top - 6 + "px";
  caretEl.style.width = Math.max(2, spanRect.width) + "px";
  caretEl.style.opacity = "1";
}

function updateLiveStats() {
  if (!started) {
    liveWpm.textContent = "0";
    liveAcc.textContent = "100%";
    liveTime.textContent = "0.0s";
    return;
  }
  const elapsed = (performance.now() - startTime) / 1000;
  const minutes = elapsed / 60;
  const wpm = minutes > 0 ? Math.round((correctKeystrokes / 5) / minutes) : 0;
  const acc = totalKeystrokes > 0
    ? Math.round((correctKeystrokes / totalKeystrokes) * 100)
    : 100;
  liveWpm.textContent = String(wpm);
  liveAcc.textContent = acc + "%";
  liveTime.textContent = elapsed.toFixed(1) + "s";
}

function reset() {
  target = generateText();
  chars = target.split("");
  pos = 0;
  started = false;
  finished = false;
  startTime = 0;
  correctKeystrokes = 0;
  totalKeystrokes = 0;
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  renderText();
  updateLiveStats();
  resultsModal.classList.remove("show");
  // focus input shortly
  setTimeout(() => inputEl.focus(), 50);
}

function finish() {
  if (finished) return;
  finished = true;
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  const elapsed = (performance.now() - startTime) / 1000;
  const minutes = elapsed / 60;
  const wpm = minutes > 0 ? Math.round((correctKeystrokes / 5) / minutes) : 0;
  const acc = totalKeystrokes > 0
    ? Math.round((correctKeystrokes / totalKeystrokes) * 100)
    : 100;
  resWpm.textContent = String(wpm);
  resAcc.textContent = acc + "%";
  resTime.textContent = elapsed.toFixed(1) + "s";
  resErrors.textContent = String(totalKeystrokes - correctKeystrokes);
  resultsModal.classList.add("show");
}

function startTimer() {
  if (started) return;
  started = true;
  startTime = performance.now();
  timerId = setInterval(updateLiveStats, 200);
}

inputEl.addEventListener("input", (e) => {
  const val = inputEl.value;
  inputEl.value = "";
  if (finished) return;
  if (val.length === 0) return;
  if (!started) startTimer();
  for (const ch of val) {
    if (pos >= chars.length) break;
    totalKeystrokes += 1;
    if (ch === chars[pos]) {
      correctKeystrokes += 1;
      pos += 1;
    }
  }
  renderText();
  updateLiveStats();
  if (pos >= chars.length) finish();
});

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Backspace") {
    e.preventDefault();
    if (finished) return;
    if (pos > 0) {
      pos -= 1;
      // adjust keystroke counts lightly: remove one correct
      if (correctKeystrokes > 0) correctKeystrokes -= 1;
      if (totalKeystrokes > 0) totalKeystrokes -= 1;
      renderText();
      updateLiveStats();
    }
  }
});

cardEl.addEventListener("click", () => inputEl.focus());

restartBtn.addEventListener("click", reset);
resultsClose.addEventListener("click", () => resultsModal.classList.remove("show"));
resultsRestart.addEventListener("click", reset);

window.addEventListener("resize", () => {
  // recompute caret position after layout changes
  requestAnimationFrame(updateCaret);
});

reset();
