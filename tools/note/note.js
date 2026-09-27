let tooltipRecentlyActive = false;
let tooltipResetTimer = null;

const STORAGE_KEY = "tbxm_notes";
const MODAL_KEY = "tbxm_notes_modal_dismissed";
const SKIP_DELETE_KEY = "tbxm_notes_skip_delete_confirm";

const elements = {
  editorEmpty: document.getElementById("editor-empty"),
  editorView: document.getElementById("editor-view"),
  titleInput: document.getElementById("note-title"),
  editor: document.getElementById("note-editor"),
  dateDisplay: document.getElementById("note-date"),
  deleteBtn: document.getElementById("delete-btn"),
  createBtn: document.getElementById("create-btn"),
  notesList: document.getElementById("notes-list"),
  notification: document.getElementById("notification"),
  storageModal: document.getElementById("storage-modal"),
  modalCloseBtn: document.getElementById("modal-close-btn"),
  dontShowCheckbox: document.getElementById("modal-dont-show"),
  contextMenu: document.getElementById("context-menu"),
  ctxDuplicate: document.getElementById("ctx-duplicate"),
  ctxDelete: document.getElementById("ctx-delete"),
  ctxCreate: document.getElementById("ctx-create"),
  settingsBtn: document.getElementById("settings-btn"),
  settingsModal: document.getElementById("settings-modal"),
  settingsCloseBtn: document.getElementById("settings-close-btn"),
  skipDeleteConfirm: document.getElementById("setting-skip-delete-confirm"),
  deleteModal: document.getElementById("delete-modal"),
  deleteModalCancel: document.getElementById("delete-modal-cancel"),
  deleteModalConfirm: document.getElementById("delete-modal-confirm"),
};

let notes = [];
let activeNoteId = null;
let saveTimeout = null;
let contextTargetNoteId = null;
let skipDeleteConfirm = localStorage.getItem(SKIP_DELETE_KEY) === "true";

function init() {
  loadNotes();
  renderList();
  setupEventListeners();
  selectFirstNote();
  elements.skipDeleteConfirm.checked = skipDeleteConfirm;
  setupStorageModal();
}

function setupStorageModal() {
  if (!elements.storageModal) return;
  const dismissed = localStorage.getItem(MODAL_KEY);
  if (dismissed === "true") return;

  requestAnimationFrame(() => {
    elements.storageModal.classList.add("show");
  });

  const close = () => {
    if (elements.dontShowCheckbox.checked) {
      localStorage.setItem(MODAL_KEY, "true");
    }
    elements.storageModal.classList.remove("show");
  };

  elements.modalCloseBtn.addEventListener("click", close);
  elements.storageModal.addEventListener("click", (e) => {
    if (e.target === elements.storageModal) close();
  });
}

function loadNotes() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      notes = JSON.parse(saved);
      notes.sort((a, b) => b.modifiedAt - a.modifiedAt);
    } else {
      notes = [];
    }
  } catch (e) {
    console.error("Failed to load notes", e);
    notes = [];
  }
}

function saveNotesToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function renderList() {
  elements.notesList.innerHTML = "";

  if (notes.length === 0) {
    elements.notesList.innerHTML = `
      <div class="sidebar-empty">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <p>No notes yet.<br>Click "New Note" to get started.</p>
      </div>
    `;
    return;
  }

  notes.forEach((note) => {
    const item = document.createElement("div");
    item.className = `note-item${note.id === activeNoteId ? " active" : ""}`;
    item.dataset.id = note.id;

    const preview = note.content
      ? note.content.substring(0, 120).replace(/\n/g, " ")
      : "Empty note";

    const createdDate = new Date(note.createdAt).toLocaleDateString(undefined, {
      month: "short", day: "numeric", year: "numeric",
    });
    const modifiedDate = new Date(note.modifiedAt).toLocaleDateString(undefined, {
      month: "short", day: "numeric", year: "numeric",
    });

    item.innerHTML = `
      <div class="note-item-title">${escapeHTML(note.title) || "Untitled Note"}</div>
      <div class="note-tooltip">
        <div class="note-tooltip-preview">${escapeHTML(preview)}</div>
        <div class="note-tooltip-dates">
          <span>Created: ${createdDate}</span>
          <span>Modified: ${modifiedDate}</span>
        </div>
      </div>
    `;

    item.addEventListener("click", () => selectNote(note.id));

    item.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      clearTimeout(tooltipTimer);
      tooltip.classList.remove("visible");
      contextTargetNoteId = note.id;
      showContextMenu(e.clientX, e.clientY, true);
    });

    const tooltip = item.querySelector(".note-tooltip");
    let tooltipTimer = null;
    item.addEventListener("mouseenter", () => {
      clearTimeout(tooltipTimer);
      clearTimeout(tooltipResetTimer);
      const show = () => {
        const rect = item.getBoundingClientRect();
        tooltip.style.left = rect.right + 12 + "px";
        tooltip.style.top = rect.top + "px";
        tooltip.classList.add("visible");
        tooltipRecentlyActive = true;
      };
      if (tooltipRecentlyActive) {
        show();
      } else {
        tooltipTimer = setTimeout(show, 400);
      }
    });
    item.addEventListener("mouseleave", () => {
      clearTimeout(tooltipTimer);
      tooltip.classList.remove("visible");
      tooltipResetTimer = setTimeout(() => {
        tooltipRecentlyActive = false;
      }, 100);
    });

    elements.notesList.appendChild(item);
  });
}

function escapeHTML(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.innerText = str;
  return div.innerHTML;
}

function selectNote(id) {
  const note = notes.find((n) => n.id === id);
  if (!note) return;

  clearTimeout(saveTimeout);
  saveTimeout = null;
  saveCurrentNote();
  activeNoteId = id;

  elements.editorEmpty.style.display = "none";
  elements.editorView.style.display = "flex";

  elements.titleInput.value = note.title;
  const dateStr = new Date(note.modifiedAt).toLocaleString();
  elements.dateDisplay.textContent = dateStr;

  renderList();
  loadEditor(note.content || "", 0);
}

function selectFirstNote() {
  if (notes.length > 0) {
    selectNote(notes[0].id);
  } else {
    showEditorEmpty();
  }
}

function showEditorEmpty() {
  activeNoteId = null;
  editorSrc = "";
  editorBlocks = [];
  blockPmaps = [];
  activeBlockIdx = -1;
  histStack = [];
  redoStack = [];
  elements.editorEmpty.style.display = "flex";
  elements.editorView.style.display = "none";
}

function createNote() {
  saveCurrentNote();
  const now = Date.now();
  const newNote = {
    id: crypto.randomUUID ? crypto.randomUUID() : `note_${now}`,
    title: "",
    content: "",
    createdAt: now,
    modifiedAt: now,
  };

  notes.unshift(newNote);
  saveNotesToStorage();
  selectNote(newNote.id);
  elements.titleInput.focus();
}

function saveCurrentNote(autoSave = false) {
  if (!activeNoteId) return;

  const title = elements.titleInput.value.trim();
  const content = editorSrc.trim();
  const index = notes.findIndex((n) => n.id === activeNoteId);

  if (index === -1) return;

  if (!title && !content && !autoSave) {
    notes.splice(index, 1);
    saveNotesToStorage();
    if (notes.length > 0) {
      selectNote(notes[0].id);
    } else {
      showEditorEmpty();
      renderList();
    }
    return;
  }

  notes[index].title = title;
  notes[index].content = content;
  notes[index].modifiedAt = Date.now();
  notes.sort((a, b) => b.modifiedAt - a.modifiedAt);
  saveNotesToStorage();
}

function scheduleAutoSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    saveCurrentNote(true);
    renderList();
    elements.dateDisplay.textContent = new Date().toLocaleString();
  }, 400);
}

function handleExternalSync() {
  const hadPendingSave = saveTimeout !== null;

  loadNotes();

  if (activeNoteId) {
    const activeNote = notes.find((n) => n.id === activeNoteId);
    if (!activeNote) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
      if (notes.length > 0) {
        selectNote(notes[0].id);
      } else {
        showEditorEmpty();
      }
    } else if (!hadPendingSave) {
      if (
        elements.titleInput.value !== activeNote.title ||
        editorSrc !== activeNote.content
      ) {
        elements.titleInput.value = activeNote.title;
        elements.dateDisplay.textContent = new Date(activeNote.modifiedAt).toLocaleString();
        loadEditor(activeNote.content || "", 0);
      }
    }
  } else if (notes.length > 0) {
    selectNote(notes[0].id);
  }

  renderList();
}

function deleteActiveNote() {
  if (!activeNoteId) return;
  const doDelete = () => {
    notes = notes.filter((n) => n.id !== activeNoteId);
    saveNotesToStorage();
    if (notes.length > 0) {
      selectNote(notes[0].id);
    } else {
      showEditorEmpty();
    }
    renderList();
    showNotification("Note deleted");
  };
  if (skipDeleteConfirm) {
    doDelete();
  } else {
    showDeleteModal(doDelete);
  }
}

function showNotification(message) {
  elements.notification.textContent = message;
  elements.notification.classList.add("show");
  setTimeout(() => {
    elements.notification.classList.remove("show");
  }, 3000);
}

// ---------- Live Markdown engine (Typora-style) ----------

let editorSrc = "";
let editorBlocks = [];
let blockPmaps = [];
let activeBlockIdx = -1;
let suppressSelection = false;
let isComposing = false;
let histStack = [];
let redoStack = [];
let lastHistPush = 0;

function sanitizeMdUrl(url) {
  const t = url.trim();
  if (/^(javascript|data|vbscript|file|blob):/i.test(t)) return "#";
  return url;
}

