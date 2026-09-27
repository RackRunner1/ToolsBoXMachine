let tooltipRecentlyActive = false;
let tooltipResetTimer = null;

const STORAGE_KEY = "tbxm_notes";
const MODAL_KEY = "tbxm_notes_modal_dismissed";
const SKIP_DELETE_KEY = "tbxm_notes_skip_delete_confirm";

const elements = {
  editorEmpty: document.getElementById("editor-empty"),
  editorView: document.getElementById("editor-view"),
  titleInput: document.getElementById("note-title"),
  contentInput: document.getElementById("note-content"),
  mdPreview: document.getElementById("md-preview"),
  tabWrite: document.getElementById("tab-write"),
  tabPreview: document.getElementById("tab-preview"),
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
  elements.contentInput.value = note.content;
  const dateStr = new Date(note.modifiedAt).toLocaleString();
  elements.dateDisplay.textContent = dateStr;

  renderList();
  updatePreview();
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
  setMdMode("write");
  selectNote(newNote.id);
  elements.titleInput.focus();
}

function saveCurrentNote(autoSave = false) {
  if (!activeNoteId) return;

  const title = elements.titleInput.value.trim();
  const content = elements.contentInput.value.trim();
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
        elements.contentInput.value !== activeNote.content
      ) {
        elements.titleInput.value = activeNote.title;
        elements.contentInput.value = activeNote.content;
        elements.dateDisplay.textContent = new Date(activeNote.modifiedAt).toLocaleString();
      }
    }
  } else if (notes.length > 0) {
    selectNote(notes[0].id);
  }

  renderList();
  updatePreview();
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

// ---------- Markdown support ----------

let mdMode = "write";

function sanitizeMdUrl(url) {
  const t = url.trim();
  if (/^(javascript|data|vbscript|file|blob):/i.test(t)) return "#";
  return url;
}

function renderMdInline(text) {
  const chunks = [];
  const stash = (html) => `\u0000${chunks.push(html) - 1}\u0000`;

  let out = escapeHTML(text);

  // Protected first: escaped punctuation (\*, \_, ...) and `code spans`
  out = out.replace(/\\([\\`*_{}[\]()#+\-.!|>~])/g, (m, ch) => stash(ch));
  out = out.replace(/`([^`\n]+?)`/g, (m, code) => stash(`<code>${code}</code>`));

  // Images: ![alt](src "title")
  out = out.replace(/!\[([^\]]*?)\]\((\S+?)(?:\s+"([^"]*?)")?\)/g, (m, alt, src, title) => {
    const t = title ? ` title="${title}"` : "";
    return `<img src="${sanitizeMdUrl(src)}" alt="${alt}"${t}>`;
  });

  // Links: [label](href "title")
  out = out.replace(/\[([^\]]*?)\]\((\S+?)(?:\s+"([^"]*?)")?\)/g, (m, label, href, title) => {
    const t = title ? ` title="${title}"` : "";
    return `<a href="${sanitizeMdUrl(href)}" target="_blank" rel="noopener noreferrer"${t}>${label}</a>`;
  });

  // Autolinks (bare URLs)
  out = out.replace(/(^|[\s(])(https?:\/\/[^\s<>()]+)/g, (m, pre, url) => {
    const trail = url.match(/[.,;:!?)]+$/);
    let clean = url;
    let suffix = "";
    if (trail) {
      clean = url.slice(0, -trail[0].length);
      suffix = trail[0];
    }
    return `${pre}<a href="${sanitizeMdUrl(clean)}" target="_blank" rel="noopener noreferrer">${clean}</a>${suffix}`;
  });

  // Bold + italic, bold, strikethrough, italic
  out = out.replace(/(\*\*\*|___)(.+?)\1/g, "<strong><em>$2</em></strong>");
  out = out.replace(/(\*\*|__)(.+?)\1/g, "<strong>$2</strong>");
  out = out.replace(/~~(.+?)~~/g, "<del>$1</del>");
  out = out.replace(/\*([^*\n]+?)\*/g, "<em>$1</em>");
  out = out.replace(/(^|\W)_([^_\n]+?)_(?=\W|$)/g, "$1<em>$2</em>");

  return out.replace(/\u0000(\d+)\u0000/g, (m, idx) => chunks[+idx]);
}

