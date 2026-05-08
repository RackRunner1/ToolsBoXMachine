const lengthInput = document.getElementById('password-length');
const lengthVal = document.getElementById('length-val');
const uppercaseCheck = document.getElementById('include-uppercase');
const lowercaseCheck = document.getElementById('include-lowercase');
const numbersCheck = document.getElementById('include-numbers');
const symbolsCheck = document.getElementById('include-symbols');
const generateBtn = document.getElementById('generate-btn');
const copyBtn = document.getElementById('copy-btn');
const passwordOutput = document.getElementById('password-output');
const strengthBar = document.getElementById('strength-bar');
const strengthText = document.getElementById('strength-text');
const copyFeedback = document.getElementById('copy-feedback');

const CHAR_SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+~`|}{[]:;?><,./-='
};

function generatePassword() {
  let charPool = '';
  if (uppercaseCheck.checked) charPool += CHAR_SETS.uppercase;
  if (lowercaseCheck.checked) charPool += CHAR_SETS.lowercase;
  if (numbersCheck.checked) charPool += CHAR_SETS.numbers;
  if (symbolsCheck.checked) charPool += CHAR_SETS.symbols;

  if (charPool === '') {
    passwordOutput.textContent = 'Select at least one type';
    updateStrength(0);
    return;
  }

  const length = parseInt(lengthInput.value);
  let password = '';
  
  // Use crypto.getRandomValues for better security
  const randomValues = new Uint32Array(length);
  window.crypto.getRandomValues(randomValues);

  for (let i = 0; i < length; i++) {
    password += charPool.charAt(randomValues[i] % charPool.length);
  }

  passwordOutput.textContent = password;
  evaluateStrength(password);
}

function evaluateStrength(password) {
  let score = 0;
  if (!password) return updateStrength(0);

  // Length factor
  if (password.length > 8) score += 1;
  if (password.length > 12) score += 1;
  if (password.length > 16) score += 1;

  // Diversity factor
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  // Max score is 7
  const percentage = (score / 7) * 100;
  updateStrength(percentage);
}

function updateStrength(percentage) {
  strengthBar.style.width = `${percentage}%`;
  
  if (percentage <= 30) {
    strengthBar.style.background = '#ef4444'; // red
    strengthText.textContent = 'Strength: Weak';
  } else if (percentage <= 60) {
    strengthBar.style.background = '#f59e0b'; // amber
    strengthText.textContent = 'Strength: Medium';
  } else if (percentage <= 85) {
    strengthBar.style.background = '#3b82f6'; // blue
    strengthText.textContent = 'Strength: Strong';
  } else {
    strengthBar.style.background = '#10b981'; // emerald
    strengthText.textContent = 'Strength: Very Strong';
  }
}

async function copyToClipboard() {
  const password = passwordOutput.textContent;
  if (password === 'Click Generate' || password === 'Select at least one type') return;

  try {
    await navigator.clipboard.writeText(password);
    showFeedback();
  } catch (err) {
    console.error('Failed to copy: ', err);
  }
}

function showFeedback() {
  copyFeedback.classList.add('show');
  setTimeout(() => {
    copyFeedback.classList.remove('show');
  }, 2000);
}

// Event Listeners
lengthInput.addEventListener('input', () => {
  lengthVal.textContent = lengthInput.value;
  generatePassword();
});

[uppercaseCheck, lowercaseCheck, numbersCheck, symbolsCheck].forEach(check => {
  check.addEventListener('change', generatePassword);
});

generateBtn.addEventListener('click', generatePassword);
copyBtn.addEventListener('click', copyToClipboard);

// Initial generation
generatePassword();
