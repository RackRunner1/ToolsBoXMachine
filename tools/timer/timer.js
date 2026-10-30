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

  const sessionsCountEl = document.getElementById("sessions-count");
  const totalFocusTimeEl = document.getElementById("total-focus-time");
  const clearStatsBtn = document.getElementById("clear-stats-btn");

  const pad = (n) => n.toString().padStart(2, "0");

  const playIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
  const pauseIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;

  let stats = JSON.parse(localStorage.getItem("tbxm_timer_stats")) || {
    sessions: 0,
    totalTime: 0,
  };

  function updateStatsUI() {
    sessionsCountEl.textContent = stats.sessions;
    if (stats.totalTime < 60) {
      totalFocusTimeEl.textContent = `${stats.totalTime}m`;
    } else {
      const hrs = Math.floor(stats.totalTime / 60);
      const mins = stats.totalTime % 60;
      totalFocusTimeEl.textContent = `${hrs}h ${mins}m`;
    }
  }

  clearStatsBtn.addEventListener("click", () => {
    stats = { sessions: 0, totalTime: 0 };
    localStorage.setItem("tbxm_timer_stats", JSON.stringify(stats));
    updateStatsUI();
  });

  updateStatsUI();

  let audioCtx = null;
  let masterVolume = 0.5;
  function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function playTone(freq, duration, vol = 0.3, type = "square") {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = vol * masterVolume;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  const alarmSounds = {
    digital() {
      [0, 0.2, 0.4].forEach((delay) => {
        setTimeout(() => playTone(880, 0.15, 0.4), delay * 1000);
        setTimeout(() => playTone(660, 0.15, 0.4), (delay + 0.1) * 1000);
      });
    },
    beep() {
      [0, 0.3, 0.6].forEach((delay) => {
        setTimeout(() => playTone(440, 0.25, 0.4, "sawtooth"), delay * 1000);
      });
    },
    chime() {
      [523, 659, 784, 1047].forEach((freq, i) => {
        setTimeout(() => playTone(freq, 0.6, 0.3, "sine"), i * 200);
      });
    },
  };

  let currentAlarm = "digital";

  let timerInterval;
  let totalSeconds = 25 * 60;
  let remainingSeconds = totalSeconds;
  let isRunning = false;

  const circumference = 2 * Math.PI * 160;
  progressCircle.style.strokeDasharray = circumference;

  const volumeSlider = document.getElementById("alarm-volume");
  const volumeVal = document.getElementById("volume-val");
  const soundSelect = document.getElementById("alarm-sound-select");

  soundSelect.addEventListener("change", (e) => {
    currentAlarm = e.target.value;
    alarmSounds[currentAlarm]();
  });

  volumeSlider.addEventListener("input", (e) => {
    const vol = e.target.value;
    masterVolume = vol / 100;
    volumeVal.textContent = `${vol}%`;
  });
  masterVolume = volumeSlider.value / 100;

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
        } else if (container.dataset.id === "timer-mode") {
          customInputs.classList.remove("active");
          applyCustomBtn.classList.remove("active");
          changeMode(parseInt(val, 10) * 60, false);
        }

        labelSpan.textContent = option.textContent;
        options.forEach((opt) => opt.classList.remove("selected"));
        option.classList.add("selected");
        nativeSelect.value = val;
        container.classList.remove("active");
        nativeSelect.dispatchEvent(new Event("change"));
      });
    });
  });

  applyCustomBtn.addEventListener("click", () => {
    const h = parseInt(customH.value) || 0;
    const m = parseInt(customM.value) || 0;
    const s = parseInt(customS.value) || 0;

    const totalSecs = h * 3600 + m * 60 + s;
    if (totalSecs <= 0) return;

    const triggerLabel = document.querySelector(".select-trigger span");
    triggerLabel.textContent = `Custom (${h > 0 ? h + ":" : ""}${pad(m)}:${pad(s)})`;

    changeMode(totalSecs, true);
  });

  document.addEventListener("click", () => {
    selectContainers.forEach((c) => c.classList.remove("active"));
  });

  function updateDisplay() {
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;

    const timeString =
      hours > 0
        ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
        : `${pad(minutes)}:${pad(seconds)}`;
    timeDisplay.classList.toggle("long-format", hours > 0);

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
    startIcon.innerHTML = pauseIcon;

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    timerInterval = setInterval(() => {
      remainingSeconds--;
      updateDisplay();

      if (remainingSeconds <= 0) {
        clearInterval(timerInterval);
        isRunning = false;
        alarmSounds[currentAlarm]();

        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Timer Finished!", {
            body: `${timeLabel.textContent} session has ended!`,
            icon: "/.assets/logo/fav.png",
          });
        }

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
        startIcon.innerHTML = playIcon;
      }
    }, 1000);
  }

  function pauseTimer() {
    isRunning = false;
    clearInterval(timerInterval);
    startText.textContent = "Resume Timer";
    startIcon.innerHTML = playIcon;
  }

  function resetTimer() {
    pauseTimer();
    remainingSeconds = totalSeconds;
    updateDisplay();
    startText.textContent = "Start Timer";
  }

  startBtn.addEventListener("click", toggleTimer);
  resetBtn.addEventListener("click", resetTimer);

  const isNativeFullscreen = () => Boolean(document.fullscreenElement || document.webkitFullscreenElement);

  const setFullscreen = (on) => {
    timerMainArea.classList.toggle("fullscreen", on);
    fullscreenBtn.innerHTML = on
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>`;
  };

  fullscreenBtn.addEventListener("click", () => {
    if (!timerMainArea.classList.contains("fullscreen")) {
      setFullscreen(true);
      if (timerMainArea.requestFullscreen) {
        timerMainArea.requestFullscreen().catch((err) => console.error(err));
      } else if (timerMainArea.webkitRequestFullscreen) {
        timerMainArea.webkitRequestFullscreen();
      }
    } else {
      setFullscreen(false);
      if (isNativeFullscreen()) {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    }
  });

  const updateFullscreenIcon = () => {
    setFullscreen(isNativeFullscreen());
  };

  document.addEventListener("fullscreenchange", updateFullscreenIcon);
  document.addEventListener("webkitfullscreenchange", updateFullscreenIcon);

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
      fullscreenBtn.click();
    }
  });

  const advancedOptionsBtn = document.getElementById("advanced-options-btn");
  const advancedOptionsContent = document.getElementById(
    "advanced-options-content",
  );
  const advancedOptionsIcon = document.getElementById("advanced-options-icon");

  advancedOptionsBtn.addEventListener("click", () => {
    const isHidden = advancedOptionsContent.style.display === "none";
    if (isHidden) {
      advancedOptionsContent.style.display = "flex";
      advancedOptionsIcon.style.transform = "rotate(180deg)";
    } else {
      advancedOptionsContent.style.display = "none";
      advancedOptionsIcon.style.transform = "rotate(0deg)";
    }
  });

  const viewStatsBtn = document.getElementById("view-stats-btn");
  const statsModal = document.getElementById("stats-modal");
  const closeStatsModal = document.getElementById("close-stats-modal");
  const statsModalContent = document.getElementById("stats-modal-content");

  function openModal() {
    statsModal.style.display = "flex";
    setTimeout(() => {
      statsModal.style.opacity = "1";
      statsModalContent.style.transform = "scale(1)";
    }, 10);
    updateStatsUI();
  }

  function closeModal() {
    statsModal.style.opacity = "0";
    statsModalContent.style.transform = "scale(0.95)";
    setTimeout(() => {
      statsModal.style.display = "none";
    }, 300);
  }

  viewStatsBtn.addEventListener("click", openModal);
  closeStatsModal.addEventListener("click", closeModal);
  statsModal.addEventListener("click", (e) => {
    if (e.target === statsModal) {
      closeModal();
    }
  });

  updateDisplay();
});
