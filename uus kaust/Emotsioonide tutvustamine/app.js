const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";

const video = document.getElementById("camera");
const overlay = document.getElementById("overlay");
const emotionText = document.getElementById("emotionText");
const modelState = document.getElementById("modelState");
const confidencePanel = document.getElementById("confidencePanel");
const shots = document.getElementById("shots");
const figmaEmotion = document.getElementById("figmaEmotion");

const options = {
  figma: document.getElementById("optFigma"),
  confidence: document.getElementById("optConfidence"),
  capture: document.getElementById("optCapture"),
  sound: document.getElementById("optSound"),
  mirror: document.getElementById("optMirror"),
};

const emotionLabels = {
  happy: "Rõõm",
  sad: "Kurbus",
  neutral: "Neutraalne",
  angry: "Viha",
};

const iconMap = {
  happy: "assets/emotions/happy.svg",
  sad: "assets/emotions/sad.svg",
  neutral: "assets/emotions/neutral.svg",
  angry: "assets/emotions/angry.svg",
};

let lastEmotion = "neutral";
let lastCaptureAt = 0;
let audioCtx = null;
let bars = null;

function createConfidenceBars() {
  const entries = ["happy", "sad", "neutral", "angry"];
  confidencePanel.innerHTML = "";

  bars = entries.reduce((acc, emotionKey) => {
    const row = document.createElement("div");
    row.className = "confidence-row";

    const label = document.createElement("span");
    label.textContent = emotionLabels[emotionKey];

    const track = document.createElement("div");
    track.className = "confidence-track";

    const bar = document.createElement("div");
    bar.className = "confidence-bar";

    const value = document.createElement("strong");
    value.textContent = "0%";

    track.appendChild(bar);
    row.append(label, track, value);
    confidencePanel.appendChild(row);

    acc[emotionKey] = { bar, value };
    return acc;
  }, {});
}

function updateConfidence(expressions) {
  if (!bars || !options.confidence.checked) {
    confidencePanel.style.display = "none";
    return;
  }

  confidencePanel.style.display = "grid";

  // Kuvame ainult nelja nõutud emotsiooni usaldusväärsust.
  ["happy", "sad", "neutral", "angry"].forEach((key) => {
    const pct = Math.round((expressions[key] || 0) * 100);
    bars[key].bar.style.width = `${pct}%`;
    bars[key].value.textContent = `${pct}%`;
  });
}

function selectEmotion(expressions) {
  // Face API tagastab rohkem emotsioone; võtame ainult ülesandes nõutud 4.
  const candidates = ["happy", "sad", "neutral", "angry"];

  return candidates.reduce(
    (best, key) => {
      const score = expressions[key] || 0;
      if (score > best.score) {
        return { emotion: key, score };
      }
      return best;
    },
    { emotion: "neutral", score: 0 }
  );
}

function drawFaceBox(box) {
  const ctx = overlay.getContext("2d");
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.strokeRect(box.x, box.y, box.width, box.height);
}

function placeFigmaIcon(box, emotion) {
  if (!options.figma.checked) {
    figmaEmotion.hidden = true;
    return;
  }

  figmaEmotion.hidden = false;
  figmaEmotion.src = iconMap[emotion];

  // Paigutame ikooni näokasti paremasse serva.
  const x = Math.min(box.x + box.width + 12, overlay.width - 80);
  const y = Math.max(box.y - 6, 6);

  figmaEmotion.style.left = `${x}px`;
  figmaEmotion.style.top = `${y}px`;
}

function beepForEmotion(emotion) {
  if (!options.sound.checked) {
    return;
  }

  if (!audioCtx) {
    audioCtx = new window.AudioContext();
  }

  const freqMap = {
    happy: 720,
    sad: 280,
    neutral: 460,
    angry: 180,
  };

  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  oscillator.frequency.value = freqMap[emotion] || 420;
  oscillator.type = "triangle";
  gain.gain.value = 0.03;

  oscillator.connect(gain);
  gain.connect(audioCtx.destination);

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.12);
}

function captureShot(emotion) {
  const now = Date.now();
  if (!options.capture.checked || now - lastCaptureAt < 1800) {
    return;
  }

  lastCaptureAt = now;

  // Jäädvustame video kaadri väikese eelvaatena galeriisse.
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = video.videoWidth;
  tempCanvas.height = video.videoHeight;

  const ctx = tempCanvas.getContext("2d");
  if (options.mirror.checked) {
    ctx.translate(tempCanvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0);

  const wrapper = document.createElement("div");
  wrapper.className = "shot-item";

  const img = document.createElement("img");
  img.src = tempCanvas.toDataURL("image/jpeg", 0.72);

  const label = document.createElement("p");
  label.textContent = `${emotionLabels[emotion]} · ${new Date().toLocaleTimeString("et-EE")}`;

  wrapper.append(img, label);
  shots.prepend(wrapper);

  while (shots.children.length > 10) {
    shots.removeChild(shots.lastChild);
  }
}

function applyMirrorMode() {
  if (options.mirror.checked) {
    video.classList.add("mirrored");
    overlay.classList.add("mirrored");
  } else {
    video.classList.remove("mirrored");
    overlay.classList.remove("mirrored");
  }
}

async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });

  video.srcObject = stream;

  await new Promise((resolve) => {
    video.onloadedmetadata = () => resolve();
  });

  overlay.width = video.videoWidth;
  overlay.height = video.videoHeight;
}

async function loadModels() {
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
  ]);
}

async function detectLoop() {
  const result = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceExpressions();

  if (!result) {
    emotionText.textContent = "Nägu ei ole kaadris";
    figmaEmotion.hidden = true;
    overlay.getContext("2d").clearRect(0, 0, overlay.width, overlay.height);
    requestAnimationFrame(detectLoop);
    return;
  }

  const { emotion, score } = selectEmotion(result.expressions);

  drawFaceBox(result.detection.box);
  updateConfidence(result.expressions);
  placeFigmaIcon(result.detection.box, emotion);

  document.body.dataset.emotion = emotion;
  emotionText.textContent = `${emotionLabels[emotion]} (${Math.round(score * 100)}%)`;

  if (emotion !== lastEmotion) {
    beepForEmotion(emotion);
    captureShot(emotion);
    lastEmotion = emotion;
  }

  requestAnimationFrame(detectLoop);
}

function bindUi() {
  createConfidenceBars();
  applyMirrorMode();

  options.mirror.addEventListener("change", applyMirrorMode);
  options.confidence.addEventListener("change", () => {
    confidencePanel.style.display = options.confidence.checked ? "grid" : "none";
  });

  document.getElementById("clearShots").addEventListener("click", () => {
    shots.innerHTML = "";
  });
}

async function init() {
  if (!navigator.mediaDevices?.getUserMedia) {
    emotionText.textContent = "Selles brauseris kaamera API ei toeta";
    modelState.textContent = "Viga";
    return;
  }

  try {
    bindUi();
    await loadModels();
    await setupCamera();

    modelState.textContent = "Mudelid: valmis";
    emotionText.textContent = "Kaamera aktiivne";

    detectLoop();
  } catch (error) {
    console.error(error);
    emotionText.textContent = "Käivitamine ebaõnnestus. Kontrolli kaameraluba.";
    modelState.textContent = "Viga";
  }
}

init();
