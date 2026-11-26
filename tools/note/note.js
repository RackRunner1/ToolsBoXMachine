let tooltipRecentlyActive = false;
let tooltipResetTimer = null;

const STORAGE_KEY = "tbxm_notes";
const FOLDERS_KEY = "tbxm_note_folders";
const MODAL_KEY = "tbxm_notes_modal_dismissed";
const SKIP_DELETE_KEY = "tbxm_notes_skip_delete_confirm";
const WORD_COUNT_KEY = "tbxm_notes_show_word_count";
const FOLDERS_ENABLED_KEY = "tbxm_notes_folders_enabled";
const INCOGNITO_KEY = "tbxm_notes_incognito";
const INCOGNITO_SESSION_COOKIE = "tbxm_notes_session";
const TBXM_MAGIC = "TBXM1";
const TBXM_ENCRYPTED_MAGIC = "TBXM2";
const PRIVACY_KEY = "tbxm_notes_privacy";
const PRIVACY_CHECK_TEXT = "tbxm-notes-check";
const PBKDF2_ITERATIONS = 600000;

const FOLDER_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`;
const CHEVRON_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;

const elements = {
  editorEmpty: document.getElementById("editor-empty"),
  editorEmptyText: document.getElementById("editor-empty-text"),
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
  ctxMoveTrigger: document.getElementById("ctx-move-trigger"),
  ctxMoveSubmenu: document.getElementById("ctx-move-submenu"),
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
  incognitoToggle: document.getElementById("setting-incognito-mode"),
  incognitoModal: document.getElementById("incognito-modal"),
  incognitoModalCancel: document.getElementById("incognito-modal-cancel"),
  incognitoModalConfirm: document.getElementById("incognito-modal-confirm"),
  deleteAllNotesBtn: document.getElementById("delete-all-notes-btn"),
  deleteAllNotesAndSettingsBtn: document.getElementById("delete-all-notes-and-settings-btn"),
  resetAllSettingsBtn: document.getElementById("reset-all-settings-btn"),
  importFileBtn: document.getElementById("import-file-btn"),
  importFileInput: document.getElementById("import-file-input"),
  exportOpenBtn: document.getElementById("export-open-btn"),
  exportModal: document.getElementById("export-modal"),
  exportModalCancel: document.getElementById("export-modal-cancel"),
  exportModalNext: document.getElementById("export-modal-next"),
  exportModalBack: document.getElementById("export-modal-back"),
  exportModalConfirm: document.getElementById("export-modal-confirm"),
  exportSteps: document.querySelectorAll(".export-step"),
  exportStepIndicator: document.querySelector(".export-step-indicator"),
  exportScopeNotes: document.getElementById("export-scope-notes"),
  exportScopeSettings: document.getElementById("export-scope-settings"),
  formatOptions: document.querySelectorAll(".format-option"),
  privacyTitle: document.getElementById("privacy-title"),
  privacyDesc: document.getElementById("privacy-desc"),
  privacyBtn: document.getElementById("privacy-btn"),
  setPasswordModal: document.getElementById("set-password-modal"),
  setPasswordInput: document.getElementById("set-password-input"),
  setPasswordConfirm: document.getElementById("set-password-confirm-input"),
  setPasswordError: document.getElementById("set-password-error"),
  setPasswordCancel: document.getElementById("set-password-cancel"),
  setPasswordSubmit: document.getElementById("set-password-submit"),
  passwordPromptModal: document.getElementById("password-prompt-modal"),
  passwordPromptTitle: document.getElementById("password-prompt-title"),
  passwordPromptMessage: document.getElementById("password-prompt-message"),
  passwordPromptInput: document.getElementById("password-prompt-input"),
  passwordPromptError: document.getElementById("password-prompt-error"),
  passwordPromptCancel: document.getElementById("password-prompt-cancel"),
  passwordPromptConfirm: document.getElementById("password-prompt-confirm"),
  incognitoBlockedModal: document.getElementById("incognito-blocked-modal"),
  incognitoBlockedOk: document.getElementById("incognito-blocked-ok"),
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
let incognitoMode = localStorage.getItem(INCOGNITO_KEY) === "true";
let locked = false;
let passwordState = null;
let persistQueue = Promise.resolve();
let passwordPromptSubmit = null;
let passwordPromptDismissable = true;

function getContent() {
  return elements.contentInput.value;
}

function setContent(text) {
  elements.contentInput.value = text;
}

async function init() {
  handleIncognitoSession();
  setupEventListeners();
  setupSettingsTabs();
  elements.skipDeleteConfirm.checked = skipDeleteConfirm;
  elements.wordCountToggle.checked = showWordCount;
  elements.foldersToggle.checked = foldersEnabled;
  elements.incognitoToggle.checked = incognitoMode;
  renderPrivacyState();

  if (isPasswordEnabled()) {
    locked = true;
    showUnlockPrompt();
    return;
  }

  await loadAll();
  finishInit();
}

async function loadAll() {
  await loadNotes();
  await loadFolders();
  renderList();
}

function finishInit() {
  showEditorEmpty();
  applyFoldersState();
  applyWordCountVisibility();
  updateWordCount();
  setupStorageModal();
}

function showUnlockPrompt() {
  const meta = readPrivacyMeta();
  showPasswordPrompt(
    {
      title: "Notes are locked",
      message: "Enter your password to open your notes.",
      confirmLabel: "Unlock",
      dismissable: false,
    },
    async (password) => {
      const key = meta ? await verifyPassword(password, meta) : null;
      if (!key) return "Wrong password";
      passwordState = { key, salt: meta.salt };
      locked = false;
      await loadAll();
      finishInit();
      return null;
    }
  );
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
  closeOnBackdropClick(elements.storageModal, close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && elements.storageModal.classList.contains("show")) close();
  });
}

async function loadNotes() {
  try {
    const saved = await readStoredValue(STORAGE_KEY);
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
  writeStoredValue(STORAGE_KEY, JSON.stringify(notes));
}

async function loadFolders() {
  try {
    const saved = await readStoredValue(FOLDERS_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    folders = Array.isArray(parsed)
      ? parsed.filter((f) => f && typeof f.id === "string" && typeof f.name === "string")
      : [];
  } catch (e) {
    console.error("Failed to load folders", e);
    folders = [];
  }
  sanitizeFolders();
}

function sanitizeFolders() {
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
  writeStoredValue(FOLDERS_KEY, JSON.stringify(folders));
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

function applyFoldersState() {
  elements.newFolderBtn.style.display = foldersEnabled ? "" : "none";
  renamingFolderId = null;
  renderList();
}

function renderList() {
  if (renamingFolderId || locked) return;

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
    <span class="folder-name">${escapeHTML(folder.name)}</span>
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
  elements.dateDisplay.textContent = new Date(note.modifiedAt).toLocaleString();

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
  elements.editorEmptyText.textContent =
    notes.length > 0
      ? "Select a note in the sidebar to start working"
      : "Create a new note or select one from the sidebar";
  elements.editorEmpty.style.display = "flex";
  elements.editorView.style.display = "none";
  applyWordCountVisibility();
}

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

async function handleExternalSync() {
  if (locked) return;
  const hadPendingSave = saveTimeout !== null;

  await loadNotes();
  await loadFolders();

  if (activeNoteId) {
    const activeNote = notes.find((n) => n.id === activeNoteId);
    if (!activeNote) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
      selectFirstNote();
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

function deleteNoteById(noteId) {
  notes = notes.filter((n) => n.id !== noteId);
  saveNotesToStorage();
  if (activeNoteId === noteId) {
    selectFirstNote();
  }
  renderList();
  showNotification("Note deleted");
}

function deleteActiveNote() {
  if (!activeNoteId) return;
  const doDelete = () => deleteNoteById(activeNoteId);
  if (skipDeleteConfirm) {
    doDelete();
  } else {
    showDeleteModal(doDelete);
  }
}

function deleteAllNotes() {
  clearTimeout(saveTimeout);
  saveTimeout = null;
  notes = [];
  activeNoteId = null;
  saveNotesToStorage();
  showEditorEmpty();
  renderList();
  showNotification("All notes deleted");
}

function deleteAllNotesAndSettings() {
  clearTimeout(saveTimeout);
  saveTimeout = null;
  purgeNotesData();
  setIncognitoMode(false);
  notes = [];
  folders = [];
  activeNoteId = null;
  elements.skipDeleteConfirm.checked = skipDeleteConfirm;
  elements.wordCountToggle.checked = showWordCount;
  elements.foldersToggle.checked = foldersEnabled;
  applyFoldersState();
  renderPrivacyState();
  showEditorEmpty();
  showNotification("All notes and settings deleted");
}

function resetAllSettings() {
  [SKIP_DELETE_KEY, WORD_COUNT_KEY, FOLDERS_ENABLED_KEY, INCOGNITO_KEY].forEach((key) =>
    localStorage.removeItem(key)
  );
  skipDeleteConfirm = false;
  showWordCount = true;
  foldersEnabled = true;
  incognitoMode = false;
  elements.skipDeleteConfirm.checked = skipDeleteConfirm;
  elements.wordCountToggle.checked = showWordCount;
  elements.foldersToggle.checked = foldersEnabled;
  elements.incognitoToggle.checked = incognitoMode;
  applyFoldersState();
  applyWordCountVisibility();
  showNotification("All settings reset");
}

function buildExportData({ withNotes, withSettings }) {
  flushPendingSave();
  const data = {
    app: "ToolsBoXMachine",
    tool: "note",
    version: 1,
    exportedAt: new Date().toISOString(),
  };
  if (withNotes) {
    data.folders = folders;
    data.notes = notes;
  }
  if (withSettings) {
    data.settings = {
      skipDeleteConfirm,
      showWordCount,
      foldersEnabled,
      incognitoMode,
    };
  }
  return data;
}

function encodeTbxm(json) {
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return `${TBXM_MAGIC}\n${btoa(binary)}`;
}

async function encodeEncryptedTbxm(json) {
  const payload = await encryptText(json, passwordState.key);
  const envelope = { salt: passwordState.salt, iv: payload.iv, data: payload.data };
  return `${TBXM_ENCRYPTED_MAGIC}\n${btoa(JSON.stringify(envelope))}`;
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportFileBaseName() {
  return `tbxm-notes-${new Date().toISOString().slice(0, 10)}`;
}

let exportFormat = "tbxm";

function setExportFormat(format) {
  exportFormat = format;
  elements.formatOptions.forEach((option) => {
    option.classList.toggle("active", option.dataset.format === format);
  });
}

function updateExportConfirm() {
  elements.exportModalConfirm.disabled =
    !elements.exportScopeNotes.checked && !elements.exportScopeSettings.checked;
}

function setExportStep(step) {
  elements.exportSteps.forEach((el) => {
    el.classList.toggle("active", Number(el.dataset.step) === step);
  });
  elements.exportStepIndicator.textContent = `Step ${step} of ${elements.exportSteps.length}`;
}

function showExportModal() {
  setExportStep(1);
  updateExportConfirm();
  elements.exportModal.classList.add("show");
}

function hideExportModal() {
  elements.exportModal.classList.remove("show");
}

async function exportFile() {
  const data = buildExportData({
    withNotes: elements.exportScopeNotes.checked,
    withSettings: elements.exportScopeSettings.checked,
  });
  if (exportFormat === "tbxm") {
    const content = passwordState
      ? await encodeEncryptedTbxm(JSON.stringify(data))
      : encodeTbxm(JSON.stringify(data));
    downloadFile(content, `${exportFileBaseName()}.tbxm`, "application/octet-stream");
  } else {
    downloadFile(JSON.stringify(data, null, 2), `${exportFileBaseName()}.json`, "application/json");
  }
  showNotification(`Exported as .${exportFormat}`);
}

let pendingImport = null;
let pendingImportPassword = null;

function parseImportFile(text) {
  let json = text;
  if (text.startsWith(`${TBXM_MAGIC}\n`)) {
    const binary = atob(text.slice(TBXM_MAGIC.length + 1).trim());
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  }

  return parseImportJson(json);
}

function parseImportJson(json) {
  const data = JSON.parse(json);
  if (
    !data ||
    typeof data !== "object" ||
    (data.app && data.app !== "ToolsBoXMachine") ||
    (data.tool && data.tool !== "note")
  ) {
    throw new Error("Invalid file");
  }

  const hasNotes = Array.isArray(data.notes);
  const hasSettings = !!data.settings && typeof data.settings === "object" && !Array.isArray(data.settings);
  if (!hasNotes && !hasSettings) throw new Error("Invalid file");

  return {
    notes: hasNotes
      ? data.notes.filter((n) => n && typeof n === "object" && typeof n.id === "string")
      : null,
    folders: hasNotes
      ? (Array.isArray(data.folders)
          ? data.folders.filter((f) => f && typeof f === "object" && typeof f.id === "string" && typeof f.name === "string")
          : [])
      : null,
    settings: hasSettings ? data.settings : null,
  };
}

async function applyImport(data, filePassword = null) {
  if (filePassword) {
    const check = await encryptText(PRIVACY_CHECK_TEXT, filePassword.key);
    localStorage.setItem(PRIVACY_KEY, JSON.stringify({ v: 1, salt: filePassword.salt, check }));
    passwordState = { key: filePassword.key, salt: filePassword.salt };
  }

  if (data.notes) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
    notes = data.notes.sort((a, b) => b.modifiedAt - a.modifiedAt);
    folders = data.folders;
    sanitizeFolders();
    saveNotesToStorage();
    saveFoldersToStorage();
    activeNoteId = null;
  }

  if (filePassword && !data.notes) {
    saveNotesToStorage();
    saveFoldersToStorage();
  }
  if (filePassword) renderPrivacyState();

  if (data.settings) {
    const s = data.settings;
    skipDeleteConfirm = s.skipDeleteConfirm === true;
    showWordCount = s.showWordCount !== false;
    foldersEnabled = s.foldersEnabled !== false;
    localStorage.setItem(SKIP_DELETE_KEY, skipDeleteConfirm);
    localStorage.setItem(WORD_COUNT_KEY, showWordCount);
    localStorage.setItem(FOLDERS_ENABLED_KEY, foldersEnabled);
    setIncognitoMode(s.incognitoMode === true && !isPasswordEnabled());
    elements.skipDeleteConfirm.checked = skipDeleteConfirm;
    elements.wordCountToggle.checked = showWordCount;
    elements.foldersToggle.checked = foldersEnabled;
  }

  applyFoldersState();
  applyWordCountVisibility();
  if (data.notes) selectFirstNote();

  const imported = [];
  if (data.notes) imported.push("notes and folders");
  if (data.settings) imported.push("settings");
  showNotification(`Imported ${imported.join(" and ")}`);
}

function requestImport(data, filePassword = null) {
  const lines = [];
  if (data.notes) {
    const noteCount = data.notes.length;
    const folderCount = data.folders.length;
    lines.push(
      `Your current notes and folders will be replaced by ${noteCount} ${noteCount === 1 ? "note" : "notes"} and ${folderCount} ${folderCount === 1 ? "folder" : "folders"}.`
    );
  } else {
    lines.push("Your notes and folders will be kept.");
  }
  if (data.settings) {
    lines.push("Your current settings will be replaced by the settings in this file.");
    if (data.settings.incognitoMode === true) {
      lines.push(
        isPasswordEnabled()
          ? "Incognito Mode stays disabled because a password is set."
          : "The file enables Incognito Mode: notes will be deleted when the browser session ends."
      );
    }
  } else {
    lines.push("Your settings will be kept.");
  }
  if (filePassword) {
    lines.push(
      isPasswordEnabled()
        ? "The password of this file will replace your current password."
        : "The password of this file will be applied to your notes."
    );
  }
  lines.push("This action cannot be undone.");

  pendingImport = data;
  pendingImportPassword = filePassword;
  showDeleteModal(() => {
    const importData = pendingImport;
    const importPassword = pendingImportPassword;
    pendingImport = null;
    pendingImportPassword = null;
    applyImport(importData, importPassword);
  }, {
    title: "Import file",
    message: lines.join(" "),
    confirmLabel: "Import",
  });
}

function isPasswordEnabled() {
  return readPrivacyMeta() !== null;
}

function readPrivacyMeta() {
  try {
    const raw = localStorage.getItem(PRIVACY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Failed to read privacy settings", e);
    return null;
  }
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function base64ToBytes(base64) {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

async function deriveKey(password, salt) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptText(text, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text));
  return { iv: bytesToBase64(iv), data: bytesToBase64(new Uint8Array(encrypted)) };
}

async function decryptText(payload, key) {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(payload.iv) },
    key,
    base64ToBytes(payload.data)
  );
  return new TextDecoder().decode(decrypted);
}

async function verifyPassword(password, meta) {
  const key = await deriveKey(password, base64ToBytes(meta.salt));
  try {
    const check = await decryptText(meta.check, key);
    return check === PRIVACY_CHECK_TEXT ? key : null;
  } catch {
    return null;
  }
}

function enqueueStorageTask(task) {
  persistQueue = persistQueue
    .then(task)
    .catch((e) => console.error("Failed to save notes", e));
  return persistQueue;
}

function writeStoredValue(key, value) {
  if (locked) return;
  enqueueStorageTask(async () => {
    if (!passwordState) {
      localStorage.setItem(key, value);
      return;
    }
    const payload = await encryptText(value, passwordState.key);
    localStorage.setItem(key, JSON.stringify(payload));
  });
}

async function readStoredValue(key) {
  await persistQueue;
  const raw = localStorage.getItem(key);
  if (raw === null || !passwordState) return raw;
  const payload = JSON.parse(raw);
  if (!payload || typeof payload.iv !== "string") return raw;
  return decryptText(payload, passwordState.key);
}

async function enablePassword(password) {
  flushPendingSave();
  if (incognitoMode) setIncognitoMode(false);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  const meta = {
    v: 1,
    salt: bytesToBase64(salt),
    check: await encryptText(PRIVACY_CHECK_TEXT, key),
  };
  localStorage.setItem(PRIVACY_KEY, JSON.stringify(meta));
  passwordState = { key, salt: meta.salt };
  saveNotesToStorage();
  saveFoldersToStorage();
  await persistQueue;
}

async function disablePassword() {
  flushPendingSave();
  passwordState = null;
  localStorage.removeItem(PRIVACY_KEY);
  saveNotesToStorage();
  saveFoldersToStorage();
  await persistQueue;
}

function renderPrivacyState() {
  const enabled = isPasswordEnabled();
  elements.privacyTitle.textContent = enabled ? "Password enabled" : "Add a password";
  elements.privacyDesc.textContent = enabled
    ? "Your notes, folders and .tbxm exports are encrypted. You will be asked for the password each time you open Notes."
    : "Encrypt your notes, folders and .tbxm exports with a password.";
  elements.privacyBtn.textContent = enabled ? "Remove password" : "Add a password";
  elements.privacyBtn.className = enabled ? "setting-danger-btn" : "setting-action-btn";
}

function validatePassword(password) {
  if (password.length < 4) return "Password must be at least 4 characters";
  if (/\s/.test(password)) return "Password cannot contain spaces";
  return null;
}

function setModalError(el, message) {
  el.textContent = message || "";
}

function showSetPasswordModal() {
  elements.setPasswordInput.value = "";
  elements.setPasswordConfirm.value = "";
  setModalError(elements.setPasswordError, "");
  elements.setPasswordModal.classList.add("show");
  elements.setPasswordInput.focus();
}

function hideSetPasswordModal() {
  elements.setPasswordModal.classList.remove("show");
}

async function submitSetPassword() {
  const password = elements.setPasswordInput.value;
  const error =
    validatePassword(password) ||
    (password !== elements.setPasswordConfirm.value ? "Passwords do not match" : null);
  if (error) {
    setModalError(elements.setPasswordError, error);
    return;
  }

  elements.setPasswordSubmit.disabled = true;
  try {
    await enablePassword(password);
    hideSetPasswordModal();
    renderPrivacyState();
    showNotification("Password added");
  } catch (e) {
    console.error("Failed to add password", e);
    setModalError(elements.setPasswordError, "Could not add the password");
  } finally {
    elements.setPasswordSubmit.disabled = false;
  }
}

function showPasswordPrompt({ title, message, confirmLabel = "Confirm", dismissable = true }, onSubmit) {
  passwordPromptSubmit = onSubmit;
  passwordPromptDismissable = dismissable;
  elements.passwordPromptTitle.textContent = title;
  elements.passwordPromptMessage.textContent = message;
  elements.passwordPromptConfirm.textContent = confirmLabel;
  elements.passwordPromptCancel.style.display = dismissable ? "" : "none";
  elements.passwordPromptInput.value = "";
  setModalError(elements.passwordPromptError, "");
  elements.passwordPromptModal.classList.add("show");
  elements.passwordPromptInput.focus();
}

function hidePasswordPrompt() {
  elements.passwordPromptModal.classList.remove("show");
  passwordPromptSubmit = null;
}

async function submitPasswordPrompt() {
  const submit = passwordPromptSubmit;
  if (!submit) return;
  elements.passwordPromptConfirm.disabled = true;
  let error = null;
  try {
    error = await submit(elements.passwordPromptInput.value);
  } catch (e) {
    console.error("Password prompt failed", e);
    error = "Something went wrong";
  }
  elements.passwordPromptConfirm.disabled = false;
  if (error) {
    setModalError(elements.passwordPromptError, error);
    elements.passwordPromptInput.select();
  } else {
    hidePasswordPrompt();
  }
}

function showRemovePasswordPrompt() {
  showPasswordPrompt(
    {
      title: "Remove password",
      message: "Enter your password. Your notes and folders will be stored in clear text again.",
      confirmLabel: "Remove",
    },
    async (password) => {
      const key = await verifyPassword(password, readPrivacyMeta());
      if (!key) return "Wrong password";
      await disablePassword();
      renderPrivacyState();
      showNotification("Password removed");
      return null;
    }
  );
}

function requestEncryptedImport(text) {
  const envelope = JSON.parse(atob(text.slice(TBXM_ENCRYPTED_MAGIC.length + 1).trim()));
  showPasswordPrompt(
    {
      title: "Encrypted file",
      message: "This file is protected by a password. Enter it to open the file.",
      confirmLabel: "Open",
    },
    async (password) => {
      const key = await deriveKey(password, base64ToBytes(envelope.salt));
      let json;
      try {
        json = await decryptText(envelope, key);
      } catch {
        return "Wrong password";
      }
      requestImport(parseImportJson(json), { key, salt: envelope.salt });
      return null;
    }
  );
}

function showIncognitoBlockedModal() {
  elements.incognitoBlockedModal.classList.add("show");
}

function hideIncognitoBlockedModal() {
  elements.incognitoBlockedModal.classList.remove("show");
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
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.code === "KeyN" && !locked) {
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

  elements.ctxMoveTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    openMoveSubmenu();
  });
  elements.ctxMoveTrigger.addEventListener("mouseenter", () => {
    clearTimeout(moveSubmenuCloseTimer);
    moveSubmenuOpenTimer = setTimeout(openMoveSubmenu, 500);
  });
  elements.ctxMoveTrigger.addEventListener("mouseleave", scheduleMoveSubmenuClose);
  elements.ctxMoveSubmenu.addEventListener("mouseenter", () => clearTimeout(moveSubmenuCloseTimer));
  elements.ctxMoveSubmenu.addEventListener("mouseleave", scheduleMoveSubmenuClose);

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
    const doDelete = () => deleteNoteById(targetId);
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
  closeOnBackdropClick(elements.deleteModal, hideDeleteModal);

  elements.settingsBtn.addEventListener("click", () => {
    elements.settingsModal.classList.add("show");
  });

  elements.settingsCloseBtn.addEventListener("click", () => {
    elements.settingsModal.classList.remove("show");
  });

  closeOnBackdropClick(elements.settingsModal, () => elements.settingsModal.classList.remove("show"));

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (elements.exportModal.classList.contains("show")) hideExportModal();
    else if (elements.incognitoBlockedModal.classList.contains("show")) hideIncognitoBlockedModal();
    else if (elements.incognitoModal.classList.contains("show")) hideIncognitoModal();
    else if (elements.setPasswordModal.classList.contains("show")) hideSetPasswordModal();
    else if (elements.passwordPromptModal.classList.contains("show") && passwordPromptDismissable) hidePasswordPrompt();
    else if (elements.deleteModal.classList.contains("show")) hideDeleteModal();
    else if (elements.settingsModal.classList.contains("show")) elements.settingsModal.classList.remove("show");
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

  elements.incognitoToggle.addEventListener("change", () => {
    if (elements.incognitoToggle.checked) {
      elements.incognitoToggle.checked = false;
      if (isPasswordEnabled()) showIncognitoBlockedModal();
      else showIncognitoModal();
    } else {
      setIncognitoMode(false);
    }
  });

  elements.incognitoModalCancel.addEventListener("click", hideIncognitoModal);
  elements.incognitoModalConfirm.addEventListener("click", () => {
    setIncognitoMode(true);
    hideIncognitoModal();
    showNotification("Incognito Mode enabled");
  });
  closeOnBackdropClick(elements.incognitoModal, hideIncognitoModal);

  elements.deleteAllNotesBtn.addEventListener("click", () => {
    showDeleteModal(deleteAllNotes, {
      title: "Delete all notes",
      message: "Delete every note? Your settings will be kept. This action cannot be undone.",
      confirmDelay: 3000,
    });
  });

  elements.deleteAllNotesAndSettingsBtn.addEventListener("click", () => {
    showDeleteModal(deleteAllNotesAndSettings, {
      title: "Delete all notes and settings",
      message: "Delete every note and folder, restore all note settings to their defaults, and remove the password? This action cannot be undone.",
      confirmDelay: 3000,
    });
  });

  elements.resetAllSettingsBtn.addEventListener("click", () => {
    showDeleteModal(resetAllSettings, {
      title: "Reset all settings",
      message: "Restore every note setting to its default value? Your notes and folders will be kept.",
      confirmLabel: "Reset",
    });
  });

  elements.importFileBtn.addEventListener("click", () => elements.importFileInput.click());
  elements.importFileInput.addEventListener("change", async () => {
    const file = elements.importFileInput.files[0];
    elements.importFileInput.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      if (text.startsWith(`${TBXM_ENCRYPTED_MAGIC}\n`)) {
        requestEncryptedImport(text);
      } else {
        requestImport(parseImportFile(text));
      }
    } catch (e) {
      console.error("Failed to import file", e);
      showNotification("Could not import this file");
    }
  });

  elements.exportOpenBtn.addEventListener("click", showExportModal);
  elements.formatOptions.forEach((option) => {
    option.addEventListener("click", () => setExportFormat(option.dataset.format));
  });
  elements.exportScopeNotes.addEventListener("change", updateExportConfirm);
  elements.exportScopeSettings.addEventListener("change", updateExportConfirm);
  elements.exportModalCancel.addEventListener("click", hideExportModal);
  elements.exportModalNext.addEventListener("click", () => setExportStep(2));
  elements.exportModalBack.addEventListener("click", () => setExportStep(1));
  elements.exportModalConfirm.addEventListener("click", async () => {
    await exportFile();
    hideExportModal();
  });
  closeOnBackdropClick(elements.exportModal, hideExportModal);

  elements.privacyBtn.addEventListener("click", () => {
    if (isPasswordEnabled()) showRemovePasswordPrompt();
    else showSetPasswordModal();
  });
  elements.setPasswordCancel.addEventListener("click", hideSetPasswordModal);
  elements.setPasswordSubmit.addEventListener("click", submitSetPassword);
  elements.setPasswordConfirm.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitSetPassword();
    }
  });
  closeOnBackdropClick(elements.setPasswordModal, hideSetPasswordModal);

  elements.passwordPromptCancel.addEventListener("click", hidePasswordPrompt);
  elements.passwordPromptConfirm.addEventListener("click", submitPasswordPrompt);
  elements.passwordPromptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitPasswordPrompt();
    }
  });
  closeOnBackdropClick(elements.passwordPromptModal, () => {
    if (passwordPromptDismissable) hidePasswordPrompt();
  });

  elements.incognitoBlockedOk.addEventListener("click", hideIncognitoBlockedModal);
  closeOnBackdropClick(elements.incognitoBlockedModal, hideIncognitoBlockedModal);

  window.addEventListener("storage", (e) => {
    if (e.key === PRIVACY_KEY) {
      location.reload();
      return;
    }
    if (e.key !== null && e.key !== STORAGE_KEY && e.key !== FOLDERS_KEY) return;
    handleExternalSync();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (saveTimeout !== null) {
      flushPendingSave();
      renderList();
    }
    handleExternalSync();
  });

  window.addEventListener("pagehide", flushPendingSave);
}

let deleteModalCallback = null;

let deleteModalConfirmTimer = null;

function showDeleteModal(
  callback,
  {
    title = "Delete note",
    message = "Are you sure you want to delete this note? This action cannot be undone.",
    confirmDelay = 0,
    confirmLabel = "Delete",
  } = {}
) {
  deleteModalCallback = callback;
  elements.deleteModalTitle.textContent = title;
  elements.deleteModalMessage.textContent = message;
  elements.deleteModalConfirm.textContent = confirmLabel;
  clearTimeout(deleteModalConfirmTimer);
  elements.deleteModalConfirm.disabled = confirmDelay > 0;
  if (confirmDelay > 0) {
    deleteModalConfirmTimer = setTimeout(() => {
      elements.deleteModalConfirm.disabled = false;
      deleteModalConfirmTimer = null;
    }, confirmDelay);
  }
  elements.deleteModal.classList.add("show");
}

function hideDeleteModal() {
  elements.deleteModal.classList.remove("show");
  deleteModalCallback = null;
}

function setupSettingsTabs() {
  const items = document.querySelectorAll(".settings-nav-item");
  items.forEach((item) => {
    item.addEventListener("click", () => {
      items.forEach((i) => i.classList.toggle("active", i === item));
      document.querySelectorAll(".settings-pane").forEach((pane) => {
        pane.classList.toggle("active", pane.dataset.pane === item.dataset.tab);
      });
    });
  });
}

function hasIncognitoSessionCookie() {
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${INCOGNITO_SESSION_COOKIE}=`));
}

