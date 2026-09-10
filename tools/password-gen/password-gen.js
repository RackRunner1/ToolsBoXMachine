const zxcvbn = window.zxcvbn;

const passwordOutput = document.getElementById("password-output");

const generateBtn = document.getElementById("generate-btn");
const copyBtn = document.getElementById("copy-btn");
const lengthInput = document.getElementById("password-length");
const lengthVal = document.getElementById("length-val");
const lengthLabel = document.getElementById("length-label");
const strengthBar = document.getElementById("strength-bar");
const strengthText = document.getElementById("strength-text");
const copyFeedback = document.getElementById("copy-feedback");

// Mode elements
const genModeRadios = document.querySelectorAll('input[name="genMode"]');
const passwordOptions = document.getElementById("password-options");
const passphraseOptions = document.getElementById("passphrase-options");

// Options
const includeUppercase = document.getElementById("include-uppercase");
const includeLowercase = document.getElementById("include-lowercase");
const includeNumbers = document.getElementById("include-numbers");
const includeSymbols = document.getElementById("include-symbols");
const excludeAmbiguous = document.getElementById("exclude-ambiguous");
const includeCustomCharset = document.getElementById("include-custom-charset");
const customCharsetInput = document.getElementById("custom-charset-input");
const customCharsetWrapper = document.getElementById("custom-charset-wrapper");

// Passphrase options
const includeNumbersPhrase = document.getElementById("include-numbers-phrase");
const capitalizePhrase = document.getElementById("capitalize-phrase");
const phraseSeparator = document.getElementById("phrase-separator");

const chars = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()+?./-=",
  ambiguous: "l1Io0O",
};

// Wordlist for passphrase mode (~530 words)
const words = [
  "apple", "apricot", "arcade", "arctic", "arrow", "autumn", "avocado",
  "badge", "bakery", "banana", "barber", "basket", "beach", "beast",
  "birch", "blaze", "bloom", "bluff", "bonfire", "bonsai", "border",
  "breeze", "bridge", "bronze", "brush", "butter", "button",
  "cabin", "cactus", "candle", "canyon", "carbon", "cedar", "chalk",
  "cherry", "chest", "chill", "chrome", "churn", "circle", "clerk",
  "cliff", "climb", "cloud", "clover", "cobalt", "comet", "coral",
  "crane", "crest", "crown", "cruise", "crystal", "cuddle", "cypher",
  "dance", "delta", "demure", "desert", "dewdrop", "digger", "dolphin",
  "dragon", "dream", "drift", "drizzle", "drum", "dusk", "dwarf",
  "eagle", "earth", "echo", "ember", "emerald", "epoch", "ettle",
  "falcon", "fawn", "fennel", "ferret", "fig", "flame", "flint",
  "flora", "fog", "forest", "forge", "frost", "frozen", "fungi",
  "gadget", "gale", "garden", "garnet", "gecko", "gentle", "glacier",
  "glow", "goat", "golden", "granite", "gravel", "grove", "guardian",
  "guitar", "gust", "hamlet", "harbor", "hazel", "hearth", "helium",
  "heron", "highland", "holly", "honey", "horizon", "hover", "hub",
  "iguana", "impala", "indigo", "ink", "ivory",
  "jade", "jasmine", "jungle", "juniper", "keystone", "kettle",
  "kiwi", "knight", "lagoon", "lantern", "lapis", "larch", "lemon",
  "lemur", "lichen", "light", "linen", "lion", "lithium", "lobster",
  "lotus", "lynx", "mango", "marble", "marten", "maple", "meadow",
  "melody", "mercury", "mica", "millet", "mirage", "mist", "mitten",
  "mocha", "mogul", "mosaic", "moss", "moth", "mulch", "murmur",
  "myrtle", "nectar", "neon", "nimble", "nimbus", "note", "nova",
  "nucleus", "oasis", "obsidian", "ocean", "olive", "onyx", "orchid",
  "otter", "oxford", "oxygen",
  "paddle", "palm", "panther", "paper", "parrot", "paste", "peach",
  "pearl", "pebble", "penny", "pepper", "perch", "pewter", "phoenix",
  "piano", "pie", "pigeon", "pine", "pirate", "pixel", "plaid",
  "planet", "plank", "plaza", "plume", "plush", "polar", "pompom",
  "poppy", "prism", "prophet", "puma", "pumpkin", "puzzle",
  "quail", "quartz", "quest", "quill", "quince",
  "rabbit", "radish", "rafter", "rain", "rapids", "raven", "reach",
  "reef", "relief", "riddle", "ripple", "ritual", "river", "robin",
  "rocket", "rook", "rose", "ruby", "ruler", "russet", "rust",
  "saddle", "saffron", "sage", "sail", "salmon", "samurai", "sand",
  "sapphire", "scarlet", "scrub", "seal", "seeds", "sequoia", "shadow",
  "shallot", "sheep", "sheriff", "shimmer", "shrine", "silver", "skink",
  "slope", "smoke", "snail", "snake", "solar", "sonnet", "sparrow",
  "spice", "spider", "spiral", "splash", "spring", "spruce", "squash",
  "stallion", "star", "steel", "stellar", "stone", "storm", "stream",
  "stride", "string", "stripe", "strong", "studio", "sugar", "summit",
  "sun", "sundial", "surge", "swan", "sycamore",
  "tablet", "talon", "tango", "teal", "temple", "thatch", "thistle",
  "thorn", "thrush", "timber", "titan", "toad", "tomes", "topaz",
  "trail", "trek", "trident", "triple", "trophy", "trout", "truffle",
  "tulip", "tundra", "tunnel", "turret", "twig", "twilight",
  "umbrella", "uniform", "urchin", "uturn",
  "valley", "vanilla", "vapor", "velvet", "vessel", "vibrant", "vicuna",
  "violet", "viper", "virtual", "vivid", "vixen", "voltage", "voyage",
  "waffle", "walnut", "wander", "wasp", "watch", "weasel", "wheat",
  "whim", "whirl", "whisk", "willow", "window", "winter", "wisdom",
  "wolf", "wombat", "wood", "wool", "wren", "wrest",
  "xenon", "xerox",
  "yacht", "yak", "yarrow", "yew", "yoga", "yoke", "young", "youth",
  "zebra", "zen", "zephyr", "zinc", "zinnia", "zodiac", "zone", "zoo",
  "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf",
  "hotel", "india", "juliet", "kilo", "lima", "mike", "november",
  "oscar", "papa", "quebec", "romeo", "sierra", "tango", "uniform",
  "victor", "whiskey", "xray", "yankee", "zulu",
  "active", "bold", "calm", "dark", "easy", "fair", "fast", "gentle",
  "good", "happy", "iron", "jolly", "kind", "lucky", "magic", "noble",
  "open", "proud", "quick", "rare", "silent", "tough", "unique",
  "vivid", "wild", "wise", "young",
];

