const qrInput = document.getElementById('qr-text');
const qrColorDark = document.getElementById('qr-color-dark');
const qrColorLight = document.getElementById('qr-color-light');
const qrSize = document.getElementById('qr-size');
const sizeValue = document.getElementById('size-value');
const qrcodeDiv = document.getElementById('qrcode');
const qrContainer = document.getElementById('qr-container');
const qrPlaceholder = document.getElementById('qr-placeholder');
const downloadBtn = document.getElementById('download-qr');

let debounceTimer;

function generateQR() {
  const text = qrInput.value.trim();
  
  if (!text) {
    qrContainer.classList.add('empty');
    qrcodeDiv.innerHTML = '';
    qrPlaceholder.style.display = 'block';
    downloadBtn.disabled = true;
    return;
  }

  qrContainer.classList.remove('empty');
  qrPlaceholder.style.display = 'none';
  qrcodeDiv.innerHTML = '';
  downloadBtn.disabled = false;

  const size = parseInt(qrSize.value);
  
  QRCode.toCanvas(document.createElement('canvas'), text, {
    width: size,
    margin: 2,
    color: {
      dark: qrColorDark.value,
      light: qrColorLight.value
    }
  }, function (error, canvas) {
    if (error) {
      console.error(error);
      return;
    }
    qrcodeDiv.appendChild(canvas);
    canvas.style.maxWidth = '100%';
    canvas.style.height = 'auto';
  });
}

function handleInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(generateQR, 300);
}

qrInput.addEventListener('input', handleInput);
qrColorDark.addEventListener('input', generateQR);
qrColorLight.addEventListener('input', generateQR);
qrSize.addEventListener('input', () => {
  sizeValue.textContent = `${qrSize.value}px`;
  generateQR();
});

downloadBtn.addEventListener('click', () => {
  const canvas = qrcodeDiv.querySelector('canvas');
  if (!canvas) return;

  const link = document.createElement('a');
  link.download = 'tbxm-qrcode.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

// Initial state
sizeValue.textContent = `${qrSize.value}px`;
