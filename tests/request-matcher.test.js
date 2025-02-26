/**
 * @fileoverview Tests for the RequestMatcher class.
 * @author Nicholas C. Zakas
 */

/* globals FormData */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import assert from "node:assert";
import { RequestMatcher } from "../src/request-matcher.js";

//-----------------------------------------------------------------------------
// Data
//-----------------------------------------------------------------------------

const BASE_URL = "https://example.com";

//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------

describe("RequestMatcher", () => {
	describe("matches()", () => {
		it("should match requests with same method", () => {
			const matcher = new RequestMatcher({
				method: "GET",
				url: BASE_URL,
			});

			const request = {
				method: "GET",
				url: BASE_URL,
				headers: {},
			};

			assert.strictEqual(matcher.matches(request), true);
		});

		it("should match requests with same method and different casing", () => {
			const matcher = new RequestMatcher({
				method: "GET",
				url: BASE_URL,
			});

			const request = {
				method: "get",
				url: BASE_URL,
				headers: {},
			};

			assert.strictEqual(matcher.matches(request), true);
		});

		it("should not match requests with different method", () => {
			const matcher = new RequestMatcher({
				method: "GET",
				url: BASE_URL,
			});

			const request = {
				method: "POST",
				url: BASE_URL,
				headers: {},
			};

			assert.strictEqual(matcher.matches(request), false);
		});

		it("should match requests with matching URL pattern", () => {
			const matcher = new RequestMatcher({
				method: "GET",
				url: `${BASE_URL}/users/:id`,
			});

			const request = {
				method: "GET",
				url: `${BASE_URL}/users/123`,
				headers: {},
			};

			assert.strictEqual(matcher.matches(request), true);
		});

		it("should match requests with matching URL pattern and baseUrl passed separately", () => {
			const matcher = new RequestMatcher({
				method: "GET",
				baseUrl: BASE_URL,
				url: `/users/:id`,
			});

			const request = {
				method: "GET",
				url: `${BASE_URL}/users/123`,
				headers: {},
			};

			assert.strictEqual(matcher.matches(request), true);
		});

		it("should match requests with matching headers", () => {
			const matcher = new RequestMatcher({
				method: "GET",
				url: BASE_URL,
				headers: {
					"content-type": "application/json",
				},
			});

			const request = {
				method: "GET",
				url: BASE_URL,
				headers: {
					"content-type": "application/json",
				},
			};

			assert.strictEqual(matcher.matches(request), true);
		});

		it("should match requests with matching headers and different casing of header name", () => {
			const matcher = new RequestMatcher({
				method: "GET",
				url: BASE_URL,
				headers: {
					"Content-type": "application/json",
				},
			});

			const request = {
				method: "GET",
				url: BASE_URL,
				headers: {
					"content-type": "application/json",
				},
			};

			assert.strictEqual(matcher.matches(request), true);
		});

		it("should match requests with matching string body", () => {
			const matcher = new RequestMatcher({
				method: "POST",
				url: BASE_URL,
				body: "test data",
			});

			const request = {
				method: "POST",
				url: BASE_URL,
				headers: {},
				body: "test data",
			};

			assert.strictEqual(matcher.matches(request), true);
		});

		it("should match requests with matching JSON body", () => {
			const matcher = new RequestMatcher({
				method: "POST",
				url: BASE_URL,
				body: { foo: "bar", baz: { boom: true } },
			});

			const request = {
				method: "POST",
				url: BASE_URL,
				headers: {},
				body: { foo: "bar", baz: { boom: true } },
			};

			assert.strictEqual(matcher.matches(request), true);
		});

		it("should match requests with partially matching JSON body", () => {
			const matcher = new RequestMatcher({
				method: "POST",
				url: BASE_URL,
				body: { foo: "bar" },
			});

			const request = {
				method: "POST",
				url: BASE_URL,
				headers: {},
				body: { foo: "bar", baz: { boom: true } },
			};

			assert.strictEqual(matcher.matches(request), true);
		});

		it("should match requests with matching FormData body", () => {
			const formData1 = new FormData();
			formData1.append("foo", "bar");

			const formData2 = new FormData();
			formData2.append("foo", "bar");
			formData2.append("baz", "boom");

			const matcher = new RequestMatcher({
				method: "POST",
				url: BASE_URL,
				body: formData1,
			});

			const request = {
				method: "POST",
				url: BASE_URL,
				headers: {},
				body: formData2,
			};

			assert.strictEqual(matcher.matches(request), true);
		});

		describe("Query Strings", () => {
			it("should match requests with matching query string data", () => {
				const matcher = new RequestMatcher({
					method: "GET",
					url: `${BASE_URL}/users`,
					query: { id: "123" },
				});

				const request = {
					method: "GET",
					url: `${BASE_URL}/users`,
					query: { id: "123" },
				};

				assert.strictEqual(matcher.matches(request), true);
			});

			it("should match requests with partially matching query string data", () => {
				const matcher = new RequestMatcher({
					method: "GET",
					url: `${BASE_URL}/users`,
					query: { id: "123" },
				});

				const request = {
					method: "GET",
					url: `${BASE_URL}/users`,
					query: { id: "123", name: "Alice" },
				};

				assert.strictEqual(matcher.matches(request), true);
			});

			it("should not match requests when query string isn't present", () => {
				const matcher = new RequestMatcher({
					method: "GET",
					url: `${BASE_URL}/users`,
					query: { id: "123" },
				});

				const request = {
					method: "GET",
					url: `${BASE_URL}/users`,
				};

				assert.strictEqual(matcher.matches(request), false);
			});

			it("should not match request when query string doesn't match", () => {
				const matcher = new RequestMatcher({
					method: "GET",
					url: `${BASE_URL}/users`,
					query: { id: "123" },
				});

				const request = {
					method: "GET",
					url: `${BASE_URL}/users`,
					query: { id: "456" },
				};

				assert.strictEqual(matcher.matches(request), false);
			});
		});

		describe("Params", () => {
			it("should match requests with matching URL params", () => {
				const matcher = new RequestMatcher({
					method: "GET",
					url: `${BASE_URL}/users/:id`,
					params: { id: "123" },
				});

				const request = {
					method: "GET",
					url: `${BASE_URL}/users/123`,
				};

				assert.strictEqual(matcher.matches(request), true);
			});

			it("should not match requests with matching URL params in different URL", () => {
				const matcher = new RequestMatcher({
					method: "GET",
					url: `${BASE_URL}/users/:id`,
					params: { id: "123" },
				});

				const request = {
					method: "GET",
					url: `${BASE_URL}/users/123/edit`,
				};

				assert.strictEqual(matcher.matches(request), false);
			});

			it("should not match requests when URL params are missing", () => {
				const matcher = new RequestMatcher({
					method: "GET",
					url: `${BASE_URL}/users/:id`,
					params: { id: "123" },
				});

				const request = {
					method: "GET",
					url: `${BASE_URL}/users`,
				};

				assert.strictEqual(matcher.matches(request), false);
			});

			it("should not match requests when URL params don't match", () => {
				const matcher = new RequestMatcher({
					method: "GET",
					url: `${BASE_URL}/users/:id`,
					params: { id: "123" },
				});

				const request = {
					method: "GET",
					url: `${BASE_URL}/users/456`,
				};

				assert.strictEqual(matcher.matches(request), false);
			});
		});
	});

	describe("traceMatches()", () => {
		it("should return success messages when everything matches", () => {
			const matcher = new RequestMatcher({
				method: "GET",
				url: `${BASE_URL}/users/:id`,
				headers: { "content-type": "application/json" },
				params: { id: "123" }
			});

			const request = {
				method: "GET",
				url: `${BASE_URL}/users/123`,
				headers: { "content-type": "application/json" }
			};

			const result = matcher.traceMatches(request);
			assert.strictEqual(result.matches, true);
			assert.deepStrictEqual(result.messages, [
				"✅ URL matches.",
				"✅ Method matches: GET.",
				"✅ URL parameters match.",
				"✅ Headers match."
			]);
			assert.deepStrictEqual(result.params, { id: "123" });
		});

		it("should return failure message when URL doesn't match", () => {
			const matcher = new RequestMatcher({
				method: "GET",
				url: `${BASE_URL}/users/:id`
			});

			const request = {
				method: "GET",
				url: `${BASE_URL}/posts/123`,
				headers: {}
			};

			const result = matcher.traceMatches(request);
			assert.strictEqual(result.matches, false);
			assert.deepStrictEqual(result.messages, ["❌ URL does not match."]);
		});

		it("should return failure message when method doesn't match", () => {
			const matcher = new RequestMatcher({
				method: "GET",
				url: `${BASE_URL}/users/:id`
			});

			const request = {
				method: "POST",
				url: `${BASE_URL}/users/123`,
				headers: {}
			};

			const result = matcher.traceMatches(request);
			assert.strictEqual(result.matches, false);
			assert.deepStrictEqual(result.messages, [
				"✅ URL matches.",
				"❌ Method does not match. Expected GET but received POST."
			]);
		});

		it("should return failure message when query string doesn't match", () => {
			const matcher = new RequestMatcher({
				method: "GET",
				url: `${BASE_URL}/users`,
				query: { sort: "asc" }
			});

			const request = {
				method: "GET",
				url: `${BASE_URL}/users`,
				query: { sort: "desc" }
			};

			const result = matcher.traceMatches(request);
			assert.strictEqual(result.matches, false);
			assert.deepStrictEqual(result.messages, [
				"✅ URL matches.",
				"✅ Method matches: GET.",
				"❌ Query string does not match. Expected sort=asc but received sort=desc."
			]);
		});

		it("should return failure message when body doesn't match", () => {
			const matcher = new RequestMatcher({
				method: "POST",
				url: `${BASE_URL}/users`,
				body: { name: "John" }
			});

			const request = {
				method: "POST",
				url: `${BASE_URL}/users`,
				headers: {},
				body: { name: "Jane" }
			};

			const result = matcher.traceMatches(request);
			assert.strictEqual(result.matches, false);
			assert.deepStrictEqual(result.messages, [
				"✅ URL matches.",
				"✅ Method matches: POST.",
				"✅ Headers match.",
				'❌ Body does not match. Expected {"name":"John"} but received {"name":"Jane"}.'
			]);
		});

		it("should return failure message when headers don't match", () => {
			const matcher = new RequestMatcher({
				method: "GET",
				url: `${BASE_URL}/users`,
				headers: { "content-type": "application/json" }
			});

			const request = {
				method: "GET",
				url: `${BASE_URL}/users`,
				headers: { "content-type": "text/plain" }
			};

			const result = matcher.traceMatches(request);
			assert.strictEqual(result.matches, false);
			assert.deepStrictEqual(result.messages, [
				"✅ URL matches.",
				"✅ Method matches: GET.",
				"❌ Headers do not match. Expected content-type=application/json but received content-type=text/plain."
			]);
		});

		it("should return correct URL params when URL matches", () => {
			const matcher = new RequestMatcher({
				method: "GET",
				url: `${BASE_URL}/users/:id/posts/:postId`
			});

			const request = {
				method: "GET",
				url: `${BASE_URL}/users/123/posts/456`,
				headers: {}
			};

			const result = matcher.traceMatches(request);
			assert.deepStrictEqual(result.params, {
				id: "123",
				postId: "456"
			});
		});

		it("should return empty params object when URL doesn't match", () => {
			const matcher = new RequestMatcher({
				method: "GET",
				url: `${BASE_URL}/users/:id`
			});

			const request = {
				method: "GET",
				url: `${BASE_URL}/posts/123`,
				headers: {}
			};

			const result = matcher.traceMatches(request);
			assert.deepStrictEqual(result.params, {});
		});

		it("should return correct query params when URL contains query string", () => {
			const matcher = new RequestMatcher({
				method: "GET",
				url: `${BASE_URL}/users`
			});

			const request = {
				method: "GET",
				url: `${BASE_URL}/users?sort=asc&limit=10`,
				headers: {}
			};

			const result = matcher.traceMatches(request);
			assert.strictEqual(result.query.get("sort"), "asc");
			assert.strictEqual(result.query.get("limit"), "10");
		});

		it("should return empty query params when URL has no query string", () => {
			const matcher = new RequestMatcher({
				method: "GET",
				url: `${BASE_URL}/users`
			});

			const request = {
				method: "GET",
				url: `${BASE_URL}/users`,
				headers: {}
			};

			const result = matcher.traceMatches(request);
			assert.strictEqual([...result.query.entries()].length, 0);
		});

		it("should return both params and query when URL contains both", () => {
			const matcher = new RequestMatcher({
				method: "GET",
				url: `${BASE_URL}/users/:id/posts/:postId`
			});

			const request = {
				method: "GET",
				url: `${BASE_URL}/users/123/posts/456?sort=asc&limit=10`,
				headers: {}
			};

			const result = matcher.traceMatches(request);
			assert.deepStrictEqual(result.params, {
				id: "123",
				postId: "456"
			});
			assert.strictEqual(result.query.get("sort"), "asc");
			assert.strictEqual(result.query.get("limit"), "10");
		});

	});
});
