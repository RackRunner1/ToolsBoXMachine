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

// A secondary canvas to keep track of painted strokes
let paintCanvas = document.createElement('canvas');
let paintCtx = paintCanvas.getContext('2d');

// Transform state for zooming and panning
let currentTransform = { x: 0, y: 0, scale: 1 };
let isPanning = false;
let startPan = { x: 0, y: 0 };
const canvasContainer = document.querySelector('.canvas-container');

// Prevent context menu on right click
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function applyTransform() {
  if (!imageObjects) return;
  
  const containerRect = canvasContainer.getBoundingClientRect();
  const scaledWidth = canvas.width * currentTransform.scale;
  const scaledHeight = canvas.height * currentTransform.scale;

  // Constrain X
  if (scaledWidth > containerRect.width) {
    currentTransform.x = Math.min(0, Math.max(currentTransform.x, containerRect.width - scaledWidth));
  } else {
    currentTransform.x = (containerRect.width - scaledWidth) / 2;
  }

  // Constrain Y
  if (scaledHeight > containerRect.height) {
    currentTransform.y = Math.min(0, Math.max(currentTransform.y, containerRect.height - scaledHeight));
  } else {
    currentTransform.y = (containerRect.height - scaledHeight) / 2;
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
}

modeRadios.forEach(radio => radio.addEventListener('change', updateCanvas));

brushSizeInput.addEventListener('input', (e) => sizeVal.textContent = e.target.value);
blurIntensityInput.addEventListener('input', (e) => {
  blurVal.textContent = e.target.value;
  if(imageObjects) {
    renderBlurredOffscreen();
    updateCanvas();
  }
});

upload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      offscreenCanvas.width = img.width;
      offscreenCanvas.height = img.height;
      paintCanvas.width = img.width;
      paintCanvas.height = img.height;
      
      imageObjects = img;

      // Hide placeholder and show canvas
      const placeholder = document.getElementById('canvas-placeholder');
      if (placeholder) placeholder.style.display = 'none';
      canvas.style.display = 'block';

      // Reset zoom transform
      currentTransform = { x: 0, y: 0, scale: 1 };
      applyTransform();

      renderBlurredOffscreen();
      updateCanvas();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
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
    isPanning = true;
    startPan = { x: e.clientX - currentTransform.x, y: e.clientY - currentTransform.y };
    return;
  }

  const mode = document.querySelector('input[name="blurMode"]:checked').value;
  if (mode !== 'brush') return;
  
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
