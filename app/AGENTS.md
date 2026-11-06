# Repository Guidelines

## Scope and Repository Workflow

This directory contains the project imported into `FRST-work/app`. Paths and commands below are relative to `app/`, not the repository root. These guidelines were reconciled with the imported source and tests; edit this copy rather than the original `C:\coding\app` folder.

Follow the repository-root `../AGENTS.md` Git workflow: synchronize safely, make the requested changes, validate them, then commit and push the task changes as authorized by the user. These local guidelines supplement that workflow and do not require a separate confirmation for ordinary commits or pushes.

## Project Structure & Module Organization

This workspace contains dependency-free HTML/CSS/JavaScript learning prototypes:

- Root `index.html`, `app*.js`, data scripts, and styles implement the FOCUS dashboard.
- `premium/` contains the redesigned dashboard.
- `n/` contains the N app reproduction, source modules, and reference assets.
- `EBOOK/` contains the reader, flashcards, integrations, and tests; root `EBOOK.html` is its standalone bundle.
- `ta/src/`, `ta/tools/`, and `ta/tests/` contain TA feature sources, tooling, and regression tests.
- JPG/PNG files are reference assets. Preserve originals.

Read `ta/AGENTS.md` before changing TA files; its preservation rules include immutable `ta/basic.html` and baseline styles. Edit sources and regenerate standalone outputs instead of patching bundles directly.

## Build, Test, and Development Commands

Use Node.js 20+. No package installation is required. Run these commands from `app/`:

- `node preview.mjs`: serve FOCUS at `http://127.0.0.1:4173`.
- `node build-standalone.mjs`: generate `몰입도.html`.
- `node premium/preview.mjs`: serve the redesign on port 4174.
- `node premium/build-standalone.mjs`: generate `몰입도-리디자인.html`.
- `node n/build.mjs`: generate `n/N.html` with embedded assets.
- `node n/preview.mjs`: serve N on port 4176.
- `node --test n/tests/*.test.mjs`: run N app, bundle, and preview regressions after building.
- `npm.cmd --prefix ta run build`: generate identical `ta/renewal.html` and `ta/TA.html` bundles.
- `npm.cmd --prefix ta run preview`: serve TA on port 4174; stop the premium server first or set `PORT`.
- `node EBOOK/preview.mjs`: serve the standalone eBook on port 4175.
- `node EBOOK/build.mjs`: package `EBOOK/ebook.html` and embed the current TA bundle into `EBOOK.html`.
- `npm.cmd --prefix ta test`: run TA tests.
- `node --test EBOOK/tests/*.test.mjs`: run eBook/TA bridge regressions.
- `node EBOOK/verify.mjs`: run eBook integration smoke checks.

Build TA before eBook when TA sources change, because `EBOOK.html` embeds `ta/renewal.html`. Run the eBook bridge tests and smoke checks after rebuilding the eBook bundle.

## Coding Style & Naming Conventions

Match surrounding code: two-space indentation, single-quoted JavaScript strings, semicolons, camelCase functions, and kebab-case CSS classes. Tooling uses `.mjs`; browser scripts support standalone HTML. Preserve UTF-8 Korean text and script order. No formatter or linter is configured; avoid unrelated reformatting.

## Testing Guidelines

Use Node's built-in test runner and assertions; name tests `*.test.mjs`. No coverage threshold is configured. Run affected suites and rebuild changed bundles. VM/DOM-stub checks do not verify layout: manually check responsive screens, dialogs, storage, and cross-app navigation.

## Commit & Pull Request Guidelines

This directory is part of the parent Git repository. Follow `../AGENTS.md` for synchronization, validation, committing, and pushing. Use concise imperative subjects, such as `Fix bookmark review navigation`, and keep changes focused. PRs, when requested, should explain purpose, link relevant issues, report validation, and include screenshots for interface changes.
