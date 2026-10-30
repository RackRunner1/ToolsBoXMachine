const upload = document.getElementById("image-upload");
const canvas = document.getElementById("blurry-canvas");
const ctx = canvas.getContext("2d");
const brushSizeInput = document.getElementById("brush-size");
const blurIntensityInput = document.getElementById("blur-intensity");
const sizeVal = document.getElementById("size-val");
const blurVal = document.getElementById("blur-val");
const downloadBtn = document.getElementById("download-btn");
const copyBtn = document.getElementById("copy-btn");
const brushSizeContainer = document.getElementById("brush-size-container");
const blurIntensityContainer = document.getElementById(
  "blur-intensity-container",
);
const canvasPlaceholder = document.getElementById("canvas-placeholder");
const pasteHint = document.getElementById("paste-hint");

let imageObjects = null;
let isDrawing = false;
let isTouchEvent = false;
const offscreenCanvas = document.createElement("canvas");
const offscreenCtx = offscreenCanvas.getContext("2d");
const modeRadios = document.querySelectorAll('input[name="blurMode"]');

const paintCanvas = document.createElement("canvas");
const paintCtx = paintCanvas.getContext("2d");
let blurHistory = [];
const maxHistory = 20;

const supportsCtxFilter = (() => {
  try {
    const testCanvas = document.createElement("canvas");
    const testCtx = testCanvas.getContext("2d");
    if (typeof testCtx.filter === "undefined") return false;
    testCtx.filter = "blur(2px)";
    return testCtx.filter === "blur(2px)";
  } catch (e) {
    return false;
  }
})();

let _blurCache = { src: null, radius: -1, canvas: null };

function boxesForGauss(sigma, n) {
  const wIdeal = Math.sqrt((12 * sigma * sigma) / n + 1);
  let wl = Math.floor(wIdeal);
  if (wl % 2 === 0) wl--;
  if (wl < 1) wl = 1;
  const wu = wl + 2;
  const mIdeal =
    (12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4);
  const m = Math.max(0, Math.min(n, Math.round(mIdeal)));
  const sizes = [];
  for (let i = 0; i < n; i++) sizes.push(i < m ? wl : wu);
  return sizes;
}

function boxBlurH(src, dst, w, h, r) {
  const div = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let accR = 0, accG = 0, accB = 0, accA = 0;
    for (let i = -r; i <= r; i++) {
      const x = i < 0 ? 0 : i > w - 1 ? w - 1 : i;
      const idx = (row + x) * 4;
      accR += src[idx];
      accG += src[idx + 1];
      accB += src[idx + 2];
      accA += src[idx + 3];
    }
    for (let x = 0; x < w; x++) {
      const idx = (row + x) * 4;
      dst[idx] = accR / div;
      dst[idx + 1] = accG / div;
      dst[idx + 2] = accB / div;
      dst[idx + 3] = accA / div;
      const xOut = x - r < 0 ? 0 : x - r;
      const xIn = x + r + 1 > w - 1 ? w - 1 : x + r + 1;
      const iOut = (row + xOut) * 4;
      const iIn = (row + xIn) * 4;
      accR += src[iIn] - src[iOut];
      accG += src[iIn + 1] - src[iOut + 1];
      accB += src[iIn + 2] - src[iOut + 2];
      accA += src[iIn + 3] - src[iOut + 3];
    }
  }
}

function boxBlurV(src, dst, w, h, r) {
  const div = 2 * r + 1;
  for (let x = 0; x < w; x++) {
    let accR = 0, accG = 0, accB = 0, accA = 0;
    for (let i = -r; i <= r; i++) {
      const y = i < 0 ? 0 : i > h - 1 ? h - 1 : i;
      const idx = (y * w + x) * 4;
      accR += src[idx];
      accG += src[idx + 1];
      accB += src[idx + 2];
      accA += src[idx + 3];
    }
    for (let y = 0; y < h; y++) {
      const idx = (y * w + x) * 4;
      dst[idx] = accR / div;
      dst[idx + 1] = accG / div;
      dst[idx + 2] = accB / div;
      dst[idx + 3] = accA / div;
      const yOut = y - r < 0 ? 0 : y - r;
      const yIn = y + r + 1 > h - 1 ? h - 1 : y + r + 1;
      const iOut = (yOut * w + x) * 4;
      const iIn = (yIn * w + x) * 4;
      accR += src[iIn] - src[iOut];
      accG += src[iIn + 1] - src[iOut + 1];
      accB += src[iIn + 2] - src[iOut + 2];
      accA += src[iIn + 3] - src[iOut + 3];
    }
  }
}

