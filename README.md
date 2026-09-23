<p align="center">
  <img src="https://github.com/RackRunner1/ToolsBoXMachine/blob/main/.assets/logo/logo.png?raw=true" width="10000">
</p>

---

## About

**ToolsBoXMachine (TBXM)** is a free, open-source collection of browser-based utility tools. Every tool runs entirely client-side: no data is ever sent to any server. Built for privacy, speed, and simplicity.

**Live:** [tbxm.org](https://www.tbxm.org)

## Technologies

- **HTML5 / CSS3**: vanilla, no frameworks, with CSS custom properties and glassmorphism UI
- **Vanilla JavaScript**: ES6+ with ES Modules, no bundler, no transpiler
- **Canvas API**: used by the blur tool for image manipulation
- **Python** (dev only): Pillow script for generating Open Graph banner images
- **GitHub Actions**: CI for OG image generation and releases

No `package.json`, no build step, no dependencies. Open `index.html` in a browser and it works.

## Tools

| Tool | Description |
|------|-------------|
| Blur Image | Protect privacy by blurring sensitive parts of images |
| Calculator | Perform basic arithmetic calculations |
| Password Generator | Generate secure passwords or passphrases |
| QR Code Generator | Create custom QR codes for any link or text |
| JSON Formatter | Format, minify, and validate JSON data |
| Pomodoro Timer | Stay focused with timed work sessions |
| Emoji Keyboard | Browse and copy emojis with one click |
| Notes | Create, save, and manage notes locally |
| Clock | A customizable clock with analog and digital display |

## Project Structure

```
tbxm/
├── index.html              # Homepage
├── style.css               # Global styles (CSS custom properties)
├── ui/                     # Shared components (navbar, footer, loader)
├── tools/                  # One folder per tool (HTML + JS)
│   ├── blur/
│   ├── calculator/
│   ├── clock/
│   ├── emoji-keyboard/
│   ├── json-formatter/
│   ├── note/
│   ├── password-gen/
│   ├── qr-gen/
│   └── timer/
├── pages/                  # Static pages (about, privacy, terms, philosophy)
├── public/                 # Machine-readable endpoints (JSON, MCP, agent-skills)
├── og/                     # Generated Open Graph images
├── scripts/                # Dev scripts (OG image generation)
└── .github/workflows/      # CI/CD (OG generation, releases)
```

## Local Development

No build tools required: just a static file server.

```bash
git clone https://github.com/RackRunner1/ToolsBoXMachine.git
cd ToolsBoXMachine
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a PR.

- Never push directly to `main`
- Use Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)
- One tool = one folder in `tools/`

## License

[Unlicense](LICENSE): public domain.
