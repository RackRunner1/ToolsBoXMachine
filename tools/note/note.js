
let tooltipRecentlyActive = false;
let tooltipResetTimer = null;

const STORAGE_KEY = "tbxm_notes";
const FOLDERS_KEY = "tbxm_note_folders";
const MODAL_KEY = "tbxm_notes_modal_dismissed";
const SKIP_DELETE_KEY = "tbxm_notes_skip_delete_confirm";
const WORD_COUNT_KEY = "tbxm_notes_show_word_count";
const FOLDERS_ENABLED_KEY = "tbxm_notes_folders_enabled";

const FOLDER_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`;
const CHEVRON_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;

const elements = {
  editorEmpty: document.getElementById("editor-empty"),
  editorView: document.getElementById("editor-view"),
  titleInput: document.getElementById("note-title"),
  contentInput: document.getElementById("note-content"),
  dateDisplay: document.getElementById("note-date"),
  deleteBtn: document.getElementById("delete-btn"),
  createBtn: document.getElementById("create-btn"),
  newFolderBtn: document.getElementById("new-folder-btn"),
  notesList: document.getElementById("notes-list"),
  notification: document.getElementById("notification"),
  storageModal: document.getElementById("storage-modal"),
  modalCloseBtn: document.getElementById("modal-close-btn"),
  dontShowCheckbox: document.getElementById("modal-dont-show"),
  contextMenu: document.getElementById("context-menu"),
  ctxCreate: document.getElementById("ctx-create"),
  ctxNewFolder: document.getElementById("ctx-new-folder"),
  ctxNewSubfolder: document.getElementById("ctx-new-subfolder"),
  ctxDuplicate: document.getElementById("ctx-duplicate"),
  ctxMoveSection: document.getElementById("ctx-move-section"),
  ctxRename: document.getElementById("ctx-rename"),
  ctxDelete: document.getElementById("ctx-delete"),
  settingsBtn: document.getElementById("settings-btn"),
  settingsModal: document.getElementById("settings-modal"),
  settingsCloseBtn: document.getElementById("settings-close-btn"),
  skipDeleteConfirm: document.getElementById("setting-skip-delete-confirm"),
  statusBar: document.getElementById("editor-status"),
  wordCountToggle: document.getElementById("setting-show-word-count"),
  foldersToggle: document.getElementById("setting-enable-folders"),
  deleteModal: document.getElementById("delete-modal"),
  deleteModalTitle: document.getElementById("delete-modal-title"),
  deleteModalMessage: document.getElementById("delete-modal-message"),
  deleteModalCancel: document.getElementById("delete-modal-cancel"),
  deleteModalConfirm: document.getElementById("delete-modal-confirm"),
};

let notes = [];
let folders = [];
let activeNoteId = null;
let saveTimeout = null;
let contextTarget = null;
let draggedNoteId = null;
let draggedFolderId = null;
let dropTarget = null;
let renamingFolderId = null;
let skipDeleteConfirm = localStorage.getItem(SKIP_DELETE_KEY) === "true";
let showWordCount = localStorage.getItem(WORD_COUNT_KEY) !== "false";
let foldersEnabled = localStorage.getItem(FOLDERS_ENABLED_KEY) !== "false";

function getContent() {
  return elements.contentInput.value;
}

/** Writes the note body to the plain text editor. */
function setContent(text) {
  elements.contentInput.value = text;
}

function init() {
  loadNotes();
  loadFolders();
  renderList();
  setupEventListeners();
  selectFirstNote();
  elements.skipDeleteConfirm.checked = skipDeleteConfirm;
  elements.wordCountToggle.checked = showWordCount;
  elements.foldersToggle.checked = foldersEnabled;
  applyFoldersState();
  applyWordCountVisibility();
  updateWordCount();
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

function loadFolders() {
  try {
    const saved = localStorage.getItem(FOLDERS_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    folders = Array.isArray(parsed)
      ? parsed.filter((f) => f && typeof f.id === "string" && typeof f.name === "string")
      : [];
  } catch (e) {
    console.error("Failed to load folders", e);
    folders = [];
  }

  const folderIds = new Set(folders.map((f) => f.id));
  folders.forEach((folder) => {
    if (!folder.parentId || !folderIds.has(folder.parentId)) folder.parentId = null;
  });
  folders.forEach((folder) => {
    let cur = folder;
    for (let i = 0; cur && cur.parentId && i <= folders.length; i++) {
      cur = folders.find((f) => f.id === cur.parentId);
      if (cur === folder) {
        folder.parentId = null;
        break;
      }
    }
  });

  notes.forEach((note) => {
    if (note.folderId && !folderIds.has(note.folderId)) note.folderId = null;
  });
}

function saveFoldersToStorage() {
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
}

function getFolder(id) {
  if (!id) return null;
  return folders.find((f) => f.id === id) || null;
}

function sortedFolders() {
  return [...folders].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
  );
}

function childFolders(parentId) {
  return sortedFolders().filter((f) => (f.parentId || null) === (parentId || null));
}

/** True when `folderId` is `ancestorId` itself or sits somewhere below it. */
function isWithin(folderId, ancestorId) {
  let cur = getFolder(folderId);
  for (let i = 0; cur && i <= folders.length; i++) {
    if (cur.id === ancestorId) return true;
    cur = getFolder(cur.parentId);
  }
  return false;
}

function folderPath(folder) {
  const parts = [];
  let cur = folder;
  for (let i = 0; cur && i <= folders.length; i++) {
    parts.unshift(cur.name);
    cur = getFolder(cur.parentId);
  }
  return parts.join(" / ");
}

/** Expands every folder above `folderId` so it is visible in the sidebar. */
function revealFolderChain(folderId) {
  let changed = false;
  let cur = getFolder(folderId);
  for (let i = 0; cur && i <= folders.length; i++) {
    if (cur.collapsed) {
      cur.collapsed = false;
      changed = true;
    }
    cur = getFolder(cur.parentId);
  }
  if (changed) saveFoldersToStorage();
}

/** Expands the folders containing the note so it is visible in the sidebar. */
function revealNote(note) {
  revealFolderChain(note.folderId);
}

function uniqueFolderName(base, parentId) {
  const names = new Set(childFolders(parentId).map((f) => f.name));
  if (!names.has(base)) return base;
  let i = 2;
  while (names.has(`${base} ${i}`)) i++;
  return `${base} ${i}`;
}

/** Shows or hides the folder UI according to the setting, then re-renders the sidebar. */
function applyFoldersState() {
  elements.newFolderBtn.style.display = foldersEnabled ? "" : "none";
  renamingFolderId = null;
  renderList();
}

function renderList() {
  if (renamingFolderId) return;

  const list = elements.notesList;
  const scrollTop = list.scrollTop;
  list.innerHTML = "";

  if (notes.length === 0 && (!foldersEnabled || folders.length === 0)) {
    list.innerHTML = `
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

  if (foldersEnabled) {
    childFolders(null).forEach((folder) => list.appendChild(createFolderGroup(folder)));
  }

  const rootGroup = document.createElement("div");
  rootGroup.className = "root-group";
  notes
    .filter((n) => !foldersEnabled || !n.folderId)
    .forEach((note) => rootGroup.appendChild(createNoteItem(note)));
  list.appendChild(rootGroup);

  list.scrollTop = scrollTop;
}

