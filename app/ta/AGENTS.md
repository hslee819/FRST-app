# Repository Guidelines

## Scope and Repository Workflow

These guidelines apply to `app/ta/` and were reconciled with the imported source, README, and regression tests. The current TA app preserves the original drawer and unframed screen. Earlier instructions about a persistent top GNB, tablet frames, and screen pagination describe superseded layouts and must not be restored without a new user request.

Inherit the repository-root `../../AGENTS.md` Git workflow and `../AGENTS.md`: synchronize safely, make requested changes, validate, commit, and push the task changes as authorized by the user. These local preservation rules supplement that workflow; ordinary commits and pushes do not need separate confirmation.

## Project Structure & Module Organization

This directory contains the original TA screen reproduction and a separate feature variant. `basic.html` is immutable: its preserved SHA256 is `996146692DDE8CB54CB68681E9DAC4C0C04EE2BC0657622D984A83C42F2C8FF5`. The separate `renewal.html` and `TA.html` keep the original app design and add requested functions. Their source is `src/renewal-base.html`, which must retain the baseline's first inline stylesheet byte-for-byte, plus feature-scoped `src/renewal-ui.css`. `src/review-cards.js` and `src/review-cards.css` provide bookmark review cards. Include the review script before the main inline app so its API is available at startup. Edit sources rather than generated bundles; `tools/build.mjs` inlines the referenced stylesheets and supported browser modules into both standalone outputs. Keep build/preview tooling in `tools/`, tests in `tests/`, and provided `KakaoTalk_*.jpg` reference photos unchanged. `.qa/` is for untracked temporary QA artifacts. Avoid unrelated changes to sibling apps; rebuild the eBook bundle when changed TA code is embedded there.

Preserve the original header, drawer controls, drawer visibility behavior, menu order and destinations, unframed main layout, and responsive styles. Keep all five menus reachable through the existing drawer. Retain existing titles, content, source-picker layout, full scrollable lists, and every existing function. New styles must be monochrome and scoped to added features; do not override global elements or unscoped existing layout classes.

Bookmark review remains in a separate popup rather than taking space from the search or mine screens. On normal initial entry, automatically open it once only when bookmarked questions exist. Keep the review-open buttons on search and mine screens, including the empty and completed states. Do not reopen the popup during ordinary rerenders or navigation, and never auto-open it on external-link entry. Preserve card flip, previous/next, completion, restart, and original-answer navigation. Retain natural scrolling in the main content, full source lists, and dialogs; every source option and full question/answer must remain reachable.

Preserve concise question summaries and hashtags, separate `문항 풀이·개념` and `학습 상담·기타` groups, validated links from another app to a prefilled problem form, and automatic review cards for bookmarked questions. Keep original full questions and answers available in details, and retain original bookmark storage while saving review progress separately. The question-photo area must show an actual original problem image associated with that exact source; solution-page photos and generic annotation uploads must not be used as problem images. When an original problem photo is unavailable, show the empty photo slot. Do not invent new problem/TA datasets or consultation booking behavior absent from the baseline.

## Build, Test, and Development Commands

Node.js 20 or newer is required for tooling; there are no package dependencies to install. From this directory, use `npm run build`, `npm run preview`, and `npm test`. In Windows PowerShell environments that block `npm.ps1`, use `npm.cmd` instead. Build regenerates both `TA.html` and `renewal.html`. The preview server defaults to `http://127.0.0.1:4174/renewal.html`; `TA.html` and `basic.html` are available at the same origin. The HTML outputs can also be opened directly without Node.js. Keep the exact commands and implementation limits in `README.md` up to date. After TA changes, run `node ../EBOOK/build.mjs` to rebuild the eBook bundle, then run the eBook bridge and smoke checks listed in `../AGENTS.md`.

## Coding Style & Naming Conventions

Use plain HTML, CSS, and JavaScript with two-space indentation and descriptive names. Tooling uses native ES modules. Browser scripts remain non-module scripts so the bundled HTML works when opened from disk. Avoid external CDN dependencies. Escape user text before inserting HTML. Use semantic controls, accessible names, visible focus states, and responsive layouts. Avoid unrelated formatting changes.

## Testing Guidelines

`npm test` uses Node's built-in test runner for focused build, preview, and original-screen preservation checks. `tests/basic-immutable.test.mjs` verifies the original file hash, baseline inline style identity, and feature CSS scope. Keep tests meaningful and verify behavior rather than mirroring implementation. After feature source changes, run the build and check existing flows such as filtering, source selection, question submission, bookmarks, answer detail, and TA/SA screens. Preserve original content and functional limitations in both versions. Check narrow/mobile layouts when browser tools are available. Do not claim browser or visual verification based on static or DOM-stub VM tests alone; report unavailable browser verification honestly.

## Commit & Pull Request Guidelines

This directory belongs to the parent Git repository. Follow `../../AGENTS.md` for synchronization, validation, committing, and pushing. Use concise, imperative commit subjects and keep changes focused. Pull requests, when requested, should explain the purpose, summarize changes, link relevant issues, and report validation performed. Include screenshots for visible interface changes.

## Security & Configuration

Keep credentials and local environment files out of version control. Add appropriate ignore rules when initializing the project, and document required configuration using examples containing placeholders rather than secrets.
