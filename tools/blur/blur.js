const upload = document.getElementById('image-upload');
const canvas = document.getElementById('blurry-canvas');
const ctx = canvas.getContext('2d');
const brushSizeInput = document.getElementById('brush-size');
const blurIntensityInput = document.getElementById('blur-intensity');
const sizeVal = document.getElementById('size-val');
const blurVal = document.getElementById('blur-val');
const downloadBtn = document.getElementById('download-btn');

let imageObjects = null;
let isDrawing = false;
let offscreenCanvas = document.createElement('canvas');
let offscreenCtx = offscreenCanvas.getContext('2d');
const modeRadios = document.querySelectorAll('input[name="blurMode"]');
const brushSizeContainer = document.getElementById('brush-size-container');

// Import Mode Elements
const importModeRadios = document.querySelectorAll('input[name="importMode"]');
const fileContainer = document.getElementById('file-import-container');
const clipboardContainer = document.getElementById('clipboard-import-container');
const pasteArea = document.getElementById('paste-area');

// A secondary canvas to keep track of painted strokes
let paintCanvas = document.createElement('canvas');
let paintCtx = paintCanvas.getContext('2d');
let blurHistory = [];
const maxHistory = 20;

// Preview Brush state
let showBrushPreview = false;
let previewTimeout = null;

function saveState() {
  if (blurHistory.length >= maxHistory) {
    blurHistory.shift();
  }
  blurHistory.push(paintCtx.getImageData(0, 0, paintCanvas.width, paintCanvas.height));
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

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    undo();
  }
});

// Transform state for zooming and panning
let currentTransform = { x: 0, y: 0, scale: 1 };
let isPanning = false;
let startPan = { x: 0, y: 0 };
const canvasContainer = document.querySelector('.canvas-container');

// Prevent context menu on right click
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

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
    currentTransform.x = Math.min(0, Math.max(currentTransform.x, containerW - scaledW));
  } else {
    currentTransform.x = (containerW - scaledW) / 2;
  }

  // Constrain Y: image must stay within its natural displayed height
  if (scaledH > naturalH) {
    currentTransform.y = Math.min(0, Math.max(currentTransform.y, naturalH - scaledH));
  } else {
    currentTransform.y = 0;
  }

  canvas.style.transformOrigin = '0 0';
  canvas.style.transform = `translate(${currentTransform.x}px, ${currentTransform.y}px) scale(${currentTransform.scale})`;
}

canvasContainer.addEventListener('wheel', (e) => {
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
}, { passive: false });

function updateCanvas() {
  if (!imageObjects) return;
  const mode = document.querySelector('input[name="blurMode"]:checked').value;
  
  if (mode === 'full') {
    brushSizeContainer.style.display = 'none';
    // Just draw the blurred offscreen layer on main canvas
    ctx.drawImage(offscreenCanvas, 0, 0);
  } else {
    brushSizeContainer.style.display = 'block';
    // Draw original image, then overlay the painted strokes
    ctx.drawImage(imageObjects, 0, 0);
    ctx.drawImage(paintCanvas, 0, 0);
  }

  if (showBrushPreview) {
    drawBrushPreview();
  }
}

function drawBrushPreview() {
  if (!showBrushPreview || !imageObjects) return;
  
  const size = parseInt(brushSizeInput.value, 10);
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  
  ctx.save();
  // Outer shadow/border for visibility
  ctx.beginPath();
  ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.lineWidth = 3;
  ctx.stroke();
  
  // Main dashed circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

modeRadios.forEach(radio => radio.addEventListener('change', updateCanvas));

brushSizeInput.addEventListener('input', (e) => {
  sizeVal.textContent = e.target.value;
  
  if (imageObjects) {
    showBrushPreview = true;
    updateCanvas();
    
    clearTimeout(previewTimeout);
    previewTimeout = setTimeout(() => {
      showBrushPreview = false;
      updateCanvas();
    }, 1000);
  }
});
blurIntensityInput.addEventListener('input', (e) => {
  blurVal.textContent = e.target.value;
  if(imageObjects) {
    renderBlurredOffscreen();
    updateCanvas();
  }
});

function loadImage(src) {
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    offscreenCanvas.width = img.width;
    offscreenCanvas.height = img.height;
    paintCanvas.width = img.width;
    paintCanvas.height = img.height;
    
    blurHistory = []; // Reset history for new image
    
    imageObjects = img;

    // Hide placeholder and show canvas
    const placeholder = document.getElementById('canvas-placeholder');
    if (placeholder) placeholder.style.display = 'none';
    canvas.style.display = 'block';

    // Let CSS handle initial fit via max-width: 100%; height: auto
    currentTransform = { x: 0, y: 0, scale: 1 };
    canvas.style.transform = 'none';

    renderBlurredOffscreen();
    updateCanvas();
  };
  img.src = src;
}

