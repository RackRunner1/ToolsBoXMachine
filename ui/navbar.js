document.addEventListener("components-loaded", () => {
  const searchInput = document.getElementById("tool-search");
  const searchDropdown = document.getElementById("search-dropdown");
  const searchResults = document.getElementById("search-results");

  const tools = [
    {
      name: "Blur Image",
      emoji: "🎨",
      desc: "Protect privacy by blurring sensitive parts.",
      keywords: "image privacy hide anonymize secure",
      url: "/tools/blur/blur.html",
    },
    {
      name: "Calculator",
      emoji: "🧮",
      desc: "Perform quick calculations with ease.",
      keywords: "math compute arithmetic calculate numbers",
      url: "/tools/calculator/calculator.html",
    },
    {
      name: "Password Gen",
      emoji: "🔐",
      desc: "Generate secure passwords or passphrases.",
      keywords: "security secret key safe password",
      url: "/tools/password-gen/password-gen.html",
    },
    {
      name: "QR Generator",
      emoji: "📱",
      desc: "Create custom QR codes for any link or text.",
      keywords: "link phone scan share code barcode",
      url: "/tools/qr-gen/qr-gen.html",
    },
    {
      name: "Pomodoro Timer",
      emoji: "⏱️",
      desc: "Stay focused with timed work sessions.",
      keywords: "pomodoro timer time clock focus break study work productivity",
      url: "/tools/timer/timer.html",
    },
    {
      name: "Emoji Keyboard",
      emoji: "😀",
      desc: "Browse and copy emojis with one click.",
      keywords: "emoji emoticon smiley symbol copy paste picker keyboard",
      url: "/tools/emoji-keyboard/emoji-keyboard.html",
    },
    {
      name: "Notes",
      emoji: "📝",
      desc: "Create, save, and manage your notes.",
      keywords: "note notes text write diary jot record save",
      url: "/tools/note/note.html",
    },
    {
      name: "Clock",
      emoji: "🕐",
      desc: "A customizable clock with analog and digital display.",
      keywords: "clock time analog digital timezone world watch",
      url: "/tools/clock/clock.html",
    },
    {
      name: "New Year Countdown",
      emoji: "🎆",
      desc: "Time until and since New Year, in your timezone.",
      keywords: "new year countdown timer january celebration fireworks clock time since new year elapsed timer",
      url: "/tools/new-year-countdown/new-year-countdown.html",
    },
  ];

  function positionDropdown() {
    const rect = searchInput.getBoundingClientRect();
    searchDropdown.style.top = `${rect.bottom + 8}px`;
    searchDropdown.style.left = `${rect.left}px`;
    searchDropdown.style.width = `${rect.width}px`;
  }

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
      searchResults.innerHTML = '<div class="search-empty">No results found</div>';
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

        searchResults.appendChild(item);
      });
    }

    positionDropdown();
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

  window.addEventListener("resize", () => {
    if (
      searchDropdown &&
      searchDropdown.classList.contains("active") &&
      searchInput
    ) {
      positionDropdown();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && searchDropdown)
      searchDropdown.classList.remove("active");
  });
});