// Tokenize one line (no newlines inside) into ordered tokens with absolute
// source indices. `base` = global src offset of `text[0]`, `full` = whole
// document source (for boundary checks), `absStart` = offset of text[0] in full.
function tokenizeInline(text, base, full, absStart) {
  const tokens = [];
  const n = text.length;
  let i = 0;
  const prevIsWord = (k) => {
    const gi = absStart + k - 1;
    return gi >= 0 && /[\w]/.test(full[gi]);
  };
  while (i < n) {
    const rest = text.slice(i);
    let m;
    // Escaped punctuation: \* \_ ...
    m = rest.match(/^\\([\\`*_{}[\]()#+\-.!|>~])/);
    if (m) {
      tokens.push({ k: "m", s: base + i, e: base + i + 1 });
      tokens.push({ k: "t", s: base + i + 1, e: base + i + 2 });
      i += 2;
      continue;
    }
    // Code span: `code` or ``code``
    m = rest.match(/^(`+)([^\n]*?)\1/);
    if (m && m[2].length > 0) {
      const openLen = m[1].length;
      const cs = i + openLen;
      const ce = cs + m[2].length;
      tokens.push({
        k: "code", s: base + i, e: base + i + m[0].length,
        openS: base + i, openE: base + cs, cs: base + cs, ce: base + ce,
        closeS: base + ce, closeE: base + i + m[0].length,
      });
      i += m[0].length;
      continue;
    }
    // Image: ![alt](src "title")
    m = rest.match(/^!\[([^\]]*?)\]\((\S+?)(?:\s+"([^"]*?)")?\)/);
    if (m) {
      const alt = m[1];
      const href = m[2];
      const title = m[3];
      const altS = i + 2;
      const altE = altS + alt.length;
      const hrefS = altE + 2;
      const hrefE = hrefS + href.length;
      const end = i + m[0].length;
      let titleS = -1;
      let titleE = -1;
      if (title !== undefined) {
        titleE = end - 2;
        titleS = titleE - title.length;
      }
      tokens.push({
        k: "img", s: base + i, e: base + end,
        openS: base + i, openE: base + altS,
        alt: tokenizeInline(alt, base + altS, full, absStart + altS),
        midS: base + altE, midE: base + hrefS,
        hs: base + hrefS, he: base + hrefE,
        rawHref: href, titleS, titleE, closeS: base + end - 1, closeE: base + end,
      });
      i = end;
      continue;
    }
    // Link: [label](href "title")
    m = rest.match(/^\[([^\]]*?)\]\((\S+?)(?:\s+"([^"]*?)")?\)/);
    if (m) {
      const label = m[1];
      const href = m[2];
      const title = m[3];
      const labelS = i + 1;
      const labelE = labelS + label.length;
      const hrefS = labelE + 2;
      const hrefE = hrefS + href.length;
      const end = i + m[0].length;
      let titleS = -1;
      let titleE = -1;
      if (title !== undefined) {
        titleE = end - 2;
        titleS = titleE - title.length;
      }
      tokens.push({
        k: "link", s: base + i, e: base + end,
        openS: base + i, openE: base + labelS,
        label: tokenizeInline(label, base + labelS, full, absStart + labelS),
        midS: base + labelE, midE: base + hrefS,
        hs: base + hrefS, he: base + hrefE,
        rawHref: href, titleS, titleE, closeS: base + end - 1, closeE: base + end,
      });
      i = end;
      continue;
    }
    // Bare URL (autolink)
    m = rest.match(/^(https?:\/\/[^\s<>()]+)/);
    if (m) {
      let url = m[1];
      const trail = url.match(/[.,;:!?)]+$/);
      if (trail) url = url.slice(0, -trail[0].length);
      tokens.push({ k: "auto", s: base + i, e: base + i + url.length, hs: base + i, he: base + i + url.length });
      i += url.length;
      continue;
    }
    // Bold + italic: ***x*** or ___x___
    m = rest.match(/^(\*\*\*|___)(.+?)\1/);
    if (m) {
      const inner = m[2];
      const innerS = i + m[1].length;
      tokens.push({
        k: "strongem", s: base + i, e: base + i + m[0].length,
        openS: base + i, openE: base + innerS,
        inner: tokenizeInline(inner, base + innerS, full, absStart + innerS),
        closeS: base + innerS + inner.length, closeE: base + i + m[0].length,
      });
      i += m[0].length;
      continue;
    }
    // Bold: **x** or __x__
    m = rest.match(/^(\*\*|__)(.+?)\1/);
    if (m) {
      const inner = m[2];
      const innerS = i + m[1].length;
      tokens.push({
        k: "strong", s: base + i, e: base + i + m[0].length,
        openS: base + i, openE: base + innerS,
        inner: tokenizeInline(inner, base + innerS, full, absStart + innerS),
        closeS: base + innerS + inner.length, closeE: base + i + m[0].length,
      });
      i += m[0].length;
      continue;
    }
    // Strikethrough: ~~x~~
    m = rest.match(/^~~(.+?)~~/);
    if (m) {
      const inner = m[1];
      tokens.push({
        k: "strike", s: base + i, e: base + i + m[0].length,
        openS: base + i, openE: base + i + 2,
        inner: tokenizeInline(inner, base + i + 2, full, absStart + i + 2),
        closeS: base + i + m[0].length - 2, closeE: base + i + m[0].length,
      });
      i += m[0].length;
      continue;
    }
    // Italic with stars: *x*
    m = rest.match(/^\*([^*\n]+?)\*/);
    if (m) {
      const inner = m[1];
      tokens.push({
        k: "em", s: base + i, e: base + i + m[0].length,
        openS: base + i, openE: base + i + 1,
        inner: tokenizeInline(inner, base + i + 1, full, absStart + i + 1),
        closeS: base + i + m[0].length - 1, closeE: base + i + m[0].length,
      });
      i += m[0].length;
      continue;
    }
    // Italic with underscores: _x_ (word boundaries, avoids foo_bar_baz)
    if (rest[0] === "_" && !prevIsWord(i)) {
      m = rest.match(/^_([^_\n]+?)_(?![\w])/);
      if (m) {
        const inner = m[1];
        tokens.push({
          k: "em", s: base + i, e: base + i + m[0].length,
          openS: base + i, openE: base + i + 1,
          inner: tokenizeInline(inner, base + i + 1, full, absStart + i + 1),
          closeS: base + i + m[0].length - 1, closeE: base + i + m[0].length,
        });
        i += m[0].length;
        continue;
      }
    }
    // Plain text run up to the next construct starter (or single char)
    m = rest.match(/^([\s\S]*?)(?=\\|`|\*|_|~|\[|!\[|https?:\/\/|$)/);
    if (m && m[1].length > 0) {
      tokens.push({ k: "t", s: base + i, e: base + i + m[1].length });
      i += m[1].length;
    } else {
      tokens.push({ k: "t", s: base + i, e: base + i + 1 });
      i += 1;
    }
  }
  return tokens;
}



function newOut(src) {
  return {
    src,
    html: "",
    vis: [],
    text(s, e) {
      this.html += escapeHTML(this.src.slice(s, e));
      for (let k = s; k < e; k++) this.vis.push(k);
    },
    mark(s, e, show) {
      const ch = escapeHTML(this.src.slice(s, e));
      if (show) {
        this.html += `<span class="md-marker">${ch}</span>`;
      } else {
        this.html += `<span class="md-marker-zero" data-mhide="1">${ch}</span>`;
      }
      for (let k = s; k < e; k++) this.vis.push(k);
    },
    br(nlIdx) {
      this.html += "<br>";
      this.vis.push(nlIdx);
    },
  };
}

function renderInlineTokens(out, tokens, show) {
  const src = out.src;
  for (const tk of tokens) {
    if (tk.k === "t") {
      out.text(tk.s, tk.e);
    } else if (tk.k === "m") {
      out.mark(tk.s, tk.e, show);
    } else if (tk.k === "strong" || tk.k === "em" || tk.k === "strike") {
      const tag = tk.k === "strong" ? "strong" : tk.k === "em" ? "em" : "del";
      out.mark(tk.openS, tk.openE, show);
      out.html += `<${tag}>`;
      renderInlineTokens(out, tk.inner, show);
      out.html += `</${tag}>`;
      out.mark(tk.closeS, tk.closeE, show);
    } else if (tk.k === "strongem") {
      out.mark(tk.openS, tk.openE, show);
      out.html += "<strong><em>";
      renderInlineTokens(out, tk.inner, show);
      out.html += "</em></strong>";
      out.mark(tk.closeS, tk.closeE, show);
    } else if (tk.k === "code") {
      out.mark(tk.openS, tk.openE, show);
      out.html += "<code>";
      out.text(tk.cs, tk.ce);
      out.html += "</code>";
      out.mark(tk.closeS, tk.closeE, show);
    } else if (tk.k === "link") {
      out.mark(tk.openS, tk.openE, show);
      const href = escapeHTML(sanitizeMdUrl(tk.rawHref));
      let titleAttr = "";
      if (tk.titleS !== -1) {
        titleAttr = ` title="${escapeHTML(src.slice(tk.titleS, tk.titleE))}"`;
      }
      out.html += `<a href="${href}" target="_blank" rel="noopener noreferrer"${titleAttr}>`;
      renderInlineTokens(out, tk.label, show);
      out.html += "</a>";
      out.mark(tk.midS, tk.midE, show);
      out.mark(tk.hs, tk.he, show);
      if (tk.titleS !== -1) {
        out.mark(tk.he, tk.titleS - 1, show);
        out.mark(tk.titleS - 1, tk.titleE + 1, show);
      }
      out.mark(tk.closeS, tk.closeE, show);
    } else if (tk.k === "img") {
      if (show) {
        out.mark(tk.openS, tk.openE, show);
        renderInlineTokens(out, tk.alt, show);
        out.mark(tk.midS, tk.closeE, show);
      } else {
        const firstAlt = tk.alt.length > 0 ? tk.alt[0].s : tk.openE;
        const lastAlt = tk.alt.length > 0 ? tk.alt[tk.alt.length - 1].e : tk.openE;
        const altText = escapeHTML(src.slice(firstAlt, lastAlt));
        const srcAttr = escapeHTML(sanitizeMdUrl(tk.rawHref));
        out.html += `<img src="${srcAttr}" alt="${altText}">`;
      }
    } else if (tk.k === "auto") {
      const url = escapeHTML(src.slice(tk.hs, tk.he));
      out.html += `<a href="${url}" target="_blank" rel="noopener noreferrer">`;
      out.text(tk.hs, tk.he);
      out.html += "</a>";
    }
  }
}

// Split a table line into trimmed cells with line-local offsets.
function splitTableLine(line) {
  const cells = [];
  const n = line.length;
  let j = 0;
  while (j < n && line[j] === " ") j++;
  let i = j < n && line[j] === "|" ? j + 1 : 0;
  let segStart = i;
  const pushCell = (end) => {
    let s = segStart;
    let e = end;
    while (s < e && line[s] === " ") s++;
    while (e > s && line[e - 1] === " ") e--;
    cells.push({ s, e });
  };
  while (i < n) {
    if (line[i] === "|") {
      pushCell(i);
      i++;
      segStart = i;
    } else {
      i++;
    }
  }
  if (segStart < n) {
    pushCell(n);
  }
  return cells;
}

function isDelimRow(line) {
  const cells = splitTableLine(line);
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(line.slice(c.s, c.e)));
}

function parseBlocks(src) {
  if (src === "") return { blocks: [{ type: "empty", start: 0, end: 0 }], lines: [""], starts: [0] };
  const lines = src.split("\n");
  const starts = [];
  let off = 0;
  for (const l of lines) {
    starts.push(off);
    off += l.length + 1;
  }
  const endOf = (li) => starts[li] + lines[li].length;
  const blank = (l) => /^\s*$/.test(l);
  const fenceOpen = (l) => l.match(/^\s{0,3}`{3,}(\w*)\s*$/);
  const fenceClose = (l) => /^\s{0,3}`{3,}\s*$/.test(l);
  const headingM = (l) => l.match(/^\s{0,3}#{1,6}\s+/);
  const hrM = (l) => /^\s{0,3}(?:(?:- *){3,}|(?:\* *){3,}|(?:_ *){3,})\s*$/.test(l);
  const quoteM = (l) => /^\s{0,3}>/.test(l);
  const listM = (l) => l.match(/^\s{0,3}(?:[*+-]|\d+[.)])\s+/);
  const blockStart = (idx) => {
    const l = lines[idx];
    if (fenceOpen(l) || headingM(l) || hrM(l) || quoteM(l) || listM(l)) return true;
    if (l.includes("|") && idx + 1 < lines.length && isDelimRow(lines[idx + 1])) return true;
    return false;
  };
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    if (blank(lines[i])) {
      i++;
      continue;
    }
    const l0 = i;
    const line = lines[i];
    const fo = fenceOpen(line);
    if (fo) {
      i++;
      while (i < lines.length && !fenceClose(lines[i])) i++;
      const l1 = i < lines.length ? i : lines.length - 1;
      if (i < lines.length) i++;
      blocks.push({ type: "fence", l0, l1, start: starts[l0], end: endOf(l1), lang: fo[1] || "" });
      continue;
    }
    if (headingM(line)) {
      const level = line.match(/^\s{0,3}(#{1,6})/)[1].length;
      blocks.push({ type: "heading", level, l0, l1: l0, start: starts[l0], end: endOf(l0) });
      i++;
      continue;
    }
    if (hrM(line)) {
      blocks.push({ type: "hr", l0, l1: l0, start: starts[l0], end: endOf(l0) });
      i++;
      continue;
    }
    if (quoteM(line)) {
      while (i < lines.length && !blank(lines[i]) && quoteM(lines[i])) i++;
      const l1 = i - 1;
      blocks.push({ type: "quote", l0, l1, start: starts[l0], end: endOf(l1) });
      continue;
    }
    if (listM(line)) {
      const base = line.match(/^\s*/)[0].length;
      while (i < lines.length) {
        const l = lines[i];
        if (blank(l)) break;
        if (listM(l)) {
          i++;
          continue;
        }
        const ind = l.match(/^\s*/)[0].length;
        if (ind > base && !blockStart(i)) {
          i++;
          continue;
        }
        break;
      }
      const l1 = i - 1;
      blocks.push({ type: "list", l0, l1, start: starts[l0], end: endOf(l1) });
      continue;
    }
    if (line.includes("|") && i + 1 < lines.length && isDelimRow(lines[i + 1])) {
      i += 2;
      while (i < lines.length && !blank(lines[i]) && lines[i].includes("|")) i++;
      const l1 = i - 1;
      blocks.push({ type: "table", l0, l1, start: starts[l0], end: endOf(l1) });
      continue;
    }
    while (i < lines.length && !blank(lines[i]) && !blockStart(i)) i++;
    const l1 = i - 1;
    blocks.push({ type: "para", l0, l1, start: starts[l0], end: endOf(l1) });
  }
  if (blocks.length === 0 || src.endsWith("\n")) {
    // Trailing/home block so the caret always has somewhere to go
    // (e.g. Enter at end of document).
    blocks.push({ type: "empty", start: src.length, end: src.length });
  }
  return { blocks, lines, starts };
}

function emitInline(out, text, base, show) {
  const tokens = tokenizeInline(text, base, out.src, base);
  renderInlineTokens(out, tokens, show);
}

function parseItemLine(text) {
  const m = text.match(/^(\s*)([*+-]|\d+[.)])(\s+)(.*)$/);
  if (!m) return null;
  const indent = m[1].length;
  const bulletS = indent;
  const bulletE = bulletS + m[2].length;
  const afterS = bulletE;
  const afterE = afterS + m[3].length;
  let task = null;
  let taskS = -1;
  let taskE = -1;
  let contentS = afterE;
  const tm = m[4].match(/^\[([ xX])\](\s+|$)/);
  if (tm) {
    task = tm[1].toLowerCase() === "x";
    taskS = afterE;
    taskE = afterE + tm[0].length;
    contentS = taskE;
  }
  return { indent, bullet: m[2], bulletS, bulletE, afterS, afterE, task, taskS, taskE, contentS };
}

function renderListLevel(out, lines, starts, idx, baseIndent, show) {
  const first = parseItemLine(lines[idx]);
  const ordered = /^\d/.test(first.bullet);
  out.html += ordered ? "<ol>" : "<ul>";
  let liOpen = false;
  const closeLi = () => {
    if (liOpen) {
      out.html += "</li>";
      liOpen = false;
    }
  };
  while (idx < lines.length) {
    const text = lines[idx];
    const ls = starts[idx];
    const p = parseItemLine(text);
    if (!p) {
      // Continuation line of the current item
      if (liOpen) {
        out.br(ls - 1);
        emitInline(out, text, ls, show);
      }
      idx++;
      continue;
    }
    const isOrd = /^\d/.test(p.bullet);
    if (p.indent < baseIndent || isOrd !== ordered) break;
    if (p.indent > baseIndent) {
      if (!liOpen) break;
      idx = renderListLevel(out, lines, starts, idx, p.indent, show);
      continue;
    }
    closeLi();
    out.html += p.task !== null ? '<li class="md-task">' : "<li>";
    liOpen = true;
    out.text(ls, ls + p.indent);
    out.mark(ls + p.bulletS, ls + p.bulletE, show);
    out.mark(ls + p.afterS, ls + p.afterE, show);
    if (p.task !== null) {
      if (show) {
        out.mark(ls + p.taskS, ls + p.taskE, true);
      } else {
        out.html += `<input type="checkbox" disabled${p.task ? " checked" : ""}>`;
      }
    }
    emitInline(out, text.slice(p.contentS), ls + p.contentS, show);
    idx++;
  }
  closeLi();
  out.html += ordered ? "</ol>" : "</ul>";
  return idx;
}

function renderBlock(b, parsed, show) {
  const out = newOut(editorSrc);
  const lines = parsed.lines;
  const starts = parsed.starts;
  const lineText = (li) => lines[li];
  const lineStart = (li) => starts[li];
  const joinLines = (l0, l1, fn) => {
    for (let k = l0; k <= l1; k++) {
      if (k > l0) out.br(starts[k] - 1);
      fn(k, starts[k], lines[k]);
    }
  };

  if (b.type === "empty") {
    return { out, cls: "md-block md-para" };
  }
  if (b.type === "para") {
    joinLines(b.l0, b.l1, (k, ls, text) => emitInline(out, text, ls, show));
    return { out, cls: "md-block md-para" };
  }
  if (b.type === "heading") {
    const ls = lineStart(b.l0);
    const text = lineText(b.l0);
    const m = text.match(/^(\s*)(#{1,6})(\s+)/);
    out.text(ls, ls + m[1].length);
    const hashS = ls + m[1].length;
    const hashE = hashS + m[2].length;
    const spE = hashE + m[3].length;
    out.mark(hashS, spE, show);
    let rest = text.slice(m[0].length);
    let restS = ls + m[0].length;
    const tm = rest.match(/^(.*?)(\s+#+\s*)$/);
    if (tm && tm[1].length > 0) {
      emitInline(out, tm[1], restS, show);
      out.mark(restS + tm[1].length, ls + text.length, show);
    } else {
      emitInline(out, rest, restS, show);
    }
    return { out, cls: `md-block md-h${b.level}` };
  }
  if (b.type === "quote") {
    joinLines(b.l0, b.l1, (k, ls, text) => {
      const m = text.match(/^(\s*)(>\s?)/);
      if (m) {
        out.text(ls, ls + m[1].length);
        out.mark(ls + m[1].length, ls + m[0].length, show);
        emitInline(out, text.slice(m[0].length), ls + m[0].length, show);
      } else {
        emitInline(out, text, ls, show);
      }
    });
    return { out, cls: "md-block md-quote" };
  }
  if (b.type === "list") {
    const sub = { lines: lines.slice(b.l0, b.l1 + 1), starts: starts.slice(b.l0, b.l1 + 1) };
    renderListLevel(out, sub.lines, sub.starts, 0, parseItemLine(lines[b.l0]).indent, show);
    return { out, cls: "md-block md-list" };
  }
  if (b.type === "fence") {
    if (show) {
      joinLines(b.l0, b.l1, (k, ls, text) => out.text(ls, ls + text.length));
    } else {
      const hasClose = /^\s{0,3}`{3,}\s*$/.test(lines[b.l1]);
      const codeL1 = hasClose ? b.l1 - 1 : b.l1;
      out.html += "<pre><code>";
      for (let k = b.l0 + 1; k <= codeL1; k++) {
        if (k > b.l0 + 1) out.br(starts[k] - 1);
        out.text(starts[k], starts[k] + lines[k].length);
      }
      out.html += "</code></pre>";
    }
    return { out, cls: "md-block md-fence" };
  }
  if (b.type === "table") {
    if (show) {
      joinLines(b.l0, b.l1, (k, ls, text) => out.text(ls, ls + text.length));
      return { out, cls: "md-block md-table md-raw" };
    }
    const headerCells = splitTableLine(lines[b.l0]);
    const delimCells = splitTableLine(lines[b.l0 + 1]);
    const aligns = delimCells.map((c) => {
      const t = lines[b.l0 + 1].slice(c.s, c.e);
      const left = t.startsWith(":");
      const right = t.endsWith(":");
      return left && right ? "center" : right ? "right" : left ? "left" : "";
    });
    out.html += '<div class="md-table-wrap"><table><thead><tr>';
    headerCells.forEach((c, idx) => {
      const a = aligns[idx] || "";
      out.html += `<th${a ? ` style="text-align:${a}"` : ""}>`;
      emitInline(out, lines[b.l0].slice(c.s, c.e), starts[b.l0] + c.s, show);
      out.html += "</th>";
    });
    out.html += "</tr></thead>";
    if (b.l1 > b.l0 + 1) {
      out.html += "<tbody>";
      for (let r = b.l0 + 2; r <= b.l1; r++) {
        const cells = splitTableLine(lines[r]);
        out.html += "<tr>";
        cells.forEach((c, idx) => {
          const a = aligns[idx] || "";
          out.html += `<td${a ? ` style="text-align:${a}"` : ""}>`;
          emitInline(out, lines[r].slice(c.s, c.e), starts[r] + c.s, show);
          out.html += "</td>";
        });
        out.html += "</tr>";
      }
      out.html += "</tbody>";
    }
    out.html += "</table></div>";
    return { out, cls: "md-block md-table" };
  }
  if (b.type === "hr") {
    if (show) {
      out.text(b.start, b.end);
    } else {
      out.html += "<hr>";
    }
    return { out, cls: "md-block md-hr" };
  }
  joinLines(b.l0, b.l1, (k, ls, text) => emitInline(out, text, ls, show));
  return { out, cls: "md-block md-para" };
}