importModeRadios.forEach(radio => {
  radio.addEventListener('change', (e) => {
    if (e.target.value === 'file') {
      fileContainer.style.display = 'block';
      clipboardContainer.style.display = 'none';
    } else {
      fileContainer.style.display = 'none';
      clipboardContainer.style.display = 'block';
    }
  });
});

upload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => loadImage(event.target.result);
  reader.readAsDataURL(file);
});

// Clipboard Logic
async function handlePaste(e) {
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  for (const item of items) {
    if (item.type.indexOf('image') !== -1) {
      const blob = item.getAsFile();
      const reader = new FileReader();
      reader.onload = (event) => loadImage(event.target.result);
      reader.readAsDataURL(blob);
      break;
    }
  }
}

window.addEventListener('paste', handlePaste);

pasteArea.addEventListener('click', async () => {
  try {
    // Try using the modern Clipboard API first
    const clipboardItems = await navigator.clipboard.read();
    for (const clipboardItem of clipboardItems) {
      for (const type of clipboardItem.types) {
        if (type.startsWith('image/')) {
          const blob = await clipboardItem.getType(type);
          const reader = new FileReader();
          reader.onload = (event) => loadImage(event.target.result);
          reader.readAsDataURL(blob);
          return;
        }
      }
    }
  } catch (err) {
    // Fallback if Clipboard API fails (e.g. permission or not supported)
    console.error('Clipboard API failed, please use Ctrl+V', err);
    // We can't programmatically trigger a paste event for security reasons,
    // but the window listener is already active for Ctrl+V.
  }
});

function renderBlurredOffscreen() {
  if (!imageObjects) return;
  // Apply a blur to the entire offscreen canvas
  offscreenCtx.filter = `blur(${blurIntensityInput.value}px)`;
  offscreenCtx.drawImage(imageObjects, 0, 0);
}

function getMousePos(evt) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  return {
    x: (evt.clientX - rect.left) * scaleX,
    y: (evt.clientY - rect.top) * scaleY
  };
}

canvas.addEventListener('mousedown', (e) => {
  if (!imageObjects) return;

  if (e.button === 2) { // Right click for panning
    if (currentTransform.scale <= 1) return; // Nothing to pan at natural size
    isPanning = true;
    startPan = { x: e.clientX - currentTransform.x, y: e.clientY - currentTransform.y };
    return;
  }

  const mode = document.querySelector('input[name="blurMode"]:checked').value;
  if (mode !== 'brush') return;
  
  saveState(); // Save state before drawing begins
  
  isDrawing = true;
  drawBlur(e);
});

canvas.addEventListener('mousemove', (e) => {
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

canvas.addEventListener('mouseup', () => {
  isPanning = false;
  isDrawing = false;
});
canvas.addEventListener('mouseleave', () => {
  isPanning = false;
  isDrawing = false;
});

function drawBlur(e) {
  const pos = getMousePos(e);
  const size = parseInt(brushSizeInput.value, 10);
  
  // draw the blurred portion on paintCanvas
  paintCtx.save();
  paintCtx.beginPath();
  paintCtx.arc(pos.x, pos.y, size, 0, Math.PI * 2, false);
  paintCtx.clip();
  
  paintCtx.drawImage(offscreenCanvas, 0, 0);
  paintCtx.restore();
  
  // update the display
  updateCanvas();
}

downloadBtn.addEventListener('click', () => {
  if (!imageObjects) return;
  const link = document.createElement('a');
  link.download = 'blurred_image.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});