function createSmoothContext(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const cctx = c.getContext("2d");
  cctx.imageSmoothingEnabled = true;
  cctx.imageSmoothingQuality = "high";
  return cctx;
}

function smoothDownscaleBlur(src, w, h, sigma) {
  const target = Math.max(1, sigma / 2);
  const sw = Math.max(1, Math.round(w / target));
  const sh = Math.max(1, Math.round(h / target));
  let cur = src;
  let curW = w;
  let curH = h;
  while (curW / 2 >= sw && curH / 2 >= sh && Math.min(curW, curH) > 16) {
    curW = Math.round(curW / 2);
    curH = Math.round(curH / 2);
    const step = createSmoothContext(curW, curH);
    step.drawImage(cur, 0, 0, curW, curH);
    cur = step.canvas;
  }
  if (cur.width !== sw || cur.height !== sh) {
    const small = createSmoothContext(sw, sh);
    small.drawImage(cur, 0, 0, sw, sh);
    cur = small.canvas;
  }
  const out = createSmoothContext(w, h);
  out.drawImage(cur, 0, 0, w, h);
  return out.canvas;
}

function manualBlurCanvas(src, radius) {
  const sigma = Math.round(radius);
  const w = src.naturalWidth || src.width;
  const h = src.naturalHeight || src.height;
  const out = createSmoothContext(w, h);
  if (!(sigma > 0)) {
    out.drawImage(src, 0, 0);
    return out.canvas;
  }

  const MAX_PIXELS = 2000000;
  const scale = Math.min(1, Math.sqrt(MAX_PIXELS / (w * h)));
  const ww = Math.max(1, Math.round(w * scale));
  const hh = Math.max(1, Math.round(h * scale));
  const work = createSmoothContext(ww, hh);
  work.drawImage(src, 0, 0, ww, hh);

  let imgData = null;
  try {
    imgData = work.getImageData(0, 0, ww, hh);
  } catch (e) {
    imgData = null;
  }
  if (!imgData) return smoothDownscaleBlur(src, w, h, sigma);

  const wSigma = Math.max(1, Math.round(sigma * scale));
  const boxes = boxesForGauss(wSigma, 3);
  let bufA = new Uint8ClampedArray(imgData.data);
  let bufB = new Uint8ClampedArray(bufA.length);
  for (let b = 0; b < boxes.length; b++) {
    const r = (boxes[b] - 1) >> 1;
    if (r <= 0) continue;
    boxBlurH(bufA, bufB, ww, hh, r);
    boxBlurV(bufB, bufA, ww, hh, r);
  }
  imgData.data.set(bufA);
  work.putImageData(imgData, 0, 0);
  out.drawImage(work.canvas, 0, 0, w, h);
  return out.canvas;
}

function getBlurredSource(radius) {
  const r = Math.round(radius);
  if (_blurCache.src === imageObjects && _blurCache.radius === r && _blurCache.canvas) {
    return _blurCache.canvas;
  }
  const blurred = manualBlurCanvas(imageObjects, r);
  _blurCache = { src: imageObjects, radius: r, canvas: blurred };
  return blurred;
}

function getBlurMode() {
  return document.querySelector('input[name="blurMode"]:checked').value;
}

function getBlurRadius() {
  return parseInt(blurIntensityInput.value, 10) || 0;
}

