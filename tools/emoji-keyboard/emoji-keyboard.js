(function() {
const DATA_PATH = "./data/";

const supportCanvas = document.createElement("canvas");
supportCanvas.width = 20;
supportCanvas.height = 20;
const supportCtx = supportCanvas.getContext("2d");
supportCtx.textBaseline = "top";
supportCtx.font = "16px sans-serif";
const supportedCache = new Map();

function isEmojiSupported(char) {
  if (supportedCache.has(char)) return supportedCache.get(char);
  try {
    supportCtx.clearRect(0, 0, 20, 20);
    supportCtx.fillText(char, 0, 0);
    const data = supportCtx.getImageData(0, 0, 20, 20).data;
    let nonZero = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) nonZero++;
    }
    const supported = nonZero > 4;
    supportedCache.set(char, supported);
    return supported;
  } catch {
    supportedCache.set(char, true);
    return true;
  }
}

const grid = document.getElementById("emoji-grid");
const tabsContainer = document.getElementById("category-tabs");
const searchInput = document.getElementById("emoji-search");
const toast = document.getElementById("toast");
const pager = document.getElementById("emoji-pager");
const pagerPrev = document.getElementById("pager-prev");
const pagerNext = document.getElementById("pager-next");
const pagerInfo = document.getElementById("pager-info");
const PAGE_SIZE = 300;

let manifest = null;
let categories = [];
let activeCategory = 0;
let view = null;
let currentPage = 0;
let viewId = 0;
let toastTimeout = null;

const dataCache = new Map();
let allEmojis = null;
let allEmojisPromise = null;

function fetchData(file) {
  if (!dataCache.has(file)) {
    const request = fetch(DATA_PATH + file)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load " + file);
        return res.json();
      })
      .catch((err) => {
        dataCache.delete(file);
        throw err;
      });
    dataCache.set(file, request);
  }
  return dataCache.get(file);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getPageFromUrl() {
  const page = parseInt(new URLSearchParams(location.search).get("page"), 10);
  return Number.isFinite(page) && page >= 1 ? page - 1 : 0;
}

function setUrlPage(page) {
  const url = new URL(location.href);
  if (page === null) url.searchParams.delete("page");
  else url.searchParams.set("page", page + 1);
  history.replaceState(null, "", url);
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 1500);
}

function copyEmoji(emoji, cell) {
  const onCopied = () => {
    cell.classList.add("copied");
    setTimeout(() => cell.classList.remove("copied"), 300);
    showToast("Copied " + emoji + "!");
  };
  navigator.clipboard.writeText(emoji).then(onCopied).catch(() => {
    const range = document.createRange();
    range.selectNodeContents(cell);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand("copy");
    sel.removeAllRanges();
    onCopied();
  });
}

function buildEmojiCell(emoji) {
  const cell = document.createElement("div");
  cell.className = "emoji-cell" + (isEmojiSupported(emoji) ? "" : " unsupported");
  cell.textContent = emoji;
  cell.addEventListener("click", () => copyEmoji(emoji, cell));
  return cell;
}

function renderGrid(items) {
  const fragment = document.createDocumentFragment();
  for (const emoji of items) {
    fragment.appendChild(buildEmojiCell(emoji));
  }
  grid.innerHTML = "";
  grid.appendChild(fragment);
}

function renderMessage(text) {
  pager.hidden = true;
  grid.innerHTML = '<div class="emoji-grid-message">' + text + "</div>";
}

function renderPager() {
  const totalPages = view.totalPages;
  pager.hidden = totalPages <= 1;
  pagerInfo.textContent = (currentPage + 1) + " / " + totalPages;
  pagerPrev.disabled = currentPage === 0;
  pagerNext.disabled = currentPage >= totalPages - 1;
}

function renderView() {
  const id = ++viewId;
  view.load(currentPage).then((items) => {
    if (id !== viewId) return;
    renderGrid(items);
    renderPager();
  }).catch(() => {
    if (id === viewId) renderMessage("Could not load emojis");
  });
}

function showAll(page) {
  view = {
    isAll: true,
    totalPages: manifest.totalPages,
    load: (p) => fetchData("pages/" + (p + 1) + ".json"),
  };
  currentPage = clamp(page, 0, view.totalPages - 1);
  setUrlPage(currentPage);
  renderView();
}

function showCategory(index) {
  const cat = categories[index];
  view = {
    isAll: false,
    totalPages: 1,
    load: () => fetchData(cat.file),
  };
  currentPage = 0;
  setUrlPage(null);
  renderView();
}

