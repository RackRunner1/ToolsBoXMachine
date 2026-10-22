import { renderMarkdown, htmlSkeleton, applyVisibility, getRawText, getCaretOffset, setCaretOffset, stripMarkdown, moveCaretOutOfHiddenMarkers, RE_LIST } from "./markdown.js?v=3";

let tooltipRecentlyActive = false;
let tooltipResetTimer = null;

const STORAGE_KEY = "tbxm_notes";
const MODAL_KEY = "tbxm_notes_modal_dismissed";
const SKIP_DELETE_KEY = "tbxm_notes_skip_delete_confirm";
const MARKDOWN_KEY = "tbxm_notes_markdown";

const elements = {
  editorEmpty: document.getElementById("editor-empty"),
  editorView: document.getElementById("editor-view"),
  titleInput: document.getElementById("note-title"),
  contentInput: document.getElementById("note-content"),
  contentMd: document.getElementById("note-content-md"),
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
  markdownToggle: document.getElementById("setting-markdown"),
  deleteModal: document.getElementById("delete-modal"),
  deleteModalCancel: document.getElementById("delete-modal-cancel"),
  deleteModalConfirm: document.getElementById("delete-modal-confirm"),
};

let notes = [];
let activeNoteId = null;
let saveTimeout = null;
let contextTargetNoteId = null;
let skipDeleteConfirm = localStorage.getItem(SKIP_DELETE_KEY) === "true";
let markdownEnabled = localStorage.getItem(MARKDOWN_KEY) === "true";

/* ------------------------------------------------------- Markdown (BETA) --- */

/** Which element currently holds the note body, depending on the setting. */
function contentEl() {
  return markdownEnabled ? elements.contentMd : elements.contentInput;
}

function getContent() {
  return markdownEnabled ? getRawText(elements.contentMd) : elements.contentInput.value;
}

/** Source text currently rendered in the contenteditable (last renderMd). */
let mdRenderedSource = "";
/** Caret offset, in source coordinates, of the last placed selection. */
let lastPlacedCaret = 0;
/** Structural fingerprint (tags/classes only) of the last render. Plain
    typing never changes it, so those keystrokes skip the re-render entirely
    and the browser caret — not us — owns the selection. */
let mdRenderedLayout = "";

/* Own history: hand-driven DOM re-renders break the browser's native undo
   stack, so the editor tracks its own snapshots (source + caret). */
const mdUndoStack = [];
const mdRedoStack = [];
const MD_HISTORY_LIMIT = 300;

/** Writes the body to both editors so toggling the setting is lossless. */
function setContent(text) {
  elements.contentInput.value = text;

  if (!markdownEnabled) {
    elements.contentMd.textContent = "";
    return;
  }

  // While the user is typing inside the markdown editor, keep the caret
  // where it is across the re-render; otherwise leave the selection alone
  // and collapse every marker to its rendered form.
  const focused = document.activeElement === elements.contentMd;
  const caret = focused ? getCaretOffset(elements.contentMd) : null;
  renderMd(text, caret ?? text.length, caret !== null);
  if (caret === null) applyVisibility(elements.contentMd, null);
}

/**
 * Renders the note body into the markdown editor.
 * When `place` is true, the caret is moved back to `caret` (a source offset)
 * right after the render, with the markers around it revealed first — that
 * ordering is what keeps the caret from collapsing into hidden markers.
 */
function renderMd(text, caret, place = false, html = null) {
  // Empty content leaves the element truly empty, which :empty uses to show
  // the placeholder. `html` lets a caller reuse an already-computed render.
  const rendered = html ?? (text ? renderMarkdown(text) : "");
  elements.contentMd.innerHTML = rendered;
  mdRenderedLayout = htmlSkeleton(rendered);
  elements.contentInput.value = text;
  mdRenderedSource = text;

  if (!markdownEnabled) return;

  if (!text) {
    applyVisibility(elements.contentMd, null);
    return;
  }

  if (place && caret !== null && caret !== undefined) {
    // Reveal first, place second: a caret dropped inside a still-hidden
    // marker is lost to the browser (display:none anchors collapse), and no
    // amount of post-processing puts it back where it belongs.
    applyVisibility(elements.contentMd, caret);
    setCaretOffset(elements.contentMd, caret);
    // Safety net for the zero-width glyph spans, which are never revealable.
    moveCaretOutOfHiddenMarkers(elements.contentMd);
    lastPlacedCaret = caret;
  } else {
    applyVisibility(elements.contentMd, null);
  }
}

