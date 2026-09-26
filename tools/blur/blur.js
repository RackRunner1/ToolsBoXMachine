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

const mobileNotice = document.getElementById('mobile-notice');
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  mobileNotice.classList.add('visible');
}

let imageObjects = null;
let isDrawing = false;
let isTouchEvent = false;
let offscreenCanvas = document.createElement("canvas");
let offscreenCtx = offscreenCanvas.getContext("2d");
const modeRadios = document.querySelectorAll('input[name="blurMode"]');

// A secondary canvas to keep track of painted strokes
let paintCanvas = document.createElement("canvas");
let paintCtx = paintCanvas.getContext("2d");
let blurHistory = [];
const maxHistory = 20;

const supportsCtxFilter = (() => {
  try {
    const testCanvas = document.createElement("canvas");
    const testCtx = testCanvas.getContext("2d");
    return typeof testCtx.filter !== "undefined";
  } catch (e) {
    return false;
  }
})();

// Preview Brush state
let showBrushPreview = false;
let previewTimeout = null;

// Selector state
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
    const previousState = blurHistory.pop();
    paintCtx.putImageData(previousState, 0, 0);
    updateCanvas();
  } else {
    paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
    updateCanvas();
  }
}

// Undo is bound to the Ctrl/Cmd + Z shortcut
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "z") {
    e.preventDefault();
    undo();
  }
});

// Transform state for zooming and panning
let currentTransform = { x: 0, y: 0, scale: 1 };
let isPanning = false;
let startPan = { x: 0, y: 0 };
const canvasContainer = document.querySelector(".canvas-container");

// Prevent context menu on right click
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

// Compute the natural CSS-displayed size of the canvas (as if no JS transform applied)
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

  // Constrain X: image must stay within container width
  if (scaledW > containerW) {
    currentTransform.x = Math.min(
      0,
      Math.max(currentTransform.x, containerW - scaledW),
    );
  } else {
    currentTransform.x = (containerW - scaledW) / 2;
  }

  // Constrain Y: image must stay within its natural displayed height
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
      if (newScale < 1) newScale = 1; // 1 = CSS natural fit size

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

// Brush size only applies to the brush and eraser modes
function updateBrushSizeVisibility() {
  const mode = document.querySelector('input[name="blurMode"]:checked').value;
  brushSizeContainer.style.display =
    mode === "full" || mode === "selector" ? "none" : "block";
}

function updateCanvas() {
  updateBrushSizeVisibility();

  if (!imageObjects) return;
  const mode = document.querySelector('input[name="blurMode"]:checked').value;

  if (mode === "full") {
    // Always use ctx.filter instead of CSS filter so toDataURL() captures the blur
    ctx.filter = `blur(${blurIntensityInput.value}px)`;
    ctx.drawImage(imageObjects, 0, 0);
    ctx.filter = "none";
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

function drawSelectorOverlay() {
  const x = Math.min(selectionStart.x, selectionEnd.x);
  const y = Math.min(selectionStart.y, selectionEnd.y);
  const w = Math.abs(selectionEnd.x - selectionStart.x);
  const h = Math.abs(selectionEnd.y - selectionStart.y);

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

  const centerX =
    (containerRect.width / 2 + containerRect.left - canvasRect.left) *
    (canvas.width / canvasRect.width);
  const centerY =
    (containerRect.height / 2 + containerRect.top - canvasRect.top) *
    (canvas.height / canvasRect.height);

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
  ctx.lineWidth = 3 * (canvas.width / canvasRect.width);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
  ctx.setLineDash([
    5 * (canvas.width / canvasRect.width),
    5 * (canvas.width / canvasRect.width),
  ]);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = 1.5 * (canvas.width / canvasRect.width);
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

    const placeholder = document.getElementById("canvas-placeholder");
    if (placeholder) placeholder.style.display = "none";
    canvas.style.display = "block";

    currentTransform = { x: 0, y: 0, scale: 1 };
    canvas.style.transform = "none";

    renderBlurredOffscreen();
    updateCanvas();
  };
  img.src = src;
}

upload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => loadImage(event.target.result);
  reader.readAsDataURL(file);
});

// Clipboard Logic
function loadFile(file) {
  if (!file || !file.type || !file.type.startsWith("image/")) return false;
  const reader = new FileReader();
  reader.onload = (event) => loadImage(event.target.result);
  reader.readAsDataURL(file);
  return true;
}

function handlePaste(e) {
  const clipboardData = e.clipboardData;
  if (!clipboardData) return;

  // Files pasted directly (screenshot tool, file from explorer, ...)
  if (clipboardData.files && clipboardData.files.length > 0) {
    for (const file of clipboardData.files) {
      if (loadFile(file)) {
        e.preventDefault();
        return;
      }
    }
  }

  // Image items ("Copy image" from another page, screenshot, ...)
  const items = clipboardData.items;
  if (!items) return;
  for (const item of items) {
    if (item.kind === "file" && item.type && item.type.startsWith("image/")) {
      const blob = item.getAsFile();
      if (blob && loadFile(blob)) {
        e.preventDefault();
        return;
      }
    }
  }
}

