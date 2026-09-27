const zxcvbn = window.zxcvbn;

const passwordOutput = document.getElementById("password-output");

const generateBtn = document.getElementById("generate-btn");
const copyBtn = document.getElementById("copy-btn");
const lengthInput = document.getElementById("password-length");
const lengthVal = document.getElementById("length-val");
const lengthLabel = document.getElementById("length-label");
const strengthBar = document.getElementById("strength-bar");
const strengthText = document.getElementById("strength-text");

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

// Wordlist for passphrase mode (~2310 words: BIP39 + curated extras)
const words = [
  "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract",
  "absurd", "abuse", "access", "accident", "account", "accuse", "achieve", "acid",
  "acoustic", "acquire", "across", "act", "action", "active", "actor", "actress",
  "actual", "adapt", "add", "addict", "address", "adjust", "admit", "adult",
  "advance", "advice", "aerobic", "affair", "afford", "afraid", "again", "age",
  "agent", "agree", "ahead", "aim", "air", "airport", "aisle", "alarm",
  "album", "alcohol", "alert", "alien", "all", "alley", "allow", "almost",
  "alone", "alpha", "already", "also", "alter", "always", "amateur", "amazing",
  "among", "amount", "amused", "analyst", "anchor", "ancient", "anger", "angle",
  "angry", "animal", "ankle", "announce", "annual", "another", "answer", "antenna",
  "antique", "anxiety", "any", "apart", "apology", "appear", "apple", "approve",
  "apricot", "april", "arcade", "arch", "arctic", "area", "arena", "argue",
  "arm", "armed", "armor", "army", "around", "arrange", "arrest", "arrive",
  "arrow", "art", "artefact", "artist", "artwork", "ask", "aspect", "assault",
  "asset", "assist", "assume", "asthma", "athlete", "atom", "attack", "attend",
  "attitude", "attract", "auction", "audit", "august", "aunt", "author", "auto",
  "autumn", "average", "avocado", "avoid", "awake", "aware", "away", "awesome",
  "awful", "awkward", "axis", "baby", "bachelor", "bacon", "badge", "bag",
  "bakery", "balance", "balcony", "ball", "bamboo", "banana", "banner", "bar",
  "barber", "barely", "bargain", "barrel", "base", "basic", "basket", "battle",
  "beach", "bean", "beast", "beauty", "because", "become", "beef", "before",
  "begin", "behave", "behind", "believe", "below", "belt", "bench", "benefit",
  "best", "betray", "better", "between", "beyond", "bicycle", "bid", "bike",
  "bind", "biology", "birch", "bird", "birth", "bitter", "black", "blade",
  "blame", "blanket", "blast", "blaze", "bleak", "bless", "blind", "blood",
  "bloom", "blossom", "blouse", "blue", "bluff", "blur", "blush", "board",
  "boat", "body", "boil", "bold", "bomb", "bone", "bonfire", "bonsai",
  "bonus", "book", "boost", "border", "boring", "borrow", "boss", "bottom",
  "bounce", "box", "boy", "bracket", "brain", "brand", "brass", "brave",
  "bravo", "bread", "breeze", "brick", "bridge", "brief", "bright", "bring",
  "brisk", "broccoli", "broken", "bronze", "broom", "brother", "brown", "brush",
  "bubble", "buddy", "budget", "buffalo", "build", "bulb", "bulk", "bullet",
  "bundle", "bunker", "burden", "burger", "burst", "bus", "business", "busy",
  "butter", "button", "buyer", "buzz", "cabbage", "cabin", "cable", "cactus",
  "cage", "cake", "call", "calm", "camera", "camp", "can", "canal",
  "cancel", "candle", "candy", "cannon", "canoe", "canvas", "canyon", "capable",
  "capital", "captain", "car", "carbon", "card", "cargo", "carpet", "carry",
  "cart", "case", "cash", "casino", "castle", "casual", "cat", "catalog",
  "catch", "category", "cattle", "caught", "cause", "caution", "cave", "cedar",
  "ceiling", "celery", "cement", "census", "century", "cereal", "certain", "chair",
  "chalk", "champion", "change", "chaos", "chapter", "charge", "charlie", "chase",
  "chat", "cheap", "check", "cheese", "chef", "cherry", "chest", "chicken",
  "chief", "child", "chill", "chimney", "choice", "choose", "chrome", "chronic",
  "chuckle", "chunk", "churn", "cigar", "cinnamon", "circle", "citizen", "city",
  "civil", "claim", "clap", "clarify", "claw", "clay", "clean", "clerk",
  "clever", "click", "client", "cliff", "climb", "clinic", "clip", "clock",
  "clog", "close", "cloth", "cloud", "clover", "clown", "club", "clump",
  "cluster", "clutch", "coach", "coast", "cobalt", "coconut", "code", "coffee",
  "coil", "coin", "collect", "color", "column", "combine", "come", "comet",
  "comfort", "comic", "common", "company", "concert", "conduct", "confirm", "congress",
  "connect", "consider", "control", "convince", "cook", "cool", "copper", "copy",
  "coral", "core", "corn", "correct", "cost", "cotton", "couch", "country",
  "couple", "course", "cousin", "cover", "coyote", "crack", "cradle", "craft",
  "cram", "crane", "crash", "crater", "crawl", "crazy", "cream", "credit",
  "creek", "crest", "crew", "cricket", "crime", "crisp", "critic", "crop",
  "cross", "crouch", "crowd", "crown", "crucial", "cruel", "cruise", "crumble",
  "crunch", "crush", "cry", "crystal", "cube", "cuddle", "culture", "cup",
  "cupboard", "curious", "current", "curtain", "curve", "cushion", "custom", "cute",
  "cycle", "cypher", "dad", "damage", "damp", "dance", "danger", "daring",
  "dark", "dash", "daughter", "dawn", "day", "deal", "debate", "debris",
  "decade", "december", "decide", "decline", "decorate", "decrease", "deer", "defense",
  "define", "defy", "degree", "delay", "deliver", "delta", "demand", "demise",
  "demure", "denial", "dentist", "deny", "depart", "depend", "deposit", "depth",
  "deputy", "derive", "describe", "desert", "design", "desk", "despair", "destroy",
  "detail", "detect", "develop", "device", "devote", "dewdrop", "diagram", "dial",
  "diamond", "diary", "dice", "diesel", "diet", "differ", "digger", "digital",
  "dignity", "dilemma", "dinner", "dinosaur", "direct", "dirt", "disagree", "discover",
  "disease", "dish", "dismiss", "disorder", "display", "distance", "divert", "divide",
  "divorce", "dizzy", "doctor", "document", "dog", "doll", "dolphin", "domain",
  "donate", "donkey", "donor", "door", "dose", "double", "dove", "draft",
  "dragon", "drama", "drastic", "draw", "dream", "dress", "drift", "drill",
  "drink", "drip", "drive", "drizzle", "drop", "drum", "dry", "duck",
  "dumb", "dune", "during", "dusk", "dust", "dutch", "duty", "dwarf",
  "dynamic", "eager", "eagle", "early", "earn", "earth", "easily", "east",
  "easy", "echo", "ecology", "economy", "edge", "edit", "educate", "effort",
  "egg", "eight", "either", "elbow", "elder", "electric", "elegant", "element",
  "elephant", "elevator", "elite", "else", "embark", "ember", "embody", "embrace",
  "emerald", "emerge", "emotion", "employ", "empower", "empty", "enable", "enact",
  "end", "endless", "endorse", "enemy", "energy", "enforce", "engage", "engine",
  "enhance", "enjoy", "enlist", "enough", "enrich", "enroll", "ensure", "enter",
  "entire", "entry", "envelope", "episode", "epoch", "equal", "equip", "era",
  "erase", "erode", "erosion", "error", "erupt", "escape", "essay", "essence",
  "estate", "eternal", "ethics", "ettle", "evidence", "evil", "evoke", "evolve",
  "exact", "example", "excess", "exchange", "excite", "exclude", "excuse", "execute",
  "exercise", "exhaust", "exhibit", "exile", "exist", "exit", "exotic", "expand",
  "expect", "expire", "explain", "expose", "express", "extend", "extra", "eye",
  "eyebrow", "fabric", "face", "faculty", "fade", "faint", "fair", "faith",
  "falcon", "fall", "false", "fame", "family", "famous", "fan", "fancy",
  "fantasy", "farm", "fashion", "fast", "fat", "fatal", "father", "fatigue",
  "fault", "favorite", "fawn", "feature", "february", "federal", "fee", "feed",
  "feel", "female", "fence", "fennel", "ferret", "festival", "fetch", "fever",
  "few", "fiber", "fiction", "field", "fig", "figure", "file", "film",
  "filter", "final", "find", "fine", "finger", "finish", "fire", "firm",
  "first", "fiscal", "fish", "fit", "fitness", "fix", "flag", "flame",
  "flash", "flat", "flavor", "flee", "flight", "flint", "flip", "float",
  "flock", "floor", "flora", "flower", "fluid", "flush", "fly", "foam",
  "focus", "fog", "foil", "fold", "follow", "food", "foot", "force",
  "forest", "forge", "forget", "fork", "fortune", "forum", "forward", "fossil",
  "foster", "found", "fox", "foxtrot", "fragile", "frame", "frequent", "fresh",
  "friend", "fringe", "frog", "front", "frost", "frown", "frozen", "fruit",
  "fuel", "fun", "fungi", "funny", "furnace", "fury", "future", "gadget",
  "gain", "galaxy", "gale", "gallery", "game", "gap", "garage", "garbage",
  "garden", "garlic", "garment", "garnet", "gas", "gasp", "gate", "gather",
  "gauge", "gaze", "gecko", "general", "genius", "genre", "gentle", "genuine",
  "gesture", "ghost", "giant", "gift", "giggle", "ginger", "giraffe", "girl",
  "give", "glacier", "glad", "glance", "glare", "glass", "glide", "glimpse",
  "globe", "gloom", "glory", "glove", "glow", "glue", "goat", "goddess",
  "gold", "golden", "golf", "good", "goose", "gorilla", "gospel", "gossip",
  "govern", "gown", "grab", "grace", "grain", "granite", "grant", "grape",
  "grass", "gravel", "gravity", "great", "green", "grid", "grief", "grit",
  "grocery", "group", "grove", "grow", "grunt", "guard", "guardian", "guess",
  "guide", "guilt", "guitar", "gun", "gust", "gym", "habit", "hair",
  "half", "hamlet", "hammer", "hamster", "hand", "happy", "harbor", "hard",
  "harsh", "harvest", "hat", "have", "hawk", "hazard", "hazel", "head",
  "health", "heart", "hearth", "heavy", "hedgehog", "height", "helium", "hello",
  "helmet", "help", "hen", "hero", "heron", "hidden", "high", "highland",
  "hill", "hint", "hip", "hire", "history", "hobby", "hockey", "hold",
  "hole", "holiday", "hollow", "holly", "home", "honey", "hood", "hope",
  "horizon", "horn", "horror", "horse", "hospital", "host", "hotel", "hour",
  "hover", "hub", "huge", "human", "humble", "humor", "hundred", "hungry",
  "hunt", "hurdle", "hurry", "hurt", "husband", "hybrid", "ice", "icon",
  "idea", "identify", "idle", "ignore", "iguana", "ill", "illegal", "illness",
  "image", "imitate", "immense", "immune", "impact", "impala", "impose", "improve",
  "impulse", "inch", "include", "income", "increase", "index", "india", "indicate",
  "indigo", "indoor", "industry", "infant", "inflict", "inform", "inhale", "inherit",
  "initial", "inject", "injury", "ink", "inmate", "inner", "innocent", "input",
  "inquiry", "insane", "insect", "inside", "inspire", "install", "intact", "interest",
  "into", "invest", "invite", "involve", "iron", "island", "isolate", "issue",
  "item", "ivory", "jacket", "jade", "jaguar", "jar", "jasmine", "jazz",
  "jealous", "jeans", "jelly", "jewel", "job", "join", "joke", "jolly",
  "journey", "joy", "judge", "juice", "juliet", "jump", "jungle", "junior",
  "juniper", "junk", "just", "kangaroo", "keen", "keep", "ketchup", "kettle",
  "key", "keystone", "kick", "kid", "kidney", "kilo", "kind", "kingdom",
  "kiss", "kit", "kitchen", "kite", "kitten", "kiwi", "knee", "knife",
  "knight", "knock", "know", "lab", "label", "labor", "ladder", "lady",
  "lagoon", "lake", "lamp", "language", "lantern", "lapis", "laptop", "larch",
  "large", "later", "latin", "laugh", "laundry", "lava", "law", "lawn",
  "lawsuit", "layer", "lazy", "leader", "leaf", "learn", "leave", "lecture",
  "left", "leg", "legal", "legend", "leisure", "lemon", "lemur", "lend",
  "length", "lens", "leopard", "lesson", "letter", "level", "liar", "liberty",
  "library", "license", "lichen", "life", "lift", "light", "like", "lima",
  "limb", "limit", "linen", "link", "lion", "liquid", "list", "lithium",
  "little", "live", "lizard", "load", "loan", "lobster", "local", "lock",
  "logic", "lonely", "long", "loop", "lottery", "lotus", "loud", "lounge",
  "love", "loyal", "lucky", "luggage", "lumber", "lunar", "lunch", "luxury",
  "lynx", "lyrics", "machine", "mad", "magic", "magnet", "maid", "mail",
  "main", "major", "make", "mammal", "man", "manage", "mandate", "mango",
  "mansion", "manual", "maple", "marble", "march", "margin", "marine", "market",
  "marriage", "marten", "mask", "mass", "master", "match", "material", "math",
  "matrix", "matter", "maximum", "maze", "meadow", "mean", "measure", "meat",
  "mechanic", "medal", "media", "melody", "melt", "member", "memory", "mention",
  "menu", "mercury", "mercy", "merge", "merit", "merry", "mesh", "message",
  "metal", "method", "mica", "middle", "midnight", "mike", "milk", "millet",
  "million", "mimic", "mind", "minimum", "minor", "minute", "miracle", "mirage",
  "mirror", "misery", "miss", "mist", "mistake", "mitten", "mix", "mixed",
  "mixture", "mobile", "mocha", "model", "modify", "mogul", "mom", "moment",
  "monitor", "monkey", "monster", "month", "moon", "moral", "more", "morning",
  "mosaic", "mosquito", "moss", "moth", "mother", "motion", "motor", "mountain",
  "mouse", "move", "movie", "much", "muffin", "mulch", "mule", "multiply",
  "murmur", "muscle", "museum", "mushroom", "music", "must", "mutual", "myrtle",
  "myself", "mystery", "myth", "naive", "name", "napkin", "narrow", "nasty",
  "nation", "nature", "near", "neck", "nectar", "need", "negative", "neglect",
  "neither", "neon", "nephew", "nerve", "nest", "net", "network", "neutral",
  "never", "news", "next", "nice", "night", "nimble", "nimbus", "noble",
  "noise", "nominee", "noodle", "normal", "north", "nose", "notable", "note",
  "nothing", "notice", "nova", "novel", "november", "now", "nuclear", "nucleus",
  "number", "nurse", "nut", "oak", "oasis", "obey", "object", "oblige",
  "obscure", "observe", "obsidian", "obtain", "obvious", "occur", "ocean", "october",
  "odor", "off", "offer", "office", "often", "oil", "okay", "old",
  "olive", "olympic", "omit", "once", "one", "onion", "online", "only",
  "onyx", "open", "opera", "opinion", "oppose", "option", "orange", "orbit",
  "orchard", "orchid", "order", "ordinary", "organ", "orient", "original", "orphan",
  "oscar", "ostrich", "other", "otter", "outdoor", "outer", "output", "outside",
  "oval", "oven", "over", "own", "owner", "oxford", "oxygen", "oyster",
  "ozone", "pact", "paddle", "page", "pair", "palace", "palm", "panda",
  "panel", "panic", "panther", "papa", "paper", "parade", "parent", "park",
  "parrot", "party", "pass", "paste", "patch", "path", "patient", "patrol",
  "pattern", "pause", "pave", "payment", "peace", "peach", "peanut", "pear",
  "pearl", "peasant", "pebble", "pelican", "pen", "penalty", "pencil", "penny",
  "people", "pepper", "perch", "perfect", "permit", "person", "pet", "pewter",
  "phoenix", "phone", "photo", "phrase", "physical", "piano", "picnic", "picture",
  "pie", "piece", "pig", "pigeon", "pill", "pilot", "pine", "pink",
  "pioneer", "pipe", "pirate", "pistol", "pitch", "pixel", "pizza", "place",
  "plaid", "planet", "plank", "plastic", "plate", "play", "plaza", "please",
  "pledge", "pluck", "plug", "plume", "plunge", "plush", "poem", "poet",
  "point", "polar", "pole", "police", "pompom", "pond", "pony", "pool",
  "poppy", "popular", "portion", "position", "possible", "post", "potato", "pottery",
  "poverty", "powder", "power", "practice", "praise", "predict", "prefer", "prepare",
  "present", "pretty", "prevent", "price", "pride", "primary", "print", "priority",
  "prism", "prison", "private", "prize", "problem", "process", "produce", "profit",
  "program", "project", "promote", "proof", "property", "prophet", "prosper", "protect",
  "proud", "provide", "public", "pudding", "pull", "pulp", "pulse", "puma",
  "pumpkin", "punch", "pupil", "puppy", "purchase", "purity", "purpose", "purse",
  "push", "put", "puzzle", "pyramid", "quail", "quality", "quantum", "quarter",
  "quartz", "quebec", "quest", "question", "quick", "quill", "quince", "quit",
  "quiz", "quote", "rabbit", "raccoon", "race", "rack", "radar", "radio",
  "radish", "rafter", "rail", "rain", "raise", "rally", "ramp", "ranch",
  "random", "range", "rapid", "rapids", "rare", "rate", "rather", "raven",
  "raw", "razor", "reach", "ready", "real", "reason", "rebel", "rebuild",
  "recall", "receive", "recipe", "record", "recycle", "reduce", "reef", "reflect",
  "reform", "refuse", "region", "regret", "regular", "reject", "relax", "release",
  "relief", "rely", "remain", "remember", "remind", "remove", "render", "renew",
  "rent", "reopen", "repair", "repeat", "replace", "report", "require", "rescue",
  "resemble", "resist", "resource", "response", "result", "retire", "retreat", "return",
  "reunion", "reveal", "review", "reward", "rhythm", "rib", "ribbon", "rice",
  "rich", "riddle", "ride", "ridge", "rifle", "right", "rigid", "ring",
  "riot", "ripple", "risk", "ritual", "rival", "river", "road", "roast",
  "robin", "robot", "robust", "rocket", "romance", "romeo", "roof", "rook",
  "rookie", "room", "rose", "rotate", "rough", "round", "route", "royal",
  "rubber", "ruby", "rude", "rug", "rule", "ruler", "run", "runway",
  "rural", "russet", "rust", "sad", "saddle", "sadness", "safe", "saffron",
  "sage", "sail", "salad", "salmon", "salon", "salt", "salute", "same",
  "sample", "samurai", "sand", "sapphire", "satisfy", "satoshi", "sauce", "sausage",
  "save", "say", "scale", "scan", "scare", "scarlet", "scatter", "scene",
  "scheme", "school", "science", "scissors", "scorpion", "scout", "scrap", "screen",
  "script", "scrub", "sea", "seal", "search", "season", "seat", "second",
  "secret", "section", "security", "seed", "seeds", "seek", "segment", "select",
  "sell", "seminar", "senior", "sense", "sentence", "sequoia", "series", "service",
  "session", "settle", "setup", "seven", "shadow", "shaft", "shallot", "shallow",
  "share", "shed", "sheep", "shell", "sheriff", "shield", "shift", "shimmer",
  "shine", "ship", "shiver", "shock", "shoe", "shoot", "shop", "short",
  "shoulder", "shove", "shrimp", "shrine", "shrug", "shuffle", "shy", "sibling",
  "sick", "side", "siege", "sierra", "sight", "sign", "silent", "silk",
  "silly", "silver", "similar", "simple", "since", "sing", "siren", "sister",
  "situate", "six", "size", "skate", "sketch", "ski", "skill", "skin",
  "skink", "skirt", "skull", "slab", "slam", "sleep", "slender", "slice",
  "slide", "slight", "slim", "slogan", "slope", "slot", "slow", "slush",
  "small", "smart", "smile", "smoke", "smooth", "snack", "snail", "snake",
  "snap", "sniff", "snow", "soap", "soccer", "social", "sock", "soda",
  "soft", "solar", "soldier", "solid", "solution", "solve", "someone", "song",
  "sonnet", "soon", "sorry", "sort", "soul", "sound", "soup", "source",
  "south", "space", "spare", "sparrow", "spatial", "spawn", "speak", "special",
  "speed", "spell", "spend", "sphere", "spice", "spider", "spike", "spin",
  "spiral", "spirit", "splash", "split", "spoil", "sponsor", "spoon", "sport",
  "spot", "spray", "spread", "spring", "spruce", "spy", "square", "squash",
  "squeeze", "squirrel", "stable", "stadium", "staff", "stage", "stairs", "stallion",
  "stamp", "stand", "star", "start", "state", "stay", "steak", "steel",
  "stellar", "stem", "step", "stereo", "stick", "still", "sting", "stock",
  "stomach", "stone", "stool", "storm", "story", "stove", "strategy", "stream",
  "street", "stride", "strike", "string", "stripe", "strong", "struggle", "student",
  "studio", "stuff", "stumble", "style", "subject", "submit", "subway", "success",
  "such", "sudden", "suffer", "sugar", "suggest", "suit", "summer", "summit",
  "sun", "sundial", "sunny", "sunset", "super", "supply", "supreme", "sure",
  "surface", "surge", "surprise", "surround", "survey", "suspect", "sustain", "swallow",
  "swamp", "swan", "swap", "swarm", "swear", "sweet", "swift", "swim",
  "swing", "switch", "sword", "sycamore", "symbol", "symptom", "syrup", "system",
  "table", "tablet", "tackle", "tag", "tail", "talent", "talk", "talon",
  "tango", "tank", "tape", "target", "task", "taste", "tattoo", "taxi",
  "teach", "teal", "team", "tell", "temple", "ten", "tenant", "tennis",
  "tent", "term", "test", "text", "thank", "that", "thatch", "theme",
  "then", "theory", "there", "they", "thing", "this", "thistle", "thorn",
  "thought", "three", "thrive", "throw", "thrush", "thumb", "thunder", "ticket",
  "tide", "tiger", "tilt", "timber", "time", "tiny", "tip", "tired",
  "tissue", "titan", "title", "toad", "toast", "tobacco", "today", "toddler",
  "toe", "together", "toilet", "token", "tomato", "tomes", "tomorrow", "tone",
  "tongue", "tonight", "tool", "tooth", "top", "topaz", "topic", "topple",
  "torch", "tornado", "tortoise", "toss", "total", "tough", "tourist", "toward",
  "tower", "town", "toy", "track", "trade", "traffic", "tragic", "trail",
  "train", "transfer", "trap", "trash", "travel", "tray", "treat", "tree",
  "trek", "trend", "trial", "tribe", "trick", "trident", "trigger", "trim",
  "trip", "triple", "trophy", "trouble", "trout", "truck", "true", "truffle",
  "truly", "trumpet", "trust", "truth", "try", "tube", "tuition", "tulip",
  "tumble", "tuna", "tundra", "tunnel", "turkey", "turn", "turret", "turtle",
  "twelve", "twenty", "twice", "twig", "twilight", "twin", "twist", "two",
  "type", "typical", "ugly", "umbrella", "unable", "unaware", "uncle", "uncover",
  "under", "undo", "unfair", "unfold", "unhappy", "uniform", "unique", "unit",
  "universe", "unknown", "unlock", "until", "unusual", "unveil", "update", "upgrade",
  "uphold", "upon", "upper", "upset", "urban", "urchin", "urge", "usage",
  "use", "used", "useful", "useless", "usual", "utility", "uturn", "vacant",
  "vacuum", "vague", "valid", "valley", "valve", "van", "vanilla", "vanish",
  "vapor", "various", "vast", "vault", "vehicle", "velvet", "vendor", "venture",
  "venue", "verb", "verify", "version", "very", "vessel", "veteran", "viable",
  "vibrant", "vicious", "victor", "victory", "vicuna", "video", "view", "village",
  "vintage", "violet", "violin", "viper", "virtual", "virus", "visa", "visit",
  "visual", "vital", "vivid", "vixen", "vocal", "voice", "void", "volcano",
  "voltage", "volume", "vote", "voyage", "waffle", "wage", "wagon", "wait",
  "walk", "wall", "walnut", "wander", "want", "warfare", "warm", "warrior",
  "wash", "wasp", "waste", "watch", "water", "wave", "way", "wealth",
  "weapon", "wear", "weasel", "weather", "web", "wedding", "weekend", "weird",
  "welcome", "west", "wet", "whale", "what", "wheat", "wheel", "when",
  "where", "whim", "whip", "whirl", "whisk", "whiskey", "whisper", "wide",
  "width", "wife", "wild", "will", "willow", "win", "window", "wine",
  "wing", "wink", "winner", "winter", "wire", "wisdom", "wise", "wish",
  "witness", "wolf", "woman", "wombat", "wonder", "wood", "wool", "word",
  "work", "world", "worry", "worth", "wrap", "wreck", "wren", "wrest",
  "wrestle", "wrist", "write", "wrong", "xenon", "xerox", "xray", "yacht",
  "yak", "yankee", "yard", "yarrow", "year", "yellow", "yew", "yoga",
  "yoke", "you", "young", "youth", "zebra", "zen", "zephyr", "zero",
  "zinc", "zinnia", "zodiac", "zone", "zoo", "zulu",
];

