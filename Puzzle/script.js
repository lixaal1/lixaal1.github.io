const state = {
  gridSize: 4,
  boardPx: 400,
  sourceImage: null,
  imageBitmap: null,
  pieces: [],
  placement: new Map(),
  activeDrag: null,
  showGhost: false,
  shapeMode: "square",
  startTime: null,
  timerRaf: null,
  gameStarted: false,
  gameWon: false,
  cameraStream: null,
  records: [],
  audioCtx: null,
  bgNodes: [],
};

const refs = {
  imageInput: document.getElementById("imageInput"),
  sliceBtn: document.getElementById("sliceBtn"),
  difficulty: document.getElementById("difficulty"),
  shapeMode: document.getElementById("shapeMode"),
  storage: document.getElementById("storage"),
  assemblyField: document.getElementById("assemblyField"),
  originalPreview: document.getElementById("originalPreview"),
  ghostImage: document.getElementById("ghostImage"),
  ghostBtn: document.getElementById("ghostBtn"),
  gameTitle: document.getElementById("gameTitle"),
  timer: document.getElementById("timer"),
  bestRecord: document.getElementById("bestRecord"),
  leaderboardList: document.getElementById("leaderboardList"),
  exportRecordsBtn: document.getElementById("exportRecordsBtn"),
  musicSelect: document.getElementById("musicSelect"),
  cameraBtn: document.getElementById("cameraBtn"),
  captureBtn: document.getElementById("captureBtn"),
  cameraPreview: document.getElementById("cameraPreview"),
  confettiCanvas: document.getElementById("confettiCanvas"),
};

const STORAGE_KEY = "pixel-puzzle-records-v1";
const MUSIC_KEY = "pixel-puzzle-music-v1";

init();

function init() {
  loadRecords();
  renderRecords();
  restoreMusicChoice();
  updateBoardSize();
  refreshGridAppearance();
  buildAssemblySlots();
  setupEventListeners();
  resizeConfettiCanvas();
  window.addEventListener("resize", () => {
    resizeConfettiCanvas();
    updateBoardSize();
    refreshGridAppearance();
    buildAssemblySlots();
  });
}

function setupEventListeners() {
  refs.imageInput.addEventListener("change", onFileUpload);
  refs.sliceBtn.addEventListener("click", generatePuzzle);
  refs.difficulty.addEventListener("change", () => {
    state.gridSize = Number(refs.difficulty.value);
    refreshGridAppearance();
    buildAssemblySlots();
  });
  refs.shapeMode.addEventListener("change", () => {
    state.shapeMode = refs.shapeMode.value;
  });

  refs.ghostBtn.addEventListener("click", () => {
    state.showGhost = !state.showGhost;
    refs.ghostImage.style.opacity = state.showGhost ? "0.35" : "0";
  });

  refs.exportRecordsBtn.addEventListener("click", exportRecordsJson);

  refs.musicSelect.addEventListener("change", () => {
    const mode = refs.musicSelect.value;
    localStorage.setItem(MUSIC_KEY, mode);
    setBackgroundMusic(mode);
  });

  refs.cameraBtn.addEventListener("click", toggleCamera);
  refs.captureBtn.addEventListener("click", captureFromCamera);

  refs.assemblyField.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
}

async function onFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const objectUrl = URL.createObjectURL(file);
  await setSourceImage(objectUrl);
}

async function setSourceImage(imageUrl) {
  state.sourceImage = imageUrl;
  refs.originalPreview.src = imageUrl;
  refs.ghostImage.src = imageUrl;

  const img = new Image();
  img.src = imageUrl;
  await img.decode();
  state.imageBitmap = img;
  refs.gameTitle.textContent = "Pixel Puzzle";
  refs.gameTitle.classList.remove("success");
}

function refreshGridAppearance() {
  refs.assemblyField.style.backgroundSize = `${state.boardPx / state.gridSize}px ${state.boardPx / state.gridSize}px`;
}

function updateBoardSize() {
  const size = refs.assemblyField.clientWidth || 400;
  state.boardPx = Math.round(size);
}

