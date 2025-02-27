/**
 * @fileoverview Tests for the CORS utilities.
 * @autor Nicholas C. Zakas
 */
/* global Request, Headers, Response */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import assert from "node:assert";
import { isCorsSimpleRequest, getUnsafeHeaders, assertCorsResponse } from "../src/cors.js";

//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------

describe("http", () => {
	describe("isCorsSimpleRequest()", () => {
		describe("Simple Requests", () => {
			it("should return true for GET request with no headers", () => {
				const request = new Request("https://example.com", {
					method: "GET",
				});
				assert.strictEqual(isCorsSimpleRequest(request), true);
			});

			it("should return true for HEAD request with no headers", () => {
				const request = new Request("https://example.com", {
					method: "HEAD",
				});
				assert.strictEqual(isCorsSimpleRequest(request), true);
			});

			it("should return true for POST request with no headers", () => {
				const request = new Request("https://example.com", {
					method: "POST",
				});
				assert.strictEqual(isCorsSimpleRequest(request), true);
			});

			it("should return true for GET request with simple headers", () => {
				const headers = new Headers({
					Accept: "application/json",
					"Accept-Language": "en-US",
					"Content-Language": "en",
				});
				const request = new Request("https://example.com", {
					method: "GET",
					headers,
				});
				assert.strictEqual(isCorsSimpleRequest(request), true);
			});

			it("should return true for POST request with simple Content-Type", () => {
				const headers = new Headers({
					"Content-Type": "application/x-www-form-urlencoded",
				});
				const request = new Request("https://example.com", {
					method: "POST",
					headers,
				});
				assert.strictEqual(isCorsSimpleRequest(request), true);
			});

			it("should return true for GET request with Range header", () => {
				const headers = new Headers({
					Range: "bytes=0-1024",
				});
				const request = new Request("https://example.com", {
					method: "GET",
					headers,
				});
				assert.strictEqual(isCorsSimpleRequest(request), true);
			});

			it("should return true for GET request with Range header without starting range", () => {
				const headers = new Headers({
					Range: "bytes=-1024",
				});
				const request = new Request("https://example.com", {
					method: "GET",
					headers,
				});
				assert.strictEqual(isCorsSimpleRequest(request), true);
			});

			it("should return true for GET request with Range header without ending range", () => {
				const headers = new Headers({
					Range: "bytes=0-",
				});
				const request = new Request("https://example.com", {
					method: "GET",
					headers,
				});
				assert.strictEqual(isCorsSimpleRequest(request), true);
			});
		});

		describe("Complex Requests", () => {
			it("should return false for PUT request", () => {
				const request = new Request("https://example.com", {
					method: "PUT",
				});
				assert.strictEqual(isCorsSimpleRequest(request), false);
			});

			it("should return false for POST request with non-simple Content-Type", () => {
				const headers = new Headers({
					"Content-Type": "application/xml",
				});
				const request = new Request("https://example.com", {
					method: "POST",
					headers,
				});
				assert.strictEqual(isCorsSimpleRequest(request), false);
			});

			it("should return false for GET request with non-simple header", () => {
				const headers = new Headers({
					Authorization: "Bearer 1234",
				});
				const request = new Request("https://example.com", {
					method: "GET",
					headers,
				});
				assert.strictEqual(isCorsSimpleRequest(request), false);
			});

			it("should return false for GET request with non-simple header and simple header", () => {
				const headers = new Headers({
					Authorization: "Bearer 1234",
					Accept: "application/json",
				});
				const request = new Request("https://example.com", {
					method: "GET",
					headers,
				});
				assert.strictEqual(isCorsSimpleRequest(request), false);
			});

			it("should return false for GET request with non-simple header and simple Content-Type", () => {
				const headers = new Headers({
					Authorization: "Bearer 1234",
					"Content-Type": "application/x-www-form-urlencoded",
				});
				const request = new Request("https://example.com", {
					method: "GET",
					headers,
				});
				assert.strictEqual(isCorsSimpleRequest(request), false);
			});

			it("should return false for GET request with non-simple header and Range header", () => {
				const headers = new Headers({
					Authorization: "Bearer 1234",
					Range: "bytes=0-1024",
				});
				const request = new Request("https://example.com", {
					method: "GET",
					headers,
				});
				assert.strictEqual(isCorsSimpleRequest(request), false);
			});

			it("should return false for GET request with invalid Range header", () => {
				const headers = new Headers({
					Range: "bytes=0-1024,2048-3072",
				});
				const request = new Request("https://example.com", {
					method: "GET",
					headers,
				});
				assert.strictEqual(isCorsSimpleRequest(request), false);
			});
		});
	});
	
	describe("getUnsafeHeaders()", () => {
		it("should return empty array for request with no headers", () => {
			const request = new Request("https://example.com");
			assert.deepStrictEqual(getUnsafeHeaders(request), []);
		});

		it("should return empty array for request with only simple headers", () => {
			const headers = new Headers({
				Accept: "application/json",
				"Accept-Language": "en-US",
				"Content-Language": "en-US"
			});
			const request = new Request("https://example.com", { headers });
			assert.deepStrictEqual(getUnsafeHeaders(request), []);
		});

		it("should return array containing non-simple headers", () => {
			const headers = new Headers({
				Accept: "application/json",
				Authorization: "Bearer token",
				"X-Custom-Header": "value"
			});
			const request = new Request("https://example.com", { headers });
			assert.deepStrictEqual(
				getUnsafeHeaders(request),
				["authorization", "x-custom-header"]
			);
		});

		it("should identify non-simple content-type header", () => {
			const headers = new Headers({
				"Content-Type": "application/json"
			});
			const request = new Request("https://example.com", { headers });
			assert.deepStrictEqual(getUnsafeHeaders(request), ["content-type"]);
		});

		it("should not include simple content-type header", () => {
			const headers = new Headers({
				"Content-Type": "text/plain"
			});
			const request = new Request("https://example.com", { headers });
			assert.deepStrictEqual(getUnsafeHeaders(request), []);
		});

		it("should identify invalid range header", () => {
			const headers = new Headers({
				Range: "bytes=0-1024,2048-3072"
			});
			const request = new Request("https://example.com", { headers });
			assert.deepStrictEqual(getUnsafeHeaders(request), ["range"]);
		});

		it("should not include valid range header", () => {
			const headers = new Headers({
				Range: "bytes=0-1024"
			});
			const request = new Request("https://example.com", { headers });
			assert.deepStrictEqual(getUnsafeHeaders(request), []);
		});

		it("should identify multiple non-simple headers", () => {
			const headers = new Headers({
				Authorization: "Bearer token",
				"Content-Type": "application/json",
				Range: "bytes=0-1024,2048-3072",
				"X-Custom-Header": "value"
			});
			const request = new Request("https://example.com", { headers });
			assert.deepStrictEqual(
				getUnsafeHeaders(request),
				["authorization", "content-type", "range", "x-custom-header"]
			);
		});
	});

	describe("assertCorsResponse()", () => {
		it("should not throw when Access-Control-Allow-Origin is *", () => {
			const headers = new Headers({
				"Access-Control-Allow-Origin": "*"
			});
			const response = new Response(null, { headers });
			
			assert.doesNotThrow(() => {
				assertCorsResponse(response, "https://example.com");
			});
		});

		it("should not throw when Access-Control-Allow-Origin matches origin", () => {
			const origin = "https://example.com";
			const headers = new Headers({
				"Access-Control-Allow-Origin": origin
			});
			const response = new Response(null, { headers });
			
			assert.doesNotThrow(() => {
				assertCorsResponse(response, origin);
			});
		});

		it("should throw when Access-Control-Allow-Origin header is missing", () => {
			const response = new Response();
			const origin = "https://example.com";
			
			assert.throws(() => {
				assertCorsResponse(response, origin);
			}, {
				name: "CorsError",
				message: `Access to fetch at '${response.url}' from origin '${origin}' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.`
			});
		});

		it("should throw when Access-Control-Allow-Origin doesn't match origin", () => {
			const headers = new Headers({
				"Access-Control-Allow-Origin": "https://example.com"
			});
			const response = new Response(null, { headers });
			const origin = "https://other.com";
			
			assert.throws(() => {
				assertCorsResponse(response, origin);
			}, {
				name: "CorsError",
				message: `Access to fetch at '${response.url}' from origin '${origin}' has been blocked by CORS policy: The 'Access-Control-Allow-Origin' header has a value 'https://example.com' that is not equal to the supplied origin.`
			});
		});

		it("should throw when Access-Control-Allow-Origin contains multiple values", () => {
			const headers = new Headers({
				"Access-Control-Allow-Origin": "https://example.com, https://other.com"
			});
			const response = new Response(null, { headers });
			const origin = "https://example.com";
			
			assert.throws(() => {
				assertCorsResponse(response, origin);
			}, {
				name: "CorsError",
				message: `Access to fetch at '${response.url}' from origin '${origin}' has been blocked by CORS policy: The 'Access-Control-Allow-Origin' header contains multiple values 'https://example.com, https://other.com', but only one is allowed.`
			});
		});
	});
});
