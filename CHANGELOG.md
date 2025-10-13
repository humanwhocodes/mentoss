# Changelog

## [0.12.0](https://github.com/humanwhocodes/mentoss/compare/mentoss-v0.11.0...mentoss-v0.12.0) (2025-10-13)


### Features

* Enhance called() method to throw error when no routes match ([#112](https://github.com/humanwhocodes/mentoss/issues/112)) ([206eda2](https://github.com/humanwhocodes/mentoss/commit/206eda24b7a1644d9e19053eef658683ab058b97))

## [0.11.0](https://github.com/humanwhocodes/mentoss/compare/mentoss-v0.10.0...mentoss-v0.11.0) (2025-04-24)


### Features

* Implement SameSite for cookies ([#100](https://github.com/humanwhocodes/mentoss/issues/100)) ([fb96bf1](https://github.com/humanwhocodes/mentoss/commit/fb96bf11f168674fd73ebc2a8e4cd5453237351f))


### Bug Fixes

* Remove unused HttpOnly flag for cookies ([fc7bb10](https://github.com/humanwhocodes/mentoss/commit/fc7bb1011a98e576038a603c3a8123667e391d2c))

## [0.10.0](https://github.com/humanwhocodes/mentoss/compare/mentoss-v0.9.2...mentoss-v0.10.0) (2025-04-22)


### Features

* Implement fetch redirects ([#98](https://github.com/humanwhocodes/mentoss/issues/98)) ([7515e1e](https://github.com/humanwhocodes/mentoss/commit/7515e1e88914d411201195018332e5afccfa18bb))

## [0.9.2](https://github.com/humanwhocodes/mentoss/compare/mentoss-v0.9.1...mentoss-v0.9.2) (2025-04-01)


### Bug Fixes

* Response body support plain Array  ([#92](https://github.com/humanwhocodes/mentoss/issues/92)) ([bf2b699](https://github.com/humanwhocodes/mentoss/commit/bf2b6999dd481487172082bada4f9f555cae2c91))

## [0.9.1](https://github.com/humanwhocodes/mentoss/compare/mentoss-v0.9.0...mentoss-v0.9.1) (2025-03-28)


### Bug Fixes

* Ensure ArrayBuffer is passed throughto response ([#90](https://github.com/humanwhocodes/mentoss/issues/90)) ([f473bf9](https://github.com/humanwhocodes/mentoss/commit/f473bf9984c4877a709c8d4e19cfb899d08a9401))
* ReadableStream in request body should require preflight ([08c5521](https://github.com/humanwhocodes/mentoss/commit/08c552157d144f8417ead5186be8f81131c4b640))

## [0.9.0](https://github.com/humanwhocodes/mentoss/compare/mentoss-v0.8.0...mentoss-v0.9.0) (2025-03-21)


### Features

* Match against already-called routes for better errors ([#84](https://github.com/humanwhocodes/mentoss/issues/84)) ([9eeb95a](https://github.com/humanwhocodes/mentoss/commit/9eeb95a561768a100c4a275180af6b13201f8e2a))


### Bug Fixes

* More succinct message when no partial matches found ([#82](https://github.com/humanwhocodes/mentoss/issues/82)) ([1f89e60](https://github.com/humanwhocodes/mentoss/commit/1f89e6016a4c77a313e07d8dce4078e6cdc6d8b3))

## [0.8.0](https://github.com/humanwhocodes/mentoss/compare/mentoss-v0.7.1...mentoss-v0.8.0) (2025-03-07)


### Features

* export types for use downstream ([#73](https://github.com/humanwhocodes/mentoss/issues/73)) ([62470de](https://github.com/humanwhocodes/mentoss/commit/62470de11d185ddd2f21e0ff39e397d582f30282))

## [0.7.1](https://github.com/humanwhocodes/mentoss/compare/mentoss-v0.7.0...mentoss-v0.7.1) (2025-03-03)


### Bug Fixes

* Ensure baseUrl is properly applied to route matching ([#71](https://github.com/humanwhocodes/mentoss/issues/71)) ([96d103c](https://github.com/humanwhocodes/mentoss/commit/96d103cea65dfa1bec4c74f23d282ec6185856c1))

## [0.7.0](https://github.com/humanwhocodes/mentoss/compare/mentoss-v0.6.0...mentoss-v0.7.0) (2025-02-27)


### Features

* Implement fetch with mode: 'same-origin' ([9add18f](https://github.com/humanwhocodes/mentoss/commit/9add18f0da1a0f51709e841e41bbc10ba539a978))
* Implement fetch with mode: "same-origin" ([#65](https://github.com/humanwhocodes/mentoss/issues/65)) ([9add18f](https://github.com/humanwhocodes/mentoss/commit/9add18f0da1a0f51709e841e41bbc10ba539a978))
* Pass more detail to response creator functions ([#67](https://github.com/humanwhocodes/mentoss/issues/67)) ([dc78d00](https://github.com/humanwhocodes/mentoss/commit/dc78d004ebccd10b2bf6886a1ce84500051b1d80))


### Bug Fixes

* CORS errors should be TypeErrors ([#70](https://github.com/humanwhocodes/mentoss/issues/70)) ([98a46ba](https://github.com/humanwhocodes/mentoss/commit/98a46bafb2210126b0449f9ed60d28b1d2e334b4))
* Ensure Access-Control-Allow-Origin header contains valid origin ([#68](https://github.com/humanwhocodes/mentoss/issues/68)) ([0e529ee](https://github.com/humanwhocodes/mentoss/commit/0e529ee723628a551ef505c704cc154a67ebcd7a))

## [0.6.0](https://github.com/humanwhocodes/mentoss/compare/mentoss-v0.5.2...mentoss-v0.6.0) (2025-02-21)


### Features

* Add FetchMocker#mockObject() method to mock non-global fetch ([#59](https://github.com/humanwhocodes/mentoss/issues/59)) ([43495c5](https://github.com/humanwhocodes/mentoss/commit/43495c5aa8c4593e4f50f26e152dc1b6dd513bda))
* Implement 'no-cors' mode for fetch ([#62](https://github.com/humanwhocodes/mentoss/issues/62)) ([d394e75](https://github.com/humanwhocodes/mentoss/commit/d394e75ff5b03dacad082ee69c23565ae5eaeff2))


### Bug Fixes

* Ensure Response#mode is 'cors' when Request#type is 'cors' ([#60](https://github.com/humanwhocodes/mentoss/issues/60)) ([910bc87](https://github.com/humanwhocodes/mentoss/commit/910bc87eb34d1a71e14cc2505c6b2f335ff00bdd))

## [0.5.2](https://github.com/humanwhocodes/mentoss/compare/mentoss-v0.5.1...mentoss-v0.5.2) (2025-02-19)


### Bug Fixes

* Limit Access-Control-Request-Headers to unsafe headers only ([#53](https://github.com/humanwhocodes/mentoss/issues/53)) ([a604e46](https://github.com/humanwhocodes/mentoss/commit/a604e4601807ffb850909f34b1f77a0bec7716f8))
* Unsafe CORS content-type throws error without Access-Control-Allow-Headers ([#55](https://github.com/humanwhocodes/mentoss/issues/55)) ([ab3136b](https://github.com/humanwhocodes/mentoss/commit/ab3136b9804246fa0f04b4a07f48f1665f7228c0)), closes [#41](https://github.com/humanwhocodes/mentoss/issues/41)

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
