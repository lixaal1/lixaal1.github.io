const outputCanvas = document.getElementById("outputCanvas");
const outputContext = outputCanvas.getContext("2d", { willReadFrequently: true });
const asciiCanvas = document.getElementById("asciiCanvas");
const asciiContext = asciiCanvas.getContext("2d");
const video = document.getElementById("cameraFeed");

const imageUpload = document.getElementById("imageUpload");
const cameraButton = document.getElementById("cameraButton");
const micButton = document.getElementById("micButton");
const saveChaosButton = document.getElementById("saveChaosButton");
const statusText = document.getElementById("statusText");
const audioMeter = document.getElementById("audioMeter");
const modeLabel = document.getElementById("modeLabel");

const controls = {
  rgbSplit: document.getElementById("rgbSplitToggle"),
  datamosh: document.getElementById("datamoshToggle"),
  pixelSort: document.getElementById("pixelSortToggle"),
  audio: document.getElementById("audioToggle"),
  scanline: document.getElementById("scanlineToggle"),
  noise: document.getElementById("noiseToggle"),
  mirror: document.getElementById("mirrorToggle"),
  freeze: document.getElementById("freezeToggle"),
  ascii: document.getElementById("asciiToggle"),
  mirrorSegments: document.getElementById("mirrorSegments"),
  intensity: document.getElementById("intensitySlider")
};

const sourceCanvas = document.createElement("canvas");
const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
const workingCanvas = document.createElement("canvas");
const workingContext = workingCanvas.getContext("2d", { willReadFrequently: true });
const previousFrameCanvas = document.createElement("canvas");
const previousFrameContext = previousFrameCanvas.getContext("2d", { willReadFrequently: true });
const freezeCanvas = document.createElement("canvas");
const freezeContext = freezeCanvas.getContext("2d");
const mirrorCanvas = document.createElement("canvas");
const mirrorContext = mirrorCanvas.getContext("2d");
const asciiSampleCanvas = document.createElement("canvas");
const asciiSampleContext = asciiSampleCanvas.getContext("2d", { willReadFrequently: true });

const loadedImage = new Image();
let currentSource = "placeholder";
let cameraStream = null;
let audioStream = null;
let audioContext = null;
let analyser = null;
let audioData = null;
let audioLevel = 0;
let animationFrameId = 0;
let frameCount = 0;

const pointerState = {
  x: outputCanvas.width * 0.5,
  y: outputCanvas.height * 0.5,
  normalizedX: 0.5,
  normalizedY: 0.5,
  speed: 0,
  lastX: outputCanvas.width * 0.5,
  lastY: outputCanvas.height * 0.5
};

const freezeRegion = {
  active: false,
  x: 0,
  y: 0,
  width: 220,
  height: 180
};

const asciiRamp = "@#W$9876543210?!abc;:+=-,._    ";

/*
  Kõik efektid jooksevad samas render-tsüklis. Iga frame algab allikakaadri joonistamisest
  offscreen-canvas'ele ning seejärel rakendatakse järjest glitch-filtreid. See hoiab kogu
  loogika ühel lehel ja võimaldab mitut efekti üksteise peale laduda.
*/
function syncCanvasSizes(width, height) {
  [outputCanvas, asciiCanvas, sourceCanvas, workingCanvas, previousFrameCanvas, freezeCanvas, mirrorCanvas].forEach((canvas) => {
    canvas.width = width;
    canvas.height = height;
  });
}

function drawPlaceholder() {
  const { width, height } = outputCanvas;
  outputContext.clearRect(0, 0, width, height);

  const gradient = outputContext.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#081525");
  gradient.addColorStop(0.5, "#10253a");
  gradient.addColorStop(1, "#250d17");

  outputContext.fillStyle = gradient;
  outputContext.fillRect(0, 0, width, height);

  outputContext.strokeStyle = "rgba(121, 247, 255, 0.24)";
  outputContext.lineWidth = 2;
  for (let y = 0; y < height; y += 26) {
    outputContext.beginPath();
    outputContext.moveTo(0, y + (frameCount % 26));
    outputContext.lineTo(width, y + (frameCount % 26));
    outputContext.stroke();
  }

  outputContext.fillStyle = "#f4f7fb";
  outputContext.textAlign = "center";
  outputContext.font = "700 56px Orbitron";
  outputContext.fillText("DIGITAL NIGHTMARE", width / 2, height / 2 - 16);
  outputContext.font = "24px Space Mono";
  outputContext.fillStyle = "rgba(244, 247, 251, 0.72)";
  outputContext.fillText("Lae foto voi ava kaamera, et glitch algaks.", width / 2, height / 2 + 38);
}