function createFolderGroup(folder) {
  const group = document.createElement("div");
  group.className = `folder-group${folder.collapsed ? " collapsed" : ""}`;
  group.dataset.folderId = folder.id;

  const directNotes = notes.filter((n) => n.folderId === folder.id);
  const subfolders = childFolders(folder.id);

  const header = document.createElement("div");
  header.className = "folder-header";
  header.setAttribute("role", "button");
  header.setAttribute("aria-expanded", String(!folder.collapsed));
  header.tabIndex = 0;
  header.draggable = true;
  header.innerHTML = `
    <span class="folder-chevron">${CHEVRON_ICON}</span>
    <span class="folder-icon">${FOLDER_ICON}</span>
    <span class="folder-name">${escapeHTML(folder.name)}</span>
    <span class="folder-count">${directNotes.length}</span>
  `;

  header.addEventListener("click", () => toggleFolder(folder.id));
  header.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleFolder(folder.id);
    }
  });
  header.addEventListener("dragstart", (e) => {
    draggedFolderId = folder.id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", folder.id);
    header.classList.add("dragging");
  });
  header.addEventListener("dragend", endDrag);

  const body = document.createElement("div");
  body.className = "folder-children";
  if (subfolders.length === 0 && directNotes.length === 0) {
    body.innerHTML = `<div class="folder-empty">Empty folder</div>`;
  } else {
    subfolders.forEach((sub) => body.appendChild(createFolderGroup(sub)));
    directNotes.forEach((note) => body.appendChild(createNoteItem(note)));
  }

  group.append(header, body);
  return group;
}