function startIncognitoSession() {
  document.cookie = `${INCOGNITO_SESSION_COOKIE}=1; path=/; SameSite=Lax`;
}

function handleIncognitoSession() {
  if (!incognitoMode) return;
  if (!hasIncognitoSessionCookie()) purgeNotesData();
  startIncognitoSession();
}

function purgeNotesData() {
  localStorage.removeItem(PRIVACY_KEY);
  passwordState = null;
  enqueueStorageTask(() => {
    [STORAGE_KEY, FOLDERS_KEY, MODAL_KEY, SKIP_DELETE_KEY, WORD_COUNT_KEY, FOLDERS_ENABLED_KEY].forEach(
      (key) => localStorage.removeItem(key)
    );
  });
  skipDeleteConfirm = false;
  showWordCount = true;
  foldersEnabled = true;
}

function setIncognitoMode(enabled) {
  incognitoMode = enabled;
  localStorage.setItem(INCOGNITO_KEY, enabled);
  elements.incognitoToggle.checked = enabled;
  if (enabled) startIncognitoSession();
}

function showIncognitoModal() {
  elements.incognitoModal.classList.add("show");
}

function hideIncognitoModal() {
  elements.incognitoModal.classList.remove("show");
}

function closeOnBackdropClick(overlay, onClose) {
  let pressStartedOnBackdrop = false;
  overlay.addEventListener("pointerdown", (e) => {
    pressStartedOnBackdrop = e.target === overlay;
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay && pressStartedOnBackdrop) onClose();
  });
}