function updateStatus(message) {
  statusText.textContent = message;
}

function fitSourceToCanvas(sourceWidth, sourceHeight) {
  const targetWidth = 1280;
  const targetHeight = 720;

  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const offsetX = (targetWidth - drawWidth) * 0.5;
  const offsetY = (targetHeight - drawHeight) * 0.5;

  return { drawWidth, drawHeight, offsetX, offsetY };
}

function renderSourceFrame() {
  const { width, height } = sourceCanvas;
  sourceContext.clearRect(0, 0, width, height);

  if (currentSource === "image" && loadedImage.complete) {
    const fit = fitSourceToCanvas(loadedImage.naturalWidth, loadedImage.naturalHeight);
    sourceContext.drawImage(loadedImage, fit.offsetX, fit.offsetY, fit.drawWidth, fit.drawHeight);
    return true;
  }

  if (currentSource === "camera" && video.readyState >= 2) {
    const fit = fitSourceToCanvas(video.videoWidth, video.videoHeight);
    sourceContext.drawImage(video, fit.offsetX, fit.offsetY, fit.drawWidth, fit.drawHeight);
    return true;
  }

  return false;
}

/*
  RGB split loeb sama kaadri pikslid ja kirjutab eri kanalid veidi erineva nihkega tagasi.
  Nihke suurus sõltub hiire positsioonist ja liikumiskiirusest, mistõttu efekt reageerib kohe.
*/
function applyRgbSplit(imageData, amount) {
  const { data, width, height } = imageData;
  const source = new Uint8ClampedArray(data);
  const shiftX = Math.round((pointerState.normalizedX - 0.5) * 36 * amount + pointerState.speed * 0.24);
  const shiftY = Math.round((pointerState.normalizedY - 0.5) * 24 * amount);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const redIndex = getClampedPixelIndex(x + shiftX, y, width, height);
      const greenIndex = getClampedPixelIndex(x, y + shiftY, width, height);
      const blueIndex = getClampedPixelIndex(x - shiftX, y - shiftY, width, height);

      data[index] = source[redIndex];
      data[index + 1] = source[greenIndex + 1];
      data[index + 2] = source[blueIndex + 2];
    }
  }
}

/*
  Datamoshing-lite segab eelmise frame'i linti praeguse frame'iga. Nii tekib tunne, et pilt
  venib ja jätab liikuvate objektide taha kummitusliku joonise.
*/
function applyDatamosh() {
  const smearStrength = 0.18 + pointerState.speed * 0.002 + audioLevel * 0.18;
  workingContext.save();
  workingContext.globalAlpha = Math.min(smearStrength, 0.45);
  workingContext.globalCompositeOperation = "lighten";
  workingContext.drawImage(previousFrameCanvas, pointerState.normalizedX * 18 - 9, pointerState.normalizedY * 12 - 6);
  workingContext.restore();
}

/*
  Pixel sorting toimub vaid kitsas automaatselt valitud ribas, et efekt oleks piisavalt kiire.
  Ala liigub ajas ning selle intensiivsus sõltub glitch-tugevusest ja audio sisendist.
*/
function applyPixelSort(imageData, amount) {
  const { data, width, height } = imageData;
  const bandHeight = Math.max(36, Math.floor(80 * amount));
  const startY = Math.floor((((frameCount * 3) % height) + pointerState.normalizedY * height) * 0.5) % Math.max(1, height - bandHeight);

  for (let y = startY; y < startY + bandHeight; y += 4) {
    const rowPixels = [];
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const brightness = red * 0.299 + green * 0.587 + blue * 0.114;
      rowPixels.push({ brightness, red, green, blue, alpha: data[index + 3] });
    }

    rowPixels.sort((left, right) => left.brightness - right.brightness);

    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const pixel = rowPixels[x];
      data[index] = pixel.red;
      data[index + 1] = pixel.green;
      data[index + 2] = pixel.blue;
      data[index + 3] = pixel.alpha;
    }
  }
}

