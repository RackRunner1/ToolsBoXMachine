const STORAGE_KEY = "tbxm_notes";

const elements = {
  grid: document.getElementById("notes-grid"),
  createBtn: document.getElementById("create-note-btn"),
  modal: document.getElementById("note-modal"),
  closeBtn: document.getElementById("close-modal-btn"),
  cancelBtn: document.getElementById("cancel-note-btn"),
  saveBtn: document.getElementById("save-note-btn"),
  titleInput: document.getElementById("modal-note-title"),
  contentInput: document.getElementById("modal-note-content"),
  dateDisplay: document.getElementById("modal-note-date"),
  notification: document.getElementById("notification"),
};

let notes = [];
let currentEditingId = null;

// Initialize
function init() {
  loadNotes();
  renderNotes();
  setupEventListeners();
}

// Load notes from localStorage
function loadNotes() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      notes = JSON.parse(saved);
      // Sort by modified date descending
      notes.sort((a, b) => b.modifiedAt - a.modifiedAt);
    }
  } catch (e) {
    console.error("Failed to load notes", e);
    notes = [];
  }
}

// Save notes to localStorage
function saveNotesToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

// Render the grid
function renderNotes() {
  elements.grid.innerHTML = "";

  if (notes.length === 0) {
    elements.grid.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <line x1="10" y1="9" x2="8" y2="9"/>
        </svg>
        <h3>No notes yet</h3>
        <p>Click "New Note" to create your first note.</p>
      </div>
    `;
    return;
  }

  notes.forEach((note) => {
    const date = new Date(note.modifiedAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const card = document.createElement("div");
    card.className = "note-card";
    card.innerHTML = `
      <h3 class="note-card-title">${escapeHTML(note.title) || "Untitled Note"}</h3>
      <div class="note-card-content">${escapeHTML(note.content) || "<em>No content</em>"}</div>
      <div class="note-card-date">${date}</div>
      <button class="delete-note-btn" title="Delete note">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
      </button>
    `;

    card.addEventListener("click", () => openModal(note));

    const delBtn = card.querySelector(".delete-note-btn");
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteNote(note.id);
    });

    elements.grid.appendChild(card);
  });
}

function escapeHTML(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.innerText = str;
  return div.innerHTML;
}

// Modal handling
function openModal(note = null) {
  if (note) {
    currentEditingId = note.id;
    elements.titleInput.value = note.title;
    elements.contentInput.value = note.content;
    const dateStr = new Date(note.modifiedAt).toLocaleString();
    elements.dateDisplay.textContent = `Last edited: ${dateStr}`;
  } else {
    currentEditingId = null;
    elements.titleInput.value = "";
    elements.contentInput.value = "";
    elements.dateDisplay.textContent = "";
  }

  elements.modal.classList.add("active");
  elements.titleInput.focus();
}

function closeModal() {
  elements.modal.classList.remove("active");
  currentEditingId = null;
}

function saveNote() {
  const title = elements.titleInput.value.trim();
  const content = elements.contentInput.value.trim();

  // Don't save empty notes
  if (!title && !content) {
    closeModal();
    return;
  }

  const now = Date.now();

  if (currentEditingId) {
    // Update existing
    const index = notes.findIndex((n) => n.id === currentEditingId);
    if (index !== -1) {
      notes[index].title = title;
      notes[index].content = content;
      notes[index].modifiedAt = now;
    }
  } else {
    // Create new
    const newNote = {
      id: crypto.randomUUID ? crypto.randomUUID() : `note_${now}`,
      title,
      content,
      createdAt: now,
      modifiedAt: now,
    };
    notes.push(newNote);
  }

  // Sort by modified date descending
  notes.sort((a, b) => b.modifiedAt - a.modifiedAt);

  saveNotesToStorage();
  renderNotes();
  closeModal();
  showNotification("Note saved!");
}

function deleteNote(id) {
  if (confirm("Are you sure you want to delete this note?")) {
    notes = notes.filter((n) => n.id !== id);
    saveNotesToStorage();
    renderNotes();
    showNotification("Note deleted");
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
  elements.createBtn.addEventListener("click", () => openModal());

  elements.closeBtn.addEventListener("click", closeModal);
  elements.cancelBtn.addEventListener("click", closeModal);

  elements.saveBtn.addEventListener("click", saveNote);

  // Close on outside click
  elements.modal.addEventListener("click", (e) => {
    if (e.target === elements.modal) {
      closeModal();
    }
  });

  // Ctrl+S to save
  elements.modal.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveNote();
    }
    if (e.key === "Escape") {
      closeModal();
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
