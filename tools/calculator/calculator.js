const display = document.getElementById("display");

const OPERATORS = ["+", "-", "*", "/"];
const SYMBOLS = { "+": "+", "-": "-", "*": "×", "/": "÷" };
const DIGIT_BUTTONS = {
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
};
const OPERATOR_BUTTONS = {
  add: "+",
  subtract: "-",
  multiply: "*",
  divide: "/",
};

let tokens = [];
let currentInput = "0";
let awaitingNumber = false;
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
  const parts = tokens.map((token) =>
    isOperator(token) ? SYMBOLS[token] : token,
  );
  if (!awaitingNumber) {
    parts.push(currentInput);
  }
  display.value = parts.join(" ");
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
    tokens.pop();
    currentInput = tokens.length ? tokens.pop() : "0";
    awaitingNumber = false;
  } else if (currentInput.length > 1) {
    currentInput = currentInput.slice(0, -1);
  } else if (tokens.length && isOperator(tokens[tokens.length - 1])) {
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
    tokens = [];
    awaitingNumber = false;
    justEvaluated = false;
  }

  if (!awaitingNumber) {
    tokens.push(currentInput);
  }

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

  while (expression.length && isOperator(expression[expression.length - 1])) {
    expression.pop();
  }

  const result = evaluate(expression);
  if (result === null) return;

  currentInput = result.toString();
  tokens = [];
  awaitingNumber = false;
  justEvaluated = true;
  render();
}

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
    }
  }

  return result;
}

document.getElementById("clear").addEventListener("click", clearAll);
document.getElementById("clear-entry").addEventListener("click", clearEntry);
document.getElementById("backspace").addEventListener("click", backspace);
document.getElementById("decimal").addEventListener("click", appendDecimal);
document.getElementById("equals").addEventListener("click", calculate);

for (const [id, digit] of Object.entries(DIGIT_BUTTONS)) {
  const button = document.getElementById(id);
  button.addEventListener("click", () => appendNumber(digit));
}

for (const [id, op] of Object.entries(OPERATOR_BUTTONS)) {
  const button = document.getElementById(id);
  button.addEventListener("click", () => setOperation(op));
}

document.addEventListener("keydown", (e) => {
  if (e.key >= "0" && e.key <= "9") {
    appendNumber(e.key);
  } else if (e.key === ".") {
    appendDecimal();
  } else if (OPERATORS.includes(e.key)) {
    setOperation(e.key);
  } else if (e.key === "Enter" || e.key === "=") {
    calculate();
  } else if (e.key === "Escape") {
    clearAll();
  } else if (e.key === "Backspace") {
    backspace();
  }
});
