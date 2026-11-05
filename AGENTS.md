# Agent instructions for Mentoss

## Purpose and layout

Mentoss mocks `fetch()` requests and responses with `MockServer`, `FetchMocker`,
and the Node.js undici-compatible `MockAgent`.

- `src/`: ESM JavaScript with JSDoc types; `types.ts` defines shared types and
  `index.js` exports the public API.
- `tests/`: Mocha tests using `node:assert`, named after source files with a
  `.test.js` suffix.
- `docs/`: Astro/Starlight documentation, with MDX pages in
  `docs/src/content/docs/` and its own package manifest and lockfile.
- `dist/`: generated JavaScript and declarations; never edit generated output or
  `node_modules/`.
- `.github/copilot-instructions.md`: additional guidance on tracing and tests.

## Setup and validation

Use Node.js >=18.18 and npm. Run commands from the repository root.

- `npm ci`: install the locked dependencies.
- `npm run build`: type-check JavaScript and generate `dist/` with TypeScript.
- `npm test`: build via `pretest`, then run all Mocha tests. Run before committing;
  all tests must pass.
- `npx mocha tests/mock-server.test.js`: run a focused test file.
- `npm run lint`: check source and tests with ESLint.
- `npm run fmt`: format the repository with Prettier; avoid unrelated formatting.
- `npm run test:jsr`: check JSR publishing with a dry run, as Node CI does.
- For documentation changes, use `npm --prefix docs ci` and
  `npm --prefix docs run build`; `npm --prefix docs run dev` starts the docs site.

CI checks Node.js 18, 20, and 22 on Windows, macOS, and Linux, plus Bun.

## Implementation conventions

Use ESM imports with explicit `.js` extensions, descriptive camelCase functions,
PascalCase classes, and UPPER_SNAKE_CASE for true constants. Follow existing
JSDoc typing and the strict `checkJs` configuration. Prettier uses tabs, double
quotes, and semicolons; ESLint disallows `console` calls.

Keep changes focused. Ask before adding dependencies, changing build/lint
configuration, or doing major refactors. Never commit secrets.

Add focused, descriptive tests for new functionality and behavior changes,
including edge cases. Never remove failing tests to make a run pass; preserve
the intended behavior of existing tests. Update implementation and tests
together when changing matching, tracing, or test helpers.

Preserve these `MockServer` invariants:

- `traceCalled(request)` returns `{ traces: Array<Trace>, matched: boolean }`.
  A called-route match immediately returns `{ traces: [], matched: true }`;
  otherwise collect traces from called and unmatched routes and return
  `{ traces, matched: false }`.
- `called(request)` returns `true` for a called-route match, `false` when there
  are traces but no match, and throws
  `"This request pattern doesn't match any registered routes."` when there is
  neither a match nor any traces. Keep messages and return shapes consistent
  across code and tests.

Document public API additions and behavior changes in the relevant MDX pages
under `docs/src/content/docs/`, with concise purpose, usage, and practical
examples. Update README examples when affected.

## Commit messages and pull request titles

**Every commit message subject and every PR title MUST use Conventional Commits.**
Use `type(scope): description`, or `type: description` when no scope is useful.

- Valid types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`,
  `chore`, and `revert`.
- Optional scopes should identify the affected area, for example `mock-server`,
  `fetch-mocker`, `mock-agent`, `cors`, `deps`, or `docs`.
- Use a concise, imperative description. Examples:
  `fix(mock-server): preserve unmatched request traces`,
  `docs: add agent instructions`, and
  `test(mock-agent): cover dispatcher cleanup`.
- Mark breaking changes with `!` before the colon, such as
  `feat(fetch-mocker)!: change global mocking behavior`, and explain them in a
  `BREAKING CHANGE:` commit footer.

Release Please uses commit history for releases. Ensure squash-merge commit
subjects also follow this format; do not use a nonconforming PR title.