function renderEditor() {
  const ed = elements.editor;
  const parsed = parseBlocks(editorSrc);
  editorBlocks = parsed.blocks;
  blockPmaps = [];
  if (!editorBlocks.length) {
    ed.innerHTML = "";
    return parsed;
  }
  let html = "";
  editorBlocks.forEach((blk, bi) => {
    const res = renderBlock(blk, parsed, bi === activeBlockIdx);
    blockPmaps.push(res.out.vis);
    html += `<div class="${res.cls}" data-bi="${bi}">${res.out.html || "<br>"}</div>`;
  });
  ed.innerHTML = html;
  return parsed;
}

function blockDiv(bi) {
  return elements.editor.querySelector(`[data-bi="${bi}"]`);
}

// Local caret offset inside a block div. skipHidden skips data-mhide spans
// (used when the caret sits in an inactive rendered block).
function domOffsetIn(root, node, nodeOff, skipHidden) {
  let off = 0;
  let done = false;
  const countSub = (n) => {
    if (n.nodeType === 3) return n.nodeValue.length;
    if (n.nodeName === "BR") return 1;
    let s = 0;
    n.childNodes.forEach((c) => {
      s += countSub(c);
    });
    return s;
  };
  const walk = (n) => {
    if (done) return;
    if (n === node) {
      if (n.nodeType === 3) {
        off += Math.min(nodeOff, n.nodeValue.length);
      } else {
        for (let k = 0; k < nodeOff && k < n.childNodes.length; k++) {
          off += countSub(n.childNodes[k]);
        }
      }
      done = true;
      return;
    }
    if (n.nodeType === 3) {
      off += n.nodeValue.length;
      return;
    }
    if (n.nodeName === "BR") {
      off += 1;
      return;
    }
    n.childNodes.forEach(walk);
  };
  walk(root);
  return done ? off : null;
}