let strengthTimer = null;
function scheduleStrengthUpdate(password) {
  clearTimeout(strengthTimer);
  strengthTimer = setTimeout(() => updateStrength(password), 300);
}

function generatePassword() {
  const mode = document.querySelector('input[name="genMode"]:checked').value;
  let password = "";

  if (mode === "password") {
    let charSet = "";
    if (includeUppercase.checked) charSet += chars.uppercase;
    if (includeLowercase.checked) charSet += chars.lowercase;
    if (includeNumbers.checked) charSet += chars.numbers;
    if (includeSymbols.checked) charSet += chars.symbols;

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
  scheduleStrengthUpdate(password);
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
      lengthInput.max = 128;
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
].forEach((input) => {
  input.addEventListener("input", () => {
    lengthVal.textContent = lengthInput.value;
    generatePassword();
  });
});

// Custom Select Logic
document.querySelectorAll(".custom-select-container").forEach((container) => {
  const trigger = container.querySelector(".select-trigger");
  const options = container.querySelectorAll(".select-option");
  const nativeSelect = container.querySelector(".native-select");
  const labelText = trigger.querySelector("span");

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    document.querySelectorAll(".custom-select-container").forEach((other) => {
      if (other !== container) other.classList.remove("active");
    });
    container.classList.toggle("active");
  });

  options.forEach((option) => {
    option.addEventListener("click", () => {
      const value = option.dataset.value;
      const text = option.textContent.trim();
      labelText.textContent = text;
      options.forEach((opt) => opt.classList.remove("selected"));
      option.classList.add("selected");
      nativeSelect.value = value;
      container.classList.remove("active");
      generatePassword();
    });
  });
});

document.addEventListener("click", () => {
  document.querySelectorAll(".custom-select-container").forEach((container) => {
    container.classList.remove("active");
  });
});

generateBtn.addEventListener("click", generatePassword);

copyBtn.addEventListener("click", () => {
  const password = passwordOutput.textContent;
  if (
    password === "Click Generate" ||
    password === "Select at least one option"
  )
    return;

  const originalContent = copyBtn.innerHTML;

  copyBtn.innerHTML = `
    <span class="copy-icon-wrapper">
      <span class="copy-icon-original fade">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
        </svg>
      </span>
      <span class="copy-icon-check">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          class="checkmark">
          <polyline points="20,6 9,17 4,12"></polyline>
        </svg>
      </span>
    </span>
    <span>Copied!</span>
  `;

  navigator.clipboard.writeText(password);

  setTimeout(() => {
    copyBtn.innerHTML = originalContent;
  }, 2000);
});

// Initial generation
generatePassword();
