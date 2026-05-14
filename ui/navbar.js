const searchInput = document.getElementById("tool-search");
const searchDropdown = document.getElementById("search-dropdown");
const searchResults = document.getElementById("search-results");

const tools = [
  {
    id: "card-blur",
    name: "Blur Image",
    emoji: "🎨",
    desc: "Protect privacy by blurring sensitive parts.",
    keywords: "image privacy hide anonymize secure",
    url: "/tools/blur/blur.html",
  },
  {
    id: "card-calculator",
    name: "Calculator",
    emoji: "🧮",
    desc: "Perform quick calculations with ease.",
    keywords: "math compute arithmetic calculate numbers",
    url: "/tools/calculator/calculator.html",
  },
  {
    id: "card-correcteur",
    name: "Text Corrector",
    emoji: "✍️",
    desc: "Fix grammar and spelling in seconds.",
    keywords: "spelling grammar writing fix spell check",
    url: "/tools/correcteur/correcteur.html",
  },
  {
    id: "card-password",
    name: "Password Gen",
    emoji: "🔐",
    desc: "Generate secure passwords or passphrases.",
    keywords: "security secret key safe password",
    url: "/tools/password-gen/password-gen.html",
  },
  {
    id: "card-qr",
    name: "QR Generator",
    emoji: "📱",
    desc: "Create custom QR codes for any link or text.",
    keywords: "link phone scan share code barcode",
    url: "/tools/qr-gen/qr-gen.html",
  },
];

function updateSearch() {
  if (!searchInput || !searchDropdown || !searchResults) return;

  const query = searchInput.value.toLowerCase().trim();
  if (query === "") {
    searchDropdown.classList.remove("active");
    return;
  }

  const queryWords = query.split(/\s+/);
  const filtered = tools.filter((t) => {
    const searchStr = (t.name + " " + t.desc + " " + t.keywords).toLowerCase();
    return queryWords.every((word) => searchStr.includes(word));
  });

  searchResults.innerHTML = "";

  if (filtered.length === 0) {
    searchResults.innerHTML =
      '<div style="padding: 1rem; text-align: center; opacity: 0.5; font-size: 0.8rem;">No results found</div>';
  } else {
    filtered.forEach((tool) => {
      const item = document.createElement("a");
      item.href = tool.url;
      item.className = "search-result-item";
      item.innerHTML = `
        <span class="result-emoji-small">${tool.emoji}</span>
        <div class="result-info">
          <div class="result-name-small">${tool.name}</div>
          <div class="result-desc-small">${tool.desc}</div>
        </div>
      `;
      item.addEventListener("click", () => {
        localStorage.setItem("tbxm_last_tool", tool.id);
        localStorage.setItem("tbxm_last_tool_name", tool.name);
      });
      searchResults.appendChild(item);
    });
  }

  // Position the dropdown directly under the search input
  const rect = searchInput.getBoundingClientRect();
  searchDropdown.style.top = `${rect.bottom + 8}px`;
  searchDropdown.style.left = `${rect.left}px`;
  searchDropdown.style.width = `${rect.width}px`;

  searchDropdown.classList.add("active");
}

if (searchInput) {
  searchInput.addEventListener("input", updateSearch);

  searchInput.addEventListener("focus", () => {
    if (searchInput.value.trim() !== "") {
      updateSearch();
    }
  });
}

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (
    searchInput &&
    searchDropdown &&
    !searchInput.contains(e.target) &&
    !searchDropdown.contains(e.target)
  ) {
    searchDropdown.classList.remove("active");
  }
});

// Update position on resize
window.addEventListener("resize", () => {
  if (
    searchDropdown &&
    searchDropdown.classList.contains("active") &&
    searchInput
  ) {
    const rect = searchInput.getBoundingClientRect();
    searchDropdown.style.top = `${rect.bottom + 8}px`;
    searchDropdown.style.left = `${rect.left}px`;
    searchDropdown.style.width = `${rect.width}px`;
  }
});

// Track tool usage for cards (if they exist on the page)
document.querySelectorAll(".card-btn").forEach((card) => {
  card.addEventListener("click", () => {
    const titleEl =
      card.querySelector("div div") || card.querySelector(".card-title");
    const title = titleEl ? titleEl.textContent : card.id;
    localStorage.setItem("tbxm_last_tool", card.id);
    localStorage.setItem("tbxm_last_tool_name", title);
  });
});

// Handle Esc key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && searchDropdown)
    searchDropdown.classList.remove("active");
});
