# Copilot Instructions for mentoss

## Project structure

- `src/` - Source code for the project.
- `tests/` - Unit tests for the project.
    - Test files are named to match the source files they test, with a `.test.js` suffix.
- `docs/` - Documentation for the project.

## Key Implementation Details

- The `MockServer` class provides helpers for route matching, request/response tracing, and test assertions.
- The `traceCalled(request)` method returns an object: `{ traces: Array<Trace>, matched: boolean }`.
    - If a called route matches, it immediately returns `{ traces: [], matched: true }`.
    - If no called route matches, it collects trace info from both called and unmatched routes and returns `{ traces, matched: false }`.
- The `called(request)` method uses `traceCalled` and:
    - Returns `true` if a called route matches.
    - Returns `false` if no called route matches but traces exist.
    - Throws an error with the message `"This request pattern doesn't match any registered routes."` if both `matched` is `false` and `traces` is an empty array.
- The error message for unmatched patterns is standardized for consistency in code and tests.
- Tests for `traceCalled` and `called` expect the above behaviors and error messages.

## Documentation

- Changes to the public API must be documented in the `docs/` directory.
- Documentation should be clear and concise, explaining the purpose and usage of each public method.
- Use examples to illustrate usage where appropriate.

## Testing/Validation

- Never remove failing tests.
- Always add new tests for any new functionality or changes to existing functionality.
- When modifying existing tests, ensure they still validate the intended behavior.
- When adding new tests, ensure they cover all edge cases and expected behaviors.
- Tests should be clear and concise, focusing on the specific functionality being tested.
- Use descriptive names for test cases to indicate what functionality is being tested.
- All tests must pass for changes to be considered complete.

## General Guidance

- When making changes to route matching, tracing, or test helpers, update both implementation and tests to keep them in sync.
- Always keep error messages and return value structures consistent between code and tests.
- Use concise region markers (`...existing code...`) in code edits to avoid unnecessary repetition.
