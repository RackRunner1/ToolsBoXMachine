(() => {
  const clockMain = document.getElementById("clock-main");
  const analogClock = document.getElementById("analog-clock");
  const handHour = document.getElementById("hand-hour");
  const handMinute = document.getElementById("hand-minute");
  const handSecond = document.getElementById("hand-second");
  const centerDot = document.getElementById("center-dot");
  const digitalTime = document.getElementById("digital-time");
  const dateDisplay = document.getElementById("date-display");
  const formatSection = document.getElementById("format-section");
  const fullscreenBtn = document.getElementById("fullscreen-btn");

  const toggleSeconds = document.getElementById("toggle-seconds");
  const toggleDate = document.getElementById("toggle-date");
  const colorSection = document.getElementById("color-section");

  let accentColor = "#3b82f6";
  let format24 = true;
  let timezone = "local";
  let mode = "analog";

  // Build tick marks
  function buildTicks() {
    for (let i = 0; i < 60; i++) {
      const tick = document.createElement("div");
      tick.className = "tick-mark" + (i % 5 === 0 ? " major" : "");
      const angle = i * 6;
      const radius = 136;
      const rad = ((angle - 90) * Math.PI) / 180;
      const isSmall = i % 5 !== 0;
      const len = isSmall ? 6 : 10;
      const cx = 150;
      const cy = 150;
      const x1 = cx + (radius - len) * Math.cos(rad);
      const y1 = cy + (radius - len) * Math.sin(rad);
      const x2 = cx + radius * Math.cos(rad);
      const y2 = cy + radius * Math.sin(rad);
      tick.style.cssText = `
        position: absolute;
        left: ${x1}px;
        top: ${y1}px;
        width: ${isSmall ? 1.5 : 2.5}px;
        height: ${len}px;
        background: ${isSmall ? "#334155" : "#475569"};
        transform-origin: center top;
        transform: rotate(${angle}deg);
        border-radius: 1px;
      `;
      analogClock.appendChild(tick);
    }
  }

  // Build numbers
  function buildNumbers() {
    const radius = 115;
    const cx = 150;
    const cy = 150;
    for (let i = 1; i <= 12; i++) {
      const angle = i * 30 - 90;
      const rad = (angle * Math.PI) / 180;
      const x = cx + radius * Math.cos(rad);
      const y = cy + radius * Math.sin(rad);
      const num = document.createElement("div");
      num.className = "number";
      num.textContent = i;
      num.style.left = `${x}px`;
      num.style.top = `${y}px`;
      num.style.transform = "translate(-50%, -50%)";
      analogClock.appendChild(num);
    }
  }

  function applyColor(color) {
    handSecond.style.background = color;
    centerDot.style.background = color;
    clockMain.style.setProperty("--accent", color);
  }

  function getTime() {
    const now = new Date();
    if (timezone === "local") return now;
    const str = now.toLocaleString("en-US", { timeZone: timezone });
    return new Date(str);
  }

  function updateClock() {
    const now = getTime();
    const h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();
    const ms = now.getMilliseconds();

    // Analog
    if (mode === "analog") {
      analogClock.style.display = "";
      digitalTime.style.display = "none";

      const secDeg = s * 6 + ms * 0.006;
      const minDeg = m * 6 + s * 0.1;
      const hrDeg = (h % 12) * 30 + m * 0.5;

      handSecond.style.transform = `translateX(-50%) rotate(${secDeg}deg)`;
      handMinute.style.transform = `translateX(-50%) rotate(${minDeg}deg)`;
      handHour.style.transform = `translateX(-50%) rotate(${hrDeg}deg)`;

      handSecond.style.display = toggleSeconds.checked ? "" : "none";
    }

    // Digital
    if (mode === "digital") {
      analogClock.style.display = "none";
      digitalTime.style.display = "";

      let displayH = h;
      let period = "";
      if (!format24) {
        period = h >= 12 ? " PM" : " AM";
        displayH = h % 12 || 12;
      }
      const pad = (n) => String(n).padStart(2, "0");
      let timeStr = `${pad(displayH)}:${pad(m)}`;
      if (toggleSeconds.checked) {
        timeStr += `:${pad(s)}`;
      }
      digitalTime.textContent = timeStr;
      if (period) {
        const span = document.createElement("span");
        span.className = "time-period";
        span.textContent = period;
        digitalTime.appendChild(span);
      }
    }

    // Date
    if (toggleDate.checked) {
      const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
      dateDisplay.textContent = now.toLocaleDateString("en-US", options);
      dateDisplay.style.display = "";
    } else {
      dateDisplay.style.display = "none";
    }

    requestAnimationFrame(updateClock);
  }

  function setMode(newMode) {
    mode = newMode;
    formatSection.style.display = mode === "digital" ? "" : "none";
    colorSection.style.display = mode === "digital" ? "none" : "";
  }

  // Custom select
  function setupSelect(containerId, onChange) {
    const container = document.getElementById(containerId);
    const trigger = container.querySelector(".select-trigger");
    const options = container.querySelector(".select-options");

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".custom-select-container").forEach((c) => {
        if (c !== container) c.classList.remove("open");
      });
      container.classList.toggle("open");
    });

    options.querySelectorAll(".select-option").forEach((opt) => {
      opt.addEventListener("click", () => {
        options.querySelectorAll(".select-option").forEach((o) => o.classList.remove("selected"));
        opt.classList.add("selected");
        trigger.querySelector("span:first-child").textContent = opt.textContent;
        container.classList.remove("open");
        onChange(opt.dataset.value);
      });
    });
  }

  document.addEventListener("click", () => {
    document.querySelectorAll(".custom-select-container").forEach((c) => c.classList.remove("open"));
  });

  setupSelect("mode-select", (val) => {
    setMode(val);
  });

  setupSelect("format-select", (val) => {
    format24 = val === "24";
  });

  setupSelect("timezone-select", (val) => {
    timezone = val;
  });

  const fontMap = {
    mono: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
    sans: "system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', Times, serif",
    display: "'Trebuchet MS', 'Lucida Grande', 'Lucida Sans', Arial, sans-serif",
    handwriting: "Comic Sans MS, cursive",
  };

  setupSelect("font-select", (val) => {
    document.documentElement.style.setProperty("--clock-font", fontMap[val] || fontMap.mono);
  });

  // Color swatches
  document.querySelectorAll(".color-swatch").forEach((swatch) => {
    swatch.addEventListener("click", () => {
      document.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("active"));
      swatch.classList.add("active");
      accentColor = swatch.dataset.color;
      applyColor(accentColor);
    });
  });

  // Fullscreen
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (clockMain.requestFullscreen) {
          clockMain.requestFullscreen().catch((err) => console.error(err));
        } else if (clockMain.webkitRequestFullscreen) {
          clockMain.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    });

    const updateFullscreenIcon = () => {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        fullscreenBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>`;
      } else {
        fullscreenBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>`;
      }
    };

    document.addEventListener("fullscreenchange", updateFullscreenIcon);
    document.addEventListener("webkitfullscreenchange", updateFullscreenIcon);
  }

  // Init
  buildTicks();
  buildNumbers();
  applyColor(accentColor);
  setMode(mode);
  requestAnimationFrame(updateClock);
})();
