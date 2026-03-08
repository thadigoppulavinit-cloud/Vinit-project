const STORAGE_KEY = "notes.app.v1";

const state = {
  notes: loadNotes(),
  selectedNoteId: null,
  query: "",
};

const ui = {
  notesList: document.getElementById("notesList"),
  searchInput: document.getElementById("searchInput"),
  newNoteButton: document.getElementById("newNoteButton"),
  editorForm: document.getElementById("editorForm"),
  emptyState: document.getElementById("emptyState"),
  titleInput: document.getElementById("titleInput"),
  contentInput: document.getElementById("contentInput"),
  deleteButton: document.getElementById("deleteButton"),
  metaText: document.getElementById("metaText"),
  noteItemTemplate: document.getElementById("noteItemTemplate"),
};

bootstrap();

function bootstrap() {
  bindEvents();

  if (state.notes.length > 0) {
    state.selectedNoteId = state.notes[0].id;
  }

  render();
}

function bindEvents() {
  ui.newNoteButton.addEventListener("click", onCreateNote);
  ui.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderNotesList();
  });

  ui.editorForm.addEventListener("submit", onSaveNote);
  ui.deleteButton.addEventListener("click", onDeleteNote);
}

function loadNotes() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.notes));
}

function onCreateNote() {
  const now = new Date().toISOString();
  const note = {
    id: crypto.randomUUID(),
    title: "Untitled note",
    content: "",
    updatedAt: now,
    createdAt: now,
  };

  state.notes.unshift(note);
  state.selectedNoteId = note.id;
  saveNotes();
  render();
  ui.titleInput.focus();
  ui.titleInput.select();
}

function onSaveNote(event) {
  event.preventDefault();

  const note = getSelectedNote();
  if (!note) return;

  note.title = ui.titleInput.value.trim() || "Untitled note";
  note.content = ui.contentInput.value.trim();
  note.updatedAt = new Date().toISOString();

  state.notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  saveNotes();
  render();
}

function onDeleteNote() {
  const note = getSelectedNote();
  if (!note) return;

  state.notes = state.notes.filter((item) => item.id !== note.id);

  const firstMatch = getFilteredNotes()[0];
  state.selectedNoteId = firstMatch ? firstMatch.id : state.notes[0]?.id || null;

  saveNotes();
  render();
}

function getSelectedNote() {
  return state.notes.find((note) => note.id === state.selectedNoteId) || null;
}

function getFilteredNotes() {
  if (!state.query) return state.notes;
  return state.notes.filter((note) => {
    const haystack = `${note.title} ${note.content}`.toLowerCase();
    return haystack.includes(state.query);
  });
}

function selectNote(id) {
  state.selectedNoteId = id;
  renderEditor();
  renderNotesList();
}

function render() {
  renderNotesList();
  renderEditor();
}

function renderNotesList() {
  ui.notesList.innerHTML = "";

  const filtered = getFilteredNotes();

  if (filtered.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "note-item";
    emptyItem.textContent = state.query
      ? "No matching notes found."
      : "No notes yet. Create one!";
    ui.notesList.appendChild(emptyItem);
    return;
  }

  filtered.forEach((note) => {
    const fragment = ui.noteItemTemplate.content.cloneNode(true);
    const listItem = fragment.querySelector(".note-item");
    const button = fragment.querySelector(".note-item-btn");

    if (note.id === state.selectedNoteId) {
      listItem.classList.add("active");
    }

    fragment.querySelector(".note-title").textContent = note.title;
    fragment.querySelector(".note-snippet").textContent =
      note.content.slice(0, 100) || "(No content yet)";
    fragment.querySelector(".note-time").textContent = `Updated ${formatDate(note.updatedAt)}`;

    button.addEventListener("click", () => selectNote(note.id));
    ui.notesList.appendChild(fragment);
  });
}

function renderEditor() {
  const note = getSelectedNote();

  if (!note) {
    ui.emptyState.classList.remove("hidden");
    ui.editorForm.classList.add("hidden");
    return;
  }

  ui.emptyState.classList.add("hidden");
  ui.editorForm.classList.remove("hidden");

  ui.titleInput.value = note.title;
  ui.contentInput.value = note.content;
  ui.metaText.textContent = `Created ${formatDate(note.createdAt)} • Updated ${formatDate(note.updatedAt)}`;
}

function formatDate(input) {
  const date = new Date(input);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}