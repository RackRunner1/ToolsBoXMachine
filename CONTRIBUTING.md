# Contributing Guide — ToolsBoXMachine (TBXM)

Thank you for your interest in contributing to **ToolsBoXMachine**! This project is a collection of 100% client-side browser tools: no build step, no dependencies, no backend. This guide defines the rules to follow so your contributions get accepted quickly.

> By contributing, you agree that your contribution is published under the [Unlicense](LICENSE) (public domain).

---

## Table of contents

1. [Code of Conduct](#code-of-conduct)
2. [Before you start](#before-you-start)
3. [Local setup](#local-setup)
4. [General rules](#general-rules)
5. [AI usage](#ai-usage)
6. [Dependencies and external fetches](#dependencies-and-external-fetches)
7. [Branches (conventional branch)](#branches-conventional-branch)
8. [Commits (Conventional Commits)](#commits-conventional-commits)
9. [Pull requests](#pull-requests)
10. [Code style](#code-style)
11. [Adding a new tool](#adding-a-new-tool)
12. [Testing](#testing)
13. [Documentation](#documentation)
14. [Accessibility](#accessibility)
15. [Supported browsers](#supported-browsers)
16. [Reporting a bug / proposing a feature](#reporting-a-bug--proposing-a-feature)
17. [License](#license)

---

## Code of Conduct

This project adopts the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you agree to follow its rules. Unacceptable behavior may be reported to the maintainer.

## Before you start

- Read this guide and the [README.md](README.md).
- Check that no issue or PR already exists for what you want to do.
- For a major change, open an issue first to discuss it.

## Local setup

No build tools required.

```bash
git clone https://github.com/RackRunner1/ToolsBoXMachine.git
cd ToolsBoXMachine
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## General rules

- **Never push directly to `main`.** Every change goes through a branch + PR.
- One PR = one coherent change. Avoid mixing refactor, feature and fix in the same PR.
- Keep PRs small and focused.
- Respect the project structure: `tools/<tool-name>/` for a tool, `pages/` for static pages, `ui/` for shared components.
- No strict file size limit, but prefer readability.

## AI usage

**AI usage is completely allowed** (code generation, writing, refactoring, etc.). Conditions:

- You remain responsible for the submitted code: review, test and understand what you propose.
- Mention in the PR description if AI was used (and for what).
- AI-generated code must follow all other rules in this guide (style, no external fetch, etc.).

## Dependencies and external fetches

**Strictly refused**: any addition or modification that introduces a `fetch` (or equivalent) of an external library, a remote resource, a font, an image, or any external asset.

- No CDN, no `npm`, no `package.json`, no bundler, no transpiler.
- No Google Fonts, no externally hosted images, no third-party scripts.
- Everything must be embedded in the repository and loaded relatively.
- If you need a feature, reimplement it in vanilla JS or vendor the resource into the repo (with a compatible license).

This rule applies to **all** external resources, without exception.

## Branches (conventional branch)

Branches must follow the **conventional branch** naming:

```
<type>/<short-title-in-kebab-case>
```

Allowed prefixes:

| Prefix | Usage |
|---|---|
| `feat/` | New feature |
| `fix/` | Bug fix |
| `chore/` | Maintenance, config, tooling |
| `docs/` | Documentation |
| `style/` | CSS styling / formatting (no logic change) |
| `refactor/` | Refactor without behavior change |
| `perf/` | Performance improvement |
| `test/` | Add/modify tests |

Examples: `feat/qr-code-colors`, `fix/navbar-mobile`, `chore/update-sitemap`.

- Short title, lowercase, words separated by hyphens.
- No spaces or special characters.

## Commits (Conventional Commits)

Commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

- `type`: one of the branch prefixes (`feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`).
- `scope`: part of the project affected (e.g. `timer`, `navbar`, `blur`, `root`).
- Short description in present tense, in English, no capital first letter, no trailing period.
- Example: `feat(qr-gen): add color customization`.

Commit signing (GPG/SSH) is **recommended** but not mandatory.

## Pull requests

### Process

- PRs are squash-merged directly to `main` (squash merge allowed).
- No mandatory approvals (reviews), but feedback is welcome.
- **Draft** PRs are allowed for work in progress.
- The PR title must follow the Conventional Commits format: `feat(scope): description`.

### Checklist before submission

- [ ] My branch follows the conventional branch naming
- [ ] My commits follow the Conventional Commits format
- [ ] I introduced no external resource fetch
- [ ] I tested on desktop and mobile
- [ ] No new console errors
- [ ] I updated the documentation if needed
- [ ] I mentioned AI usage where applicable

### What is expected in the PR

- Clear description of what the PR does.
- Type of change (new tool, fix, feature, docs, etc.).
- Affected scope.
- Steps to test.
- Screenshot if visual change.
- References to related issues (`Closes #123`).

## Code style

- **Indentation: 2 spaces** (no tabs).
- **Vanilla JavaScript ES6+**, ES modules (`import`/`export`), no framework.
- **HTML5 / CSS3** vanilla, CSS custom properties, no preprocessor.
- Language for code, comments and documentation: **English**.
- No unnecessary comments; code should be self-documenting.
- No `console.log` left in production.
- Match the existing style of neighboring files.

## Adding a new tool

1. Create a folder `tools/<tool-name>/`.
2. Add at least an HTML file and a JS file.
3. Follow the structure of existing tools (navbar/footer included via `ui/include.js`).
4. Update `index.html` (tool card) and `llms.txt` / `public/` if relevant.
5. Update `sitemap.xml` if needed.
6. Folder name in kebab-case, consistent with the tool slug.

## Testing

- No automated test suite in this project.
- **Manual** tests required: desktop + mobile (at least one mobile browser or responsive mode).
- Check for absence of console errors.
- Verify the tool works offline (no external resource).

## Documentation

Update documentation **if your change impacts it**:

- `README.md` (tool list, structure).
- `llms.txt` and `public/` (machine-readable catalog).
- `sitemap.xml`.
- Code comments if necessary.

## Accessibility

Not mandatory, but encouraged: correct HTML semantics, labels on inputs, sufficient contrast, keyboard navigation.

## Supported browsers

- Modern browsers: Chrome, Firefox, Safari, Edge (recent versions).
- Mobile: iOS Safari and Chrome Android.
- No support for legacy browsers (IE, etc.).

## Reporting a bug / proposing a feature

- Use the issue templates (bug report available).
- For a feature, open a discussion issue before coding (recommended).
- Include: description, reproduction steps, expected vs observed behavior, environment (browser, OS, device, resolution), screenshots.

## License

This project is under the [Unlicense](LICENSE) (public domain). By contributing, you agree that your contribution is placed in the public domain without restriction.

---

Questions? Open an issue or contact the maintainer.