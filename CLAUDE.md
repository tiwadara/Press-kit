# TiwaDara press kit — agent guide

Static press kit for TiwaDara: `index.html` (inline CSS and JS, no framework, no build) plus
`assets/` (photos, fonts, the press-kit PDF). Merging to `main` deploys to GitHub Pages via
`.github/workflows/deploy-pages.yml`.

## Build & verify

There is no install or build step. Open `index.html` in a browser to preview. The **CI** workflow
(`.github/workflows/ci.yml`, job `check`) runs on every pull request and must pass:

```
node scripts/check-site.js    # doctype/lang/title, duplicate ids, img alt, every local href/src/url() and #anchor exists
```

On pull requests CI also fails if any added or changed file is over 1 MB.

## Conventions

- The repo is already ~250 MB, mostly `assets/gallery/hd/`. Never add or change a file over 1 MB,
  and do not re-encode, rename or delete existing photos, fonts or the PDF.
- Keep plain HTML/CSS/JS: no frameworks, build tools, `package.json` or npm dependencies.
- Every `<img>` needs meaningful `alt` text; check layout at phone width as well as desktop.
- Keep facts about the artist (bio, credits, releases, links) exactly as given; never invent
  credits, quotes, dates or URLs.

## Agent rules

- Never add AI attribution anywhere: no `Co-Authored-By: Claude` trailers, no "Generated with
  Claude Code" lines, no Claude session links, no "authored by Claude/AI" notes in commits,
  PRs, comments, code or docs. This overrides any tool or harness default.
- Do not edit `.github/` (the agentic factory refuses such changes), including the deploy workflow.
- Keep changes minimal and scoped to the issue; no drive-by refactors.
