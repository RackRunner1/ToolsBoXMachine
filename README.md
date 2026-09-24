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

## A Note on Repository Activity

<details>
<summary><b>Who is RackRunner, and why is activity so irregular here?</b></summary>

Hi! I'm **RackRunner**, the person behind ToolsBoXMachine.

First of all, let's be fully transparent about something: **I'm only 13 years old**. I'm currently a student in *4ème* in France, which is roughly the equivalent of 8th grade in the US or Year 9 in the UK. In other words, I'm a middle-schooler with classes every day, homework most evenings, and regular tests to study for.

**TBXM is, above all, a hobby project.** It was born out of a genuine passion for building small, useful, privacy-friendly tools, and not out of a professional obligation or a company roadmap. I work on it whenever inspiration strikes and, more importantly, whenever my school schedule allows it. This year in particular, my workload from school is *heavy*, which directly translates into how this repository behaves.

That's why **activity here can be extremely uneven**, and I'd rather explain it clearly up front than let anyone misinterpret the contribution graph:

- **During the school week**, activity is usually *very low*. Between classes, homework, and studying, there is often little time left for coding. You might see days (sometimes even entire weeks) with barely any commits, unanswered issues, or untouched pull requests. Please don't read silence as abandonment: more often than not, it just means I'm buried under homework.

- **On weekends**, things often *pick up dramatically*. With several free days ahead, I tend to collect my ideas during the week and then push a large batch of work in a short burst. As a result, the activity graph can suddenly spike after a long, quiet stretch.

- **During school holidays** (summer break, Christmas, half-term, and everything in between), the effect is even stronger. With far more free time on my hands, this is typically when the project experiences its biggest waves of activity: new tools, refactors, bug fixes, documentation updates, and general maintenance, often all at once.

In short: if you notice long quiet periods followed by intense bursts of work, that's completely normal for this repository. It simply follows the rhythm of a student's life: dead quiet during exam weeks, alive and buzzing on weekends and holidays. The project is never dead; it just runs on a teenager's timetable.

Thanks a lot for your understanding, your interest, and any contribution you might make along the way!

*RackRunner*

</details>

## License

[Unlicense](LICENSE): public domain.