/*
  Scanlines ja VHS noise joonistatakse imageData järel 2D-operatsioonidena, sest need on
  odavamad kui iga triibu või müratera pikslipõhine muutmine.
*/
function drawScanlines(amount) {
  const { width, height } = outputCanvas;
  outputContext.save();
  outputContext.globalAlpha = 0.12 + amount * 0.08;
  outputContext.fillStyle = "#02060c";
  for (let y = 0; y < height; y += 4) {
    const wobble = Math.sin((y + frameCount * 2) * 0.05) * 2;
    outputContext.fillRect(wobble, y, width, 2);
  }
  outputContext.restore();
}

function drawVhsNoise(amount) {
  const { width, height } = outputCanvas;
  outputContext.save();
  outputContext.globalAlpha = 0.14 + amount * 0.12;

  for (let index = 0; index < 1600; index += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const w = Math.random() * 3 + 1;
    const h = Math.random() * 2 + 1;
    const shade = Math.random() > 0.5 ? 255 : 20;
    outputContext.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${0.18 + Math.random() * amount * 0.3})`;
    outputContext.fillRect(x, y, w, h);
  }

  outputContext.fillStyle = `rgba(255, 255, 255, ${0.04 + amount * 0.05})`;
  outputContext.fillRect(0, (frameCount * 11) % height, width, 8);
  outputContext.restore();
}

function applyMirrorDimension() {
  const { width, height } = outputCanvas;
  const segments = Number(controls.mirrorSegments.value);
  mirrorContext.clearRect(0, 0, width, height);
  mirrorContext.drawImage(outputCanvas, 0, 0);

  outputContext.save();
  outputContext.clearRect(0, 0, width, height);
  outputContext.translate(width / 2, height / 2);

  for (let index = 0; index < segments; index += 1) {
    outputContext.save();
    outputContext.rotate((Math.PI * 2 * index) / segments);
    if (index % 2 === 1) {
      outputContext.scale(-1, 1);
    }
    outputContext.beginPath();
    outputContext.moveTo(0, 0);
    outputContext.arc(0, 0, Math.max(width, height), -Math.PI / segments, Math.PI / segments);
    outputContext.closePath();
    outputContext.clip();
    outputContext.drawImage(mirrorCanvas, -width / 2, -height / 2, width, height);
    outputContext.restore();
  }

  outputContext.restore();
}

function captureFreezeRegion() {
  freezeContext.clearRect(0, 0, freezeCanvas.width, freezeCanvas.height);
  freezeContext.drawImage(outputCanvas, 0, 0);
}

function drawFreezeRegion() {
  if (!freezeRegion.active) {
    return;
  }

  outputContext.save();
  outputContext.strokeStyle = "rgba(121, 247, 255, 0.9)";
  outputContext.lineWidth = 2;
  outputContext.drawImage(
    freezeCanvas,
    freezeRegion.x,
    freezeRegion.y,
    freezeRegion.width,
    freezeRegion.height,
    freezeRegion.x,
    freezeRegion.y,
    freezeRegion.width,
    freezeRegion.height
  );
  outputContext.strokeRect(freezeRegion.x, freezeRegion.y, freezeRegion.width, freezeRegion.height);
  outputContext.restore();
}

/*
  ASCII mode kasutab sama lõppkaadrit, kuid kirjutab selle väiksema sammuga üle sümboliteks.
  Nii jääb kogu glitch-ahel alles, ainult viimane esitusviis muutub tekstiliseks maatriksiks.
*/
function renderAsciiView() {
  const sampleWidth = 120;
  const sampleHeight = Math.round((outputCanvas.height / outputCanvas.width) * sampleWidth * 0.55);
  asciiSampleCanvas.width = sampleWidth;
  asciiSampleCanvas.height = sampleHeight;
  asciiCanvas.hidden = false;
  outputCanvas.hidden = true;

  asciiContext.fillStyle = "#02060c";
  asciiContext.fillRect(0, 0, asciiCanvas.width, asciiCanvas.height);

  asciiSampleContext.clearRect(0, 0, sampleWidth, sampleHeight);
  asciiSampleContext.drawImage(outputCanvas, 0, 0, sampleWidth, sampleHeight);
  const { data } = asciiSampleContext.getImageData(0, 0, sampleWidth, sampleHeight);

  asciiContext.fillStyle = "#8ffaff";
  asciiContext.font = `${Math.ceil(asciiCanvas.height / sampleHeight)}px Space Mono`;

  const cellWidth = asciiCanvas.width / sampleWidth;
  const cellHeight = asciiCanvas.height / sampleHeight;

  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      const index = (y * sampleWidth + x) * 4;
      const brightness = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
      const charIndex = Math.floor((brightness / 255) * (asciiRamp.length - 1));
      const character = asciiRamp[charIndex];
      asciiContext.fillStyle = `rgb(${data[index]}, ${data[index + 1]}, ${data[index + 2]})`;
      asciiContext.fillText(character, x * cellWidth, (y + 1) * cellHeight);
    }
  }
}

function showOutputCanvas() {
  outputCanvas.hidden = false;
  asciiCanvas.hidden = true;
}

/*
  Chaos Save teeb hetke väljundist koopia ning lisab alles salvestamisel ühe juhusliku
  artefakti-kihi. Nii jääb live-vaade puhtaks, aga eksporditud fail saab kordumatu vea.
*/
function applyChaosSaveArtifact() {
  const scratchCanvas = document.createElement("canvas");
  scratchCanvas.width = outputCanvas.width;
  scratchCanvas.height = outputCanvas.height;
  const scratchContext = scratchCanvas.getContext("2d");
  scratchContext.drawImage(controls.ascii.checked ? asciiCanvas : outputCanvas, 0, 0);

  for (let index = 0; index < 14; index += 1) {
    const sliceY = Math.random() * scratchCanvas.height;
    const sliceHeight = 8 + Math.random() * 40;
    const shift = (Math.random() - 0.5) * 180;
    scratchContext.drawImage(
      scratchCanvas,
      0,
      sliceY,
      scratchCanvas.width,
      sliceHeight,
      shift,
      sliceY,
      scratchCanvas.width,
      sliceHeight
    );
  }

  scratchContext.globalCompositeOperation = "lighter";
  scratchContext.fillStyle = `rgba(255, ${80 + Math.random() * 120}, ${120 + Math.random() * 100}, 0.12)`;
  scratchContext.fillRect(0, 0, scratchCanvas.width, scratchCanvas.height);

  const downloadLink = document.createElement("a");
  downloadLink.download = `digital-nightmare-${Date.now()}.png`;
  downloadLink.href = scratchCanvas.toDataURL("image/png");
  downloadLink.click();
  updateStatus("Chaos Save valmis. Fail laaditi alla juhusliku artefaktiga.");
}

function getClampedPixelIndex(x, y, width, height) {
  const clampedX = Math.min(width - 1, Math.max(0, x));
  const clampedY = Math.min(height - 1, Math.max(0, y));
  return (clampedY * width + clampedX) * 4;
}

function updateAudioLevel() {
  if (!controls.audio.checked || !analyser || !audioData) {
    audioLevel = 0;
    audioMeter.textContent = "MIC 0%";
    return;
  }

  analyser.getByteTimeDomainData(audioData);
  let sum = 0;
  for (let index = 0; index < audioData.length; index += 1) {
    const normalized = (audioData[index] - 128) / 128;
    sum += normalized * normalized;
  }

  audioLevel = Math.min(1, Math.sqrt(sum / audioData.length) * 2.8);
  audioMeter.textContent = `MIC ${Math.round(audioLevel * 100)}%`;
}

/*
  Audio-reactive distortion ei vaja eraldi filtrit. Piisab, kui sama audio-tase mõjutab teiste
  glitch-efektide amplituudi. Nii muutub kogu pilt karjumise peale agressiivsemaks.
*/
function renderFrame() {
  frameCount += 1;
  updateAudioLevel();

  if (!renderSourceFrame()) {
    drawPlaceholder();
    animationFrameId = requestAnimationFrame(renderFrame);
    return;
  }

  workingContext.clearRect(0, 0, workingCanvas.width, workingCanvas.height);
  workingContext.drawImage(sourceCanvas, 0, 0);

  if (controls.datamosh.checked) {
    applyDatamosh();
  }

  const intensity = Number(controls.intensity.value);
  const distortionAmount = intensity + audioLevel * 1.3;
  const frame = workingContext.getImageData(0, 0, workingCanvas.width, workingCanvas.height);

  if (controls.rgbSplit.checked) {
    applyRgbSplit(frame, distortionAmount);
  }

  if (controls.pixelSort.checked) {
    applyPixelSort(frame, distortionAmount);
  }

  outputContext.putImageData(frame, 0, 0);

  if (controls.freeze.checked && freezeRegion.active) {
    drawFreezeRegion();
  }

  if (controls.scanline.checked) {
    drawScanlines(distortionAmount);
  }

  if (controls.noise.checked) {
    drawVhsNoise(distortionAmount);
  }

  if (controls.mirror.checked) {
    applyMirrorDimension();
  }

  if (controls.ascii.checked) {
    modeLabel.textContent = "MODE: ASCII NIGHTMARE";
    renderAsciiView();
  } else {
    modeLabel.textContent = "MODE: NIGHTMARE";
    showOutputCanvas();
  }

  previousFrameContext.clearRect(0, 0, previousFrameCanvas.width, previousFrameCanvas.height);
  previousFrameContext.drawImage(outputCanvas, 0, 0);
  animationFrameId = requestAnimationFrame(renderFrame);
}

function updatePointerPosition(event) {
  const activeCanvas = event.currentTarget;
  const rect = activeCanvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * outputCanvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * outputCanvas.height;
  const dx = x - pointerState.lastX;
  const dy = y - pointerState.lastY;

  pointerState.x = x;
  pointerState.y = y;
  pointerState.normalizedX = Math.min(1, Math.max(0, x / outputCanvas.width));
  pointerState.normalizedY = Math.min(1, Math.max(0, y / outputCanvas.height));
  pointerState.speed = Math.min(120, Math.hypot(dx, dy));
  pointerState.lastX = x;
  pointerState.lastY = y;
}

function updateFreezeRegion(event) {
  const activeCanvas = event.currentTarget;
  const rect = activeCanvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * outputCanvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * outputCanvas.height;

  freezeRegion.active = true;
  freezeRegion.x = Math.max(0, Math.min(outputCanvas.width - freezeRegion.width, x - freezeRegion.width * 0.5));
  freezeRegion.y = Math.max(0, Math.min(outputCanvas.height - freezeRegion.height, y - freezeRegion.height * 0.5));
  captureFreezeRegion();
}

async function startCamera() {
  if (cameraStream) {
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = cameraStream;
    currentSource = "camera";
    updateStatus("Kaamera on aktiivne. Liiguta hiirt ja kliki freeze-ala loomiseks.");
  } catch (error) {
    updateStatus("Kaamera loa küsimine ebaõnnestus.");
    console.error(error);
  }
}

async function startMicrophone() {
  if (audioStream) {
    return;
  }

  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(audioStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    audioData = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);
    updateStatus("Mikrofon on aktiivne. Helitugevus juhib glitch-intensiivsust.");
  } catch (error) {
    updateStatus("Mikrofoni loa küsimine ebaõnnestus.");
    console.error(error);
  }
}

function loadImage(file) {
  const objectUrl = URL.createObjectURL(file);
  loadedImage.onload = () => {
    currentSource = "image";
    updateStatus("Foto laaditud. RGB split, pixel sorting ja datamosh on aktiivsed.");
    URL.revokeObjectURL(objectUrl);
  };
  loadedImage.src = objectUrl;
}

imageUpload.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) {
    loadImage(file);
  }
});

cameraButton.addEventListener("click", () => {
  startCamera();
});

micButton.addEventListener("click", () => {
  startMicrophone();
});

saveChaosButton.addEventListener("click", () => {
  applyChaosSaveArtifact();
});

[outputCanvas, asciiCanvas].forEach((canvas) => {
  canvas.addEventListener("pointermove", updatePointerPosition);
  canvas.addEventListener("click", (event) => {
    if (controls.freeze.checked) {
      updateFreezeRegion(event);
    }
  });
});

controls.freeze.addEventListener("change", () => {
  if (controls.freeze.checked) {
    captureFreezeRegion();
  } else {
    freezeRegion.active = false;
  }
});

controls.ascii.addEventListener("change", () => {
  if (!controls.ascii.checked) {
    showOutputCanvas();
  }
});

window.addEventListener("beforeunload", () => {
  cancelAnimationFrame(animationFrameId);
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
  }
  if (audioStream) {
    audioStream.getTracks().forEach((track) => track.stop());
  }
  if (audioContext) {
    audioContext.close();
  }
});

syncCanvasSizes(1280, 720);
drawPlaceholder();
renderFrame();