function drawBlurredImage(target, radius) {
  if (supportsCtxFilter) {
    target.filter = `blur(${radius}px)`;
    target.drawImage(imageObjects, 0, 0);
    target.filter = "none";
  } else {
    target.drawImage(getBlurredSource(radius), 0, 0);
  }
}

let showBrushPreview = false;

let selectionStart = null;
let selectionEnd = null;
let isSelecting = false;

function saveState() {
  if (blurHistory.length >= maxHistory) {
    blurHistory.shift();
  }
  blurHistory.push(
    paintCtx.getImageData(0, 0, paintCanvas.width, paintCanvas.height),
  );
}

function undo() {
  if (blurHistory.length > 0) {
    paintCtx.putImageData(blurHistory.pop(), 0, 0);
  } else {
    paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
  }
  updateCanvas();
}

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "z") {
    e.preventDefault();
    undo();
  }
});

let currentTransform = { x: 0, y: 0, scale: 1 };
let isPanning = false;
let startPan = { x: 0, y: 0 };
const canvasContainer = document.querySelector(".canvas-container");

canvas.addEventListener("contextmenu", (e) => e.preventDefault());

function getNaturalDisplaySize() {
  const containerW = canvasContainer.getBoundingClientRect().width;
  const naturalW = Math.min(canvas.width, containerW);
  const naturalH = (canvas.height / canvas.width) * naturalW;
  return { w: naturalW, h: naturalH };
}

function applyTransform() {
  if (!imageObjects) return;

  const containerW = canvasContainer.getBoundingClientRect().width;
  const { w: naturalW, h: naturalH } = getNaturalDisplaySize();

  const scaledW = naturalW * currentTransform.scale;
  const scaledH = naturalH * currentTransform.scale;

  if (scaledW > containerW) {
    currentTransform.x = Math.min(
      0,
      Math.max(currentTransform.x, containerW - scaledW),
    );
  } else {
    currentTransform.x = (containerW - scaledW) / 2;
  }

  if (scaledH > naturalH) {
    currentTransform.y = Math.min(
      0,
      Math.max(currentTransform.y, naturalH - scaledH),
    );
  } else {
    currentTransform.y = 0;
  }

  canvas.style.transformOrigin = "0 0";
  canvas.style.transform = `translate(${currentTransform.x}px, ${currentTransform.y}px) scale(${currentTransform.scale})`;
}

canvasContainer.addEventListener(
  "wheel",
  (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (!imageObjects) return;

      const delta = e.deltaY;
      const zoom = Math.exp(-delta * 0.005);
      let newScale = currentTransform.scale * zoom;

      if (newScale > 50) return;
      if (newScale < 1) newScale = 1;

      const rect = canvas.getBoundingClientRect();
      const dx = e.clientX - rect.left;
      const dy = e.clientY - rect.top;
      const R = newScale / currentTransform.scale;

      currentTransform.x = currentTransform.x + dx - dx * R;
      currentTransform.y = currentTransform.y + dy - dy * R;
      currentTransform.scale = newScale;

      applyTransform();
    }
  },
  { passive: false },
);

function updateSettingsVisibility() {
  const mode = getBlurMode();
  const showBrush = mode !== "full" && mode !== "selector";
  const showIntensity = mode !== "eraser";
  brushSizeContainer.style.display = showBrush ? "block" : "none";
  blurIntensityContainer.style.display = showIntensity ? "block" : "none";
  brushSizeContainer.style.marginBottom = showIntensity ? "" : "0";
}

function updateCanvas() {
  updateSettingsVisibility();

  if (!imageObjects) return;
  const mode = getBlurMode();

  if (mode === "full") {
    drawBlurredImage(ctx, getBlurRadius());
  } else {
    canvas.style.filter = "none";
    ctx.drawImage(imageObjects, 0, 0);
    ctx.drawImage(paintCanvas, 0, 0);
  }

  if (showBrushPreview && mode !== "selector") {
    drawBrushPreview();
  }

  if (mode === "selector" && selectionStart && selectionEnd && isSelecting) {
    drawSelectorOverlay();
  }
}