function splitMdTableRow(line) {
  let t = line.trim();
  if (t.startsWith("|")) t = t.slice(1);
  if (t.endsWith("|")) t = t.slice(0, -1);
  return t.split("|").map((c) => c.trim());
}

function isMdDelimRow(line) {
  const cells = splitMdTableRow(line);
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));
}

function isMdBlockStart(line, nextLine) {
  if (/^\s{0,3}`{3,}/.test(line)) return true;
  if (/^\s{0,3}#{1,6}\s+/.test(line)) return true;
  if (/^\s{0,3}(?:(?:- *){3,}|(?:\* *){3,}|(?:_ *){3,})\s*$/.test(line)) return true;
  if (/^\s{0,3}>/.test(line)) return true;
  if (/^\s{0,3}(?:[*+-]|\d+[.)])\s+/.test(line)) return true;
  if (line.includes("|") && nextLine && isMdDelimRow(nextLine)) return true;
  return false;
}

function buildMdList(lines, start, baseIndent) {
  const first = lines[start].match(/^(\s*)([*+-]|\d+[.)])\s+(.*)$/);
  const ordered = /^\d/.test(first[2]);
  const items = [];
  let k = start;

  while (k < lines.length) {
    const raw = lines[k];
    if (/^\s*$/.test(raw)) {
      // Blank lines are allowed inside a list only if another item follows
      let j = k + 1;
      while (j < lines.length && /^\s*$/.test(lines[j])) j++;
      if (j < lines.length) {
        const nm = lines[j].match(/^(\s*)([*+-]|\d+[.)])\s+(.*)$/);
        if (nm && nm[1].length >= baseIndent && /^\d/.test(nm[2]) === ordered) {
          k = j;
          continue;
        }
      }
      break;
    }
    const m = raw.match(/^(\s*)([*+-]|\d+[.)])\s+(.*)$/);
    if (!m) {
      // Continuation text belonging to the current item
      const indent = raw.match(/^\s*/)[0].length;
      if (items.length > 0 && indent > baseIndent) {
        items[items.length - 1].content.push(raw.trim());
        k++;
        continue;
      }
      break;
    }
    const indent = m[1].length;
    if (indent < baseIndent) break;
    if (indent > baseIndent) {
      if (items.length === 0) break;
      const sub = buildMdList(lines, k, indent);
      items[items.length - 1].children += sub.html;
      k = sub.next;
      continue;
    }
    if (/^\d/.test(m[2]) !== ordered) break;
    items.push({ content: [m[3]], children: "" });
    k++;
  }

  const tag = ordered ? "ol" : "ul";
  const startNum = ordered ? parseInt(first[2], 10) : 1;
  let html = ordered && startNum !== 1 ? `<${tag} start="${startNum}">` : `<${tag}>`;
  for (const item of items) {
    const task = !ordered && item.content[0].match(/^\[([ xX])\]\s+(.*)$/);
    if (task) {
      const checked = task[1].toLowerCase() === "x" ? " checked" : "";
      const rest = item.content.slice(1);
      const inner =
        `<input type="checkbox" disabled${checked}> ${renderMdInline(task[2])}` +
        (rest.length > 0 ? "<br>" + rest.map(renderMdInline).join("<br>") : "");
      html += `<li class="md-task">${inner}${item.children}</li>`;
    } else {
      html += `<li>${item.content.map(renderMdInline).join("<br>")}${item.children}</li>`;
    }
  }
  html += `</${tag}>`;
  return { html, next: k };
}

function renderMarkdown(src) {
  if (!src || !src.trim()) return '<p class="md-empty">Nothing to preview.</p>';
  const lines = src.replace(/\r\n?/g, "\n").replace(/\t/g, "  ").split("\n");
  let html = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }

    // Fenced code block
    const fence = line.match(/^\s{0,3}`{3,}(\w*)\s*$/);
    if (fence) {
      const lang = fence[1];
      i++;
      const buf = [];
      while (i < lines.length && !/^\s{0,3}`{3,}\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // skip closing fence (or end of text)
      html += `<pre><code${lang ? ` class="language-${escapeHTML(lang)}"` : ""}>${escapeHTML(buf.join("\n"))}</code></pre>`;
      continue;
    }

    // ATX heading
    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const level = heading[1].length;
      html += `<h${level}>${renderMdInline(heading[2])}</h${level}>`;
      i++;
      continue;
    }

    // Horizontal rule
    if (/^\s{0,3}(?:(?:- *){3,}|(?:\* *){3,}|(?:_ *){3,})\s*$/.test(line)) {
      html += "<hr>";
      i++;
      continue;
    }

    // Blockquote (supports nesting via recursion)
    if (/^\s{0,3}>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s{0,3}>/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s{0,3}>\s?/, ""));
        i++;
      }
      html += `<blockquote>${renderMarkdown(buf.join("\n"))}</blockquote>`;
      continue;
    }

    // Table
    if (line.includes("|") && i + 1 < lines.length && isMdDelimRow(lines[i + 1])) {
      const header = splitMdTableRow(line);
      const aligns = splitMdTableRow(lines[i + 1]).map((c) => {
        const left = c.startsWith(":");
        const right = c.endsWith(":");
        return left && right ? "center" : right ? "right" : left ? "left" : "";
      });
      i += 2;
      const rows = [];
      while (i < lines.length && !/^\s*$/.test(lines[i]) && lines[i].includes("|")) {
        rows.push(splitMdTableRow(lines[i]));
        i++;
      }
      const width = Math.max(header.length, ...rows.map((r) => r.length));
      const cell = (content, tag, align) =>
        `<${tag}${align ? ` style="text-align:${align}"` : ""}>${renderMdInline(content)}</${tag}>`;
      const pad = (arr) => {
        const copy = arr.slice();
        while (copy.length < width) copy.push("");
        return copy;
      };
      html += "<table><thead><tr>";
      pad(header).forEach((c, idx) => {
        html += cell(c, "th", aligns[idx] || "");
      });
      html += "</tr></thead>";
      if (rows.length > 0) {
        html += "<tbody>";
        for (const row of rows) {
          html += "<tr>";
          pad(row).forEach((c, idx) => {
            html += cell(c, "td", aligns[idx] || "");
          });
          html += "</tr>";
        }
        html += "</tbody>";
      }
      html += "</table>";
      continue;
    }

    // List
    if (/^\s{0,3}(?:[*+-]|\d+[.)])\s+/.test(line)) {
      const baseIndent = line.match(/^\s*/)[0].length;
      const res = buildMdList(lines, i, baseIndent);
      html += res.html;
      i = res.next;
      continue;
    }

    // Paragraph (single newlines become <br>)
    const buf = [line];
    i++;
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !isMdBlockStart(lines[i], lines[i + 1])) {
      buf.push(lines[i]);
      i++;
    }
    html += `<p>${buf.map(renderMdInline).join("<br>")}</p>`;
  }

  return html;
}

function updatePreview() {
  if (!elements.mdPreview) return;
  elements.mdPreview.innerHTML = renderMarkdown(elements.contentInput.value);
}

function setMdMode(mode) {
  mdMode = mode;
  const isPreview = mode === "preview";
  elements.contentInput.style.display = isPreview ? "none" : "";
  elements.mdPreview.style.display = isPreview ? "" : "none";
  elements.tabWrite.classList.toggle("active", !isPreview);
  elements.tabPreview.classList.toggle("active", isPreview);
  if (isPreview) {
    updatePreview();
  } else {
    elements.contentInput.focus();
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
  elements.contentInput.addEventListener("input", scheduleAutoSave);
  elements.contentInput.addEventListener("input", () => {
    if (mdMode === "preview") updatePreview();
  });

  elements.tabWrite.addEventListener("click", () => setMdMode("write"));
  elements.tabPreview.addEventListener("click", () => setMdMode("preview"));

  elements.titleInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      elements.contentInput.focus();
    }
  });

  elements.contentInput.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      clearTimeout(saveTimeout);
      saveTimeout = null;
      saveCurrentNote();
      renderList();
      showNotification("Note saved!");
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
