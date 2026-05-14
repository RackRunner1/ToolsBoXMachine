const display = document.getElementById('display');
let currentInput = '0';
let previousInput = '';
let operation = null;
let shouldResetDisplay = false;

function updateDisplay() {
  display.value = currentInput;
}

function clear() {
  currentInput = '0';
  previousInput = '';
  operation = null;
  shouldResetDisplay = false;
  updateDisplay();
}

function backspace() {
  if (currentInput.length > 1) {
    currentInput = currentInput.slice(0, -1);
  } else {
    currentInput = '0';
  }
  updateDisplay();
}

function appendNumber(number) {
  if (shouldResetDisplay) {
    currentInput = number;
    shouldResetDisplay = false;
  } else {
    if (currentInput === '0') {
      currentInput = number;
    } else {
      currentInput += number;
    }
  }
  updateDisplay();
}

function appendDecimal() {
  if (shouldResetDisplay) {
    currentInput = '0.';
    shouldResetDisplay = false;
  } else if (!currentInput.includes('.')) {
    currentInput += '.';
  }
  updateDisplay();
}

function setOperation(op) {
  if (operation !== null && !shouldResetDisplay) {
    calculate();
  }
  previousInput = currentInput;
  operation = op;
  shouldResetDisplay = true;
}

function calculate() {
  const prev = parseFloat(previousInput);
  const current = parseFloat(currentInput);

  if (isNaN(prev) || isNaN(current)) return;

  let result;
  switch (operation) {
    case '+':
      result = prev + current;
      break;
    case '-':
      result = prev - current;
      break;
    case '*':
      result = prev * current;
      break;
    case '/':
      result = prev / current;
      break;
    default:
      return;
  }

  currentInput = result.toString();
  operation = null;
  shouldResetDisplay = true;
  updateDisplay();
}

// Event listeners
document.getElementById('clear').addEventListener('click', clear);
document.getElementById('backspace').addEventListener('click', backspace);

document.getElementById('zero').addEventListener('click', () => appendNumber('0'));
document.getElementById('one').addEventListener('click', () => appendNumber('1'));
document.getElementById('two').addEventListener('click', () => appendNumber('2'));
document.getElementById('three').addEventListener('click', () => appendNumber('3'));
document.getElementById('four').addEventListener('click', () => appendNumber('4'));
document.getElementById('five').addEventListener('click', () => appendNumber('5'));
document.getElementById('six').addEventListener('click', () => appendNumber('6'));
document.getElementById('seven').addEventListener('click', () => appendNumber('7'));
document.getElementById('eight').addEventListener('click', () => appendNumber('8'));
document.getElementById('nine').addEventListener('click', () => appendNumber('9'));

document.getElementById('decimal').addEventListener('click', appendDecimal);

document.getElementById('add').addEventListener('click', () => setOperation('+'));
document.getElementById('subtract').addEventListener('click', () => setOperation('-'));
document.getElementById('multiply').addEventListener('click', () => setOperation('*'));
document.getElementById('divide').addEventListener('click', () => setOperation('/'));

document.getElementById('equals').addEventListener('click', calculate);

// Keyboard support
document.addEventListener('keydown', (e) => {
  if (e.key >= '0' && e.key <= '9') {
    appendNumber(e.key);
  } else if (e.key === '.') {
    appendDecimal();
  } else if (e.key === '+') {
    setOperation('+');
  } else if (e.key === '-') {
    setOperation('-');
  } else if (e.key === '*') {
    setOperation('*');
  } else if (e.key === '/') {
    setOperation('/');
  } else if (e.key === 'Enter' || e.key === '=') {
    calculate();
  } else if (e.key === 'Escape') {
    clear();
  } else if (e.key === 'Backspace') {
    backspace();
  }
});