function renderEmojis(index) {
  if (index === 0) showAll(0);
  else showCategory(index);
}

let activeTabButtons = [];

function renderTabs() {
  const fragment = document.createDocumentFragment();
  activeTabButtons = [];
  categories.forEach((cat, i) => {
    const btn = document.createElement("button");
    btn.className = "category-tab" + (i === activeCategory ? " active" : "");
    btn.textContent = cat.name;
    btn.addEventListener("click", () => {
      setActiveCategory(i);
      searchInput.value = "";
    });
    activeTabButtons.push(btn);
    fragment.appendChild(btn);
  });
  tabsContainer.innerHTML = "";
  tabsContainer.appendChild(fragment);
  scrollActiveTabIntoView();
}

function setActiveCategory(i) {
  activeTabButtons[activeCategory].classList.remove("active");
  activeCategory = i;
  activeTabButtons[i].classList.add("active");
  renderEmojis(i);
  scrollActiveTabIntoView();
}

function scrollActiveTabIntoView() {
  activeTabButtons[activeCategory].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
}

let emojiNameMap = null;
let emojiNamesPromise = null;

function loadScript(src) {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = resolve;
    document.head.appendChild(script);
  });
}

function loadEmojiNames() {
  if (!emojiNamesPromise) {
    emojiNamesPromise = Promise.all([
      loadScript("./emoji-names.js?v=1"),
      loadScript("./emoji-keywords.js?v=1"),
    ]).then(() => {
      const names = window.__emojiNames || {};
      const keywords = window.__emojiKeywords || {};
      emojiNameMap = new Map();
      for (const emoji of new Set([...Object.keys(names), ...Object.keys(keywords)])) {
        emojiNameMap.set(emoji, [names[emoji], keywords[emoji]].filter(Boolean).join(" "));
      }
    });
  }
  return emojiNamesPromise;
}

function loadAllEmojis() {
  if (!allEmojisPromise) {
    const requests = [];
    for (let i = 0; i < manifest.totalPages; i++) {
      requests.push(fetchData("pages/" + (i + 1) + ".json"));
    }
    allEmojisPromise = Promise.all(requests)
      .then((chunks) => {
        allEmojis = chunks.flat();
      })
      .catch((err) => {
        allEmojisPromise = null;
        throw err;
      });
  }
  return allEmojisPromise;
}

function getEmojiName(emoji) {
  return emojiNameMap.get(emoji) || "";
}

function filterEmojis(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    renderEmojis(activeCategory);
    return;
  }

  const id = ++viewId;
  pager.hidden = true;
  grid.innerHTML = '<div class="emoji-grid-message">Loading search data...</div>';
  Promise.all([loadEmojiNames(), loadAllEmojis()]).then(() => {
    if (id !== viewId) return;
    doFilter(q);
  }).catch(() => {
    if (id === viewId) renderMessage("Could not load search data");
  });
}

function doFilter(q) {
  const filtered = [];
  for (const emoji of allEmojis) {
    if (
      emoji.includes(q) ||
      emoji.codePointAt(0).toString(16).includes(q) ||
      getEmojiName(emoji).includes(q)
    ) {
      filtered.push(emoji);
    }
  }

  if (filtered.length === 0) {
    view = null;
    renderMessage("No emojis found");
    return;
  }

  view = {
    isAll: false,
    totalPages: Math.ceil(filtered.length / PAGE_SIZE),
    load: (p) => Promise.resolve(filtered.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE)),
  };
  currentPage = 0;
  setUrlPage(null);
  renderView();
}

let searchDebounce = null;
searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => filterEmojis(searchInput.value), 150);
});

document.getElementById("tab-arrow-left").addEventListener("click", () => {
  tabsContainer.scrollBy({ left: -200, behavior: "smooth" });
});

document.getElementById("tab-arrow-right").addEventListener("click", () => {
  tabsContainer.scrollBy({ left: 200, behavior: "smooth" });
});

function changePage(delta) {
  currentPage = clamp(currentPage + delta, 0, view.totalPages - 1);
  if (view.isAll) setUrlPage(currentPage);
  renderView();
  grid.scrollIntoView({ behavior: "smooth", block: "start" });
}

pagerPrev.addEventListener("click", () => changePage(-1));
pagerNext.addEventListener("click", () => changePage(1));

fetchData("index.json").then((data) => {
  manifest = data;
  categories = [{ name: "All" }, ...manifest.categories];
  renderTabs();
  showAll(getPageFromUrl());
}).catch(() => renderMessage("Could not load emojis"));
})();