function setCaretIn(root, local) {
  const sel = window.getSelection();
  const r = document.createRange();
  let rem = Math.max(0, local);
  let placed = false;
  const walk = (n) => {
    if (placed) return;
    const kids = n.childNodes;
    for (let ci = 0; ci < kids.length; ci++) {
      if (placed) return;
      const c = kids[ci];
      if (c.nodeType === 3) {
        const L = c.nodeValue.length;
        if (rem <= L) {
          r.setStart(c, rem);
          placed = true;
          return;
        }
        rem -= L;
      } else if (c.nodeName === "BR") {
        if (rem === 0) {
          r.setStart(n, ci);
          placed = true;
          return;
        }
        rem -= 1;
      } else {
        walk(c);
      }
    }
  };
  walk(root);
  if (!placed) {
    r.selectNodeContents(root);
    r.collapse(false);
  }
  sel.removeAllRanges();
  sel.addRange(r);
}

// Read back the exact source of an ACTIVE block (all markers visible).
function readBlockText(div) {
  let s = "";
  const walk = (n) => {
    n.childNodes.forEach((c) => {
      if (c.nodeType === 3) s += c.nodeValue;
      else if (c.nodeName === "BR") s += "\n";
      else walk(c);
    });
  };
  walk(div);
  return s;
}

function getCaretInfo() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return null;
  let el = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentNode;
  if (!el || !el.closest) return null;
  const div = el.closest(".md-block");
  if (!div || !elements.editor.contains(div)) return null;
  const bi = parseInt(div.dataset.bi, 10);
  if (Number.isNaN(bi) || !editorBlocks[bi]) return null;
  const skipHidden = bi !== activeBlockIdx;
  const local = domOffsetIn(div, range.startContainer, range.startOffset, skipHidden);
  if (local === null) return null;
  return { bi, local, div };
}

function locateBlock(blocks, g) {
  if (!blocks.length) return { bi: 0, local: 0 };
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (g >= b.start && g <= b.end) return { bi: i, local: g - b.start };
  }
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].start >= g) return { bi: i, local: 0 };
  }
  const l = blocks[blocks.length - 1];
  return { bi: blocks.length - 1, local: l.end - l.start };
}

function restoreCaret(bi, local) {
  const div = blockDiv(bi);
  if (!div) {
    elements.editor.focus();
    return;
  }
  suppressSelection = true;
  try {
    setCaretIn(div, local);
  } finally {
    setTimeout(() => {
      suppressSelection = false;
    }, 0);
  }
}

function commitHist(g, structural) {
  const now = Date.now();
  const top = histStack[histStack.length - 1];
  if (!structural && top && now - lastHistPush < 1500) {
    top.src = editorSrc;
    top.g = g;
    redoStack = [];
    return;
  }
  histStack.push({ src: editorSrc, g });
  if (histStack.length > 100) histStack.shift();
  redoStack = [];
  lastHistPush = now;
}

function applyHist(entry) {
  editorSrc = entry.src;
  const parsed = parseBlocks(editorSrc);
  editorBlocks = parsed.blocks;
  const loc = locateBlock(editorBlocks, Math.min(entry.g, editorSrc.length));
  activeBlockIdx = loc.bi;
  renderEditor();
  restoreCaret(loc.bi, loc.local);
  scheduleAutoSave();
}

function pushUndo() {
  const sel = window.getSelection();
  if (sel.rangeCount) {
    const info = getCaretInfo();
    if (info) {
      commitHist(editorBlocks[info.bi].start + info.local, true);
      return;
    }
  }
  commitHist(0, true);
}