function createNoteItem(note) {
  const item = document.createElement("div");
  item.className = `note-item${note.id === activeNoteId ? " active" : ""}`;
  item.dataset.id = note.id;
  item.draggable = true;

  const plain = note.content;
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

  const tooltip = item.querySelector(".note-tooltip");
  let tooltipTimer = null;

  item.addEventListener("click", () => selectNote(note.id));

  item.addEventListener("dragstart", (e) => {
    draggedNoteId = note.id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", note.id);
    item.classList.add("dragging");
    clearTimeout(tooltipTimer);
    tooltip.classList.remove("visible");
  });
  item.addEventListener("dragend", endDrag);

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

  return item;
}

function hideTooltips() {
  document.querySelectorAll(".note-tooltip.visible").forEach((t) => t.classList.remove("visible"));
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
  updateWordCount();
  applyWordCountVisibility();
  const dateStr = new Date(note.modifiedAt).toLocaleString();
  elements.dateDisplay.textContent = dateStr;

  revealNote(note);
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
  applyWordCountVisibility();
}

/** Creates a note in `folderId`, or at the top level when no folder is given. */
function createNote(folderId = null) {
  const targetFolderId = getFolder(folderId) ? folderId : null;

  saveCurrentNote();
  const now = Date.now();
  const newNote = {
    id: crypto.randomUUID ? crypto.randomUUID() : `note_${now}`,
    title: "",
    content: "",
    folderId: targetFolderId,
    createdAt: now,
    modifiedAt: now,
  };

  notes.unshift(newNote);
  saveNotesToStorage();
  selectNote(newNote.id);
  elements.titleInput.focus();
}

/** Creates a folder at the top level, or inside `parentId` when given. */
function createFolder(parentId = null) {
  if (!foldersEnabled) return;
  const parent = getFolder(parentId);
  const folder = {
    id: crypto.randomUUID ? crypto.randomUUID() : `folder_${Date.now()}`,
    name: uniqueFolderName("New folder", parent ? parent.id : null),
    parentId: parent ? parent.id : null,
    collapsed: false,
    createdAt: Date.now(),
  };
  folders.push(folder);
  if (parent) revealFolderChain(parent.id);
  saveFoldersToStorage();
  renderList();
  startRename(folder.id);
}

function toggleFolder(id) {
  if (renamingFolderId) return;
  const folder = getFolder(id);
  if (!folder) return;
  folder.collapsed = !folder.collapsed;
  saveFoldersToStorage();
  renderList();
}

