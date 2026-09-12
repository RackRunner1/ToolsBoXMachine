# Contributing to ToolsBoXMachine

Thanks for your interest in contributing to TBXM! This guide explains how to participate effectively.

**PRs that do not follow these rules will be refused.**

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Contribution Types](#contribution-types)
- [Branches](#branches)
- [Commit Format](#commit-format)
- [Pull Requests](#pull-requests)
- [Code Style](#code-style)
- [Adding a New Tool](#adding-a-new-tool)
- [Reporting a Bug](#reporting-a-bug)

---

## Code of Conduct

- Be respectful and constructive in discussions.
- Focus on code and ideas, not people.
- Harassment of any kind will not be tolerated.

---

## Contribution Types

| Type | Description |
|------|-------------|
| **Bug fix** | Fix an existing bug |
| **Feature** | Add a new functionality |
| **New tool** | Create a complete tool (HTML + JS) |
| **Docs** | Improve documentation |
| **Style** | Fix CSS/HTML style without changing behavior |
| **Refactor** | Restructure code without changing behavior |
| **Perf** | Improve performance |
| **Test** | Add or fix tests |

---

## Branches

### Rules

- **Never push directly to `main`**.
- Create a branch from `main` for each change.
- Name branches using the format `type/your-name`:
  - `feature/blur` — new "blur" tool
  - `feature/calculator-dark-mode` — add dark mode to calculator
  - `fix/timer-pause-bug` — fix the pause button
  - `docs/update-readme` — update documentation
- Delete branches after merge.

### Creating and pushing a branch

```bash
git checkout main
git pull origin main

# Examples — replace with what YOU are working on
git checkout -b feature/blur
git checkout -b feature/calculator-dark-mode
git checkout -b fix/timer-pause-bug
git checkout -b docs/update-readme

# ... work on your changes ...

git add .
git commit -m "feat(blur): add intensity slider"
git push origin feature/blur
```

---

## Commit Format

We use [Conventional Commits](https://www.conventionalcommits.org/). Every commit must follow this format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Available types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(timer): add alarm sound` |
| `fix` | Bug fix | `fix(blur): fix canvas resize on mobile` |
| `docs` | Documentation | `docs: update installation guide` |
| `style` | Style (no behavior change) | `style: fix button hover color` |
| `refactor` | Refactoring | `refactor(password-gen): extract validation logic` |
| `perf` | Performance improvement | `perf(json-formatter): optimize parsing` |
| `test` | Tests | `test(calculator): add edge case tests` |
| `chore` | Maintenance task | `chore: update .gitignore` |
| `ci` | CI/CD | `ci: add GitHub Actions workflow` |

### Scope

The scope is optional but recommended. It indicates the affected part of the project:

- Folder name in `tools/`: `timer`, `blur`, `calculator`, etc.
- `ui` for shared components
- `pages` for static pages
- `root` for root-level files

### Message rules

- **Description**: imperative mood, no period at the end, lowercase after the colon
- **Max 72 characters** for the first line
- **Body** (optional): explain the "why" not the "what"
- **Reference issues**: `Closes #123` or `Fixes #456`

### Examples

```bash
# Good
feat(password-gen): add clipboard copy button
fix(json-formatter): handle empty input gracefully
docs: add contribution guidelines

# Bad
Added a new feature           ← no type, no scope, not imperative
Fixed the bug                 ← no type
feat(timer) add alarm         ← missing colon after scope
```

---

## Pull Requests

### Process

1. **Fork** the repository (if you don't have write access).
2. **Create a branch** from `main` (see [Branches](#branches)).
3. **Work** on your changes.
4. **Commit** using the conventional format (see [Commits](#commit-format)).
5. **Push** your branch.
6. **Open a Pull Request** against `main`.
7. **Fill out** the PR template completely.
8. **Wait for review** from at least 1 maintainer.
9. **Fix** any requested changes.
10. **Merge** (squash merge) once approved.

### Mandatory rules

- [ ] PR title follows the Conventional Commits format
- [ ] PR template is filled out completely
- [ ] At least 1 approval before merge
- [ ] Squash merge only (no merge commits)
- [ ] No force push on `main`
- [ ] CI checks pass (if applicable)

**PRs that do not follow these rules will be refused.**

### What to avoid

- **Split PRs** if they cover multiple concerns.
- **WIP PRs**: don't open a PR until it's ready for review.
- **Force push** after requesting a review (it breaks comments).

---

## Code Style

### HTML

- Use semantic elements (`<header>`, `<main>`, `<section>`, etc.)
- Indentation: **2 spaces**
- Put attributes on separate lines if > 2 attributes

### CSS

- Indentation: **2 spaces**
- Use CSS custom properties defined in `style.css`
- Follow existing naming conventions (BEM-like when appropriate)
- No CSS frameworks

### JavaScript

- **ES6+**: `const`/`let`, arrow functions, template literals, destructuring
- **ES Modules**: `import`/`export`
- Indentation: **2 spaces**
- No `var`
- Variable/function names in **camelCase**
- Classes in **PascalCase**
- Global constants in **UPPER_SNAKE_CASE**

### Tool files

Each tool follows this structure:

```
tools/
  tool-name/
    tool-name.html    ← tool page
    tool-name.js      ← tool logic
```

- HTML includes tool-specific CSS (inline or `<style>`)
- JS is an ES module (`type="module"`)
- HTML must include SEO and Open Graph `<meta>` tags

---

## Adding a New Tool

1. **Create the folder** `tools/tool-name/`
2. **Create the HTML** with the standard structure:
   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>Tool Name - TBXM</title>
     <meta name="description" content="SEO description of the tool">
     <!-- Open Graph -->
     <meta property="og:title" content="Tool Name - TBXM">
     <meta property="og:description" content="SEO description">
     <meta property="og:image" content="https://www.tbxm.org/og/tool-name.png">
     <link rel="stylesheet" href="/style.css">
     <style>
       /* Tool-specific CSS */
     </style>
   </head>
   <body>
     <div id="navbar-placeholder"></div>
     <main>
       <!-- Tool content -->
     </main>
     <div id="footer-placeholder"></div>
     <script type="module" src="/ui/include.js"></script>
     <script type="module" src="./tool-name.js"></script>
   </body>
   </html>
   ```
3. **Create the JS** with the tool logic
4. **Add the tool** to `public/tools/index.json`
5. **Add the card** in `index.html`
6. **Test** locally with `npm run dev`
7. **Open a PR** with the `feat` tag

---

## Reporting a Bug

Use the "Bug Report" issue template with:

- **Clear description** of the problem
- **Steps to reproduce**
- **Expected behavior** vs **actual behavior**
- **Browser and OS**
- **Screenshots** if applicable

---

## Questions?

Use [Discussions](../../discussions) for questions. Do not open issues or PRs for questions.