function handleUndo() {
  if (histStack.length > 1) {
    redoStack.push(histStack.pop());
    applyHist(histStack[histStack.length - 1]);
  }
}

function handleRedo() {
  if (redoStack.length > 0) {
    const entry = redoStack.pop();
    histStack.push(entry);
    applyHist(entry);
  }
}

function loadEditor(content, caretG) {
  editorSrc = content || "";
  histStack = [{ src: editorSrc, g: caretG || 0 }];
  redoStack = [];
  lastHistPush = 0;
  const parsed = parseBlocks(editorSrc);
  editorBlocks = parsed.blocks;
  const loc = locateBlock(editorBlocks, Math.min(caretG || 0, editorSrc.length));
  activeBlockIdx = loc.bi;
  renderEditor();
  restoreCaret(loc.bi, loc.local);
}

function getLineAt(src, g) {
  const ls = src.lastIndexOf("\n", g - 1) + 1;
  let le = src.indexOf("\n", g);
  if (le === -1) le = src.length;
  return { lineStart: ls, lineEnd: le, line: src.slice(ls, le), col: g - ls };
}

function handleEditorInput() {
  if (isComposing) return;
  const info = getCaretInfo();
  if (!info || info.bi !== activeBlockIdx) {
    renderEditor();
    return;
  }
  const blk = editorBlocks[info.bi];
  const text = readBlockText(info.div);
  editorSrc = editorSrc.slice(0, blk.start) + text + editorSrc.slice(blk.end);
  const g = blk.start + info.local;
  commitHist(g, false);
  const parsed = parseBlocks(editorSrc);
  editorBlocks = parsed.blocks;
  const loc = locateBlock(editorBlocks, g);
  activeBlockIdx = loc.bi;
  renderEditor();
  restoreCaret(loc.bi, loc.local);
  scheduleAutoSave();
}

function handleEditorKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && !e.altKey) {
    const key = e.key.toLowerCase();
    if (key === "s") {
      e.preventDefault();
      clearTimeout(saveTimeout);
      saveTimeout = null;
      saveCurrentNote();
      renderList();
      showNotification("Note saved!");
      return;
    }
    if (key === "z" && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
      return;
    }
    if (key === "y" || (key === "z" && e.shiftKey)) {
      e.preventDefault();
      handleRedo();
      return;
    }
  }
  if (e.key === "Tab") {
    const sel = window.getSelection();
    if (!sel.rangeCount || !sel.getRangeAt(0).collapsed) return;
    e.preventDefault();
    const info = getCaretInfo();
    if (!info) return;
    const blk = editorBlocks[info.bi];
    const g = blk.start + info.local;
    if (e.shiftKey) {
      const { lineStart, line } = getLineAt(editorSrc, g);
      const rm = line.match(/^ {1,2}/) ? line.match(/^ {1,2}/)[0].length : 0;
      if (rm > 0) {
        editorSrc = editorSrc.slice(0, lineStart) + editorSrc.slice(lineStart + rm);
        commitHist(g - rm, true);
        const parsed = parseBlocks(editorSrc);
        editorBlocks = parsed.blocks;
        const loc = locateBlock(editorBlocks, g - rm);
        activeBlockIdx = loc.bi;
        renderEditor();
        restoreCaret(loc.bi, loc.local);
        scheduleAutoSave();
      }
    } else {
      editorSrc = editorSrc.slice(0, g) + "  " + editorSrc.slice(g);
      commitHist(g + 2, true);
      const parsed = parseBlocks(editorSrc);
      editorBlocks = parsed.blocks;
      const loc = locateBlock(editorBlocks, g + 2);
      activeBlockIdx = loc.bi;
      renderEditor();
      restoreCaret(loc.bi, loc.local);
      scheduleAutoSave();
    }
    return;
  }
  if (e.key === "Enter") {
    handleEnter(e);
    return;
  }
  if (e.key === "Backspace") {
    const info = getCaretInfo();
    if (info && info.local === 0) {
      e.preventDefault();
      handleBackspaceAtStart(info);
    }
    return;
  }
  if (e.key === "Delete") {
    const info = getCaretInfo();
    if (!info) return;
    const blk = editorBlocks[info.bi];
    if (info.local === blk.end - blk.start && info.bi < editorBlocks.length - 1) {
      e.preventDefault();
      if (editorSrc[blk.end] === "\n") {
        editorSrc = editorSrc.slice(0, blk.end) + editorSrc.slice(blk.end + 1);
        commitHist(blk.start + info.local, true);
        const parsed = parseBlocks(editorSrc);
        editorBlocks = parsed.blocks;
        const nb = editorBlocks.find((x) => x.start === blk.start) || editorBlocks[info.bi];
        const nbi = editorBlocks.indexOf(nb);
        activeBlockIdx = nbi;
        renderEditor();
        restoreCaret(nbi, info.local);
        scheduleAutoSave();
      }
    }
  }
}

function handleEnter(e) {
  const sel = window.getSelection();
  if (!sel.rangeCount || !sel.getRangeAt(0).collapsed) return;
  e.preventDefault();
  const info = getCaretInfo();
  if (!info) return;
  const blk = editorBlocks[info.bi];
  const g = blk.start + info.local;
  const type = blk.type;
  let newG = g;

  // Shift+Enter: soft break (single newline, stays in the same block)
  if (e.shiftKey) {
    editorSrc = editorSrc.slice(0, g) + "\n" + editorSrc.slice(g);
    commitHist(g + 1, true);
    const parsedShift = parseBlocks(editorSrc);
    editorBlocks = parsedShift.blocks;
    const locShift = locateBlock(editorBlocks, g + 1);
    activeBlockIdx = locShift.bi;
    renderEditor();
    restoreCaret(locShift.bi, locShift.local);
    scheduleAutoSave();
    return;
  }

  const splitWithBlank = () => {
    editorSrc = editorSrc.slice(0, g) + "\n\n" + editorSrc.slice(g);
    newG = g + 2;
  };

  if (type === "fence" || type === "table" || type === "empty") {
    editorSrc = editorSrc.slice(0, g) + "\n" + editorSrc.slice(g);
    newG = g + 1;
  } else if (type === "hr") {
    editorSrc = editorSrc.slice(0, blk.end) + "\n\n" + editorSrc.slice(blk.end);
    newG = blk.end + 2;
  } else if (type === "heading") {
    splitWithBlank();
  } else if (type === "para") {
    splitWithBlank();
  } else if (type === "quote" || type === "list") {
    const { lineStart, lineEnd, line, col } = getLineAt(editorSrc, g);
    let prefix;
    let emptyRest;
    if (type === "quote") {
      const m = line.match(/^\s{0,3}>\s?/);
      prefix = m ? m[0] : "> ";
      emptyRest = line.slice(prefix.length) === "";
    } else {
      const p = parseItemLine(line);
      if (!p) {
        splitWithBlank();
        commitHist(newG, true);
        const parsed = parseBlocks(editorSrc);
        editorBlocks = parsed.blocks;
        const loc = locateBlock(editorBlocks, newG);
        activeBlockIdx = loc.bi;
        renderEditor();
        restoreCaret(loc.bi, loc.local);
        scheduleAutoSave();
        return;
      }
      const indentStr = line.slice(0, p.indent);
      let bullet = p.bullet;
      const on = bullet.match(/^(\d+)([.)])$/);
      if (on) bullet = `${parseInt(on[1], 10) + 1}${on[2]}`;
      prefix = `${indentStr}${bullet} `;
      if (p.task !== null) prefix += "[ ] ";
      emptyRest = p.content === "";
      if (emptyRest && col >= line.length) {
        // Empty item + Enter at end: end the list, plain line
        const absLineStart = lineStart;
        const absLineEnd = lineEnd;
        editorSrc = editorSrc.slice(0, absLineStart) + editorSrc.slice(absLineEnd);
        if (editorSrc[absLineStart] === "\n") {
          editorSrc = editorSrc.slice(0, absLineStart) + editorSrc.slice(absLineStart + 1);
        }
        newG = absLineStart;
        commitHist(newG, true);
        const parsed = parseBlocks(editorSrc);
        editorBlocks = parsed.blocks;
        const loc = locateBlock(editorBlocks, newG);
        activeBlockIdx = loc.bi;
        renderEditor();
        restoreCaret(loc.bi, loc.local);
        scheduleAutoSave();
        return;
      }
    }
    if (emptyRest && type === "quote") {
      const { lineStart: qls, lineEnd: qle } = getLineAt(editorSrc, g);
      editorSrc = editorSrc.slice(0, qls) + editorSrc.slice(qle);
      if (editorSrc[qls] === "\n") {
        editorSrc = editorSrc.slice(0, qls) + editorSrc.slice(qls + 1);
      }
      newG = qls;
    } else {
      editorSrc = editorSrc.slice(0, g) + "\n" + prefix + editorSrc.slice(g);
      newG = g + 1 + prefix.length;
    }
  }
  commitHist(newG, true);
  const parsed = parseBlocks(editorSrc);
  editorBlocks = parsed.blocks;
  const loc = locateBlock(editorBlocks, newG);
  activeBlockIdx = loc.bi;
  renderEditor();
  restoreCaret(loc.bi, loc.local);
  scheduleAutoSave();
}