/** Replaces the folder name with an inline input. Enter/blur saves, Escape cancels. */
function startRename(folderId) {
  const folder = getFolder(folderId);
  const group = elements.notesList.querySelector(`.folder-group[data-folder-id="${CSS.escape(folderId)}"]`);
  if (!folder || !group) return;

  const nameEl = group.querySelector(".folder-name");
  const input = document.createElement("input");
  input.type = "text";
  input.className = "folder-rename-input";
  input.value = folder.name;
  input.maxLength = 60;
  input.setAttribute("aria-label", "Folder name");
  nameEl.replaceWith(input);

  renamingFolderId = folderId;
  input.focus();
  input.select();

  let done = false;
  const finish = (save) => {
    if (done) return;
    done = true;
    renamingFolderId = null;
    if (save) {
      const name = input.value.trim();
      if (name) folder.name = name;
      saveFoldersToStorage();
    }
    renderList();
  };

  input.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      finish(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      finish(false);
    }
  });
  input.addEventListener("click", (e) => e.stopPropagation());
  input.addEventListener("blur", () => finish(true));
}

function requestDeleteFolder(folderId) {
  const folder = getFolder(folderId);
  if (!folder) return;
  const noteCount = notes.filter((n) => n.folderId === folderId).length;
  const subCount = folders.filter((f) => f.parentId === folderId).length;
  const doDelete = () => deleteFolder(folderId);

  if (noteCount === 0 && subCount === 0) {
    doDelete();
    return;
  }

  const parts = [];
  if (noteCount > 0) parts.push(`${noteCount} ${noteCount === 1 ? "note" : "notes"}`);
  if (subCount > 0) parts.push(`${subCount} ${subCount === 1 ? "subfolder" : "subfolders"}`);
  showDeleteModal(doDelete, {
    title: "Delete folder",
    message: `Delete "${folder.name}"? Its ${parts.join(" and ")} will be kept and moved up one level.`,
  });
}

/** Writes the active note's pending edits only, without touching untouched notes. */
function flushPendingSave() {
  if (saveTimeout === null) return;
  clearTimeout(saveTimeout);
  saveTimeout = null;
  saveCurrentNote(true);
}

function deleteFolder(folderId) {
  flushPendingSave();

  const folder = getFolder(folderId);
  if (!folder) return;
  const parentId = folder.parentId || null;

  notes.forEach((n) => {
    if (n.folderId === folderId) n.folderId = parentId;
  });
  folders.forEach((f) => {
    if (f.parentId === folderId) f.parentId = parentId;
  });
  folders = folders.filter((f) => f.id !== folderId);
  saveNotesToStorage();
  saveFoldersToStorage();
  renderList();
  showNotification("Folder deleted");
}

function moveNoteToFolder(noteId, folderId) {
  const targetId = getFolder(folderId) ? folderId : null;

  flushPendingSave();

  const note = notes.find((n) => n.id === noteId);
  if (!note || (note.folderId || null) === targetId) {
    renderList();
    return;
  }

  note.folderId = targetId;
  saveNotesToStorage();
  revealNote(note);
  renderList();

  const folder = getFolder(targetId);
  showNotification(folder ? `Moved to "${folder.name}"` : "Moved out of folder");
}

/** Moves a folder under `parentId` (or to the top level when null). */
function moveFolder(folderId, parentId) {
  const folder = getFolder(folderId);
  if (!folder) return;
  const targetId = getFolder(parentId) ? parentId : null;

  if (targetId && isWithin(targetId, folderId)) {
    showNotification("A folder can't be moved into itself");
    renderList();
    return;
  }
  if ((folder.parentId || null) === targetId) {
    renderList();
    return;
  }

  folder.parentId = targetId;
  revealFolderChain(targetId);
  saveFoldersToStorage();
  renderList();

  const target = getFolder(targetId);
  showNotification(target ? `Moved to "${target.name}"` : "Moved to top level");
}

function setDropTarget(el) {
  if (dropTarget === el) return;
  if (dropTarget) dropTarget.classList.remove("drop-target");
  dropTarget = el;
  if (dropTarget) dropTarget.classList.add("drop-target");
}

