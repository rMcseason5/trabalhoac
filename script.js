const SIZE = GRID_SIZE;

const gridElement = document.getElementById("grid");
const cluesElement = document.getElementById("clues");
const messageElement = document.getElementById("message");
const counterElement = document.getElementById("counter");
const progressElement = document.getElementById("progress");
const creditsElement = document.getElementById("credits");

const revealDialog = document.getElementById("reveal");
const revealMedia = revealDialog.querySelector(".reveal-media");
const revealImg = document.getElementById("reveal-img");
const revealWord = document.getElementById("reveal-word");
const revealMeaning = document.getElementById("reveal-meaning");
const revealStatus = document.getElementById("reveal-status");
const revealClose = document.getElementById("reveal-close");

// Cada palavra recebe uma cor (cores de fios de cabo de rede). O roxo fica reservado para as dicas.
const WORD_COLORS = [
  "#C2560A", "#2B7A3E", "#2A5FC4", "#8A5232", "#0E7C7B",
  "#C23A52", "#7A6A00", "#4F5F78", "#11789F", "#5A7A00"
];
const colorOf = (word) => WORD_COLORS[terms.findIndex(t => t.word === word) % WORD_COLORS.length];
const termOf = (word) => terms.find(t => t.word === word);

let credits = INITIAL_CREDITS;
let audioContext = null;

let board = [];
let placements = [];
let found = new Set();
let hinted = new Set();
let selected = [];
let pointerStart = null;
let isDragging = false;

const directions = [
  [0, 1], [1, 0], [1, 1], [-1, 1],
  [0, -1], [-1, 0], [-1, -1], [1, -1]
];

/* ---------- Créditos e sons ---------- */

function updateCredits() {
  creditsElement.textContent = credits;
}

// Sons simples gerados no navegador; não é necessário descarregar ficheiros de áudio.
function playSound(type) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioContext = audioContext || new AudioContextClass();
    if (audioContext.state === "suspended") audioContext.resume();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    const now = audioContext.currentTime;
    if (type === "success") {
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(660, now);
      oscillator.frequency.setValueAtTime(880, now + 0.11);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
    } else {
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(220, now);
      oscillator.frequency.setValueAtTime(150, now + 0.13);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      oscillator.start(now);
      oscillator.stop(now + 0.27);
    }
  } catch (error) {
    // Se o navegador bloquear áudio, o jogo continua normalmente.
  }
}

/* ---------- Criação da grelha ---------- */

function tryBuildBoard() {
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(""));
  placements = [];

  // Coloca cada palavra numa direção aleatória.
  for (const term of terms) {
    let placed = false;
    for (let attempt = 0; attempt < 1200 && !placed; attempt++) {
      const [dr, dc] = directions[Math.floor(Math.random() * directions.length)];
      const row = Math.floor(Math.random() * SIZE);
      const col = Math.floor(Math.random() * SIZE);
      const endRow = row + dr * (term.word.length - 1);
      const endCol = col + dc * (term.word.length - 1);

      if (endRow < 0 || endRow >= SIZE || endCol < 0 || endCol >= SIZE) continue;

      let fits = true;
      for (let i = 0; i < term.word.length; i++) {
        const r = row + dr * i, c = col + dc * i;
        if (board[r][c] && board[r][c] !== term.word[i]) { fits = false; break; }
      }
      if (!fits) continue;

      const cells = [];
      for (let i = 0; i < term.word.length; i++) {
        const r = row + dr * i, c = col + dc * i;
        board[r][c] = term.word[i];
        cells.push(`${r},${c}`);
      }
      placements.push({ word: term.word, cells });
      placed = true;
    }
    if (!placed) return false;
  }
  return true;
}

function createBoard() {
  // Se alguma palavra não couber, volta a tentar para o jogo nunca ficar impossível.
  for (let i = 0; i < 100 && !tryBuildBoard(); i++);

  // Preenche os espaços vazios com letras aleatórias.
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!board[r][c]) board[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  }
}

/* ---------- Desenho do ecrã ---------- */

function renderClues() {
  cluesElement.innerHTML = "";
  terms.forEach((term) => {
    const item = document.createElement("div");
    item.className = "clue";
    item.id = `clue-${term.word}`;
    item.style.setProperty("--c", colorOf(term.word));

    const dot = document.createElement("span");
    dot.className = "clue-dot";

    const content = document.createElement("div");
    content.className = "clue-content";
    const clue = document.createElement("p");
    clue.textContent = term.clue;
    const label = document.createElement("div");
    label.className = "clue-word";
    label.textContent = term.label || term.word;
    const hint = document.createElement("div");
    hint.className = "hint-result";
    hint.id = `hint-${term.word}`;
    content.append(clue, label, hint);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "hint-button";
    button.dataset.word = term.word;
    button.textContent = "Dica";

    item.append(dot, content, button);
    cluesElement.appendChild(item);
  });
}