function handleBackspaceAtStart(info) {
  const blk = editorBlocks[info.bi];
  if (info.bi === 0 && blk.start === 0) return;
  if (blk.type === "list" || blk.type === "quote") {
    const firstLineEnd = editorSrc.indexOf("\n", blk.start);
    const firstLine = editorSrc.slice(blk.start, firstLineEnd === -1 ? blk.end : firstLineEnd);
    if (blk.type === "list") {
      const p = parseItemLine(firstLine);
      if (p) {
        if (p.indent > 0) {
          const rm = Math.min(2, p.indent);
          editorSrc = editorSrc.slice(0, blk.start) + editorSrc.slice(blk.start + rm);
          commitHist(blk.start, true);
        } else {
          const cut = p.bullet.length + (firstLine.slice(p.bullet.length).match(/^\s+/) || [""])[0].length;
          editorSrc = editorSrc.slice(0, blk.start) + editorSrc.slice(blk.start + cut);
          commitHist(blk.start, true);
        }
        const parsed = parseBlocks(editorSrc);
        editorBlocks = parsed.blocks;
        const loc = locateBlock(editorBlocks, blk.start);
        activeBlockIdx = loc.bi;
        renderEditor();
        restoreCaret(loc.bi, loc.local);
        scheduleAutoSave();
        return;
      }
    } else {
      const m = firstLine.match(/^\s{0,3}>\s?/);
      if (m) {
        editorSrc = editorSrc.slice(0, blk.start) + editorSrc.slice(blk.start + m[0].length);
        commitHist(blk.start, true);
        const parsed = parseBlocks(editorSrc);
        editorBlocks = parsed.blocks;
        const loc = locateBlock(editorBlocks, blk.start);
        activeBlockIdx = loc.bi;
        renderEditor();
        restoreCaret(loc.bi, loc.local);
        scheduleAutoSave();
        return;
      }
    }
  }
  // Merge with previous block: delete one newline before this block
  if (blk.start > 0 && editorSrc[blk.start - 1] === "\n") {
    const prev = editorBlocks[info.bi - 1];
    const newG = prev.end;
    editorSrc = editorSrc.slice(0, blk.start - 1) + editorSrc.slice(blk.start);
    commitHist(newG, true);
    const parsed = parseBlocks(editorSrc);
    editorBlocks = parsed.blocks;
    const nb = editorBlocks.find((x) => x.start === prev.start) || editorBlocks[0];
    const nbi = editorBlocks.indexOf(nb);
    activeBlockIdx = nbi;
    renderEditor();
    restoreCaret(nbi, newG - nb.start);
    scheduleAutoSave();
  }
}

// Global src offset of an arbitrary DOM caret position (any block).
function caretPosOf(node, off) {
  if (!node) return null;
  const el = node.nodeType === 1 ? node : node.parentNode;
  if (!el || !el.closest) return null;
  const div = el.closest(".md-block");
  if (!div || !elements.editor.contains(div)) return null;
  const bi = parseInt(div.dataset.bi, 10);
  const blk = editorBlocks[bi];
  if (Number.isNaN(bi) || !blk) return null;
  const skip = bi !== activeBlockIdx;
  const vis = domOffsetIn(div, node, off, skip);
  if (vis === null) return null;
  if (skip) {
    const pmap = blockPmaps[bi] || [];
    const local = vis < pmap.length ? pmap[vis] : blk.end - blk.start;
    return { g: blk.start + local };
  }
  return { g: blk.start + vis };
}

function spliceSrc(g, delCount, insertText) {
  editorSrc = editorSrc.slice(0, g) + insertText + editorSrc.slice(g + delCount);
  const newG = g + insertText.length;
  commitHist(newG, true);
  const parsed = parseBlocks(editorSrc);
  editorBlocks = parsed.blocks;
  const loc = locateBlock(editorBlocks, newG);
  activeBlockIdx = loc.bi;
  renderEditor();
  restoreCaret(loc.bi, loc.local);
  scheduleAutoSave();
}

let pendingDragRange = null;

function handleDragStart(e) {
  pendingDragRange = null;
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.getRangeAt(0).collapsed) return;
  const range = sel.getRangeAt(0);
  if (!elements.editor.contains(range.commonAncestorContainer)) return;
  const a = caretPosOf(range.startContainer, range.startOffset);
  const f = caretPosOf(range.endContainer, range.endOffset);
  if (a && f) pendingDragRange = { g1: Math.min(a.g, f.g), g2: Math.max(a.g, f.g) };
}

function handleDrop(e) {
  e.preventDefault();
  const dt = e.dataTransfer;
  const text = dt && dt.getData ? dt.getData("text/plain").replace(/\r\n?/g, "\n") : "";
  let g = editorSrc.length;
  if (document.caretRangeFromPoint) {
    try {
      const r = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (r) {
        const p = caretPosOf(r.startContainer, r.startOffset);
        if (p) g = p.g;
      }
    } catch (err) {
      /* keep end-of-doc fallback */
    }
  }
  if (pendingDragRange) {
    const { g1, g2 } = pendingDragRange;
    pendingDragRange = null;
    if (g >= g1 && g <= g2) return; // dropped onto itself: no-op
    editorSrc = editorSrc.slice(0, g1) + editorSrc.slice(g2);
    if (g > g2) g -= g2 - g1;
    commitHist(g, true);
  }
  if (!text) {
    const parsed = parseBlocks(editorSrc);
    editorBlocks = parsed.blocks;
    const loc = locateBlock(editorBlocks, g);
    activeBlockIdx = loc.bi;
    renderEditor();
    restoreCaret(loc.bi, loc.local);
    scheduleAutoSave();
    return;
  }
  spliceSrc(g, 0, text);
}

function handleCut(e) {
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.getRangeAt(0).collapsed) return;
  const range = sel.getRangeAt(0);
  if (!elements.editor.contains(range.commonAncestorContainer)) return;
  e.preventDefault();
  const a = caretPosOf(range.startContainer, range.startOffset);
  const f = caretPosOf(range.endContainer, range.endOffset);
  if (!a || !f) return;
  const g1 = Math.min(a.g, f.g);
  const g2 = Math.max(a.g, f.g);
  if (e.clipboardData) {
    e.clipboardData.setData("text/plain", editorSrc.slice(g1, g2));
  }
  spliceSrc(g1, g2 - g1, "");
}

