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
  const mode = document.querySelector('input[name="blurMode"]:checked').value;
  if (mode !== 'brush') return;
  
  isDrawing = true;
  drawBlur(e);
});

canvas.addEventListener('mousemove', (e) => {
  if (isDrawing) {
    drawBlur(e);
  }
});

canvas.addEventListener('mouseup', () => isDrawing = false);
canvas.addEventListener('mouseleave', () => isDrawing = false);

function drawBlur(e) {
  const pos = getMousePos(e);
  const size = parseInt(brushSizeInput.value, 10);
  
  // on dessine la portion floutée sur paintCanvas
  paintCtx.save();
  paintCtx.beginPath();
  paintCtx.arc(pos.x, pos.y, size, 0, Math.PI * 2, false);
  paintCtx.clip();
  
  paintCtx.drawImage(offscreenCanvas, 0, 0);
  paintCtx.restore();
  
  // on met à jour l'affichage
  updateCanvas();
}

downloadBtn.addEventListener('click', () => {
  if (!imageObjects) return;
  const link = document.createElement('a');
  link.download = 'blurred_image.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});
