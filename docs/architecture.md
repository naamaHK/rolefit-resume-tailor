# RoleFit Frontend Architecture

RoleFit currently uses plain browser JavaScript with no build step. The goal of
the modularization work is to reduce the size and fragility of `src/app.js`
incrementally while preserving the existing product behavior.

## Current Boundary

```text
index.html
  -> src/resume/document-parser.js
  -> src/resume/experience-parser.js
  -> src/resume/text-editor.js
  -> src/resume/preview-highlighter.js
  -> src/app.js
```

`src/app.js` remains the legacy composition shell. It owns application state,
DOM events, rendering, placement flows, and compatibility functions used by the
existing tests.

`src/resume/experience-parser.js` owns the implementation for recognizing and
parsing Experience entries. It receives shared text helpers as explicit
dependencies, so it does not read DOM state or application globals.

`src/resume/document-parser.js` owns section vocabulary, header and section
recognition, duplicate-section merging, core section ordering, and plain-text
serialization.

`src/resume/text-editor.js` owns low-level, state-free resume text edits:
whitespace-tolerant replacement, whole-section replacement, section-body
replacement, and duplicate section-header removal. The higher-level accepted
change dispatcher remains in `src/app.js` because it still coordinates
spelling, removal, and placement-specific rules.

`src/resume/preview-highlighter.js` owns state-free preview diffing and generic
HTML highlighting: token-level changed fragments, visible-text matching,
section-scoped matching, fuzzy block scoring, and section highlighting.
`src/app.js` still decides which candidates and section belong to each change.

## Extraction Rules

1. Extract one cohesive behavior at a time.
2. Preserve existing public function names with thin adapters when other code
   still depends on them.
3. Keep extracted resume logic independent from the DOM and mutable app state.
4. Add focused tests for the new module before extracting another area.
5. Run every existing test suite before creating a Git checkpoint.
6. Do not combine modularization with product behavior changes.

## Planned Order

1. Experience parsing and recognition. Complete.
2. Resume document and section parsing. Complete.
3. Applying accepted changes to the resume document. In progress: the shared
   text editor is extracted; the higher-level dispatcher and placement-specific
   operations remain in `src/app.js`.
4. Preview targeting and changed-text highlighting. In progress: the pure diff
   and HTML highlighter is extracted; placement-specific candidate and fallback
   decisions remain in `src/app.js`. Rewrite highlighting now mutates the exact
   selected HTML block by index, so identical bullets in different Experience
   entries cannot redirect the preview to the first occurrence.
5. Missing-experience placement flows.
6. Designed and ATS resume renderers.
7. UI state and event-controller separation.

Native ES modules or a TypeScript build can be considered after the browser
logic has clear boundaries. Introducing that toolchain during the initial
extractions would make regressions harder to diagnose.

## Required Verification

```bash
node tests/experience-parser-tests.mjs
node tests/document-parser-tests.mjs
node tests/text-editor-tests.mjs
node tests/preview-highlighter-tests.mjs
node tests/regression-tests.mjs
node tests/placement-flow-tests.mjs
node tests/mobile-layout-tests.mjs
node tests/server-json-tests.mjs
```