function getSelectionRect() {
  return {
    x: Math.min(selectionStart.x, selectionEnd.x),
    y: Math.min(selectionStart.y, selectionEnd.y),
    w: Math.abs(selectionEnd.x - selectionStart.x),
    h: Math.abs(selectionEnd.y - selectionStart.y),
  };
}

function drawSelectorOverlay() {
  const { x, y, w, h } = getSelectionRect();

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(offscreenCanvas, 0, 0);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawBrushPreview() {
  if (!showBrushPreview || !imageObjects) return;

  const size = parseInt(brushSizeInput.value, 10);

  const containerRect = canvasContainer.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const scale = canvas.width / canvasRect.width;

  const centerX =
    (containerRect.width / 2 + containerRect.left - canvasRect.left) * scale;
  const centerY =
    (containerRect.height / 2 + containerRect.top - canvasRect.top) *
    (canvas.height / canvasRect.height);

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
  ctx.lineWidth = 3 * scale;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
  ctx.setLineDash([5 * scale, 5 * scale]);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();
  ctx.restore();
}

function cleanupSelectorListeners() {
  document.removeEventListener("mousemove", onSelectorMouseMove);
  document.removeEventListener("mouseup", onSelectorMouseUp);
  document.removeEventListener("touchmove", onSelectorTouchMove);
  document.removeEventListener("touchend", onSelectorTouchEnd);
}

modeRadios.forEach((radio) =>
  radio.addEventListener("change", () => {
    cleanupSelectorListeners();
    selectionStart = null;
    selectionEnd = null;
    isSelecting = false;
    updateCanvas();
  }),
);

brushSizeInput.addEventListener("input", (e) => {
  sizeVal.textContent = e.target.value;
  if (imageObjects) {
    showBrushPreview = true;
    updateCanvas();
  }
});

brushSizeInput.addEventListener("change", () => {
  showBrushPreview = false;
  updateCanvas();
});

blurIntensityInput.addEventListener("input", (e) => {
  blurVal.textContent = e.target.value;
  if (imageObjects) {
    renderBlurredOffscreen();
    updateCanvas();
  }
});

function loadImage(src) {
  const img = new Image();
  img.onload = () => {
    cleanupSelectorListeners();
    canvas.width = img.width;
    canvas.height = img.height;
    offscreenCanvas.width = img.width;
    offscreenCanvas.height = img.height;
    paintCanvas.width = img.width;
    paintCanvas.height = img.height;

    blurHistory = [];

    imageObjects = img;
    _blurCache = { src: null, radius: -1, canvas: null };

    canvasPlaceholder.style.display = "none";
    canvas.style.display = "block";

    currentTransform = { x: 0, y: 0, scale: 1 };
    canvas.style.transform = "none";

    renderBlurredOffscreen();
    updateCanvas();
  };
  img.src = src;
}

function readImageFile(file) {
  const reader = new FileReader();
  reader.onload = (event) => loadImage(event.target.result);
  reader.readAsDataURL(file);
}

upload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  hidePasteHint();
  readImageFile(file);
});

function loadFile(file) {
  if (!file || !file.type || !file.type.startsWith("image/")) return false;
  readImageFile(file);
  return true;
}

function handlePaste(e) {
  const clipboardData = e.clipboardData;
  if (!clipboardData) {
    pasteFromClipboardAPI(e);
    return;
  }

  if (clipboardData.files && clipboardData.files.length > 0) {
    for (const file of clipboardData.files) {
      if (loadFile(file)) {
        hidePasteHint();
        e.preventDefault();
        return;
      }
    }
  }

  const items = clipboardData.items;
  if (items) {
    for (const item of items) {
      if (item.kind === "file" && item.type && item.type.startsWith("image/")) {
        const blob = item.getAsFile();
        if (blob && loadFile(blob)) {
          hidePasteHint();
          e.preventDefault();
          return;
        }
      }
    }
  }

  if (items) {
    for (const item of items) {
      if (item.kind === "string") return;
    }
  } else if (
    clipboardData.types &&
    Array.prototype.some.call(
      clipboardData.types,
      (t) => typeof t === "string" && t.startsWith("text/"),
    )
  ) {
    return;
  }

  pasteFromClipboardAPI(e);
}