function renderProgress() {
  progressElement.innerHTML = "";
  terms.forEach((term) => {
    const wire = document.createElement("span");
    wire.className = "wire";
    wire.dataset.word = term.word;
    wire.style.setProperty("--c", colorOf(term.word));
    progressElement.appendChild(wire);
  });
  progressElement.setAttribute("aria-valuemax", terms.length);
}

function renderGrid() {
  gridElement.innerHTML = "";
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.textContent = board[r][c];
      cell.dataset.row = r;
      cell.dataset.col = c;
      gridElement.appendChild(cell);
    }
  }
  updateCells();
}

function cellKey(row, col) { return `${row},${col}`; }

// Atualiza as cores das células: palavras encontradas e letras das dicas (roxo).
function updateCells() {
  const foundColor = new Map();
  placements.filter(p => found.has(p.word)).forEach(p => {
    p.cells.forEach(key => foundColor.set(key, colorOf(p.word)));
  });

  const hintCells = new Set();
  placements.filter(p => hinted.has(p.word) && !found.has(p.word)).forEach(p => {
    p.cells.slice(0, 2).forEach(key => hintCells.add(key));
  });

  gridElement.querySelectorAll(".cell").forEach(cell => {
    const key = cellKey(Number(cell.dataset.row), Number(cell.dataset.col));
    const color = foundColor.get(key);
    cell.classList.toggle("found", Boolean(color));
    if (color) cell.style.setProperty("--c", color); else cell.style.removeProperty("--c");
    cell.classList.toggle("hint", !color && hintCells.has(key));
  });
}

function updateProgress() {
  counterElement.textContent = `${found.size} / ${terms.length}`;
  progressElement.setAttribute("aria-valuenow", found.size);
  progressElement.querySelectorAll(".wire").forEach(wire => {
    wire.classList.toggle("on", found.has(wire.dataset.word));
  });
}

/* ---------- Significado e imagem ---------- */

function openReveal(word, isNew) {
  const term = termOf(word);
  if (!term) return;

  revealWord.textContent = term.label || term.word;
  revealMeaning.textContent = term.meaning || term.clue;
  revealDialog.style.setProperty("--c", colorOf(word));

  const allDone = found.size === terms.length;
  revealStatus.textContent = isNew
    ? (allDone ? "Última palavra! Encontraste todas." : "Palavra encontrada, +1 crédito")
    : "Significado";
  revealClose.textContent = isNew && allDone ? "Concluir" : "Continuar";

  revealMedia.classList.remove("no-image");
  if (term.image) {
    revealImg.onerror = () => revealMedia.classList.add("no-image");
    revealImg.alt = `Ilustração: ${term.label || term.word}`;
    revealImg.src = term.image;
  } else {
    revealMedia.classList.add("no-image");
  }

  if (typeof revealDialog.showModal === "function") {
    if (!revealDialog.open) revealDialog.showModal();
  } else {
    revealDialog.setAttribute("open", "");
  }
  revealClose.focus();
}

function closeReveal() {
  if (revealDialog.open) revealDialog.close();
}

revealClose.addEventListener("click", closeReveal);
// Clicar fora do cartão (no fundo escurecido) também fecha.
revealDialog.addEventListener("click", (event) => {
  if (event.target === revealDialog) closeReveal();
});

/* ---------- Dicas e pistas ---------- */

cluesElement.addEventListener("click", (event) => {
  const view = event.target.closest(".view-button");
  if (view) {
    openReveal(view.dataset.word, false);
    return;
  }

  const button = event.target.closest(".hint-button");
  if (!button) return;
  const word = button.dataset.word;
  if (found.has(word) || hinted.has(word)) return;

  if (credits <= 0) {
    messageElement.textContent = "Não tens créditos suficientes para pedir uma dica.";
    playSound("error");
    return;
  }

  credits -= 1;
  hinted.add(word);
  updateCredits();

  const hint = document.getElementById(`hint-${word}`);
  hint.innerHTML = "";
  const chip = document.createElement("span");
  chip.className = "hint-chip";
  chip.textContent = word.slice(0, 2);
  hint.append("Começa por ", chip);
  hint.classList.add("show");

  button.disabled = true;
  button.textContent = "Dica usada";
  updateCells();
  messageElement.textContent = "Dica revelada! As duas primeiras letras estão a roxo na grelha. Gastaste 1 crédito.";
});