function buildAssemblySlots() {
  refs.assemblyField.querySelectorAll(".slot").forEach((s) => s.remove());

  const pieceSize = state.boardPx / state.gridSize;
  for (let row = 0; row < state.gridSize; row += 1) {
    for (let col = 0; col < state.gridSize; col += 1) {
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.style.width = `${pieceSize}px`;
      slot.style.height = `${pieceSize}px`;
      slot.style.left = `${col * pieceSize}px`;
      slot.style.top = `${row * pieceSize}px`;
      refs.assemblyField.appendChild(slot);
    }
  }
}

function generatePuzzle() {
  if (!state.imageBitmap) {
    alert("Laadi esmalt pilt üles või tee pilt kaameraga.");
    return;
  }

  state.gridSize = Number(refs.difficulty.value);
  state.shapeMode = refs.shapeMode.value;
  state.pieces = [];
  state.placement.clear();
  state.gameStarted = false;
  state.gameWon = false;
  state.startTime = null;
  refs.timer.textContent = "0.0s";
  refs.gameTitle.textContent = "Pixel Puzzle";
  refs.gameTitle.classList.remove("success");

  refs.storage.innerHTML = "";
  refs.assemblyField.querySelectorAll(".piece").forEach((p) => p.remove());

  updateBoardSize();
  refreshGridAppearance();
  buildAssemblySlots();

  const pieceSize = state.boardPx / state.gridSize;

  for (let row = 0; row < state.gridSize; row += 1) {
    for (let col = 0; col < state.gridSize; col += 1) {
      const pieceIndex = row * state.gridSize + col;

      const pieceCanvas = document.createElement("canvas");
      pieceCanvas.width = pieceSize;
      pieceCanvas.height = pieceSize;
      const ctx = pieceCanvas.getContext("2d");

      drawPieceOnCanvas(ctx, row, col, pieceSize);

      const pieceEl = document.createElement("img");
      pieceEl.src = pieceCanvas.toDataURL("image/png");
      pieceEl.className = "piece";
      pieceEl.draggable = false;
      pieceEl.width = pieceSize;
      pieceEl.height = pieceSize;
      pieceEl.style.width = `${pieceSize}px`;
      pieceEl.style.height = `${pieceSize}px`;
      pieceEl.dataset.correctIndex = String(pieceIndex);
      pieceEl.dataset.currentParent = "storage";

      applyShape(pieceEl, row, col);
      pieceEl.addEventListener("pointerdown", onPointerDown);

      state.pieces.push(pieceEl);
    }
  }

  shuffleArray(state.pieces).forEach((piece) => refs.storage.appendChild(piece));
}

function drawPieceOnCanvas(ctx, row, col, pieceSize) {
  const sx = (state.imageBitmap.naturalWidth / state.gridSize) * col;
  const sy = (state.imageBitmap.naturalHeight / state.gridSize) * row;
  const sw = state.imageBitmap.naturalWidth / state.gridSize;
  const sh = state.imageBitmap.naturalHeight / state.gridSize;

  ctx.drawImage(state.imageBitmap, sx, sy, sw, sh, 0, 0, pieceSize, pieceSize);
}

function applyShape(pieceEl, row, col) {
  if (state.shapeMode === "square") {
    pieceEl.style.clipPath = "none";
    return;
  }

  if (state.shapeMode === "triangle") {
    const orientation = (row + col) % 2 === 0;
    pieceEl.style.clipPath = orientation ? "polygon(0 0, 100% 0, 0 100%)" : "polygon(100% 0, 100% 100%, 0 100%)";
    return;
  }

  // Random polygon gives each piece a unique outline but preserves image mapping.
  pieceEl.style.clipPath = buildRandomPolygonClip();
}

function buildRandomPolygonClip() {
  const points = [];
  const count = 6 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count;
    const radius = 38 + Math.random() * 16;
    const x = 50 + Math.cos(angle) * radius;
    const y = 50 + Math.sin(angle) * radius;
    points.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
  }
  return `polygon(${points.join(",")})`;
}

function onPointerDown(event) {
  const piece = event.currentTarget;
  if (!(piece instanceof HTMLElement)) return;

  if (state.gameWon) return;
  if (piece.classList.contains("placed")) return;

  // Time starts from the first direct interaction with a puzzle piece.
  if (!state.gameStarted) {
    state.gameStarted = true;
    state.startTime = performance.now();
    animateTimer();
  }

  const rect = piece.getBoundingClientRect();
  const fieldRect = refs.assemblyField.getBoundingClientRect();

  state.activeDrag = {
    piece,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    fromParent: piece.parentElement,
    pointerId: event.pointerId,
  };

  piece.classList.add("dragging");
  piece.setPointerCapture(event.pointerId);
  refs.assemblyField.appendChild(piece);
  piece.style.position = "absolute";

  // Convert screen coordinates into assembly-field-local coordinates.
  const localX = event.clientX - fieldRect.left - state.activeDrag.offsetX;
  const localY = event.clientY - fieldRect.top - state.activeDrag.offsetY;
  piece.style.left = `${localX}px`;
  piece.style.top = `${localY}px`;
}

