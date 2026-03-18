const canvas = document.getElementById('sandbox');
const ctx = canvas.getContext('2d');

const materialSelect = document.getElementById('materialSelect');
const toolSelect = document.getElementById('toolSelect');
const brushSizeInput = document.getElementById('brushSize');
const sprayRateInput = document.getElementById('sprayRate');
const clearButton = document.getElementById('clearButton');
const statusText = document.getElementById('statusText');
const particleCount = document.getElementById('particleCount');

const CELL_SIZE = 4;
const GRID_WIDTH = Math.floor(canvas.width / CELL_SIZE);
const GRID_HEIGHT = Math.floor(canvas.height / CELL_SIZE);
const MAX_PARTICLES = GRID_WIDTH * GRID_HEIGHT;

const MATERIALS = {
  sand: { color: '#d9bb62', density: 3, drift: 1 },
  water: { color: '#4ea6ff', density: 2, drift: 3 },
  gas: { color: '#cfd8ff', density: 1, drift: 4 }
};

function hexToRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

const grid = Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(null));
let particles = [];

let audioCtx = null;
let soundEnabled = true;
let soundsThisFrame = 0;
const MAX_SOUNDS_PER_FRAME = 4;
const soundGate = { sand: 0, water: 0, gas: 0 };

let organizeMode = false;
let organizeFrames = 0;
const ORGANIZE_DURATION = 360;

let windStrength = 0;
let lifeEnabled = false;
let frameCount = 0;
const LIFE_FRAMES = 600;
let heatMapEnabled = false;
const HEAT_CELL = 10;
const HEAT_COLS = Math.ceil(canvas.width / HEAT_CELL);
const HEAT_ROWS = Math.ceil(canvas.height / HEAT_CELL);

let frozen = false;

const pointer = {
  active: false,
  inside: false,
  x: 0,
  y: 0
};

function createParticle(x, y, materialKey) {
  if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT || grid[y][x]) {
    return;
  }

  const material = MATERIALS[materialKey];
  const [r, g, b] = hexToRgb(material.color);
  const particle = {
    x,
    y,
    material: materialKey,
    color: `rgb(${r},${g},${b})`,
    r, g, b,
    birthFrame: frameCount,
    updated: false
  };

  grid[y][x] = particle;
  particles.push(particle);
}

function moveParticle(particle, newX, newY) {
  if (newX < 0 || newX >= GRID_WIDTH || newY < 0 || newY >= GRID_HEIGHT) {
    return false;
  }

  if (grid[newY][newX]) {
    return false;
  }

  grid[particle.y][particle.x] = null;
  particle.x = newX;
  particle.y = newY;
  grid[newY][newX] = particle;
  particle.updated = true;
  return true;
}

function swapParticle(particle, targetX, targetY) {
  if (targetX < 0 || targetX >= GRID_WIDTH || targetY < 0 || targetY >= GRID_HEIGHT) {
    return false;
  }

  const other = grid[targetY][targetX];
  if (!other) {
    return false;
  }

  const particleDensity = MATERIALS[particle.material].density;
  const otherDensity = MATERIALS[other.material].density;
  if (particleDensity <= otherDensity) {
    return false;
  }

  blendColors(particle, other);
  queueCollisionSound(particle.material);

  grid[particle.y][particle.x] = other;
  grid[targetY][targetX] = particle;

  const oldX = particle.x;
  const oldY = particle.y;
  particle.x = targetX;
  particle.y = targetY;
  other.x = oldX;
  other.y = oldY;
  particle.updated = true;
  other.updated = true;
  return true;
}

function updateSand(particle) {
  const belowY = particle.y + 1;
  if (moveParticle(particle, particle.x, belowY)) {
    return;
  }

  if (swapParticle(particle, particle.x, belowY)) {
    return;
  }

  const directions = Math.random() > 0.5 ? [-1, 1] : [1, -1];
  for (const dir of directions) {
    if (moveParticle(particle, particle.x + dir, particle.y + 1)) {
      return;
    }

    if (swapParticle(particle, particle.x + dir, particle.y + 1)) {
      return;
    }
  }
}

