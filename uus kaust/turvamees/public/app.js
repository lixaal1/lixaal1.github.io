const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusText = document.getElementById('statusText');
const lastMovementText = document.getElementById('lastMovement');
const video = document.getElementById('video');
const canvas = document.getElementById('motionCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

let stream = null;
let animationId = null;
let previousFrame = null;
let previousCentroid = null;
let previousMovementSize = 0;
let audioContext = null;
let soundCooldownUntil = 0;

const settings = {
  // Samm ja tundlikkus hoiavad pildi arvutamise kerge, et vaade liiguks sujuvalt.
  sampleStep: 4,
  pixelDifferenceThreshold: 32,
  minMovementPixels: 130,
  directionThreshold: 8,
  cooldownMs: 450
};

const movementLabels = {
  left: 'Liikumine vasakule',
  right: 'Liikumine paremale',
  up: 'Liikumine ules',
  down: 'Liikumine alla',
  back: 'Liikumine tagasi',
  forward: 'Liikumine edasi'
};

startBtn.addEventListener('click', startCamera);
stopBtn.addEventListener('click', stopCamera);

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: false
    });

    video.srcObject = stream;

    // Loome heli keskkonna kasutaja nupuvajutusel, et brauser lubaks piikse mängida.
    if (!audioContext) {
      audioContext = new window.AudioContext();
    }

    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusText.textContent = 'Kaamera toole pandud';

    previousFrame = null;
    previousCentroid = null;
    previousMovementSize = 0;
    loop();
  } catch (error) {
    console.error(error);
    statusText.textContent = 'Kaamerat ei saanud avada';
  }
}

function stopCamera() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  previousFrame = null;
  previousCentroid = null;
  previousMovementSize = 0;
  video.srcObject = null;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  statusText.textContent = 'Kaamera peatatud';
  lastMovementText.textContent = 'Veel pole liikumist nähtud.';
}

function loop() {
  if (!stream) {
    return;
  }

  if (video.readyState >= 2) {
    processFrame();
  }

  animationId = requestAnimationFrame(loop);
}

function processFrame() {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const currentGray = toGray(frame.data);

  if (!previousFrame) {
    previousFrame = currentGray;
    return;
  }

  const movement = detectMovement(previousFrame, currentGray);
  drawMovement(frame, movement);

  if (movement.pixelCount > settings.minMovementPixels && previousCentroid) {
    const direction = resolveDirection(movement, previousCentroid, previousMovementSize);

    if (direction) {
      const now = Date.now();
      if (now >= soundCooldownUntil) {
        playSound(direction);
        soundCooldownUntil = now + settings.cooldownMs;
      }

      lastMovementText.textContent = `${movementLabels[direction]} (${movement.pixelCount} muutunud pikslit)`;
    }
  }

  previousFrame = currentGray;
  previousCentroid = movement.centroid;
  previousMovementSize = movement.pixelCount;
}

function toGray(rgba) {
  const gray = new Uint8ClampedArray(canvas.width * canvas.height);

  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 1) {
    gray[j] = Math.floor(rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114);
  }

  return gray;
}

function detectMovement(previousGray, currentGray) {
  let pixelCount = 0;
  let sumX = 0;
  let sumY = 0;

  for (let y = 0; y < canvas.height; y += settings.sampleStep) {
    for (let x = 0; x < canvas.width; x += settings.sampleStep) {
      const index = y * canvas.width + x;
      const difference = Math.abs(currentGray[index] - previousGray[index]);

      if (difference > settings.pixelDifferenceThreshold) {
        pixelCount += 1;
        sumX += x;
        sumY += y;
      }
    }
  }

  const centroid = pixelCount
    ? { x: sumX / pixelCount, y: sumY / pixelCount }
    : { x: canvas.width / 2, y: canvas.height / 2 };

  return { pixelCount, centroid };
}

function drawMovement(frame, movement) {
  const overlay = frame;

  // Punase tooniga varjutame kohad, kus pilt muutus, et kasutaja naeks liikumise jalge.
  for (let y = 0; y < canvas.height; y += settings.sampleStep) {
    for (let x = 0; x < canvas.width; x += settings.sampleStep) {
      const pixelIndex = y * canvas.width + x;
      const rgbaIndex = pixelIndex * 4;
      const currentBrightness =
        overlay.data[rgbaIndex] * 0.299 +
        overlay.data[rgbaIndex + 1] * 0.587 +
        overlay.data[rgbaIndex + 2] * 0.114;

      if (currentBrightness < 60) {
        continue;
      }

      overlay.data[rgbaIndex] = Math.min(255, overlay.data[rgbaIndex] + 25);
      overlay.data[rgbaIndex + 1] = Math.max(0, overlay.data[rgbaIndex + 1] - 10);
      overlay.data[rgbaIndex + 2] = Math.max(0, overlay.data[rgbaIndex + 2] - 10);
    }
  }

  // Joonistame ringi, mis markeerib liikumise keskpunkti.
  ctx.putImageData(overlay, 0, 0);
  ctx.beginPath();
  ctx.arc(movement.centroid.x, movement.centroid.y, 12, 0, Math.PI * 2);
  ctx.strokeStyle = '#36d7b7';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function resolveDirection(movement, lastCentroid, lastMovementSize) {
  const dx = movement.centroid.x - lastCentroid.x;
  const dy = movement.centroid.y - lastCentroid.y;

  // Kui muutunud ala suureneb, tuleb asi kaamerale lahemale (edasi);
  // kui vahepeal muutunud ala kahaneb, liigub asi kaugemale (tagasi).
  const sizeDelta = movement.pixelCount - lastMovementSize;

  if (sizeDelta > 140) {
    return 'forward';
  }

  if (sizeDelta < -140) {
    return 'back';
  }

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > settings.directionThreshold) {
      return 'right';
    }

    if (dx < -settings.directionThreshold) {
      return 'left';
    }
  } else {
    if (dy > settings.directionThreshold) {
      return 'down';
    }

    if (dy < -settings.directionThreshold) {
      return 'up';
    }
  }

  return null;
}

function playSound(direction) {
  if (!audioContext) {
    return;
  }

  // Iga suund saab oma miniviisi, et kasutaja tunneks liikumise ara ka siis, kui ekraani ei vaata.
  const soundMap = {
    left: [230, 180],
    right: [740, 880],
    up: [950],
    down: [130],
    back: [420, 360, 280],
    forward: [250, 420, 620]
  };

  const tones = soundMap[direction] || [300];
  let startAt = audioContext.currentTime;

  tones.forEach((frequency) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = direction === 'back' ? 'square' : 'sine';
    oscillator.frequency.setValueAtTime(frequency, startAt);

    gain.gain.setValueAtTime(0.001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.22, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.17);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start(startAt);
    oscillator.stop(startAt + 0.2);
    startAt += 0.12;
  });
}