function onPointerMove(event) {
  if (!state.activeDrag) return;
  const { piece, offsetX, offsetY } = state.activeDrag;
  const fieldRect = refs.assemblyField.getBoundingClientRect();

  const x = event.clientX - fieldRect.left - offsetX;
  const y = event.clientY - fieldRect.top - offsetY;

  piece.style.left = `${x}px`;
  piece.style.top = `${y}px`;
}

function onPointerUp(event) {
  if (!state.activeDrag) return;

  const { piece, pointerId } = state.activeDrag;
  if (pointerId !== event.pointerId) return;

  piece.classList.remove("dragging");
  piece.releasePointerCapture(pointerId);

  const snapped = trySnapPiece(piece);
  if (!snapped) {
    returnPieceToStorage(piece);
  }

  state.activeDrag = null;
  checkWin();
}

function trySnapPiece(piece) {
  const pieceSize = state.boardPx / state.gridSize;
  const fieldRect = refs.assemblyField.getBoundingClientRect();
  const pieceRect = piece.getBoundingClientRect();

  const pieceCenterX = pieceRect.left - fieldRect.left + pieceRect.width / 2;
  const pieceCenterY = pieceRect.top - fieldRect.top + pieceRect.height / 2;

  const col = Math.floor(pieceCenterX / pieceSize);
  const row = Math.floor(pieceCenterY / pieceSize);

  if (row < 0 || row >= state.gridSize || col < 0 || col >= state.gridSize) return false;

  const targetIndex = row * state.gridSize + col;
  const correctIndex = Number(piece.dataset.correctIndex);

  const targetCenterX = col * pieceSize + pieceSize / 2;
  const targetCenterY = row * pieceSize + pieceSize / 2;

  const dist = Math.hypot(pieceCenterX - targetCenterX, pieceCenterY - targetCenterY);
  const magnetThreshold = pieceSize * 0.28;

  // Snap only when piece is near its true location and location is not already occupied.
  if (targetIndex !== correctIndex || dist > magnetThreshold || state.placement.has(targetIndex)) {
    return false;
  }

  state.placement.set(targetIndex, piece);

  piece.style.left = `${col * pieceSize}px`;
  piece.style.top = `${row * pieceSize}px`;
  piece.dataset.currentParent = "field";
  piece.classList.add("placed");
  playSnapSound();
  return true;
}

function returnPieceToStorage(piece) {
  piece.style.position = "relative";
  piece.style.left = "auto";
  piece.style.top = "auto";
  piece.dataset.currentParent = "storage";
  refs.storage.appendChild(piece);
}

function checkWin() {
  const total = state.gridSize * state.gridSize;
  if (state.placement.size !== total) return;

  state.gameWon = true;
  cancelAnimationFrame(state.timerRaf);

  const elapsed = (performance.now() - state.startTime) / 1000;
  refs.timer.textContent = `${elapsed.toFixed(1)}s`;
  refs.gameTitle.textContent = "Success";
  refs.gameTitle.classList.add("success");

  saveRecord(elapsed);
  launchWinExplosion();
}

function animateTimer() {
  if (!state.gameStarted || state.gameWon || state.startTime === null) return;

  const elapsed = (performance.now() - state.startTime) / 1000;
  refs.timer.textContent = `${elapsed.toFixed(1)}s`;
  state.timerRaf = requestAnimationFrame(animateTimer);
}

function saveRecord(timeSeconds) {
  const name = prompt("Sisesta nimi rekordi jaoks:", "Mängija") || "Mängija";
  const entry = {
    name: name.trim().slice(0, 24) || "Mängija",
    time: Number(timeSeconds.toFixed(2)),
    grid: `${state.gridSize}x${state.gridSize}`,
    date: new Date().toISOString(),
  };

  state.records.push(entry);
  state.records.sort((a, b) => a.time - b.time);
  state.records = state.records.slice(0, 10);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
  renderRecords();
}

