document.addEventListener('DOMContentLoaded', () => {
  const timeDisplay = document.getElementById('time-display');
  const timeLabel = document.getElementById('time-label');
  const progressCircle = document.getElementById('timer-progress');
  const startBtn = document.getElementById('start-btn');
  const startText = document.getElementById('start-text');
  const startIcon = document.getElementById('start-icon');
  const resetBtn = document.getElementById('reset-btn');
  
  const applyCustomBtn = document.getElementById('apply-custom-btn');
  const customInputs = document.getElementById('custom-inputs');
  const customH = document.getElementById('custom-h');
  const customM = document.getElementById('custom-m');
  const customS = document.getElementById('custom-s');
  
  // Audio for alarm
  const alarmSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

  let timerInterval;
  let totalSeconds = 25 * 60;
  let remainingSeconds = totalSeconds;
  let isRunning = false;
  
  // Total circumference for r=160
  const circumference = 2 * Math.PI * 160;
  progressCircle.style.strokeDasharray = circumference;

  // Custom Select Logic
  const selectContainers = document.querySelectorAll('.custom-select-container');
  selectContainers.forEach((container) => {
    const trigger = container.querySelector('.select-trigger');
    const options = container.querySelectorAll('.select-option');
    const nativeSelect = document.getElementById(container.dataset.id);
    const labelSpan = trigger.querySelector('span');

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      selectContainers.forEach((c) => {
        if (c !== container) c.classList.remove('active');
      });
      container.classList.toggle('active');
    });

    options.forEach((option) => {
      option.addEventListener('click', () => {
        const val = option.dataset.value;
        
        if (val === 'custom') {
          customInputs.classList.add('active');
          applyCustomBtn.classList.add('active');
          
          options.forEach((opt) => opt.classList.remove('selected'));
          option.classList.add('selected');
          labelSpan.textContent = option.textContent;
          nativeSelect.value = val;
          container.classList.remove('active');
          return;
        } else {
          customInputs.classList.remove('active');
          applyCustomBtn.classList.remove('active');
          
          let seconds = parseInt(val, 10) * 60;
          labelSpan.textContent = option.textContent;

          options.forEach((opt) => opt.classList.remove('selected'));
          option.classList.add('selected');
          
          nativeSelect.value = val;
          container.classList.remove('active');
          
          changeMode(seconds, false);
        }
      });
    });
  });

  if (applyCustomBtn) {
    applyCustomBtn.addEventListener('click', () => {
      const h = parseInt(customH.value) || 0;
      const m = parseInt(customM.value) || 0;
      const s = parseInt(customS.value) || 0;
      
      const totalSecs = (h * 3600) + (m * 60) + s;
      if (totalSecs <= 0) return;
      
      const triggerLabel = document.querySelector('.select-trigger span');
      triggerLabel.textContent = `Custom (${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')})`;
      
      changeMode(totalSecs, true);
    });
  }

  document.addEventListener('click', () => {
    selectContainers.forEach((c) => c.classList.remove('active'));
  });

  function updateDisplay() {
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;
    
    let timeString = '';
    if (hours > 0) {
      timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      timeDisplay.classList.add('long-format');
    } else {
      timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      timeDisplay.classList.remove('long-format');
    }
    
    timeDisplay.textContent = timeString;
    document.title = `${timeString} - Pomodoro Timer`;
    
    const offset = circumference - (remainingSeconds / totalSeconds) * circumference;
    progressCircle.style.strokeDashoffset = offset;
  }

  function changeMode(seconds, isCustom = false) {
    pauseTimer();
    totalSeconds = seconds;
    remainingSeconds = totalSeconds;
    
    if (isCustom) {
      timeLabel.textContent = "Custom";
      progressCircle.classList.remove('break-mode');
    } else if (seconds === 25 * 60) {
      timeLabel.textContent = "Focus";
      progressCircle.classList.remove('break-mode');
    } else {
      timeLabel.textContent = seconds === 5 * 60 ? "Short Break" : "Long Break";
      progressCircle.classList.add('break-mode');
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
    
    timerInterval = setInterval(() => {
      remainingSeconds--;
      updateDisplay();
      
      if (remainingSeconds <= 0) {
        clearInterval(timerInterval);
        isRunning = false;
        alarmSound.play().catch(e => console.log('Audio play failed:', e));
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

  startBtn.addEventListener('click', toggleTimer);
  resetBtn.addEventListener('click', resetTimer);

  // Initialize
  updateDisplay();
});