function handlePaste(e) {
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData("text/plain").replace(/\r\n?/g, "\n");
  if (!text) return;
  const info = getCaretInfo();
  let g;
  if (info) {
    g = editorBlocks[info.bi].start + info.local;
  } else {
    g = editorSrc.length;
  }
  spliceSrc(g, 0, text);
}

function handleSelectionChange() {
  if (suppressSelection || isComposing) return;
  if (elements.editorView.style.display === "none") return;
  const sel = window.getSelection();
  if (!sel.rangeCount || !sel.getRangeAt(0).collapsed) return;
  if (!elements.editor.contains(sel.anchorNode)) return;
  const info = getCaretInfo();
  if (!info || info.bi === activeBlockIdx) return;
  const pmap = blockPmaps[info.bi] || [];
  const blk = editorBlocks[info.bi];
  const len = blk.end - blk.start;
  const local = info.local < pmap.length ? pmap[info.local] : len;
  activeBlockIdx = info.bi;
  renderEditor();
  restoreCaret(info.bi, local);
}

function handleEditorClick(e) {
  const a = e.target.closest ? e.target.closest("a") : null;
  if (a) e.preventDefault();
  if (e.target === elements.editor) {
    const last = editorBlocks[editorBlocks.length - 1];
    if (last) {
      activeBlockIdx = editorBlocks.length - 1;
      renderEditor();
      restoreCaret(activeBlockIdx, last.end - last.start);
    }
    return;
  }
  const hr = e.target.closest ? e.target.closest(".md-hr") : null;
  if (hr) {
    const bi = parseInt(hr.dataset.bi, 10);
    if (!Number.isNaN(bi) && editorBlocks[bi]) {
      activeBlockIdx = bi;
      renderEditor();
      restoreCaret(bi, 0);
    }
  }
}

function setupEventListeners() {
  elements.createBtn.addEventListener("click", createNote);
  elements.deleteBtn.addEventListener("click", deleteActiveNote);

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.code === "KeyN") {
      e.preventDefault();
      hideContextMenu();
      createNote();
    }
  });

  elements.titleInput.addEventListener("input", scheduleAutoSave);

  elements.editor.addEventListener("input", handleEditorInput);
  elements.editor.addEventListener("keydown", handleEditorKeydown);
  elements.editor.addEventListener("paste", handlePaste);
  elements.editor.addEventListener("cut", handleCut);
  elements.editor.addEventListener("drop", handleDrop);
  elements.editor.addEventListener("dragstart", handleDragStart);
  elements.editor.addEventListener("click", handleEditorClick);
  elements.editor.addEventListener("compositionstart", () => {
    isComposing = true;
  });
  elements.editor.addEventListener("compositionend", () => {
    isComposing = false;
    handleEditorInput();
  });
  document.addEventListener("selectionchange", handleSelectionChange);

  elements.titleInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      elements.editor.focus();
      const last = editorBlocks[editorBlocks.length - 1];
      if (last) {
        activeBlockIdx = editorBlocks.length - 1;
        renderEditor();
        restoreCaret(activeBlockIdx, last.end - last.start);
      }
    }
  });

  elements.notesList.addEventListener("contextmenu", (e) => {
    if (e.target.closest(".note-item")) return;
    e.preventDefault();
    contextTargetNoteId = null;
    showContextMenu(e.clientX, e.clientY, false);
  });

  document.addEventListener("click", hideContextMenu);
  document.addEventListener("contextmenu", (e) => {
    if (!e.target.closest(".notes-sidebar")) {
      hideContextMenu();
    }
  });

  elements.ctxDelete.addEventListener("click", () => {
    if (!contextTargetNoteId) return;
    const targetId = contextTargetNoteId;
    hideContextMenu();
    const doDelete = () => {
      notes = notes.filter((n) => n.id !== targetId);
      saveNotesToStorage();
      if (activeNoteId === targetId) {
        if (notes.length > 0) {
          selectNote(notes[0].id);
        } else {
          showEditorEmpty();
        }
      }
      renderList();
      showNotification("Note deleted");
    };
    if (skipDeleteConfirm) {
      doDelete();
    } else {
      showDeleteModal(doDelete);
    }
  });

  elements.ctxCreate.addEventListener("click", () => {
    hideContextMenu();
    createNote();
  });

  elements.ctxDuplicate.addEventListener("click", () => {
    if (!contextTargetNoteId) return;
    const source = notes.find((n) => n.id === contextTargetNoteId);
    hideContextMenu();
    if (!source) return;
    const now = Date.now();
    const dup = {
      id: crypto.randomUUID ? crypto.randomUUID() : `note_${now}`,
      title: source.title + " (copy)",
      content: source.content,
      createdAt: now,
      modifiedAt: now,
    };
    notes.unshift(dup);
    saveNotesToStorage();
    selectNote(dup.id);
    elements.titleInput.focus();
    elements.titleInput.select();
    renderList();
    showNotification("Note duplicated");
  });

  elements.deleteModalCancel.addEventListener("click", hideDeleteModal);
  elements.deleteModalConfirm.addEventListener("click", () => {
    if (deleteModalCallback) deleteModalCallback();
    hideDeleteModal();
  });
  elements.deleteModal.addEventListener("click", (e) => {
    if (e.target === elements.deleteModal) hideDeleteModal();
  });

  elements.settingsBtn.addEventListener("click", () => {
    elements.settingsModal.classList.add("show");
  });

  elements.settingsCloseBtn.addEventListener("click", () => {
    elements.settingsModal.classList.remove("show");
  });

  elements.settingsModal.addEventListener("click", (e) => {
    if (e.target === elements.settingsModal) {
      elements.settingsModal.classList.remove("show");
    }
  });

  elements.skipDeleteConfirm.addEventListener("change", () => {
    skipDeleteConfirm = elements.skipDeleteConfirm.checked;
    localStorage.setItem(SKIP_DELETE_KEY, skipDeleteConfirm);
  });

  window.addEventListener("storage", (e) => {
    if (e.key !== null && e.key !== STORAGE_KEY) return;
    handleExternalSync();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (saveTimeout !== null) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
      saveCurrentNote(true);
      renderList();
    }
    handleExternalSync();
  });

  window.addEventListener("pagehide", () => {
    if (saveTimeout !== null) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
      saveCurrentNote(true);
    }
  });
}

let deleteModalCallback = null;

function showDeleteModal(callback) {
  deleteModalCallback = callback;
  elements.deleteModal.classList.add("show");
}

function hideDeleteModal() {
  elements.deleteModal.classList.remove("show");
  deleteModalCallback = null;
}

function showContextMenu(x, y, showDelete) {
  elements.ctxDuplicate.style.display = showDelete ? "flex" : "none";
  elements.ctxDelete.style.display = showDelete ? "flex" : "none";
  elements.ctxCreate.style.display = showDelete ? "none" : "flex";

  const menu = elements.contextMenu;
  menu.classList.add("show");

  const menuRect = menu.getBoundingClientRect();
  const maxX = window.innerWidth - menuRect.width - 8;
  const maxY = window.innerHeight - menuRect.height - 8;
  menu.style.left = Math.min(x, maxX) + "px";
  menu.style.top = Math.min(y, maxY) + "px";
}

function hideContextMenu() {
  elements.contextMenu.classList.remove("show");
  contextTargetNoteId = null;
}

document.addEventListener("DOMContentLoaded", init);
