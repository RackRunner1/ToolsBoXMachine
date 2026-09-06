# Contribuer à ToolsBoXMachine

Merci de vouloir contribuer à TBXM ! Ce guide explique comment participer efficacement.

## Table des matières

- [Code de conduite](#code-de-conduite)
- [Types de contributions](#types-de-contributions)
- [Branches](#branches)
- [Format des commits](#format-des-commits)
- [Pull Requests](#pull-requests)
- [Style du code](#style-du-code)
- [Ajouter un nouvel outil](#ajouter-un-nouvel-outil)
- [Signaler un bug](#signaler-un-bug)

---

## Code de conduite

- Sois respectueux et constructif dans les discussions.
- Focus sur le code et les idées, pas sur les personnes.
- Toute forme de harcèlement ne sera pas tolérée.

---

## Types de contributions

| Type | Description |
|------|-------------|
| **Bug fix** | Corriger un bug existant |
| **Feature** | Ajouter une nouvelle fonctionnalité |
| **Nouvel outil** | Créer un outil complet (HTML + JS) |
| **Docs** | Améliorer la documentation |
| **Style** | Corriger le style CSS/HTML sans changer le comportement |
| **Refactor** | Restructurer le code sans changer le comportement |
| **Perf** | Améliorer les performances |
| **Test** | Ajouter ou corriger des tests |

---

## Branches

### Règles

- **Ne jamais push directement sur `main`**.
- Créer une branche depuis `main` pour chaque modification.
- Nommer les branches avec le format `type/nom-que-tu-choisis` :
  - `feature/blur` → nouvel outil "blur"
  - `feature/calculator-dark-mode` → ajout du dark mode au calculateur
  - `fix/timer-pause-bug` → correction du bouton pause
  - `docs/update-readme` → mise à jour de la documentation
- Supprimer les branches après le merge.

### Créer et push une branche

```bash
git checkout main
git pull origin main

# Exemples — remplace par le nom de ce que TU fais
git checkout -b feature/blur
git checkout -b feature/calculator-dark-mode
git checkout -b fix/timer-pause-bug
git checkout -b docs/update-readme

# ... travailler ...

git add .
git commit -m "feat(blur): add intensity slider"
git push origin feature/blur
```

---

## Format des commits

Nous utilisons [Conventional Commits](https://www.conventionalcommits.org/). Chaque commit doit respecter ce format :

```
<type>(<scope>): <description>

[corps optionnel]

[pied de page optionnel]
```

### Types disponibles

| Type | Description | Exemple |
|------|-------------|---------|
| `feat` | Nouvelle fonctionnalité | `feat(timer): add alarm sound` |
| `fix` | Correction de bug | `fix(blur): fix canvas resize on mobile` |
| `docs` | Documentation | `docs: update installation guide` |
| `style` | Style (sans changement de comportement) | `style: fix button hover color` |
| `refactor` | Refactorisation | `refactor(password-gen): extract validation logic` |
| `perf` | Amélioration de performance | `perf(json-formatter): optimize parsing` |
| `test` | Tests | `test(calculator): add edge case tests` |
| `chore` | Tâches de maintenance | `chore: update .gitignore` |
| `ci` | CI/CD | `ci: add GitHub Actions workflow` |

### Scope (portée)

Le scope est optionnel mais recommandé. Il indique la partie du projet concernée :

- Nom du dossier dans `tools/` : `timer`, `blur`, `calculator`, etc.
- `ui` pour les composants partagés
- `pages` pour les pages statiques
- `root` pour les fichiers à la racine

### Règles pour les messages

- **Description** : imperatif, pas de point à la fin, minuscule en début
- **Max 72 caractères** pour la première ligne
- **Corps** (optionnel) : expliquer le "pourquoi" pas le "quoi"
- **Référencer les issues** : `Closes #123` ou `Fixes #456`

### Exemples

```bash
# Bon
feat(password-gen): add clipboard copy button
fix(json-formatter): handle empty input gracefully
docs: add contribution guidelines
chore: configure Husky hooks

# Mauvais
Added a new feature           ← pas de type, pas de scope, pas imperatif
Fixed the bug                 ← pas de type
feat(timer) add alarm         ← pas de deux-points après le scope
```

---

## Pull Requests

### Processus

1. **Fork** le repository (si tu n'as pas accès en écriture).
2. **Créer une branche** depuis `main` (voir [Branches](#branches)).
3. **Travailler** sur tes modifications.
4. **Commit** avec le format conventionnel (voir [Commits](#format-des-commits)).
5. **Push** ta branche.
6. **Ouvrir une Pull Request** contre `main`.
7. **Remplir le template** PR complètement.
8. **Attendre la review** d'au moins 1 mainteneur.
9. **Corriger** les éventuels retours.
10. **Merge** (squash merge) une fois approuvé.

### Règles obligatoires

- [ ] La PR a un titre au format Conventional Commits
- [ ] Le template PR est rempli complètement
- [ ] Au moins 1 approval avant le merge
- [ ] Squash merge uniquement (pas de merge commit)
- [ ] Aucun force push sur `main`
- [ ] Les checks CI passent (si applicable)

### Ce qu'il faut éviter

- **Grosses PRs** : idéalement < 300 lignes. Découper si nécessaire.
- **PRs "WIP"** : ne pas ouvrir de PR tant qu'elle n'est pas prête pour review.
- **Force push** après avoir demandé une review (ça casse les commentaires).

---

## Style du code

### HTML

- Utiliser des éléments sémantiques (`<header>`, `<main>`, `<section>`, etc.)
- Indentation : **2 espaces**
- Attributs sur des lignes séparées si > 2 attributs

### CSS

- Indentation : **2 espaces**
- Utiliser les CSS custom properties définies dans `style.css`
- Suivre la convention de nommage existante (BEM-like quand approprié)
- Pas de frameworks CSS

### JavaScript

- **ES6+** : `const`/`let`, arrow functions, template literals, destructuring
- **Modules ES** : `import`/`export`
- Indentation : **2 espaces**
- Pas de `var`
- Noms de variables/fonctions en **camelCase**
- Classes en **PascalCase**
- Constantes globales en **UPPER_SNAKE_CASE**

### Fichiers d'outils

Chaque outil suit cette structure :

```
tools/
  nom-outil/
    nom-outil.html    ← page de l'outil
    nom-outil.js      ← logique de l'outil
```

- Le HTML inclut le CSS spécifique de l'outil (inline ou `<style>`)
- Le JS est un module ES (`type="module"`)
- Le HTML doit inclure les balises `<meta>` SEO et Open Graph

---

## Ajouter un nouvel outil

1. **Créer le dossier** `tools/nom-outil/`
2. **Créer le HTML** avec la structure standard :
   ```html
   <!DOCTYPE html>
   <html lang="fr">
   <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>Nom Outil - TBXM</title>
     <meta name="description" content="Description SEO de l'outil">
     <!-- Open Graph -->
     <meta property="og:title" content="Nom Outil - TBXM">
     <meta property="og:description" content="Description SEO">
     <meta property="og:image" content="https://tbxm.pages.dev/og/nom-outil.png">
     <link rel="stylesheet" href="/style.css">
     <style>
       /* CSS spécifique à l'outil */
     </style>
   </head>
   <body>
     <div id="navbar-placeholder"></div>
     <main>
       <!-- Contenu de l'outil -->
     </main>
     <div id="footer-placeholder"></div>
     <script type="module" src="/ui/include.js"></script>
     <script type="module" src="./nom-outil.js"></script>
   </body>
   </html>
   ```
3. **Créer le JS** avec la logique de l'outil
4. **Ajouter l'outil** dans `public/tools/index.json`
5. **Ajouter la carte** dans `index.html`
6. **Tester** localement avec `npm run dev`
7. **Ouvrir une PR** avec le tag `feat`

---

## Signaler un bug

Utilise le template d'issue "Bug Report" avec :

- **Description claire** du problème
- **Étapes pour reproduire**
- **Comportement attendu** vs **comportement actuel**
- **Navigateur et OS**
- **Captures d'écran** si applicable

---

## Questions ?

En cas de doute, ouvre une issue avec le tag `question`.