let moveSubmenuOpenTimer = null;
let moveSubmenuCloseTimer = null;

function openMoveSubmenu() {
  clearTimeout(moveSubmenuOpenTimer);
  clearTimeout(moveSubmenuCloseTimer);
  const trigger = elements.ctxMoveTrigger.getBoundingClientRect();
  const submenu = elements.ctxMoveSubmenu;
  submenu.classList.add("show");

  const subRect = submenu.getBoundingClientRect();
  let left = trigger.right + 6;
  if (left + subRect.width > window.innerWidth - 8) {
    left = trigger.left - subRect.width - 6;
  }
  const maxY = window.innerHeight - subRect.height - 8;
  submenu.style.left = Math.max(8, left) + "px";
  submenu.style.top = Math.max(8, Math.min(trigger.top, maxY)) + "px";
}

function closeMoveSubmenu() {
  clearTimeout(moveSubmenuOpenTimer);
  clearTimeout(moveSubmenuCloseTimer);
  elements.ctxMoveSubmenu.classList.remove("show");
}

function scheduleMoveSubmenuClose() {
  clearTimeout(moveSubmenuOpenTimer);
  clearTimeout(moveSubmenuCloseTimer);
  moveSubmenuCloseTimer = setTimeout(closeMoveSubmenu, 150);
}

function renderMoveSection(target) {
  const section = elements.ctxMoveSection;
  const note = target && target.type === "note" ? notes.find((n) => n.id === target.id) : null;
  const folder = target && target.type === "folder" ? getFolder(target.id) : null;

  if ((!note && !folder) || !foldersEnabled || folders.length === 0) {
    elements.ctxMoveTrigger.style.display = "none";
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
    elements.ctxMoveTrigger.style.display = "none";
    section.innerHTML = "";
    return;
  }

  section.innerHTML = options
    .map((o) => `<div class="context-menu-item" data-folder-id="${o.id}">${o.id ? FOLDER_ICON : ""}${escapeHTML(o.label)}</div>`)
    .join("");
  elements.ctxMoveTrigger.style.display = "flex";
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
  closeMoveSubmenu();
  contextTarget = null;
}

document.addEventListener("DOMContentLoaded", init);