function endDrag() {
  draggedNoteId = null;
  draggedFolderId = null;
  setDropTarget(null);
  document.querySelectorAll(".dragging").forEach((el) => el.classList.remove("dragging"));
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

/** Updates the word/character/reading-time stats shown under the editor. */
function updateWordCount() {
  const text = getContent();
  const words = (text.match(/\S+/g) || []).length;
  const minutes = words > 0 ? Math.max(1, Math.round(words / 200)) : 0;
  elements.statusBar.textContent =
    `${words.toLocaleString()} words · ${text.length.toLocaleString()} characters · ${minutes} min read`;
}

function applyWordCountVisibility() {
  elements.statusBar.style.display = activeNoteId && showWordCount ? "" : "none";
}

function handleExternalSync() {
  const hadPendingSave = saveTimeout !== null;

  loadNotes();
  loadFolders();

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
        updateWordCount();
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
  elements.createBtn.addEventListener("click", () => createNote());
  elements.newFolderBtn.addEventListener("click", () => createFolder());
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
  elements.contentInput.addEventListener("input", updateWordCount);

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

  elements.notesList.addEventListener("dragover", (e) => {
    if (!foldersEnabled || (!draggedNoteId && !draggedFolderId)) return;
    const group = e.target.closest(".folder-group");
    const groupId = group ? group.dataset.folderId : null;
    if (draggedFolderId && groupId && isWithin(groupId, draggedFolderId)) {
      setDropTarget(null);
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(group || elements.notesList.querySelector(".root-group"));
  });

  elements.notesList.addEventListener("dragleave", (e) => {
    if (!elements.notesList.contains(e.relatedTarget)) setDropTarget(null);
  });

  elements.notesList.addEventListener("drop", (e) => {
    if (!foldersEnabled || (!draggedNoteId && !draggedFolderId)) return;
    e.preventDefault();
    const group = e.target.closest(".folder-group");
    const groupId = group ? group.dataset.folderId : null;
    const noteId = draggedNoteId;
    const folderId = draggedFolderId;
    endDrag();
    if (folderId) {
      moveFolder(folderId, groupId);
    } else {
      moveNoteToFolder(noteId, groupId);
    }
  });

  elements.notesList.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    hideTooltips();
    const noteEl = e.target.closest(".note-item");
    const folderEl = e.target.closest(".folder-group");
    if (noteEl) {
      contextTarget = { type: "note", id: noteEl.dataset.id };
    } else if (folderEl) {
      contextTarget = { type: "folder", id: folderEl.dataset.folderId };
    } else {
      contextTarget = { type: "root", id: null };
    }
    showContextMenu(e.clientX, e.clientY, contextTarget.type);
  });

  document.addEventListener("click", hideContextMenu);
  document.addEventListener("contextmenu", (e) => {
    if (!e.target.closest(".notes-sidebar")) {
      hideContextMenu();
    }
  });

  elements.ctxCreate.addEventListener("click", () => {
    const folderId = contextTarget && contextTarget.type === "folder" ? contextTarget.id : null;
    hideContextMenu();
    createNote(folderId);
  });

  elements.ctxNewFolder.addEventListener("click", () => {
    hideContextMenu();
    createFolder();
  });

  elements.ctxNewSubfolder.addEventListener("click", () => {
    const parentId = contextTarget && contextTarget.type === "folder" ? contextTarget.id : null;
    hideContextMenu();
    createFolder(parentId);
  });

  elements.ctxRename.addEventListener("click", () => {
    if (!contextTarget || contextTarget.type !== "folder") return;
    const folderId = contextTarget.id;
    hideContextMenu();
    startRename(folderId);
  });

  elements.ctxDuplicate.addEventListener("click", () => {
    if (!contextTarget || contextTarget.type !== "note") return;
    const sourceId = contextTarget.id;
    hideContextMenu();
    const source = notes.find((n) => n.id === sourceId);
    if (!source) return;
    const now = Date.now();
    const dup = {
      id: crypto.randomUUID ? crypto.randomUUID() : `note_${now}`,
      title: source.title + " (copy)",
      content: source.content,
      folderId: source.folderId || null,
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

  elements.ctxMoveSection.addEventListener("click", (e) => {
    const item = e.target.closest("[data-folder-id]");
    if (!item || !contextTarget) return;
    const target = contextTarget;
    const destinationId = item.dataset.folderId || null;
    hideContextMenu();
    if (target.type === "note") {
      moveNoteToFolder(target.id, destinationId);
    } else if (target.type === "folder") {
      moveFolder(target.id, destinationId);
    }
  });

  elements.ctxDelete.addEventListener("click", () => {
    if (!contextTarget) return;
    const target = contextTarget;
    hideContextMenu();

    if (target.type === "folder") {
      requestDeleteFolder(target.id);
      return;
    }
    if (target.type !== "note") return;

    const targetId = target.id;
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

  elements.wordCountToggle.addEventListener("change", () => {
    showWordCount = elements.wordCountToggle.checked;
    localStorage.setItem(WORD_COUNT_KEY, showWordCount);
    applyWordCountVisibility();
  });

  elements.foldersToggle.addEventListener("change", () => {
    foldersEnabled = elements.foldersToggle.checked;
    localStorage.setItem(FOLDERS_ENABLED_KEY, foldersEnabled);
    applyFoldersState();
  });

  window.addEventListener("storage", (e) => {
    if (e.key !== null && e.key !== STORAGE_KEY && e.key !== FOLDERS_KEY) return;
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

function showDeleteModal(
  callback,
  {
    title = "Delete note",
    message = "Are you sure you want to delete this note? This action cannot be undone.",
  } = {}
) {
  deleteModalCallback = callback;
  elements.deleteModalTitle.textContent = title;
  elements.deleteModalMessage.textContent = message;
  elements.deleteModal.classList.add("show");
}

function hideDeleteModal() {
  elements.deleteModal.classList.remove("show");
  deleteModalCallback = null;
}

function renderMoveSection(target) {
  const section = elements.ctxMoveSection;
  const note = target && target.type === "note" ? notes.find((n) => n.id === target.id) : null;
  const folder = target && target.type === "folder" ? getFolder(target.id) : null;

  if ((!note && !folder) || !foldersEnabled || folders.length === 0) {
    section.style.display = "none";
    section.innerHTML = "";
    return;
  }

  const currentParentId = note ? note.folderId || null : folder.parentId || null;
  const options = [];
  if (currentParentId) options.push({ id: "", label: folder ? "Top level" : "No folder" });
  [...folders]
    .filter((f) => f.id !== currentParentId)
    .filter((f) => !folder || !isWithin(f.id, folder.id))
    .sort((a, b) =>
      folderPath(a).localeCompare(folderPath(b), undefined, { numeric: true, sensitivity: "base" })
    )
    .forEach((f) => options.push({ id: f.id, label: folderPath(f) }));

  if (options.length === 0) {
    section.style.display = "none";
    section.innerHTML = "";
    return;
  }

  section.innerHTML =
    `<div class="context-menu-label">Move to</div>` +
    options
      .map((o) => `<div class="context-menu-item" data-folder-id="${o.id}">${o.id ? FOLDER_ICON : ""}${escapeHTML(o.label)}</div>`)
      .join("");
  section.style.display = "block";
}

function showContextMenu(x, y, type) {
  const isRoot = type === "root";
  const isFolder = type === "folder";
  const isNote = type === "note";

  elements.ctxCreate.style.display = isNote ? "none" : "flex";
  elements.ctxNewFolder.style.display = isRoot && foldersEnabled ? "flex" : "none";
  elements.ctxNewSubfolder.style.display = isFolder && foldersEnabled ? "flex" : "none";
  elements.ctxDuplicate.style.display = isNote ? "flex" : "none";
  elements.ctxRename.style.display = isFolder ? "flex" : "none";
  elements.ctxDelete.style.display = isNote || isFolder ? "flex" : "none";
  renderMoveSection(isRoot ? null : contextTarget);

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
  contextTarget = null;
}

document.addEventListener("DOMContentLoaded", init);
