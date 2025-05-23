/**
 * @fileoverview Tests for the utility functions.
 * @author Nicholas C. Zakas
 */

/* global Request, FormData */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import assert from "node:assert";
import { stringifyRequest, getBody, NoRouteMatchedError } from "../src/util.js";

//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------

describe("util", () => {
	describe("stringifyRequest()", () => {
		it("should stringify a request", () => {
			const request = new Request("https://example.com", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});

			const expected = `POST https://example.com/
Content-Type: application/json

{"name":"value"}`;

			assert.strictEqual(
				stringifyRequest(request, { name: "value" }),
				expected,
			);
		});

		it("should stringify a request with form data", () => {
			const formData = new FormData();
			formData.append("name", "value");

			const request = new Request("https://example.com/foo", {
				method: "POST",
				headers: {
					"Content-Type": "multipart/form-data",
				},
			});

			const expected = `POST https://example.com/foo
Content-Type: multipart/form-data

[object FormData]`;

			assert.strictEqual(stringifyRequest(request, formData), expected);
		});

		it("should stringify a request with URL-encoded form data", () => {
			const formData = new FormData();
			formData.append("name", "value");

			const request = new Request("https://example.com", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
			});

			const expected = `POST https://example.com/
Content-Type: application/x-www-form-urlencoded

[object FormData]`;

			assert.strictEqual(stringifyRequest(request, formData), expected);
		});

		it("should stringify a request with no body", () => {
			const request = new Request("https://example.com", {
				method: "GET",
			});

			const expected = `GET https://example.com/`;

			assert.strictEqual(stringifyRequest(request), expected);
		});

		it("should stringify a request with a text body", () => {
			const request = new Request("https://example.com", {
				method: "POST",
				headers: {
					"Content-Type": "text/plain",
				},
			});

			const expected = `POST https://example.com/
Content-Type: text/plain

Hello, world!`;

			assert.strictEqual(
				stringifyRequest(request, "Hello, world!"),
				expected,
			);
		});

		it("should stringify a request with an ArrayBuffer body", () => {
			const request = new Request("https://example.com", {
				method: "POST",
				headers: {
					"Content-Type": "application/octet-stream",
				},
			});

			const expected = `POST https://example.com/
Content-Type: application/octet-stream

[object ArrayBuffer]`;

			assert.strictEqual(
				stringifyRequest(request, new ArrayBuffer(8)),
				expected,
			);
		});
	});

	describe("getBody()", () => {
		it("should return null for a request with no body", async () => {
			const request = new Request("https://example.com", {
				method: "GET",
			});

			assert.strictEqual(await getBody(request), null);
		});

		it("should return the body for a request with a text body", async () => {
			const request = new Request("https://example.com", {
				method: "POST",
				headers: {
					"Content-Type": "text/plain",
				},
				body: "Hello, world!",
			});

			assert.strictEqual(await getBody(request), "Hello, world!");
		});

		it("should return the body for a request with a JSON body", async () => {
			const request = new Request("https://example.com", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ name: "value" }),
			});

			assert.deepStrictEqual(await getBody(request), { name: "value" });
		});

		it("should return the body for a request with a form data body", async () => {
			const formData = new FormData();
			formData.append("name", "value");

			const request = new Request("https://example.com", {
				method: "POST",
				body: formData,
			});

			const body = await getBody(request);
			assert(body instanceof FormData);
			assert.strictEqual(body.get("name"), "value");
		});

		it("should return the body for a request with an ArrayBuffer body", async () => {
			const request = new Request("https://example.com", {
				method: "POST",
				headers: {
					"Content-Type": "application/octet-stream",
				},
				body: new ArrayBuffer(8),
			});

			const body = await getBody(request);
			assert(body instanceof ArrayBuffer);
			assert.strictEqual(body.byteLength, 8);
		});
	});

	describe("NoRouteMatchedError", () => {
		it("should create an error with the correct message for no partial matches", () => {
			const request = new Request("https://example.com", {
				method: "GET",
			});
			const body = null;
			const traces = [];

			const error = new NoRouteMatchedError(request, body, traces);

			assert.strictEqual(error.name, "NoRouteMatchedError");
			assert.ok(
				error.message.includes(
					"No route matched for GET https://example.com/",
				),
			);
			assert.ok(error.message.includes("No partial matches found."));
			assert.strictEqual(error.request, request);
			assert.strictEqual(error.body, body);
			assert.deepStrictEqual(error.traces, traces);
		});

		it("should create an error with the correct message for partial matches", () => {
			const request = new Request("https://example.com/users/123", {
				method: "GET",
			});
			const body = null;
			const traces = [
				{
					title: "Route 1",
					messages: ["Message 1", "Message 2"],
				},
				{
					title: "Route 2",
					messages: ["Message 3", "Message 4"],
				},
			];

			const error = new NoRouteMatchedError(request, body, traces);

			assert.strictEqual(error.name, "NoRouteMatchedError");
			assert.ok(
				error.message.includes(
					"No route matched for GET https://example.com/users/123",
				),
			);
			assert.ok(error.message.includes("Partial matches:"));
			assert.ok(error.message.includes("Route 1:"));
			assert.ok(error.message.includes("  Message 1"));
			assert.ok(error.message.includes("  Message 2"));
			assert.ok(error.message.includes("Route 2:"));
			assert.ok(error.message.includes("  Message 3"));
			assert.ok(error.message.includes("  Message 4"));
			assert.strictEqual(error.request, request);
			assert.strictEqual(error.body, body);
			assert.deepStrictEqual(error.traces, traces);
		});

		it("should create an error with the correct message when body is provided", () => {
			const request = new Request("https://example.com", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});
			const body = { name: "value" };
			const traces = [];

			const error = new NoRouteMatchedError(request, body, traces);

			assert.strictEqual(error.name, "NoRouteMatchedError");
			assert.ok(
				error.message.includes(
					"No route matched for POST https://example.com/",
				),
			);
			assert.ok(error.message.includes('{"name":"value"}'));
			assert.strictEqual(error.request, request);
			assert.strictEqual(error.body, body);
			assert.deepStrictEqual(error.traces, traces);
		});
	});
});
