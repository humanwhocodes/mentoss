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
		
		it("should match requests with matching query string data", () => {
			const matcher = new RequestMatcher({
				method: "GET",
				url: `${BASE_URL}/users`,
				query: { id: "123" },
			});

			const request = {
				method: "GET",
				url: `${BASE_URL}/users`,
				query : { id: "123" },
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
});