function updateWater(particle) {
  const belowY = particle.y + 1;
  if (moveParticle(particle, particle.x, belowY)) {
    return;
  }

  const directions = Math.random() > 0.5 ? [-1, 1] : [1, -1];
  for (const dir of directions) {
    if (moveParticle(particle, particle.x + dir, particle.y + 1)) {
      return;
    }
  }

  for (const dir of directions) {
    for (let step = 1; step <= MATERIALS.water.drift; step += 1) {
      if (!grid[particle.y][particle.x + dir * step]) {
        if (moveParticle(particle, particle.x + dir * step, particle.y)) {
          return;
        }
      } else {
        break;
      }
    }
  }
}

function updateGas(particle) {
  const aboveY = particle.y - 1;
  if (moveParticle(particle, particle.x, aboveY)) {
    return;
  }

  const directions = Math.random() > 0.5 ? [-1, 1] : [1, -1];
  for (const dir of directions) {
    if (moveParticle(particle, particle.x + dir, particle.y - 1)) {
      return;
    }
  }

  for (const dir of directions) {
    for (let step = 1; step <= MATERIALS.gas.drift; step += 1) {
      if (!grid[particle.y][particle.x + dir * step]) {
        if (moveParticle(particle, particle.x + dir * step, particle.y)) {
          return;
        }
      } else {
        break;
      }
    }
  }
}

function applySpray(cx, cy) {
  const radius = Number(brushSizeInput.value);
  const sprayRate = Number(sprayRateInput.value);
  const materialKey = materialSelect.value;

  for (let count = 0; count < sprayRate; count += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius;
    const x = Math.floor(cx + Math.cos(angle) * distance);
    const y = Math.floor(cy + Math.sin(angle) * distance);

    if (particles.length < MAX_PARTICLES) {
      createParticle(x, y, materialKey);
    }
  }
}

function applyForce(cx, cy, isAttract) {
  const radius = Number(brushSizeInput.value) * 2.2;
  const strength = isAttract ? 1 : -1;
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(GRID_WIDTH - 1, Math.ceil(cx + radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(GRID_HEIGHT - 1, Math.ceil(cy + radius));

  const influenced = [];
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const particle = grid[y][x];
      if (!particle) {
        continue;
      }

      const dx = cx - particle.x;
      const dy = cy - particle.y;
      const distance = Math.hypot(dx, dy);
      if (distance === 0 || distance > radius) {
        continue;
      }

      influenced.push({ particle, dx, dy, distance });
    }
  }

  influenced.sort((left, right) => {
    if (isAttract) {
      return left.distance - right.distance;
    }

    return right.distance - left.distance;
  });

  for (const item of influenced) {
    const stepX = Math.round((item.dx / item.distance) * strength);
    const stepY = Math.round((item.dy / item.distance) * strength);
    const nextX = item.particle.x + stepX;
    const nextY = item.particle.y + stepY;

    if (!grid[nextY]?.[nextX]) {
      moveParticle(item.particle, nextX, nextY);
    }
  }
}

// ── colour fusion ─────────────────────────────────────────────

function blendColors(a, b) {
  if (a.material === b.material) return;
  const t = 0.18;
  const [ar, ag, ab] = [a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t];
  b.r += (a.r - b.r) * t;
  b.g += (a.g - b.g) * t;
  b.b += (a.b - b.b) * t;
  a.r = ar; a.g = ag; a.b = ab;
  a.color = `rgb(${Math.round(a.r)},${Math.round(a.g)},${Math.round(a.b)})`;
  b.color = `rgb(${Math.round(b.r)},${Math.round(b.g)},${Math.round(b.b)})`;
}

