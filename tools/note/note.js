import { renderMarkdown, getRawText, getCaretOffset, setCaretOffset, stripMarkdown } from "./markdown.js";

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

/** Writes the body to both editors so toggling the setting is lossless. */
function setContent(text) {
  elements.contentInput.value = text;
  if (markdownEnabled) {
    renderMd(text, text.length);
  } else {
    elements.contentMd.textContent = "";
  }
}

/**
 * Re-renders the markdown editor and restores the caret.
 * `caret` is an offset into the markdown source.
 */
function renderMd(text, caret) {
  elements.contentMd.innerHTML = text ? renderMarkdown(text, caret) : "";
  elements.contentMd.classList.toggle("is-empty", !text);
  // Only move the caret when the markdown editor actually holds focus,
  // otherwise switching notes would hijack the selection.
  if (text && document.activeElement === elements.contentMd) {
    setCaretOffset(elements.contentMd, caret);
  }
}

function refreshMd() {
  if (!markdownEnabled) return;
  const caret = getCaretOffset(elements.contentMd);
  renderMd(getRawText(elements.contentMd), caret);
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
    elements.contentMd.classList.toggle("is-empty", true);
  }
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
  let mdRenderQueued = false;
  // Re-rendering fires selectionchange again; this guard stops the loop.
  let mdRestoring = false;
  let mdLastCaret = null;

  /**
   * Re-renders the markdown editor from its current DOM text, keeping the
   * caret where the user left it. Safe to call after any mutation.
   */
  function syncMarkdownEditor() {
    if (!markdownEnabled) return;

    const text = getRawText(elements.contentMd);
    const caret = getCaretOffset(elements.contentMd);

    elements.contentInput.value = text;
    renderMd(text, caret ?? text.length);
    mdLastCaret = caret ?? text.length;
    scheduleAutoSave();
  }

  function queueMarkdownSync() {
    if (mdRenderQueued) return;
    mdRenderQueued = true;
    requestAnimationFrame(() => {
      mdRenderQueued = false;
      if (mdComposing) return;
      syncMarkdownEditor();
    });
  }

  function setupMarkdownEditor() {
    const el = elements.contentMd;

    // Paste as plain text: pasting rich HTML would break the invariant that
    // the DOM only ever contains our own spans, and could inject markup.
    el.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData)?.getData("text/plain") ?? "";
      if (!text) return;

      document.execCommand("insertText", false, text);
      queueMarkdownSync();
    });

    el.addEventListener("compositionstart", () => {
      mdComposing = true;
    });

    el.addEventListener("compositionend", () => {
      mdComposing = false;
      syncMarkdownEditor();
    });

    el.addEventListener("input", () => {
      if (mdComposing) return;
      queueMarkdownSync();
    });

    // Keep the marker visibility in sync with the caret. selectionchange does
    // not bubble, so this has to listen on the document.
    document.addEventListener("selectionchange", () => {
      if (!markdownEnabled || mdComposing || mdRestoring) return;
      if (document.activeElement !== el) return;
      const caret = getCaretOffset(el);
      if (caret === null || caret === mdLastCaret) return;

      mdRestoring = true;
      refreshMd();
      mdLastCaret = caret;
      requestAnimationFrame(() => {
        mdRestoring = false;
      });
    });

    // Focusing by keyboard/tab leaves no caret inside the editor, so typing
    // would go nowhere. Place it at the end of the note instead.
    el.addEventListener("focus", () => {
      if (!markdownEnabled || mdComposing) return;
      if (getCaretOffset(el) !== null) return;
      const text = getRawText(el);
      if (!text) return;
      mdRestoring = true;
      setCaretOffset(el, text.length);
      mdLastCaret = text.length;
      requestAnimationFrame(() => {
        mdRestoring = false;
      });
    });

    el.addEventListener("blur", () => {
      if (!markdownEnabled) return;
      // Drop the caret so all markers collapse back to their rendered form.
      const text = getRawText(el);
      el.innerHTML = renderMarkdown(text, -1);
      el.classList.toggle("is-empty", !text);
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
