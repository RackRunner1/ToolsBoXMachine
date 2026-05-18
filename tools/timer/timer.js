document.addEventListener("DOMContentLoaded", () => {
  const timeDisplay = document.getElementById("time-display");
  const timeLabel = document.getElementById("time-label");
  const progressCircle = document.getElementById("timer-progress");
  const startBtn = document.getElementById("start-btn");
  const startText = document.getElementById("start-text");
  const startIcon = document.getElementById("start-icon");
  const resetBtn = document.getElementById("reset-btn");

  const applyCustomBtn = document.getElementById("apply-custom-btn");
  const customInputs = document.getElementById("custom-inputs");
  const customH = document.getElementById("custom-h");
  const customM = document.getElementById("custom-m");
  const customS = document.getElementById("custom-s");

  const fullscreenBtn = document.getElementById("fullscreen-btn");
  const timerMainArea = document.getElementById("timer-main-area");

  // Focus Stats Elements
  const sessionsCountEl = document.getElementById("sessions-count");
  const totalFocusTimeEl = document.getElementById("total-focus-time");
  const clearStatsBtn = document.getElementById("clear-stats-btn");

  let stats = JSON.parse(localStorage.getItem("tbxm_timer_stats")) || {
    sessions: 0,
    totalTime: 0,
  };

  function updateStatsUI() {
    if (sessionsCountEl) sessionsCountEl.textContent = stats.sessions;
    if (totalFocusTimeEl) {
      if (stats.totalTime < 60) {
        totalFocusTimeEl.textContent = `${stats.totalTime}m`;
      } else {
        const hrs = Math.floor(stats.totalTime / 60);
        const mins = stats.totalTime % 60;
        totalFocusTimeEl.textContent = `${hrs}h ${mins}m`;
      }
    }
  }

  if (clearStatsBtn) {
    clearStatsBtn.addEventListener("click", () => {
      stats = { sessions: 0, totalTime: 0 };
      localStorage.setItem("tbxm_timer_stats", JSON.stringify(stats));
      updateStatsUI();
    });
  }

  updateStatsUI();

  // Audio for alarm
  const alarmSound = new Audio(
    "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
  );

  // Audio for tick
  const tickSound = new Audio(
    "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
  );
  tickSound.volume = 0.15;

  const tickingSoundToggle = document.getElementById("ticking-sound-toggle");

  let timerInterval;
  let totalSeconds = 25 * 60;
  let remainingSeconds = totalSeconds;
  let isRunning = false;

  // Total circumference for r=160
  const circumference = 2 * Math.PI * 160;
  progressCircle.style.strokeDasharray = circumference;

  // Sounds Map
  const sounds = {
    digital:
      "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
    beep: "https://assets.mixkit.co/active_storage/sfx/911/911-preview.mp3",
    chime: "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3",
  };

  const volumeSlider = document.getElementById("alarm-volume");
  const volumeVal = document.getElementById("volume-val");
  const soundSelect = document.getElementById("alarm-sound-select");

  if (soundSelect) {
    soundSelect.addEventListener("change", (e) => {
      const selectedSound = e.target.value;
      alarmSound.src = sounds[selectedSound] || sounds.digital;
      alarmSound.play().catch((err) => console.log("Sound test failed:", err));
    });
  }

  if (volumeSlider) {
    volumeSlider.addEventListener("input", (e) => {
      const vol = e.target.value;
      if (volumeVal) volumeVal.textContent = `${vol}%`;
      alarmSound.volume = vol / 100;
    });
    // Set initial volume
    alarmSound.volume = volumeSlider.value / 100;
  }

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
      selectContainers.forEach((c) => {
        if (c !== container) c.classList.remove("active");
      });
      container.classList.toggle("active");
    });

    options.forEach((option) => {
      option.addEventListener("click", () => {
        const val = option.dataset.value;

        if (val === "custom") {
          customInputs.classList.add("active");
          applyCustomBtn.classList.add("active");

          options.forEach((opt) => opt.classList.remove("selected"));
          option.classList.add("selected");
          labelSpan.textContent = option.textContent;
          nativeSelect.value = val;
          container.classList.remove("active");
          nativeSelect.dispatchEvent(new Event("change"));
          return;
        } else {
          if (container.dataset.id === "timer-mode") {
            customInputs.classList.remove("active");
            applyCustomBtn.classList.remove("active");
            let seconds = parseInt(val, 10) * 60;
            changeMode(seconds, false);
          }

          labelSpan.textContent = option.textContent;

          options.forEach((opt) => opt.classList.remove("selected"));
          option.classList.add("selected");

          nativeSelect.value = val;
          container.classList.remove("active");
          nativeSelect.dispatchEvent(new Event("change"));
        }
      });
    });
  });

  if (applyCustomBtn) {
    applyCustomBtn.addEventListener("click", () => {
      const h = parseInt(customH.value) || 0;
      const m = parseInt(customM.value) || 0;
      const s = parseInt(customS.value) || 0;

      const totalSecs = h * 3600 + m * 60 + s;
      if (totalSecs <= 0) return;

      const triggerLabel = document.querySelector(".select-trigger span");
      triggerLabel.textContent = `Custom (${h > 0 ? h + ":" : ""}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")})`;

      changeMode(totalSecs, true);
    });
  }

  document.addEventListener("click", () => {
    selectContainers.forEach((c) => c.classList.remove("active"));
  });

  function updateDisplay() {
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;

    let timeString = "";
    if (hours > 0) {
      timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      timeDisplay.classList.add("long-format");
    } else {
      timeString = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      timeDisplay.classList.remove("long-format");
    }

    timeDisplay.textContent = timeString;
    document.title = `${timeString} - Pomodoro Timer`;

    const offset =
      circumference - (remainingSeconds / totalSeconds) * circumference;
    progressCircle.style.strokeDashoffset = offset;
  }

  function changeMode(seconds, isCustom = false) {
    pauseTimer();
    totalSeconds = seconds;
    remainingSeconds = totalSeconds;

    if (isCustom) {
      timeLabel.textContent = "Custom";
      progressCircle.classList.remove("break-mode");
    } else if (seconds === 25 * 60) {
      timeLabel.textContent = "Focus";
      progressCircle.classList.remove("break-mode");
    } else {
      timeLabel.textContent = seconds === 5 * 60 ? "Short Break" : "Long Break";
      progressCircle.classList.add("break-mode");
    }

    updateDisplay();
  }

  function toggleTimer() {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }

  function startTimer() {
    if (remainingSeconds === 0) return;

    isRunning = true;
    startText.textContent = "Pause Timer";
    startIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    timerInterval = setInterval(() => {
      remainingSeconds--;
      updateDisplay();

      // Play tick sound if checkbox is checked
      if (
        tickingSoundToggle &&
        tickingSoundToggle.checked &&
        remainingSeconds > 0
      ) {
        tickSound.currentTime = 0;
        tickSound.play().catch((e) => console.log("Tick play failed:", e));
      }

      if (remainingSeconds <= 0) {
        clearInterval(timerInterval);
        isRunning = false;
        alarmSound.play().catch((e) => console.log("Audio play failed:", e));

        // Show notification
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Timer Finished!", {
            body: `${timeLabel.textContent} session has ended!`,
            icon: "/.assets/logo/fav.png",
          });
        }

        // Record focus session stats
        if (
          timeLabel.textContent !== "Short Break" &&
          timeLabel.textContent !== "Long Break"
        ) {
          stats.sessions++;
          stats.totalTime += Math.round(totalSeconds / 60);
          localStorage.setItem("tbxm_timer_stats", JSON.stringify(stats));
          updateStatsUI();
        }

        startText.textContent = "Start Timer";
        startIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
      }
    }, 1000);
  }

  function pauseTimer() {
    isRunning = false;
    clearInterval(timerInterval);
    startText.textContent = "Resume Timer";
    startIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
  }

  function resetTimer() {
    pauseTimer();
    remainingSeconds = totalSeconds;
    updateDisplay();
    startText.textContent = "Start Timer";
  }

  startBtn.addEventListener("click", toggleTimer);
  resetBtn.addEventListener("click", resetTimer);

  if (fullscreenBtn && timerMainArea) {
    fullscreenBtn.addEventListener("click", () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (timerMainArea.requestFullscreen) {
          timerMainArea.requestFullscreen().catch((err) => console.error(err));
        } else if (timerMainArea.webkitRequestFullscreen) {
          timerMainArea.webkitRequestFullscreen();
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

  // Keyboard Shortcuts
  document.addEventListener("keydown", (e) => {
    const activeElement = document.activeElement;
    if (
      activeElement &&
      (activeElement.tagName === "INPUT" ||
        activeElement.tagName === "SELECT" ||
        activeElement.tagName === "TEXTAREA")
    ) {
      return;
    }
    if (e.code === "Space") {
      e.preventDefault();
      toggleTimer();
    } else if (e.key.toLowerCase() === "r") {
      resetTimer();
    } else if (e.key.toLowerCase() === "f") {
      if (fullscreenBtn) fullscreenBtn.click();
    }
  });

  // Initialize
  updateDisplay();
});