function pasteFromClipboardAPI(e) {
  try {
    if (
      !navigator.clipboard ||
      typeof navigator.clipboard.read !== "function"
    ) {
      showPasteHint();
      return;
    }
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    navigator.clipboard
      .read()
      .then(async (clipboardItems) => {
        try {
          for (const item of clipboardItems || []) {
            const types = item.types || [];
            const imageType = types.find(
              (t) => typeof t === "string" && t.startsWith("image/"),
            );
            if (!imageType) continue;
            try {
              const blob = await item.getType(imageType);
              if (blob && loadFile(blob)) {
                hidePasteHint();
                return;
              }
            } catch (_) {
              continue;
            }
          }
          showPasteHint();
        } catch (_) {
          showPasteHint();
        }
      })
      .catch(() => showPasteHint());
  } catch (_) {
    showPasteHint();
  }
}

function showPasteHint() {
  pasteHint.hidden = false;
}

function hidePasteHint() {
  pasteHint.hidden = true;
}

window.addEventListener("paste", handlePaste);

function renderBlurredOffscreen() {
  if (!imageObjects) return;
  const blurValue = getBlurRadius();
  if (!supportsCtxFilter) {
    _blurCache.src = null;
    offscreenCanvas.width = imageObjects.width;
    offscreenCanvas.height = imageObjects.height;
    offscreenCtx.drawImage(getBlurredSource(blurValue), 0, 0);
    return;
  }

  offscreenCanvas.width = imageObjects.width + blurValue * 2;
  offscreenCanvas.height = imageObjects.height + blurValue * 2;
  offscreenCtx.filter = `blur(${blurValue}px)`;
  offscreenCtx.drawImage(imageObjects, blurValue, blurValue);
  offscreenCtx.filter = "none";
}

function getPosFromEvent(evt) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const touch = evt.touches ? (evt.touches[0] || evt.changedTouches[0]) : null;
  const clientX = touch ? touch.clientX : (evt.clientX || 0);
  const clientY = touch ? touch.clientY : (evt.clientY || 0);

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

function startSelection(e) {
  saveState();
  selectionStart = getPosFromEvent(e);
  selectionEnd = getPosFromEvent(e);
  isSelecting = true;
  updateCanvas();
}

function finishSelection() {
  isSelecting = false;
  applySelectorBlur();
  selectionStart = null;
  selectionEnd = null;
  updateCanvas();
}

function onSelectorMouseMove(e) {
  if (!isSelecting) return;
  selectionEnd = getPosFromEvent(e);
  updateCanvas();
}

function onSelectorMouseUp() {
  if (!isSelecting) return;
  finishSelection();
  document.removeEventListener("mousemove", onSelectorMouseMove);
  document.removeEventListener("mouseup", onSelectorMouseUp);
}

function onSelectorTouchMove(e) {
  e.preventDefault();
  if (!isSelecting) return;
  selectionEnd = getPosFromEvent(e);
  updateCanvas();
}

function onSelectorTouchEnd() {
  if (!isSelecting) return;
  finishSelection();
  document.removeEventListener("touchmove", onSelectorTouchMove);
  document.removeEventListener("touchend", onSelectorTouchEnd);
}

canvas.addEventListener("mousedown", (e) => {
  if (!imageObjects) return;
  if (isTouchEvent) { isTouchEvent = false; return; }

  if (e.button === 2) {
    if (currentTransform.scale <= 1) return;
    isPanning = true;
    startPan = {
      x: e.clientX - currentTransform.x,
      y: e.clientY - currentTransform.y,
    };
    return;
  }

  const mode = getBlurMode();
  if (mode === "full") return;

  if (mode === "selector") {
    startSelection(e);
    document.addEventListener("mousemove", onSelectorMouseMove);
    document.addEventListener("mouseup", onSelectorMouseUp);
    return;
  }

  saveState();
  isDrawing = true;
  drawBlur(e);
});