function colorFusionPass() {
  const t = 0.007;
  for (const p of particles) {
    const right = grid[p.y]?.[p.x + 1];
    const below = grid[p.y + 1]?.[p.x];
    for (const nb of [right, below]) {
      if (!nb || nb.material === p.material) continue;
      const pr = p.r + (nb.r - p.r) * t;
      const pg = p.g + (nb.g - p.g) * t;
      const pb = p.b + (nb.b - p.b) * t;
      nb.r += (p.r - nb.r) * t;
      nb.g += (p.g - nb.g) * t;
      nb.b += (p.b - nb.b) * t;
      p.r = pr; p.g = pg; p.b = pb;
      p.color = `rgb(${Math.round(p.r)},${Math.round(p.g)},${Math.round(p.b)})`;
      nb.color = `rgb(${Math.round(nb.r)},${Math.round(nb.g)},${Math.round(nb.b)})`;
    }
  }
}

// ── collision sound ────────────────────────────────────────────

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } else if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function queueCollisionSound(materialKey) {
  if (!soundEnabled || !audioCtx || soundsThisFrame >= MAX_SOUNDS_PER_FRAME) return;
  const now = audioCtx.currentTime;
  if (now < soundGate[materialKey]) return;
  soundsThisFrame += 1;

  const gain = audioCtx.createGain();
  gain.connect(audioCtx.destination);

  if (materialKey === 'sand') {
    soundGate.sand = now + 0.07;
    const osc = audioCtx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500 + Math.random() * 900, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.05);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.06);
  } else if (materialKey === 'water') {
    soundGate.water = now + 0.14;
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220 + Math.random() * 160, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(filter);
    filter.connect(gain);
    osc.start(now);
    osc.stop(now + 0.14);
  } else {
    soundGate.gas = now + 0.22;
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1600 + Math.random() * 1200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.18);
    gain.gain.setValueAtTime(0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.22);
  }
}

// ── self-organisation ──────────────────────────────────────────

function getTextTargets(word) {
  const off = document.createElement('canvas');
  off.width = GRID_WIDTH;
  off.height = GRID_HEIGHT;
  const offCtx = off.getContext('2d');
  let fontSize = Math.floor(GRID_HEIGHT * 0.62);
  offCtx.font = `bold ${fontSize}px monospace`;
  const tw = offCtx.measureText(word).width;
  if (tw > GRID_WIDTH * 0.92) {
    fontSize = Math.floor(fontSize * (GRID_WIDTH * 0.92) / tw);
  }
  offCtx.font = `bold ${fontSize}px monospace`;
  offCtx.fillStyle = '#fff';
  offCtx.textAlign = 'center';
  offCtx.textBaseline = 'middle';
  offCtx.fillText(word, GRID_WIDTH / 2, GRID_HEIGHT / 2);
  const imgData = offCtx.getImageData(0, 0, GRID_WIDTH, GRID_HEIGHT).data;
  const targets = [];
  for (let y = 0; y < GRID_HEIGHT; y += 1) {
    for (let x = 0; x < GRID_WIDTH; x += 1) {
      if (imgData[(y * GRID_WIDTH + x) * 4] > 128) {
        targets.push({ x, y });
      }
    }
  }
  return targets;
}

function startOrganize(word) {
  const rawTargets = getTextTargets(word || 'LIFE');
  if (!rawTargets.length || !particles.length) return;
  const n = particles.length;
  const targets = Array.from({ length: n }, (_, i) =>
    rawTargets[Math.round(i * (rawTargets.length - 1) / Math.max(n - 1, 1))]
  );
  const linearIdx = p => p.y * GRID_WIDTH + p.x;
  const sortedParticles = [...particles].sort((a, b) => linearIdx(a) - linearIdx(b));
  const sortedTargets = [...targets].sort((a, b) => linearIdx(a) - linearIdx(b));
  for (let i = 0; i < sortedParticles.length; i += 1) {
    sortedParticles[i].target = sortedTargets[i];
  }
  organizeMode = true;
  organizeFrames = 0;
  document.getElementById('organizeButton').textContent = 'Peata';
}

function stopOrganize() {
  for (const p of particles) {
    delete p.target;
  }
  organizeMode = false;
  document.getElementById('organizeButton').textContent = 'Rivista';
}

