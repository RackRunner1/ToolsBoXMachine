document.addEventListener("DOMContentLoaded", () => {
  const inputEl = document.getElementById("b64-input");
  const outputEl = document.getElementById("b64-output");
  const modeSelect = document.getElementById("b64-mode");
  const clearBtn = document.getElementById("clear-btn");
  const copyBtn = document.getElementById("copy-btn");

  // Custom Select Logic
  const selectContainers = document.querySelectorAll(
    ".custom-select-container",
  );
  selectContainers.forEach((container) => {
    const trigger = container.querySelector(".select-trigger");
    const options = container.querySelectorAll(".select-option");
    const nativeSelect = document.getElementById(container.dataset.id);
    const labelSpan = trigger.querySelector("span");

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      // Close others
      selectContainers.forEach((c) => {
        if (c !== container) c.classList.remove("active");
      });
      container.classList.toggle("active");
    });

    options.forEach((option) => {
      option.addEventListener("click", () => {
        // Remove selected from all
        options.forEach((opt) => opt.classList.remove("selected"));
        // Add selected to clicked
        option.classList.add("selected");
        // Update label
        labelSpan.textContent = option.textContent;
        // Update native select
        nativeSelect.value = option.dataset.value;
        // Close dropdown
        container.classList.remove("active");

        // Trigger conversion on mode change
        convert();
      });
    });
  });

  // Close selects on outside click
  document.addEventListener("click", () => {
    selectContainers.forEach((c) => c.classList.remove("active"));
  });

  // Conversion Logic
  function convert() {
    const text = inputEl.value;
    const mode = modeSelect.value;

    if (!text) {
      outputEl.value = "";
      return;
    }

    try {
      if (mode === "encode") {
        outputEl.value = btoa(unescape(encodeURIComponent(text)));
      } else {
        outputEl.value = decodeURIComponent(escape(atob(text)));
      }
    } catch (e) {
      outputEl.value = "Invalid input for " + mode;
    }
  }

  inputEl.addEventListener("input", convert);

  // Clear button
  clearBtn.addEventListener("click", () => {
    inputEl.value = "";
    outputEl.value = "";
    inputEl.focus();
  });

  // Copy Result
  copyBtn.addEventListener("click", () => {
    const text = outputEl.value;
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      const originalIcon = copyBtn.querySelector(".copy-icon-original");
      originalIcon.classList.add("fade");

      const checkIcon = document.createElement("div");
      checkIcon.className = "copy-icon-check";
      checkIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="checkmark">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
      originalIcon.parentNode.appendChild(checkIcon);

      setTimeout(() => {
        checkIcon.remove();
        originalIcon.classList.remove("fade");
      }, 2000);
    });
  });
});
