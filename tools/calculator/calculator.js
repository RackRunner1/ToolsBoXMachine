const display = document.getElementById("display");

const OPERATORS = ["+", "-", "*", "/"];
const SYMBOLS = { "+": "+", "-": "-", "*": "×", "/": "÷" };

// Committed expression tokens (numbers and operators), e.g. ["7", "*", "7", "*"].
let tokens = [];
// The number currently being typed.
let currentInput = "0";
// True when the last committed token is an operator (waiting for an operand).
let awaitingNumber = false;
// True right after "=" was pressed, so the next input starts fresh.
let justEvaluated = false;

function isOperator(token) {
  return OPERATORS.includes(token);
}

function resetState() {
  tokens = [];
  currentInput = "0";
  awaitingNumber = false;
  justEvaluated = false;
}

function render() {
  if (justEvaluated) {
    display.value = currentInput;
    return;
  }

  const parts = tokens.map((token) =>
    isOperator(token) ? SYMBOLS[token] : token,
  );
  if (!awaitingNumber) {
    parts.push(currentInput);
  }
  display.value = parts.length ? parts.join(" ") : currentInput;
}

function clearAll() {
  resetState();
  render();
}

function clearEntry() {
  if (justEvaluated) {
    clearAll();
    return;
  }
  currentInput = "0";
  render();
}

function backspace() {
  if (justEvaluated) return;

  if (awaitingNumber) {
    // Drop the pending operator and resume editing the previous number.
    tokens.pop();
    currentInput = tokens.length ? tokens.pop() : "0";
    awaitingNumber = false;
  } else if (currentInput.length > 1) {
    currentInput = currentInput.slice(0, -1);
  } else if (tokens.length && isOperator(tokens[tokens.length - 1])) {
    // The current number is empty, step back to the previous number.
    tokens.pop();
    currentInput = tokens.length ? tokens.pop() : "0";
  } else {
    currentInput = "0";
  }

  render();
}

function appendNumber(number) {
  if (justEvaluated) {
    resetState();
  }

  if (awaitingNumber) {
    currentInput = number;
    awaitingNumber = false;
  } else if (currentInput === "0") {
    currentInput = number;
  } else {
    currentInput += number;
  }

  render();
}

function appendDecimal() {
  if (justEvaluated) {
    resetState();
  }

  if (awaitingNumber) {
    currentInput = "0.";
    awaitingNumber = false;
  } else if (!currentInput.includes(".")) {
    currentInput += ".";
  }

  render();
}

function setOperation(op) {
  if (justEvaluated) {
    // Keep the result as the first operand of the new calculation.
    tokens = [];
    awaitingNumber = false;
    justEvaluated = false;
  }

  if (!awaitingNumber) {
    tokens.push(currentInput);
  }

  // Replace the operator if one was already pending instead of stacking them.
  if (tokens.length && isOperator(tokens[tokens.length - 1])) {
    tokens[tokens.length - 1] = op;
  } else {
    tokens.push(op);
  }

  currentInput = "0";
  awaitingNumber = true;
  render();
}

function calculate() {
  const expression = tokens.slice();
  if (!awaitingNumber) {
    expression.push(currentInput);
  }

  // Ignore a trailing operator (e.g. "7 ×"): it has no effect until "=".
  while (expression.length && isOperator(expression[expression.length - 1])) {
    expression.pop();
  }
  if (expression.length === 0) return;

  const result = evaluate(expression);
  if (result === null) return;

  currentInput = result.toString();
  tokens = [];
  awaitingNumber = false;
  justEvaluated = true;
  render();
}

// Evaluate the whole expression at once, applying each operator left to right
// (same order as the previous step-by-step behaviour).
function evaluate(expression) {
  let result = parseFloat(expression[0]);
  if (isNaN(result)) return null;

  for (let i = 1; i < expression.length; i += 2) {
    const operand = parseFloat(expression[i + 1]);
    if (isNaN(operand)) return null;

    switch (expression[i]) {
      case "+":
        result += operand;
        break;
      case "-":
        result -= operand;
        break;
      case "*":
        result *= operand;
        break;
      case "/":
        result /= operand;
        break;
      default:
        return null;
    }
  }

  return result;
}

// Event listeners
document.getElementById("clear").addEventListener("click", clearAll);
document.getElementById("clear-entry").addEventListener("click", clearEntry);
document.getElementById("backspace").addEventListener("click", backspace);

document
  .getElementById("zero")
  .addEventListener("click", () => appendNumber("0"));
document
  .getElementById("one")
  .addEventListener("click", () => appendNumber("1"));
document
  .getElementById("two")
  .addEventListener("click", () => appendNumber("2"));
document
  .getElementById("three")
  .addEventListener("click", () => appendNumber("3"));
document
  .getElementById("four")
  .addEventListener("click", () => appendNumber("4"));
document
  .getElementById("five")
  .addEventListener("click", () => appendNumber("5"));
document
  .getElementById("six")
  .addEventListener("click", () => appendNumber("6"));
document
  .getElementById("seven")
  .addEventListener("click", () => appendNumber("7"));
document
  .getElementById("eight")
  .addEventListener("click", () => appendNumber("8"));
document
  .getElementById("nine")
  .addEventListener("click", () => appendNumber("9"));

document.getElementById("decimal").addEventListener("click", appendDecimal);

document
  .getElementById("add")
  .addEventListener("click", () => setOperation("+"));
document
  .getElementById("subtract")
  .addEventListener("click", () => setOperation("-"));
document
  .getElementById("multiply")
  .addEventListener("click", () => setOperation("*"));
document
  .getElementById("divide")
  .addEventListener("click", () => setOperation("/"));

document.getElementById("equals").addEventListener("click", calculate);

// Keyboard support
document.addEventListener("keydown", (e) => {
  if (e.key >= "0" && e.key <= "9") {
    appendNumber(e.key);
  } else if (e.key === ".") {
    appendDecimal();
  } else if (e.key === "+") {
    setOperation("+");
  } else if (e.key === "-") {
    setOperation("-");
  } else if (e.key === "*") {
    setOperation("*");
  } else if (e.key === "/") {
    setOperation("/");
  } else if (e.key === "Enter" || e.key === "=") {
    calculate();
  } else if (e.key === "Escape") {
    clearAll();
  } else if (e.key === "Backspace") {
    backspace();
  }
});