canvas.addEventListener("mousemove", (e) => {
  if (isPanning) {
    currentTransform.x = e.clientX - startPan.x;
    currentTransform.y = e.clientY - startPan.y;
    applyTransform();
    return;
  }
  if (isDrawing) {
    drawBlur(e);
  }
});

function stopCanvasInteraction() {
  isPanning = false;
  isDrawing = false;
}

canvas.addEventListener("mouseup", stopCanvasInteraction);
canvas.addEventListener("mouseleave", stopCanvasInteraction);

canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  isTouchEvent = true;
  if (!imageObjects) return;

  if (e.touches.length > 1) {
    isPanning = true;
    isDrawing = false;
    startPan = {
      x: e.touches[0].clientX - currentTransform.x,
      y: e.touches[0].clientY - currentTransform.y,
    };
    return;
  }

  const mode = getBlurMode();
  if (mode === "full") return;

  if (mode === "selector") {
    startSelection(e);
    document.addEventListener("touchmove", onSelectorTouchMove, { passive: false });
    document.addEventListener("touchend", onSelectorTouchEnd);
    return;
  }

  saveState();
  isDrawing = true;
  drawBlur(e);
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  if (!imageObjects) return;

  if (isPanning) {
    currentTransform.x = e.touches[0].clientX - startPan.x;
    currentTransform.y = e.touches[0].clientY - startPan.y;
    applyTransform();
    return;
  }
  if (isDrawing) {
    drawBlur(e);
  }
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
  isPanning = false;
  isDrawing = false;
  isTouchEvent = false;
});

function drawBlur(e) {
  const pos = getPosFromEvent(e);
  const size = parseInt(brushSizeInput.value, 10);
  const mode = getBlurMode();

  paintCtx.save();
  paintCtx.globalCompositeOperation =
    mode === "eraser" ? "destination-out" : "source-over";

  paintCtx.beginPath();
  paintCtx.arc(pos.x, pos.y, size, 0, Math.PI * 2, false);
  paintCtx.clip();

  if (mode === "brush") {
    drawBlurredImage(paintCtx, getBlurRadius());
  } else if (mode === "eraser") {
    paintCtx.fill();
  }

  paintCtx.restore();
  updateCanvas();
}

function applySelectorBlur() {
  if (!selectionStart || !selectionEnd) return;

  const { x, y, w, h } = getSelectionRect();

  if (w < 2 || h < 2) return;

  paintCtx.save();
  paintCtx.beginPath();
  paintCtx.rect(x, y, w, h);
  paintCtx.clip();
  drawBlurredImage(paintCtx, getBlurRadius());
  paintCtx.restore();
}

function getExportCanvas() {
  if (getBlurMode() !== "full") return canvas;
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  drawBlurredImage(tempCanvas.getContext("2d"), getBlurRadius());
  return tempCanvas;
}

downloadBtn.addEventListener("click", () => {
  if (!imageObjects) return;
  const link = document.createElement("a");
  link.download = "blurred_image.png";
  link.href = getExportCanvas().toDataURL("image/png");
  link.click();
});

copyBtn.addEventListener("click", () => {
  if (!imageObjects) return;

  const originalContent = copyBtn.innerHTML;

  copyBtn.innerHTML = `
    <span class="copy-icon-wrapper">
      <span class="copy-icon-original fade">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
        </svg>
      </span>

      <span class="copy-icon-check">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          class="checkmark">
          <polyline points="20,6 9,17 4,12"></polyline>
        </svg>
      </span>
    </span>

    <span>Copied!</span>
  `;

  getExportCanvas().toBlob((blob) => {
    if (!blob) return;
    const item = new ClipboardItem({ "image/png": blob });
    navigator.clipboard.write([item]);
  });

  setTimeout(() => {
    copyBtn.innerHTML = originalContent;
  }, 2000);
});
