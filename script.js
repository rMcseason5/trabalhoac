const SIZE = GRID_SIZE;
  const gridElement = document.getElementById("grid");
  const cluesElement = document.getElementById("clues");
  const messageElement = document.getElementById("message");
  const counterElement = document.getElementById("counter");
  const progressElement = document.getElementById("progress");

  const creditsElement = document.getElementById("credits");
  let credits = INITIAL_CREDITS;
  let audioContext = null;

  function updateCredits() {
    creditsElement.textContent = `Créditos: ${credits}`;
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


  let board = [];
  let placements = [];
  let found = new Set();
  let selected = [];
  let pointerStart = null;
  let isDragging = false;

  const directions = [
    [0, 1], [1, 0], [1, 1], [-1, 1],
    [0, -1], [-1, 0], [-1, -1], [1, -1]
  ];

  function createBoard() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(""));
    placements = [];

    // Coloca cada palavra numa direção aleatória.
    terms.forEach((term) => {
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
    });

    // Preenche os espaços vazios com letras aleatórias.
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!board[r][c]) board[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    }
  }

  function renderClues() {
    cluesElement.innerHTML = "";
    terms.forEach((term, index) => {
      const item = document.createElement("div");
      item.className = "clue";
      item.id = `clue-${term.word}`;
      item.innerHTML = `<span class="clue-number">${String(index + 1).padStart(2, "0")}</span>
        <div class="clue-content"><p>${term.clue}</p><small class="hint-result" id="hint-${term.word}"></small></div>
        <button class="hint-button" type="button" data-word="${term.word}">Dica</button>`;
      cluesElement.appendChild(item);
    });
  }


  cluesElement.addEventListener("click", (event) => {
    const button = event.target.closest(".hint-button");
    if (!button) return;
    const word = button.dataset.word;
    if (found.has(word)) return;
    const hint = document.getElementById(`hint-${word}`);
    if (credits <= 0) {
      messageElement.textContent = "Não tens créditos suficientes para pedir uma dica.";
      playSound("error");
      return;
    }
    credits -= 1;
    updateCredits();
    hint.textContent = `Começa por: ${word.slice(0, 2)}`;
    button.disabled = true;
    button.textContent = "Dica usada";
    messageElement.textContent = `Dica revelada! Gastaste 1 crédito.`;
  });

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
    updateFoundCells();
  }

  function cellKey(row, col) { return `${row},${col}`; }

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
      playSound("success");
      document.getElementById(`clue-${match.word}`).classList.add("done");
      const hintButton = document.querySelector(`.hint-button[data-word="${match.word}"]`);
      if (hintButton) hintButton.disabled = true;
      messageElement.textContent = `Correto! Encontraste ${match.word}. +1 crédito!`;
      updateFoundCells();
      updateProgress();
      if (found.size === terms.length) {
        messageElement.textContent = "Parabéns! Encontraste todas as 12 palavras!";
      }
    } else if (selected.length > 1) {
      playSound("error");
      messageElement.textContent = "Essa sequência não corresponde a uma palavra. Tenta novamente!";
    }
    showSelection([]);
  }

  function updateFoundCells() {
    const foundCells = new Set();
    placements.filter(p => found.has(p.word)).forEach(p => p.cells.forEach(c => foundCells.add(c)));
    gridElement.querySelectorAll(".cell").forEach(cell => {
      const key = cellKey(Number(cell.dataset.row), Number(cell.dataset.col));
      cell.classList.toggle("found", foundCells.has(key));
    });
  }

  function updateProgress() {
    counterElement.textContent = `${found.size} / ${terms.length}`;
    progressElement.style.width = `${(found.size / terms.length) * 100}%`;
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

  function startGame() {
    found = new Set();
    credits = INITIAL_CREDITS;
    updateCredits();
    selected = [];
    pointerStart = null;
    isDragging = false;
    createBoard();
    renderClues();
    renderGrid();
    updateProgress();
    messageElement.textContent = "Boa sorte! Encontra as 12 palavras.";
  }

  startGame();