function loadRecords() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    state.records = [];
    return;
  }

  try {
    state.records = JSON.parse(raw);
  } catch {
    state.records = [];
  }
}

function renderRecords() {
  refs.leaderboardList.innerHTML = "";

  if (state.records.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Rekordid puuduvad";
    refs.leaderboardList.appendChild(li);
    refs.bestRecord.textContent = "-";
    return;
  }

  state.records.forEach((record) => {
    const li = document.createElement("li");
    li.textContent = `${record.name}: ${record.time.toFixed(2)}s (${record.grid})`;
    refs.leaderboardList.appendChild(li);
  });

  const best = state.records[0];
  refs.bestRecord.textContent = `${best.name} - ${best.time.toFixed(2)}s`;
}

function exportRecordsJson() {
  const payload = JSON.stringify(state.records, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "pixel-puzzle-records.json";
  a.click();

  URL.revokeObjectURL(url);
}

async function toggleCamera() {
  if (state.cameraStream) {
    stopCamera();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    state.cameraStream = stream;
    refs.cameraPreview.srcObject = stream;
    refs.captureBtn.disabled = false;
    refs.cameraBtn.textContent = "Peata kaamera";
  } catch (err) {
    alert("Kaamera käivitamine ebaõnnestus: " + err.message);
  }
}

function stopCamera() {
  state.cameraStream?.getTracks().forEach((t) => t.stop());
  state.cameraStream = null;
  refs.cameraPreview.srcObject = null;
  refs.captureBtn.disabled = true;
  refs.cameraBtn.textContent = "Kaamera";
}

async function captureFromCamera() {
  if (!state.cameraStream) return;

  const video = refs.cameraPreview;
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);

  const dataUrl = canvas.toDataURL("image/png");
  await setSourceImage(dataUrl);
}

function playSnapSound() {
  const ctx = ensureAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(660, now);
  osc.frequency.exponentialRampToValueAtTime(990, now + 0.05);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.16);
}

function restoreMusicChoice() {
  const saved = localStorage.getItem(MUSIC_KEY) || "off";
  refs.musicSelect.value = saved;
}

function setBackgroundMusic(mode) {
  stopBackgroundMusic();
  if (mode === "off") return;

  const ctx = ensureAudioContext();
  const master = ctx.createGain();
  master.gain.value = 0.06;
  master.connect(ctx.destination);

  const sequence = mode === "ambient1" ? [220, 329.63, 277.18, 392] : [174.61, 261.63, 233.08, 349.23];

  sequence.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = mode === "ambient1" ? "sine" : "triangle";
    osc.frequency.value = freq;
    gain.gain.value = 0.0001;

    osc.connect(gain).connect(master);
    osc.start();

    // Pulse each layer so the background loop feels alive, without external audio files.
    const intervalMs = 2200 + index * 370;
    const timer = setInterval(() => {
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.8 / sequence.length, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    }, intervalMs);

    state.bgNodes.push({ osc, gain, timer });
  });
}

function stopBackgroundMusic() {
  state.bgNodes.forEach((node) => {
    clearInterval(node.timer);
    try {
      node.osc.stop();
    } catch {
      // Oscillator may already be stopped.
    }
  });
  state.bgNodes = [];
}

function ensureAudioContext() {
  if (!state.audioCtx) {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (state.audioCtx.state === "suspended") {
    state.audioCtx.resume();
  }
  return state.audioCtx;
}

function resizeConfettiCanvas() {
  refs.confettiCanvas.width = window.innerWidth;
  refs.confettiCanvas.height = window.innerHeight;
}

function launchWinExplosion() {
  const canvas = refs.confettiCanvas;
  const ctx = canvas.getContext("2d");
  const particles = [];

  for (let i = 0; i < 240; i += 1) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.7) * 14,
      life: 60 + Math.random() * 40,
      size: 2 + Math.random() * 4,
      color: ["#f4a261", "#2a9d8f", "#e63946", "#e9c46a"][Math.floor(Math.random() * 4)],
    });
  }

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.18;
      p.life -= 1;

      ctx.globalAlpha = Math.max(0, p.life / 100);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });

    ctx.globalAlpha = 1;

    if (particles.some((p) => p.life > 0)) {
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  requestAnimationFrame(frame);
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
