const jsonInput = document.getElementById("json-input");
const jsonOutput = document.getElementById("json-output");
const formatBtn = document.getElementById("format-btn");
const minifyBtn = document.getElementById("minify-btn");
const clearBtn = document.getElementById("clear-btn");
const copyBtn = document.getElementById("copy-btn");
const inputStatus = document.getElementById("input-status");
const indentSelect = document.getElementById("json-indent");

function updateStatus(isValid, message) {
  inputStatus.textContent = message || (isValid ? "Valid JSON" : "Invalid JSON");
  inputStatus.className = `status-badge ${isValid ? "status-valid" : "status-invalid"}`;
  if (!message && !jsonInput.value.trim()) {
    inputStatus.textContent = "Empty";
    inputStatus.className = "status-badge";
  }
}

function getIndent() {
  const val = indentSelect.value;
  return val === "tab" ? "\t" : parseInt(val);
}

function formatJSON() {
  const input = jsonInput.value.trim();
  if (!input) {
    jsonOutput.textContent = "";
    updateStatus(true);
    return;
  }

  try {
    const obj = JSON.parse(input);
    const indent = getIndent();
    const formatted = JSON.stringify(obj, null, indent);
    jsonOutput.textContent = formatted;
    jsonOutput.style.color = "#e2e8f0";
    updateStatus(true);
  } catch (e) {
    jsonOutput.textContent = e.message;
    jsonOutput.style.color = "#ef4444";
    updateStatus(false);
  }
}

function minifyJSON() {
  const input = jsonInput.value.trim();
  if (!input) return;

  try {
    const obj = JSON.parse(input);
    const minified = JSON.stringify(obj);
    jsonOutput.textContent = minified;
    jsonOutput.style.color = "#e2e8f0";
    updateStatus(true);
  } catch (e) {
    jsonOutput.textContent = e.message;
    jsonOutput.style.color = "#ef4444";
    updateStatus(false);
  }
}

formatBtn.addEventListener("click", formatJSON);
minifyBtn.addEventListener("click", minifyJSON);

clearBtn.addEventListener("click", () => {
  jsonInput.value = "";
  jsonOutput.textContent = "";
  updateStatus(true);
});

copyBtn.addEventListener("click", () => {
  const text = jsonOutput.textContent;
  if (!text) return;

  const originalContent = copyBtn.innerHTML;
  navigator.clipboard.writeText(text).then(() => {
    copyBtn.innerHTML = `
      <span class="copy-icon-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </span>
      <span>Copied!</span>
    `;
    setTimeout(() => {
      copyBtn.innerHTML = originalContent;
    }, 2000);
  });
});

// CUSTOM SELECT LOGIC (Ported from qr-gen)
document.querySelectorAll(".custom-select-container").forEach((container) => {
  const trigger = container.querySelector(".select-trigger");
  const options = container.querySelectorAll(".select-option");
  const nativeSelect = container.querySelector(".native-select");
  const labelText = trigger.querySelector("span");

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    document.querySelectorAll(".custom-select-container").forEach((other) => {
      if (other !== container) other.classList.remove("active");
    });
    container.classList.toggle("active");
  });

  options.forEach((option) => {
    option.addEventListener("click", () => {
      const value = option.dataset.value;
      const text = option.textContent.trim();
      labelText.textContent = text;
      options.forEach((opt) => opt.classList.remove("selected"));
      option.classList.add("selected");
      nativeSelect.value = value;
      container.classList.remove("active");
      formatJSON(); // Auto-reformat on indent change
    });
  });
});

document.addEventListener("click", () => {
  document.querySelectorAll(".custom-select-container").forEach((container) => {
    container.classList.remove("active");
  });
});

// Real-time validation
jsonInput.addEventListener("input", () => {
  const input = jsonInput.value.trim();
  if (!input) {
    updateStatus(true);
    return;
  }
  try {
    JSON.parse(input);
    updateStatus(true);
  } catch (e) {
    updateStatus(false);
  }
});