// Ctrl/Cmd + V paste support
window.addEventListener("paste", handlePaste);

// Pad offscreen canvas to avoid edge transparency with blur
function renderBlurredOffscreen() {
  if (!imageObjects) return;
  const blurValue = parseInt(blurIntensityInput.value, 10);
  const pad = blurValue;

  offscreenCanvas.width = imageObjects.width + pad * 2;
  offscreenCanvas.height = imageObjects.height + pad * 2;
  offscreenCtx.filter = `blur(${blurValue}px)`;
  offscreenCtx.drawImage(imageObjects, pad, pad);
}

// Map canvas coordinates from pointer/touch events, accounting for CSS transforms
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

// --- Selector handlers ---
function onSelectorMouseMove(e) {
  if (!isSelecting) return;
  selectionEnd = getPosFromEvent(e);
  updateCanvas();
}

function onSelectorMouseUp() {
  if (!isSelecting) return;
  isSelecting = false;
  applySelectorBlur();
  selectionStart = null;
  selectionEnd = null;
  updateCanvas();
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
  isSelecting = false;
  applySelectorBlur();
  selectionStart = null;
  selectionEnd = null;
  updateCanvas();
  document.removeEventListener("touchmove", onSelectorTouchMove);
  document.removeEventListener("touchend", onSelectorTouchEnd);
}

// --- mousedown ---
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

  const mode = document.querySelector('input[name="blurMode"]:checked').value;
  if (mode === "full") return;

  if (mode === "selector") {
    saveState();
    selectionStart = getPosFromEvent(e);
    selectionEnd = getPosFromEvent(e);
    isSelecting = true;
    updateCanvas();
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

canvas.addEventListener("mouseup", () => {
  isPanning = false;
  isDrawing = false;
});
canvas.addEventListener("mouseleave", () => {
  isPanning = false;
  isDrawing = false;
});

// --- Touch handlers ---
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

  const mode = document.querySelector('input[name="blurMode"]:checked').value;
  if (mode === "full") return;

  if (mode === "selector") {
    saveState();
    selectionStart = getPosFromEvent(e);
    selectionEnd = getPosFromEvent(e);
    isSelecting = true;
    updateCanvas();
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
  const mode = document.querySelector('input[name="blurMode"]:checked').value;
  const blurValue = blurIntensityInput.value;

  paintCtx.save();
  if (mode === "eraser") {
    paintCtx.globalCompositeOperation = "destination-out";
  } else {
    paintCtx.globalCompositeOperation = "source-over";
  }

  paintCtx.beginPath();
  paintCtx.arc(pos.x, pos.y, size, 0, Math.PI * 2, false);
  paintCtx.clip();

  if (mode === "brush") {
    paintCtx.filter = `blur(${blurValue}px)`;
    paintCtx.drawImage(imageObjects, 0, 0);
    paintCtx.filter = "none";
  } else if (mode === "eraser") {
    paintCtx.fill();
  }

  paintCtx.restore();
  updateCanvas();
}

function applySelectorBlur() {
  if (!selectionStart || !selectionEnd) return;

  const x = Math.min(selectionStart.x, selectionEnd.x);
  const y = Math.min(selectionStart.y, selectionEnd.y);
  const w = Math.abs(selectionEnd.x - selectionStart.x);
  const h = Math.abs(selectionEnd.y - selectionStart.y);

  if (w < 2 || h < 2) return;

  paintCtx.save();
  paintCtx.beginPath();
  paintCtx.rect(x, y, w, h);
  paintCtx.clip();
  paintCtx.filter = `blur(${blurIntensityInput.value}px)`;
  paintCtx.drawImage(imageObjects, 0, 0);
  paintCtx.filter = "none";
  paintCtx.restore();
}

downloadBtn.addEventListener("click", () => {
  if (!imageObjects) return;
  const link = document.createElement("a");
  link.download = "blurred_image.png";
  // Always render with blur applied on a fresh canvas so toDataURL captures it
  const mode = document.querySelector('input[name="blurMode"]:checked').value;
  if (mode === "full") {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    const blurValue = parseInt(blurIntensityInput.value, 10);
    tempCtx.filter = `blur(${blurValue}px)`;
    tempCtx.drawImage(imageObjects, 0, 0);
    link.href = tempCanvas.toDataURL("image/png");
  } else {
    link.href = canvas.toDataURL("image/png");
  }
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

  const mode = document.querySelector('input[name="blurMode"]:checked').value;
  if (mode === "full") {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    const blurValue = parseInt(blurIntensityInput.value, 10);
    tempCtx.filter = `blur(${blurValue}px)`;
    tempCtx.drawImage(imageObjects, 0, 0);
    tempCanvas.toBlob((blob) => {
      if (!blob) return;
      const item = new ClipboardItem({ "image/png": blob });
      navigator.clipboard.write([item]);
    });
  } else {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const item = new ClipboardItem({ "image/png": blob });
      navigator.clipboard.write([item]);
    });
  }

  setTimeout(() => {
    copyBtn.innerHTML = originalContent;
  }, 2000);
});