/* ---------- Seleção ---------- */

function getCellFromPoint(x, y) {
  const element = document.elementFromPoint(x, y);
  const cell = element && element.closest(".cell");
  return cell ? { row: Number(cell.dataset.row), col: Number(cell.dataset.col) } : null;
}

function lineCells(start, end) {
  const drRaw = end.row - start.row;
  const dcRaw = end.col - start.col;
  const steps = Math.max(Math.abs(drRaw), Math.abs(dcRaw));
  if (steps === 0) return [cellKey(start.row, start.col)];
  if (!(drRaw === 0 || dcRaw === 0 || Math.abs(drRaw) === Math.abs(dcRaw))) return [];
  const dr = Math.sign(drRaw), dc = Math.sign(dcRaw);
  return Array.from({ length: steps + 1 }, (_, i) => cellKey(start.row + dr * i, start.col + dc * i));
}

function showSelection(cells) {
  document.querySelectorAll(".cell.selected").forEach(el => el.classList.remove("selected"));
  selected = cells;
  cells.forEach(key => {
    const [r, c] = key.split(",").map(Number);
    const el = gridElement.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    if (el && !el.classList.contains("found")) el.classList.add("selected");
  });
}

function checkSelection() {
  const chosen = selected.join("|");
  const reversed = [...selected].reverse().join("|");
  const match = placements.find(p =>
    !found.has(p.word) &&
    (p.cells.join("|") === chosen || p.cells.join("|") === reversed)
  );

  if (match) {
    found.add(match.word);
    credits += 1;
    updateCredits();
    creditsElement.closest(".stat").classList.remove("pulse");
    void creditsElement.offsetWidth; // reinicia a animação
    creditsElement.closest(".stat").classList.add("pulse");
    playSound("success");

    const clueItem = document.getElementById(`clue-${match.word}`);
    clueItem.classList.add("done");
    const oldButton = clueItem.querySelector(".hint-button");
    if (oldButton) {
      oldButton.className = "view-button";
      oldButton.disabled = false;
      oldButton.textContent = "Ver";
      oldButton.setAttribute("aria-label", `Ver significado de ${termOf(match.word).label || match.word}`);
    }

    const label = termOf(match.word).label || match.word;
    messageElement.textContent = found.size === terms.length
      ? `Parabéns! Encontraste todas as ${terms.length} palavras!`
      : `Correto! Encontraste ${label}. +1 crédito!`;

    showSelection([]);
    updateCells();
    updateProgress();
    openReveal(match.word, true);
    return;
  }

  if (selected.length > 1) {
    playSound("error");
    messageElement.textContent = "Essa sequência não corresponde a uma palavra. Tenta novamente!";
  }
  showSelection([]);
}

gridElement.addEventListener("pointerdown", (event) => {
  const cell = event.target.closest(".cell");
  if (!cell) return;
  event.preventDefault();
  pointerStart = { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
  isDragging = true;
  gridElement.setPointerCapture?.(event.pointerId);
  showSelection([cellKey(pointerStart.row, pointerStart.col)]);
});

gridElement.addEventListener("pointermove", (event) => {
  if (!isDragging || !pointerStart) return;
  const end = getCellFromPoint(event.clientX, event.clientY);
  if (end) showSelection(lineCells(pointerStart, end));
});

gridElement.addEventListener("pointerup", (event) => {
  if (!isDragging) return;
  isDragging = false;
  const end = getCellFromPoint(event.clientX, event.clientY);
  if (end) showSelection(lineCells(pointerStart, end));
  checkSelection();
  pointerStart = null;
});

gridElement.addEventListener("pointercancel", () => {
  isDragging = false;
  pointerStart = null;
  showSelection([]);
});

document.getElementById("clear").addEventListener("click", () => {
  showSelection([]);
  messageElement.textContent = "Seleção limpa. Continua a procurar!";
});

document.getElementById("restart").addEventListener("click", startGame);

/* ---------- Início do jogo ---------- */

function startGame() {
  closeReveal();
  found = new Set();
  hinted = new Set();
  credits = INITIAL_CREDITS;
  updateCredits();
  selected = [];
  pointerStart = null;
  isDragging = false;
  createBoard();
  renderClues();
  renderProgress();
  renderGrid();
  updateProgress();
  messageElement.textContent = `Boa sorte! Encontra as ${terms.length} palavras.`;
}

startGame();
