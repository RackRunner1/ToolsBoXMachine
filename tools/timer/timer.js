document.addEventListener('DOMContentLoaded', () => {
  const timeDisplay = document.getElementById('time-display');
  const timeLabel = document.getElementById('time-label');
  const progressCircle = document.getElementById('timer-progress');
  const startBtn = document.getElementById('start-btn');
  const startText = document.getElementById('start-text');
  const startIcon = document.getElementById('start-icon');
  const resetBtn = document.getElementById('reset-btn');
  
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
        options.forEach((opt) => opt.classList.remove('selected'));
        option.classList.add('selected');
        labelSpan.textContent = option.textContent;
        nativeSelect.value = option.dataset.value;
        container.classList.remove('active');
        
        changeMode(parseInt(option.dataset.value));
      });
    });
  });

  document.addEventListener('click', () => {
    selectContainers.forEach((c) => c.classList.remove('active'));
  });

  function updateDisplay() {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.title = `${timeDisplay.textContent} - Pomodoro Timer`;
    
    const offset = circumference - (remainingSeconds / totalSeconds) * circumference;
    progressCircle.style.strokeDashoffset = offset;
  }

  function changeMode(minutes) {
    pauseTimer();
    totalSeconds = minutes * 60;
    remainingSeconds = totalSeconds;
    
    if (minutes === 25) {
      timeLabel.textContent = "Focus";
      progressCircle.classList.remove('break-mode');
    } else {
      timeLabel.textContent = minutes === 5 ? "Short Break" : "Long Break";
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