function updateOrganize(particle) {
  if (!particle.target) return;
  const dx = particle.target.x - particle.x;
  const dy = particle.target.y - particle.y;
  if (dx === 0 && dy === 0) return;
  const candidates = [];
  if (dx !== 0) candidates.push([particle.x + Math.sign(dx), particle.y]);
  if (dy !== 0) candidates.push([particle.x, particle.y + Math.sign(dy)]);
  if (dx !== 0 && dy !== 0) candidates.push([particle.x + Math.sign(dx), particle.y + Math.sign(dy)]);
  for (const [nx, ny] of candidates) {
    if (moveParticle(particle, nx, ny)) return;
  }
}

function updateSimulation() {
  soundsThisFrame = 0;

  for (const particle of particles) {
    particle.updated = false;
  }

  if (organizeMode) {
    organizeFrames += 1;
    if (organizeFrames >= ORGANIZE_DURATION) {
      stopOrganize();
    } else {
      for (let y = 0; y < GRID_HEIGHT; y += 1) {
        for (let x = 0; x < GRID_WIDTH; x += 1) {
          const particle = grid[y][x];
          if (particle && !particle.updated) updateOrganize(particle);
        }
      }
      return;
    }
  }

  for (let y = GRID_HEIGHT - 1; y >= 0; y -= 1) {
    for (let x = 0; x < GRID_WIDTH; x += 1) {
      const particle = grid[y][x];
      if (!particle || particle.updated) {
        continue;
      }

      if (particle.material === 'sand') {
        updateSand(particle);
      } else if (particle.material === 'water') {
        updateWater(particle);
      } else if (particle.material === 'gas') {
        updateGas(particle);
      }
    }
  }

  colorFusionPass();
  applyWind();

  frameCount += 1;
  if (lifeEnabled) {
    const alive = [];
    for (const p of particles) {
      if (frameCount - p.birthFrame < LIFE_FRAMES) {
        alive.push(p);
      } else {
        grid[p.y][p.x] = null;
      }
    }
    particles = alive;
  }
}

// ── wind ──────────────────────────────────────────────────

function applyWind() {
  if (windStrength === 0) return;
  const dir = windStrength > 0 ? 1 : -1;
  const abs = Math.abs(windStrength);
  for (const p of particles) {
    if (Math.random() * 5 >= abs) continue;
    const mult = p.material === 'gas' ? 1.0 : p.material === 'water' ? 0.65 : 0.35;
    if (Math.random() >= mult) continue;
    moveParticle(p, p.x + dir, p.y);
  }
}

// ── heat map ────────────────────────────────────────────

function heatColor(t) {
  if (t < 0.25) { const f = t / 0.25; return [0, 0, Math.round(f * 255)]; }
  if (t < 0.5)  { const f = (t - 0.25) / 0.25; return [0, Math.round(f * 255), 255]; }
  if (t < 0.75) { const f = (t - 0.5) / 0.25; return [Math.round(f * 255), 255, Math.round((1 - f) * 255)]; }
  const f = (t - 0.75) / 0.25;
  return [255, Math.round((1 - f) * 255), 0];
}

function drawHeatMap() {
  const density = new Uint16Array(HEAT_COLS * HEAT_ROWS);
  let maxDensity = 0;
  for (const p of particles) {
    const col = Math.min(Math.floor((p.x * CELL_SIZE) / HEAT_CELL), HEAT_COLS - 1);
    const row = Math.min(Math.floor((p.y * CELL_SIZE) / HEAT_CELL), HEAT_ROWS - 1);
    const idx = row * HEAT_COLS + col;
    density[idx] += 1;
    if (density[idx] > maxDensity) maxDensity = density[idx];
  }
  if (maxDensity === 0) return;
  ctx.save();
  for (let row = 0; row < HEAT_ROWS; row += 1) {
    for (let col = 0; col < HEAT_COLS; col += 1) {
      const d = density[row * HEAT_COLS + col];
      if (d === 0) continue;
      const [r, g, b] = heatColor(Math.min(d / maxDensity, 1));
      ctx.fillStyle = `rgba(${r},${g},${b},0.52)`;
      ctx.fillRect(col * HEAT_CELL, row * HEAT_CELL, HEAT_CELL, HEAT_CELL);
    }
  }
  ctx.restore();
}

