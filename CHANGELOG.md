# Changelog

## [0.5.1](https://github.com/humanwhocodes/mentoss/compare/mentoss-v0.5.0...mentoss-v0.5.1) (2025-02-13)


### Bug Fixes

* Ensure forbidden CORS headers throw an error ([#51](https://github.com/humanwhocodes/mentoss/issues/51)) ([e472e14](https://github.com/humanwhocodes/mentoss/commit/e472e14e9f9885ed3cc542700f307113e6257336)), closes [#40](https://github.com/humanwhocodes/mentoss/issues/40)
* Request without a body should not throw an error ([#49](https://github.com/humanwhocodes/mentoss/issues/49)) ([0b6b981](https://github.com/humanwhocodes/mentoss/commit/0b6b981df4050178d56ad7c1dcc25133ebd2c976)), closes [#48](https://github.com/humanwhocodes/mentoss/issues/48)

## [0.5.0](https://github.com/humanwhocodes/mentoss/compare/mentoss-v0.4.0...mentoss-v0.5.0) (2025-02-12)


### Features

* Add response creator function support ([#45](https://github.com/humanwhocodes/mentoss/issues/45)) ([1af9805](https://github.com/humanwhocodes/mentoss/commit/1af9805748389ee688ed612bc02130b5e4179c98))
* Mocking credentialed requests ([#39](https://github.com/humanwhocodes/mentoss/issues/39)) ([cacb6d0](https://github.com/humanwhocodes/mentoss/commit/cacb6d0b69b9dc6753e96c42a9c31d94f0fa312b))

## [0.4.0](https://github.com/humanwhocodes/mentoss/compare/mentoss-v0.3.0...mentoss-v0.4.0) (2025-02-05)


### Features

* Add test helper methods ([#33](https://github.com/humanwhocodes/mentoss/issues/33)) ([c05baa2](https://github.com/humanwhocodes/mentoss/commit/c05baa27e828b21c6083c029e01f3f5fb936cdd6))


### Bug Fixes

* Make Mentoss work in Bun ([#36](https://github.com/humanwhocodes/mentoss/issues/36)) ([d3e1e4b](https://github.com/humanwhocodes/mentoss/commit/d3e1e4bb13c3db9e92069c8a90bd7f021e4df036))

## [0.3.0](https://github.com/humanwhocodes/mentoss/compare/mentoss-v0.2.0...mentoss-v0.3.0) (2025-01-31)


### Features

* Add ability to delay generating a response ([#28](https://github.com/humanwhocodes/mentoss/issues/28)) ([9a384b3](https://github.com/humanwhocodes/mentoss/commit/9a384b356e2f37fddc0407c4b05ec8a46bebb620))
* Implement Access-Control-Expose-Headers ([#31](https://github.com/humanwhocodes/mentoss/issues/31)) ([60b5fd0](https://github.com/humanwhocodes/mentoss/commit/60b5fd0ea87d5ab603744628bb5564f34f4bf039))


### Bug Fixes

* Validate route inputs ([#29](https://github.com/humanwhocodes/mentoss/issues/29)) ([b314c31](https://github.com/humanwhocodes/mentoss/commit/b314c31f76bb91e17ee4b2354ba13708915af28f))

## [0.2.0](https://github.com/humanwhocodes/mentoss/compare/mentoss-v0.1.0...mentoss-v0.2.0) (2025-01-29)


### Features

* Support AbortSignal in fetch() ([#22](https://github.com/humanwhocodes/mentoss/issues/22)) ([12b6e72](https://github.com/humanwhocodes/mentoss/commit/12b6e72061fab308964e0748a9fe178ea76e2781))


### Bug Fixes

* **deps:** update dependency sharp to ^0.33.0 ([#11](https://github.com/humanwhocodes/mentoss/issues/11)) ([235ca34](https://github.com/humanwhocodes/mentoss/commit/235ca34579e8f0508749b34e96b88a48e475da48))
* Ensure request ArrayBuffer body works ([#23](https://github.com/humanwhocodes/mentoss/issues/23)) ([b561ad7](https://github.com/humanwhocodes/mentoss/commit/b561ad73800549cef7e52d5ce3dd290eec862779))

## 0.1.0 (2025-01-25)

### Features

* Add baseUrl option to FetchMocker ([541a6bc](https://github.com/humanwhocodes/mentoss/commit/541a6bc872c80676298c049dd0dfa2130ea9e373))
* Add MockServer#traceReceive() method ([1a77cf5](https://github.com/humanwhocodes/mentoss/commit/1a77cf599d653a55bb31a1d189a55eee60c9b185))
* Add support for CORS requests ([#14](https://github.com/humanwhocodes/mentoss/issues/14)) ([b3d0323](https://github.com/humanwhocodes/mentoss/commit/b3d032321e1790b033bc567a098b7151ec80b403))
* Add URL parameter matching ([8481d81](https://github.com/humanwhocodes/mentoss/commit/8481d816a67f5adeefff2b6e1d0200eb1f9aee8f))
* Fetch Mocker cheks for partial matches ([d73d72c](https://github.com/humanwhocodes/mentoss/commit/d73d72c30e955edc2731743310630a2f3e7d2ceb))


### Bug Fixes

* **docs:** Update READMEs ([941b3d0](https://github.com/humanwhocodes/mentoss/commit/941b3d0861843ecec07e48f0da46c85c1c7691d5))
