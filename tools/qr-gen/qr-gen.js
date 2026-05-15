const qrInput = document.getElementById("qr-text");
const qrColorDark = document.getElementById("qr-color-dark");
const qrColorLight = document.getElementById("qr-color-light");
const qrSize = document.getElementById("qr-size");
const sizeValue = document.getElementById("size-value");
const qrcodeDiv = document.getElementById("qrcode");
const qrContainer = document.getElementById("qr-container");
const qrPlaceholder = document.getElementById("qr-placeholder");
const downloadBtn = document.getElementById("download-qr");
const copyBtn = document.getElementById("copy-btn");

let debounceTimer;

function generateQR() {
  const text = qrInput.value.trim();

  if (!text) {
    qrContainer.classList.add("empty");
    qrcodeDiv.innerHTML = "";
    qrPlaceholder.style.display = "block";
    downloadBtn.disabled = true;
    return;
  }

  qrContainer.classList.remove("empty");
  qrPlaceholder.style.display = "none";
  qrcodeDiv.innerHTML = "";
  downloadBtn.disabled = false;

  const size = parseInt(qrSize.value);

  QRCode.toCanvas(
    document.createElement("canvas"),
    text,
    {
      width: size,
      margin: 2,
      color: {
        dark: qrColorDark.value,
        light: qrColorLight.value,
      },
    },
    function (error, canvas) {
      if (error) {
        console.error(error);
        return;
      }
      qrcodeDiv.appendChild(canvas);
      canvas.style.maxWidth = "100%";
      canvas.style.height = "auto";
    },
  );
}

function handleInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(generateQR, 300);
}

qrInput.addEventListener("input", handleInput);
qrColorDark.addEventListener("input", generateQR);
qrColorLight.addEventListener("input", () => {
  generateQR();
  qrContainer.style.backgroundColor = qrColorLight.value;
});
qrSize.addEventListener("input", () => {
  sizeValue.textContent = `${qrSize.value}px`;
  generateQR();
});

downloadBtn.addEventListener("click", () => {
  const canvas = qrcodeDiv.querySelector("canvas");
  if (!canvas) return;

  const link = document.createElement("a");
  link.download = "tbxm-qrcode.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

copyBtn.addEventListener("click", () => {
  const canvas = qrcodeDiv.querySelector("canvas");
  if (!canvas) return;

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

  canvas.toBlob((blob) => {
    if (!blob) return;

    // works only if the page use HTTPS protocol
    const item = new ClipboardItem({ "image/png": blob });
    navigator.clipboard.write([item]);
  });

  setTimeout(() => {
    copyBtn.innerHTML = originalContent;
  }, 2000);
});

// Initial state
sizeValue.textContent = `${qrSize.value}px`;
qrContainer.style.backgroundColor = qrColorLight.value;