function applyMarkdownMode() {
  // Read the body from the editor that is CURRENTLY active, before the
  // setting flips and switches which one that is.
  const text = getContent();

  elements.contentInput.hidden = markdownEnabled;
  elements.contentMd.hidden = !markdownEnabled;

  if (markdownEnabled) {
    renderMd(text, text.length);
  } else {
    elements.contentInput.value = text;
    elements.contentMd.textContent = "";
    mdRenderedSource = "";
    mdRenderedLayout = "";
  }
}

/**
 * Copies the data-* source offsets from a fresh canonical render onto the
 * live DOM without touching a single character of text. Used by the
 * live-preview pass when typing did not change the structure: the DOM (and
 * the browser's caret inside it) stays exactly where it is, while the hidden
 * offsets stay in sync with the source. Returns false when the two trees do
 * not match node-for-node, in which case the caller must do a full re-render.
 */
function syncMarkerOffsets(el, html) {
  try {
    const probe = document.createElement("template");
    probe.innerHTML = html;
    const SEL = ".md-line, .md-mark, .md-mark-swap, [data-o]";
    const live = el.querySelectorAll(SEL);
    const fresh = probe.content.querySelectorAll(SEL);
    if (live.length !== fresh.length) return false;

    // Transient states set by applyVisibility must not count as differences.
    const cls = (node) =>
      node.className
        .split(/\s+/)
        .filter((c) => c && c !== "is-active" && c !== "is-touched")
        .sort()
        .join(" ");

    for (let k = 0; k < live.length; k++) {
      if (cls(live[k]) !== cls(fresh[k])) return false;
      for (const key of ["o", "from", "to", "s", "e"]) {
        if (fresh[k].dataset[key] !== undefined) live[k].dataset[key] = fresh[k].dataset[key];
      }
    }
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------- undo / redo --- */

function pushUndo(source, caret) {
  // Collapse no-op pushes (visibility-only passes push the same source).
  const last = mdUndoStack[mdUndoStack.length - 1];
  if (last && last.source === source) {
    if (caret !== undefined && caret !== null) last.caret = caret;
    return;
  }
  mdUndoStack.push({ source, caret: caret ?? 0 });
  if (mdUndoStack.length > MD_HISTORY_LIMIT) mdUndoStack.shift();
  mdRedoStack.length = 0;
}

/** Rewinds to a history state, keeping the other stack for the opposite key. */
function travelMarkdown(state) {
  const current = {
    source: mdRenderedSource,
    caret: getCaretOffset(elements.contentMd) ?? lastPlacedCaret,
  };
  renderMd(state.source, state.caret, true);
  scheduleAutoSave();
  return current;
}

function undoMarkdown() {
  if (!markdownEnabled) return false;
  const state = mdUndoStack.pop();
  if (!state) return false;
  mdRedoStack.push(travelMarkdown(state));
  return true;
}

function redoMarkdown() {
  if (!markdownEnabled) return false;
  const state = mdRedoStack.pop();
  if (!state) return false;
  // Re-push the current state without wiping the redo stack (pushUndo
  // clears it, which would eat every remaining redo entry).
  mdUndoStack.push(travelMarkdown(state));
  if (mdUndoStack.length > MD_HISTORY_LIMIT) mdUndoStack.shift();
  return true;
}

function init() {
  loadNotes();
  renderList();
  setupEventListeners();
  applyMarkdownMode();
  selectFirstNote();
  elements.skipDeleteConfirm.checked = skipDeleteConfirm;
  elements.markdownToggle.checked = markdownEnabled;
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

    const plain = markdownEnabled ? stripMarkdown(note.content) : note.content;
    const preview = plain
      ? plain.substring(0, 120).replace(/\n/g, " ")
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
  setContent(note.content);
  const dateStr = new Date(note.modifiedAt).toLocaleString();
  elements.dateDisplay.textContent = dateStr;

  renderList();
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
  selectNote(newNote.id);
  elements.titleInput.focus();
}

function saveCurrentNote(autoSave = false) {
  if (!activeNoteId) return;

  const title = elements.titleInput.value.trim();
  const content = getContent().trim();
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
        getContent() !== activeNote.content
      ) {
        elements.titleInput.value = activeNote.title;
        setContent(activeNote.content);
        elements.dateDisplay.textContent = new Date(activeNote.modifiedAt).toLocaleString();
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

  setupMarkdownEditor();

  elements.titleInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      contentEl().focus();
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

  elements.contentMd.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      clearTimeout(saveTimeout);
      saveTimeout = null;
      saveCurrentNote();
      renderList();
      showNotification("Note saved!");
    }
  });

  /* ------------------------------------------------ Markdown (BETA) --- */

  // Set while an IME composition is in progress. Re-rendering the DOM during
  // composition would cancel the in-flight input, so we defer instead.
  let mdComposing = false;
  let mdRefreshQueued = false;

  /** Reveals the markers around the caret, without touching the DOM structure. */
  function updateMdVisibility() {
    if (!markdownEnabled) return;
    const caret = getCaretOffset(elements.contentMd);
    if (caret !== null) lastPlacedCaret = caret;
    applyVisibility(elements.contentMd, caret);
  }

  /**
   * Live preview pass: reads the post-keystroke source from the DOM and
   * re-renders only when the parse actually changed the structure. Native
   * typing is what mutates the DOM (so the browser owns caret motion and
   * IME); the flat-DOM renderer + exact-offset caret restore keep the
   * selection rock solid across the few re-renders that remain.
   */
  function refreshMarkdown() {
    if (!markdownEnabled) return;
    const el = elements.contentMd;
    const text = getRawText(el);
    const focused = document.activeElement === el;
    const caret = focused ? getCaretOffset(el) : null;

    if (text === mdRenderedSource) {
      updateMdVisibility();
      return;
    }

    pushUndo(mdRenderedSource, lastPlacedCaret);

    // Re-render only when the new parse actually changed the editor's
    // STRUCTURE (a span or marker added/removed). Typing inside an unchanged
    // line — the overwhelmingly common case — never re-renders: the DOM and
    // the browser's selection are left alone and only the hidden data-*
    // offsets get synced. Fighting the caret on every keystroke is what made
    // it jump back to previous lines mid-word.
    const html = text ? renderMarkdown(text) : "";
    if (htmlSkeleton(html) === mdRenderedLayout && syncMarkerOffsets(el, html)) {
      if (caret !== null) lastPlacedCaret = caret;
      elements.contentInput.value = text;
      mdRenderedSource = text;
      applyVisibility(el, caret);
      scheduleAutoSave();
      return;
    }

    renderMd(text, caret ?? text.length, caret !== null, html);
    scheduleAutoSave();
  }

  function queueMarkdownRefresh() {
    if (mdRefreshQueued) return;
    mdRefreshQueued = true;
    requestAnimationFrame(() => {
      mdRefreshQueued = false;
      if (mdComposing) return;
      refreshMarkdown();
    });
  }

  /**
   * Applies a structured edit (Enter, paste): rewrites the source around the
   * caret and re-renders from scratch, since the DOM itself cannot produce
   * the required result. `mutate(text, caret)` returns { next, nextCaret }.
   */
  function applyMarkdownEdit(mutate) {
    const el = elements.contentMd;
    const text = getRawText(el);
    const caret = getCaretOffset(el) ?? text.length;
    const { next, nextCaret } = mutate(text, caret);

    pushUndo(text, caret);
    renderMd(next, nextCaret, true);
    scheduleAutoSave();
  }

  function setupMarkdownEditor() {
    const el = elements.contentMd;

    // Enter and Shift+Enter: a contenteditable would otherwise insert its own
    // <div>/<br> structure, which breaks the "one <br> per source newline"
    // invariant and makes the caret jump. We insert the newline ourselves,
    // with Obsidian's list semantics: an item continues, an empty item exits
    // the list (its marker collapses away).
    el.addEventListener("keydown", (e) => {
      if (!markdownEnabled || mdComposing || e.isComposing) return;
      if (e.key !== "Enter" || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();

      const src = getRawText(el);
      const caret = getCaretOffset(el) ?? src.length;

      const lineStart = src.lastIndexOf("\n", caret - 1) + 1;
      const nlAfter = src.indexOf("\n", caret);
      const lineEnd = nlAfter === -1 ? src.length : nlAfter;

      // Shift+Enter is a soft break: never continue a list.
      if (e.shiftKey) {
        applyMarkdownEdit(() => ({
          next: src.slice(0, caret) + "\n" + src.slice(caret),
          nextCaret: caret + 1,
        }));
        return;
      }

      const li = src.slice(lineStart, lineEnd).match(RE_LIST);
      if (!li) {
        applyMarkdownEdit(() => ({
          next: src.slice(0, caret) + "\n" + src.slice(caret),
          nextCaret: caret + 1,
        }));
        return;
      }

      const [, indent, bullet, gap, box, rest] = li;

      // Enter on an empty item exits the list: the marker collapses away and
      // the caret lands on the now-blank line.
      if (rest === "") {
        applyMarkdownEdit(() => ({
          next: src.slice(0, lineStart) + "\n" + src.slice(lineEnd),
          nextCaret: lineStart + 1,
        }));
        return;
      }

      // Continue the list: same indent, same marker (incremented for ordered
      // lists), same task box.
      const ordered = /\d/.test(bullet);
      let nextBullet = bullet;
      if (ordered) {
        const num = parseInt(bullet, 10);
        nextBullet = String(num + 1) + bullet.slice(String(num).length);
      }
      const cont = indent + nextBullet + gap + (box ? box + " " : "");

      applyMarkdownEdit(() => ({
        next: src.slice(0, caret) + "\n" + cont + src.slice(caret),
        nextCaret: caret + 1 + cont.length,
      }));
    });

    // Our own history: re-rendering per keystroke voids the browser's native
    // contenteditable undo stack, so Ctrl+Z / Ctrl+Y drive ours instead.
    el.addEventListener("keydown", (e) => {
      if (!markdownEnabled || mdComposing || e.isComposing) return;
      if (!((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z" || e.key === "y" || e.key === "Y"))) return;
      e.preventDefault();
      if (e.key === "y" || e.key === "Y" || e.shiftKey) redoMarkdown();
      else undoMarkdown();
    });

    // The browser also delivers undo through beforeinput; cancel those or it
    // would rewind the DOM into an inconsistent state behind our back.
    el.addEventListener("beforeinput", (e) => {
      if (!markdownEnabled) return;
      if (e.inputType === "historyUndo") {
        e.preventDefault();
        undoMarkdown();
      } else if (e.inputType === "historyRedo") {
        e.preventDefault();
        redoMarkdown();
      }
    });

    // Paste as plain text, spliced straight into the source: rich HTML would
    // break the DOM invariant, and multi-line text does not survive a
    // contenteditable insertion as "one <br> per newline" anyway.
    el.addEventListener("paste", (e) => {
      if (!markdownEnabled) return;
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData)?.getData("text/plain") ?? "";
      if (!text) return;
      const normalized = text.replace(/\r\n?/g, "\n");
      applyMarkdownEdit((src, caret) => ({
        next: src.slice(0, caret) + normalized + src.slice(caret),
        nextCaret: caret + normalized.length,
      }));
    });

    // Dragging text (inside or from outside) fights the flat-DOM invariant.
    el.addEventListener("dragover", (e) => e.preventDefault());
    el.addEventListener("drop", (e) => e.preventDefault());

    el.addEventListener("compositionstart", () => {
      mdComposing = true;
    });

    el.addEventListener("compositionend", () => {
      mdComposing = false;
      queueMarkdownRefresh();
    });

    el.addEventListener("input", () => {
      if (mdComposing) return;
      queueMarkdownRefresh();
    });

    // Keep marker visibility in sync with the caret. This only toggles
    // classes, so the selection is never disturbed. selectionchange does not
    // bubble, so this has to listen on the document.
    document.addEventListener("selectionchange", () => {
      if (!markdownEnabled || mdComposing) return;
      if (document.activeElement !== el) return;
      updateMdVisibility();
    });

    // Focusing by keyboard/tab leaves no caret inside the editor, so typing
    // would go nowhere. Place it at the end of the note instead — but never
    // during a mouse click: focus fires mid-click, before the browser has
    // moved the caret to the clicked spot, and rewriting the selection there
    // makes Chrome finish the click as a drag-selection instead of a plain
    // caret move. During a mouse focus the click itself does the placing.
    let mdMouseFocus = false;
    el.addEventListener("mousedown", () => {
      mdMouseFocus = true;
    });
    el.addEventListener("focus", () => {
      if (!markdownEnabled || mdComposing) return;
      if (mdMouseFocus) {
        mdMouseFocus = false;
        updateMdVisibility();
        return;
      }
      if (getCaretOffset(el) !== null) {
        updateMdVisibility();
        return;
      }
      const text = getRawText(el);
      if (text) {
        setCaretOffset(el, text.length);
        lastPlacedCaret = text.length;
      }
      updateMdVisibility();
    });

    el.addEventListener("blur", () => {
      if (!markdownEnabled) return;
      // Collapse every marker back to its rendered form.
      applyVisibility(el, null);
    });
  }

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

  elements.markdownToggle.addEventListener("change", () => {
    // Persist the current text while the previous editor is still the active
    // one, then switch modes.
    saveCurrentNote(true);

    markdownEnabled = elements.markdownToggle.checked;
    localStorage.setItem(MARKDOWN_KEY, String(markdownEnabled));

    applyMarkdownMode();
    renderList();

    if (markdownEnabled) {
      showNotification("Markdown enabled (BETA)");
      elements.contentMd.focus();
    } else {
      elements.contentInput.focus();
    }
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
