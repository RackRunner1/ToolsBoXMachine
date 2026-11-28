const TEXTS = [
  "The quick brown fox jumps over the lazy dog near the riverbank while the sun sets behind the distant hills. Birds return to their nests and the wind carries the scent of pine through the quiet forest. It is a calm evening, perfect for a slow walk home.",
  "Technology has changed the way we communicate, work, and learn. Every day, new tools appear that make tasks easier and faster. Yet the most important skills remain simple: focus, patience, and the willingness to keep improving one step at a time.",
  "Reading a good book can transport you to another world. The characters become friends, and their journeys feel like your own. When the last page is turned, you carry a piece of that story with you for a long time.",
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
let status = [];
let started = false;
let finished = false;
let startTime = 0;
let correctKeystrokes = 0;
let totalKeystrokes = 0;
let timerId = null;

function generateText() {
  const text = TEXTS[Math.floor(Math.random() * TEXTS.length)];
  return text + " ";
}

function renderText() {
  textEl.innerHTML = "";
  spans = chars.map((ch, i) => {
    const span = document.createElement("span");
    span.textContent = ch === " " ? "\u00A0" : ch;
    if (i < pos) {
      if (status[i] === 1) span.classList.add("done");
      else span.classList.add("wrong");
    } else if (i === pos) {
      span.classList.add("current");
    }
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
  status = new Array(chars.length).fill(0);
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
      status[pos] = 1;
    } else {
      status[pos] = -1;
    }
    pos += 1;
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
      if (status[pos] === 1 && correctKeystrokes > 0) correctKeystrokes -= 1;
      status[pos] = 0;
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