function generatePassword() {
  const mode = document.querySelector('input[name="genMode"]:checked').value;
  let password = "";

  if (mode === "password") {
    let charSet = "";
    if (includeUppercase.checked) charSet += chars.uppercase;
    if (includeLowercase.checked) charSet += chars.lowercase;
    if (includeNumbers.checked) charSet += chars.numbers;
    if (includeSymbols.checked) charSet += chars.symbols;

    if (
      includeCustomCharset &&
      includeCustomCharset.checked &&
      customCharsetInput
    ) {
      charSet += customCharsetInput.value;
    }

    if (excludeAmbiguous.checked) {
      for (const amb of chars.ambiguous) {
        charSet = charSet.split(amb).join("");
      }
    }

    if (charSet === "") {
      passwordOutput.textContent = "Select at least one option";
      updateStrength("");
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

    const randomWordIndices = new Uint32Array(length);
    const randomDigitIndices = new Uint32Array(length);
    window.crypto.getRandomValues(randomWordIndices);
    window.crypto.getRandomValues(randomDigitIndices);

    for (let i = 0; i < length; i++) {
      let word = words[randomWordIndices[i] % words.length];
      if (capitalizePhrase.checked) {
        word = word.charAt(0).toUpperCase() + word.slice(1);
      }
      if (includeNumbersPhrase.checked) {
        word += randomDigitIndices[i] % 10;
      }
      chosenWords.push(word);
    }
    password = chosenWords.join(separator);
  }

  passwordOutput.textContent = password;
  updateStrength(password);
}

function updateStrength(password) {
  if (
    !password ||
    password === "Select at least one option" ||
    password === "Click Generate"
  ) {
    strengthBar.style.width = "0%";
    strengthText.textContent = "Strength: -";
    return;
  }

  // Analyse via zxcvbn
  const result = zxcvbn(password);
  const score = result.score; // 0 à 4

  // Définition des niveaux
  const levels = [
    { text: "Very Weak", color: "#ef4444", percent: 10 },
    { text: "Weak", color: "#f97316", percent: 30 },
    { text: "Medium", color: "#eab308", percent: 50 },
    { text: "Strong", color: "#22c55e", percent: 75 },
    { text: "Very Strong", color: "#10b981", percent: 100 },
  ];

  const level = levels[score];

  strengthBar.style.width = `${level.percent}%`;
  strengthBar.style.backgroundColor = level.color;
  strengthText.textContent = `Strength: ${level.text}`;
}

// Event Listeners
genModeRadios.forEach((radio) => {
  radio.addEventListener("change", (e) => {
    if (e.target.value === "password") {
      passwordOptions.style.display = "block";
      passphraseOptions.style.display = "none";
      lengthInput.min = 4;
      lengthInput.max = 50;
      lengthInput.value = 16;
      lengthLabel.textContent = "Characters";
    } else {
      passwordOptions.style.display = "none";
      passphraseOptions.style.display = "block";
      lengthInput.min = 2;
      lengthInput.max = 12;
      lengthInput.value = 4;
      lengthLabel.textContent = "Words";
    }
    lengthVal.textContent = lengthInput.value;
    generatePassword();
  });
});

[
  lengthInput,
  includeUppercase,
  includeLowercase,
  includeNumbers,
  includeSymbols,
  excludeAmbiguous,
  includeNumbersPhrase,
  capitalizePhrase,
  phraseSeparator,
].forEach((input) => {
  input.addEventListener("input", () => {
    lengthVal.textContent = lengthInput.value;
    generatePassword();
  });
});

if (includeCustomCharset) {
  includeCustomCharset.addEventListener("change", (e) => {
    if (customCharsetWrapper) {
      customCharsetWrapper.style.display = e.target.checked ? "block" : "none";
    }
    generatePassword();
  });
}

if (customCharsetInput) {
  customCharsetInput.addEventListener("input", generatePassword);
}

generateBtn.addEventListener("click", generatePassword);

copyBtn.addEventListener("click", () => {
  const password = passwordOutput.textContent;
  if (
    password === "Click Generate" ||
    password === "Select at least one option"
  )
    return;

  navigator.clipboard.writeText(password).then(() => {
    copyFeedback.classList.add("show");
    setTimeout(() => {
      copyFeedback.classList.remove("show");
    }, 2000);
  });
});

// Initial generation
generatePassword();
