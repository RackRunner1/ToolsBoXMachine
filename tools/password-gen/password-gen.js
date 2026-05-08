const passwordOutput = document.getElementById('password-output');
const generateBtn = document.getElementById('generate-btn');
const copyBtn = document.getElementById('copy-btn');
const lengthInput = document.getElementById('password-length');
const lengthVal = document.getElementById('length-val');
const lengthLabel = document.getElementById('length-label');
const strengthBar = document.getElementById('strength-bar');
const strengthText = document.getElementById('strength-text');
const copyFeedback = document.getElementById('copy-feedback');

// Mode elements
const genModeRadios = document.querySelectorAll('input[name="genMode"]');
const passwordOptions = document.getElementById('password-options');
const passphraseOptions = document.getElementById('passphrase-options');

// Options
const includeUppercase = document.getElementById('include-uppercase');
const includeLowercase = document.getElementById('include-lowercase');
const includeNumbers = document.getElementById('include-numbers');
const includeSymbols = document.getElementById('include-symbols');
const excludeAmbiguous = document.getElementById('exclude-ambiguous');

// Passphrase options
const includeNumbersPhrase = document.getElementById('include-numbers-phrase');
const capitalizePhrase = document.getElementById('capitalize-phrase');
const phraseSeparator = document.getElementById('phrase-separator');

const chars = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+~`|}{[]:;?><,./-=',
  ambiguous: 'l1Io0O'
};

// Simplified wordlist for passphrase mode
const words = [
  'apple', 'beach', 'brain', 'bread', 'brush', 'chair', 'chest', 'chord', 'click', 'clock',
  'cloud', 'dance', 'diary', 'drink', 'earth', 'feast', 'field', 'flame', 'glass', 'grass',
  'heart', 'house', 'juice', 'light', 'money', 'music', 'night', 'ocean', 'paint', 'paper',
  'phone', 'piano', 'plane', 'plant', 'plate', 'radio', 'river', 'robot', 'shirt', 'shoes',
  'smile', 'snake', 'space', 'spoon', 'storm', 'table', 'tiger', 'toast', 'touch', 'train',
  'truck', 'voice', 'water', 'watch', 'whale', 'world', 'write', 'youth', 'zebra', 'alpha',
  'bravo', 'delta', 'echo', 'hotel', 'india', 'juliet', 'kilo', 'lima', 'mike', 'november',
  'oscar', 'papa', 'quebec', 'romeo', 'sierra', 'tango', 'uniform', 'victor', 'whiskey', 'xray',
  'yankee', 'zulu', 'active', 'bright', 'calm', 'dark', 'early', 'fast', 'great', 'happy',
  'iron', 'jolly', 'kind', 'lucky', 'magic', 'noble', 'open', 'proud', 'quick', 'rare',
  'silent', 'tough', 'unique', 'vivid', 'wild', 'young', 'zen', 'bold', 'cool', 'deep',
  'easy', 'fair', 'good', 'high', 'just', 'keen', 'loud', 'main', 'near', 'odd', 'pure',
  'real', 'soft', 'true', 'used', 'very', 'wise', 'zero'
];

function generatePassword() {
  const mode = document.querySelector('input[name="genMode"]:checked').value;
  let password = '';

  if (mode === 'password') {
    let charSet = '';
    if (includeUppercase.checked) charSet += chars.uppercase;
    if (includeLowercase.checked) charSet += chars.lowercase;
    if (includeNumbers.checked) charSet += chars.numbers;
    if (includeSymbols.checked) charSet += chars.symbols;

    if (excludeAmbiguous.checked) {
      for (const amb of chars.ambiguous) {
        charSet = charSet.split(amb).join('');
      }
    }

    if (charSet === '') {
      passwordOutput.textContent = 'Select at least one option';
      updateStrength('');
      return;
    }

    const length = parseInt(lengthInput.value);
    const randomValues = new Uint32Array(length);
    window.crypto.getRandomValues(randomValues);

    for (let i = 0; i < length; i++) {
      password += charSet.charAt(randomValues[i] % charSet.length);
    }
  } else {
    const length = parseInt(lengthInput.value);
    const separator = phraseSeparator.value;
    let chosenWords = [];
    
    for (let i = 0; i < length; i++) {
      let word = words[Math.floor(Math.random() * words.length)];
      if (capitalizePhrase.checked) {
        word = word.charAt(0).toUpperCase() + word.slice(1);
      }
      if (includeNumbersPhrase.checked) {
        word += Math.floor(Math.random() * 10);
      }
      chosenWords.push(word);
    }
    password = chosenWords.join(separator);
  }

  passwordOutput.textContent = password;
  updateStrength(password);
}

function updateStrength(password) {
  let score = 0;
  if (!password || password === 'Select at least one option' || password === 'Click Generate') {
    strengthBar.style.width = '0%';
    strengthText.textContent = 'Strength: -';
    return;
  }

  const mode = document.querySelector('input[name="genMode"]:checked').value;
  
  if (mode === 'password') {
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    if (!excludeAmbiguous.checked) score += 0; // No penalty, just baseline
  } else {
    const length = parseInt(lengthInput.value);
    if (length >= 3) score += 2;
    if (length >= 5) score += 2;
    if (capitalizePhrase.checked) score += 1;
    if (includeNumbersPhrase.checked) score += 1;
  }

  let color = '#ef4444';
  let text = 'Weak';
  let percentage = (score / 6) * 100;

  if (mode === 'passphrase') percentage = (score / 6) * 100;

  if (percentage >= 80) {
    color = '#10b981';
    text = 'Very Strong';
  } else if (percentage >= 60) {
    color = '#22c55e';
    text = 'Strong';
  } else if (percentage >= 40) {
    color = '#eab308';
    text = 'Medium';
  }

  strengthBar.style.width = `${Math.min(percentage, 100)}%`;
  strengthBar.style.backgroundColor = color;
  strengthText.textContent = `Strength: ${text}`;
}

// Event Listeners
genModeRadios.forEach(radio => {
  radio.addEventListener('change', (e) => {
    if (e.target.value === 'password') {
      passwordOptions.style.display = 'block';
      passphraseOptions.style.display = 'none';
      lengthInput.min = 4;
      lengthInput.max = 50;
      lengthInput.value = 16;
      lengthLabel.textContent = 'Characters';
    } else {
      passwordOptions.style.display = 'none';
      passphraseOptions.style.display = 'block';
      lengthInput.min = 2;
      lengthInput.max = 12;
      lengthInput.value = 4;
      lengthLabel.textContent = 'Words';
    }
    lengthVal.textContent = lengthInput.value;
    generatePassword();
  });
});

[lengthInput, includeUppercase, includeLowercase, includeNumbers, includeSymbols, 
 excludeAmbiguous, includeNumbersPhrase, capitalizePhrase, phraseSeparator].forEach(input => {
  input.addEventListener('input', () => {
    lengthVal.textContent = lengthInput.value;
    generatePassword();
  });
});

generateBtn.addEventListener('click', generatePassword);

copyBtn.addEventListener('click', () => {
  const password = passwordOutput.textContent;
  if (password === 'Click Generate' || password === 'Select at least one option') return;

  navigator.clipboard.writeText(password).then(() => {
    copyFeedback.classList.add('show');
    setTimeout(() => {
      copyFeedback.classList.remove('show');
    }, 2000);
  });
});

// Initial generation
generatePassword();