function drawBrushPreview() {
  if (!pointer.inside) {
    return;
  }

  const radius = Number(brushSizeInput.value) * CELL_SIZE;
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.arc(pointer.x * CELL_SIZE, pointer.y * CELL_SIZE, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const particle of particles) {
    ctx.fillStyle = particle.color;
    ctx.fillRect(
      particle.x * CELL_SIZE,
      particle.y * CELL_SIZE,
      CELL_SIZE,
      CELL_SIZE
    );
  }

  if (heatMapEnabled) drawHeatMap();
  drawBrushPreview();
}

function updateStatus() {
  const materialLabel = materialSelect.options[materialSelect.selectedIndex].text;
  const toolLabel = toolSelect.options[toolSelect.selectedIndex].text;
  statusText.textContent = `${toolLabel} | Materjal: ${materialLabel}`;
  particleCount.textContent = `Osakesi: ${particles.length}`;
}

function clearSimulation() {
  if (organizeMode) stopOrganize();
  for (let y = 0; y < GRID_HEIGHT; y += 1) {
    grid[y].fill(null);
  }

  particles = [];
  updateStatus();
}

function handlePointerAction(event) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * GRID_WIDTH);
  const y = Math.floor(((event.clientY - rect.top) / rect.height) * GRID_HEIGHT);

  pointer.x = Math.max(0, Math.min(GRID_WIDTH - 1, x));
  pointer.y = Math.max(0, Math.min(GRID_HEIGHT - 1, y));

  if (!pointer.active) {
    return;
  }

  const tool = toolSelect.value;
  if (tool === 'spray') {
    applySpray(pointer.x, pointer.y);
  } else {
    applyForce(pointer.x, pointer.y, tool === 'attract');
  }
}

canvas.addEventListener('pointerdown', (event) => {
  ensureAudio();
  pointer.inside = true;
  pointer.active = true;
  canvas.setPointerCapture(event.pointerId);
  handlePointerAction(event);
});

canvas.addEventListener('pointermove', (event) => {
  pointer.inside = true;
  handlePointerAction(event);
});

canvas.addEventListener('pointerup', (event) => {
  pointer.active = false;
  canvas.releasePointerCapture(event.pointerId);
});

canvas.addEventListener('pointercancel', (event) => {
  pointer.active = false;
  pointer.inside = false;
  canvas.releasePointerCapture(event.pointerId);
});

canvas.addEventListener('pointerleave', () => {
  pointer.inside = false;
});

clearButton.addEventListener('click', clearSimulation);
materialSelect.addEventListener('change', updateStatus);
toolSelect.addEventListener('change', updateStatus);

document.getElementById('soundToggle').addEventListener('change', (event) => {
  soundEnabled = event.target.checked;
});

document.getElementById('organizeButton').addEventListener('click', () => {
  const word = document.getElementById('organizeWord').value.trim().toUpperCase() || 'LIFE';
  if (organizeMode) {
    stopOrganize();
  } else {
    startOrganize(word);
  }
});

document.getElementById('windStrength').addEventListener('input', (event) => {
  windStrength = Number(event.target.value);
});

document.getElementById('lifeToggle').addEventListener('change', (event) => {
  lifeEnabled = event.target.checked;
  if (lifeEnabled) {
    for (const p of particles) {
      p.birthFrame = frameCount;
    }
  }
});

document.getElementById('heatMapToggle').addEventListener('change', (event) => {
  heatMapEnabled = event.target.checked;
});

const freezeButton = document.getElementById('freezeButton');

function toggleFreeze() {
  frozen = !frozen;
  freezeButton.textContent = frozen ? '▶ Jätka' : '⏸ Külmuta aeg';
  freezeButton.classList.toggle('btn-active', frozen);
}

freezeButton.addEventListener('click', toggleFreeze);

document.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && event.target === document.body) {
    event.preventDefault();
    toggleFreeze();
  }
});

function tick() {
  if (!frozen) updateSimulation();
  render();
  updateStatus();
  requestAnimationFrame(tick);
}

updateStatus();
tick();
