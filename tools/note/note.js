let tooltipRecentlyActive = false;
let tooltipResetTimer = null;

const STORAGE_KEY = "tbxm_notes";
const MODAL_KEY = "tbxm_notes_modal_dismissed";

const elements = {
  editorEmpty: document.getElementById("editor-empty"),
  editorView: document.getElementById("editor-view"),
  titleInput: document.getElementById("note-title"),
  contentInput: document.getElementById("note-content"),
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
  deleteModal: document.getElementById("delete-modal"),
  deleteModalCancel: document.getElementById("delete-modal-cancel"),
  deleteModalConfirm: document.getElementById("delete-modal-confirm"),
};

let notes = [];
let activeNoteId = null;
let saveTimeout = null;
let contextTargetNoteId = null;

function init() {
  loadNotes();
  renderList();
  setupEventListeners();
  selectFirstNote();
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

  saveCurrentNote();
  activeNoteId = id;

  elements.editorEmpty.style.display = "none";
  elements.editorView.style.display = "flex";

  elements.titleInput.value = note.title;
  elements.contentInput.value = note.content;
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
    saveCurrentNote(true);
    renderList();
    elements.dateDisplay.textContent = new Date().toLocaleString();
  }, 400);
}

function deleteActiveNote() {
  if (!activeNoteId) return;
  showDeleteModal(() => {
    notes = notes.filter((n) => n.id !== activeNoteId);
    saveNotesToStorage();
    if (notes.length > 0) {
      selectNote(notes[0].id);
    } else {
      showEditorEmpty();
    }
    renderList();
    showNotification("Note deleted");
  });
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

  elements.titleInput.addEventListener("input", scheduleAutoSave);
  elements.contentInput.addEventListener("input", scheduleAutoSave);

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
    showDeleteModal(() => {
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
    });
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
