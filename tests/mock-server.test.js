/**
 * @fileoverview Tests for the MockServer class.
 * @author Nicholas C. Zakas
 */

/* globals FormData, Request, TextEncoder */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import assert from "node:assert";
import { MockServer } from "../src/mock-server.js";
import { verbs } from "../src/http.js";

//-----------------------------------------------------------------------------
// Data
//-----------------------------------------------------------------------------

const BASE_URL = "https://example.com";


//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

/**
 * Creates a request object for testing
 * @param {Object} options Request options
 * @returns {Request} A new request object
 */
function createRequest({ method, url, headers = {}, body = undefined }) {
	const requestInit = {
		method,
		headers,
	};

	if (body !== undefined) {
		if (body instanceof FormData) {
			requestInit.body = body;
		} else if (body instanceof ArrayBuffer) {
			requestInit.body = body;
			requestInit.headers["content-type"] = "application/octet-stream";
		} else if (typeof body === "object") {
			requestInit.body = JSON.stringify(body);
			requestInit.headers["content-type"] = "application/json";
		} else {
			requestInit.body = body;
		}
	}

	return new Request(url, requestInit);
}

/**
 * Reads the response body based on content type
 * @param {Response} response The response to read
 * @returns {Promise<string|object>} The response body
 */
async function getResponseBody(response) {
	const contentType = response.headers.get("content-type");
	if (contentType?.includes("application/json")) {
		return response.json();
	}
	
	if (contentType?.includes("text")) {
		return response.text();
	}
	
	return response.arrayBuffer();
}

//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------

describe("MockServer", () => {
	let server;

	beforeEach(() => {
		server = new MockServer(BASE_URL);
	});

	describe("receive()", () => {
		it("should add a GET route and match the request", async () => {
			server.get("/test", { status: 200, body: "OK" });

			const request = createRequest({
				method: "GET",
				url: `${BASE_URL}/test`,
			});

			const response = await server.receive(request);
			assert.strictEqual(response.status, 200);
			assert.strictEqual(response.statusText, "OK");
			assert.strictEqual(await getResponseBody(response), "OK");
		});

		it("should add a GET route with param and match the request", async () => {
			server.get("/test/:id", { status: 200, body: "OK" });

			const request = createRequest({
				method: "GET",
				url: `${BASE_URL}/test/123`,
			});

			const response = await server.receive(request);
			assert.strictEqual(response.status, 200);
			assert.strictEqual(response.statusText, "OK");
			assert.strictEqual(await getResponseBody(response), "OK");
		});

		it("should add a POST route and match the request", async () => {
			server.post("/submit", { status: 201, body: "Created" });

			const request = createRequest({
				method: "POST",
				url: `${BASE_URL}/submit`,
			});

			const response = await server.receive(request);
			assert.strictEqual(response.status, 201);
			assert.strictEqual(response.statusText, "Created");
			assert.strictEqual(await getResponseBody(response), "Created");
		});

		it("should return undefined for unmatched requests", async () => {
			server.get("/test", { status: 200, body: "OK" });

			const request = createRequest({
				method: "POST",
				url: `${BASE_URL}/test`,
			});

			const response = await server.receive(request);
			assert.strictEqual(response, undefined);
		});

		it("should reset all routes", async () => {
			server.get("/reset", { status: 200, body: "OK" });
			server.clear();

			const request = createRequest({
				method: "GET",
				url: `${BASE_URL}/reset`,
			});

			const response = await server.receive(request);
			assert.strictEqual(response, undefined);
		});

		it("should add a PUT route and match the request", async () => {
			server.put("/update/:id", { status: 200, body: "Updated" });

			const request = createRequest({
				method: "PUT",
				url: `${BASE_URL}/update/123`,
			});

			const response = await server.receive(request);
			assert.strictEqual(response.status, 200);
			assert.strictEqual(response.statusText, "OK");
			assert.strictEqual(await getResponseBody(response), "Updated");
		});

		it("should add a DELETE route and match the request", async () => {
			server.delete("/delete/:id", { status: 204 });

			const request = createRequest({
				method: "DELETE",
				url: `${BASE_URL}/delete/123`,
			});

			const response = await server.receive(request);
			assert.strictEqual(response.status, 204);
			assert.strictEqual(response.statusText, "No Content");
		});

		it("should add a PATCH route and match the request", async () => {
			server.patch("/patch/:id", { status: 200, body: "Patched" });

			const request = createRequest({
				method: "PATCH",
				url: `${BASE_URL}/patch/123`,
			});

			const response = await server.receive(request);
			assert.strictEqual(response.status, 200);
			assert.strictEqual(response.statusText, "OK");
			assert.strictEqual(await getResponseBody(response), "Patched");
		});

		it("should add a HEAD route and match the request", async () => {
			server.head("/head", { status: 200 });

			const request = createRequest({
				method: "HEAD",
				url: `${BASE_URL}/head`,
			});

			const response = await server.receive(request);
			assert.strictEqual(response.status, 200);
			assert.strictEqual(response.statusText, "OK");
		});

		it("should add an OPTIONS route and match the request", async () => {
			server.options("/options", {
				status: 200,
				headers: { Allow: "GET, POST" },
			});

			const request = createRequest({
				method: "OPTIONS",
				url: `${BASE_URL}/options`,
			});

			const response = await server.receive(request);
			assert.strictEqual(response.status, 200);
			assert.strictEqual(response.statusText, "OK");
			assert.strictEqual(response.headers.get("Allow"), "GET, POST");
		});

		it("should match a route only once and then not again", async () => {
			server.get("/query", { status: 200, body: "OK" });

			const request = createRequest({
				method: "GET",
				url: `${BASE_URL}/query`,
			});

			const firstResponse = await server.receive(request);
			assert.strictEqual(firstResponse.status, 200);
			assert.strictEqual(firstResponse.statusText, "OK");
			assert.strictEqual(await getResponseBody(firstResponse), "OK");

			const secondResponse = await server.receive(request);
			assert.strictEqual(secondResponse, undefined);
		});

		it("should match a route and the response object should have a URL that matches the request", async () => {
			server.get("/test", { status: 200, body: "OK" });

			const request = createRequest({
				method: "GET",
				url: `${BASE_URL}/test?foo=bar`,
			});

			const response = await server.receive(request);
			assert.strictEqual(response.url, `${BASE_URL}/test?foo=bar`);
		});
		
		it("should delay the response by at least 500ms", async () => {
			server.get("/test", { status: 200, body: "OK", delay: 500 });

			const request = createRequest({
				method: "GET",
				url: `${BASE_URL}/test?foo=bar`,
			});

			const startTime = Date.now();
			const response = await server.receive(request);
			const elapsed = Date.now() - startTime;
			
			assert.ok(elapsed >= 500, `Response was delayed ${elapsed}ms, expected at least 500ms.`);
			assert.strictEqual(response.url, `${BASE_URL}/test?foo=bar`);
		});
	});

	describe("traceReceive()", () => {
		it("should return response and messages when a route matches", async () => {
			server.get("/test", { status: 200, body: "OK" });

			const request = createRequest({
				method: "GET",
				url: `${BASE_URL}/test`,
			});

			const { response, traces } = await server.traceReceive(request);
			assert.strictEqual(response.status, 200);
			assert.strictEqual(response.statusText, "OK");
			assert.strictEqual(await getResponseBody(response), "OK");
			assert.strictEqual(traces.length, 0);
		});

		it("should return undefined response and traces with multiple messages when a route doesn't match", async () => {
			server.get("/test", { status: 200, body: "OK" });

			const request = createRequest({
				method: "POST",
				url: `${BASE_URL}/test`,
			});

			const { response, traces } = await server.traceReceive(request);
			assert.strictEqual(response, undefined);
			assert.strictEqual(traces.length, 1);
			assert.strictEqual(
				traces[0].route.toString(),
				"[Route: GET https://example.com/test -> 200]",
			);
			assert.deepStrictEqual(traces[0].messages, [
				"✅ URL matches.",
				"❌ Method does not match. Expected GET but received POST.",
			]);
		});

		it("should return response and traces with multiple messages when a route partially matches", async () => {
			server.get("/test", { status: 200, body: "OK" });

			const request = createRequest({
				method: "GET",
				url: `${BASE_URL}/test/123`,
			});

			const { response, traces } = await server.traceReceive(request);
			assert.strictEqual(response, undefined);
			assert.strictEqual(traces.length, 1);
			assert.strictEqual(
				traces[0].route.toString(),
				"[Route: GET https://example.com/test -> 200]",
			);
			assert.deepStrictEqual(traces[0].messages, [
				"❌ URL does not match.",
			]);
		});

		it("should return response and traces with multiple messages when a route doesn't match query string", async () => {
			server.get(
				{
					url: "/query",
					query: {
						id: "123",
						name: "Alice",
					},
				},
				{ status: 200, body: "OK" },
			);

			const request = createRequest({
				method: "GET",
				url: `${BASE_URL}/query?id=123`,
			});

			const { response, traces } = await server.traceReceive(request);
			assert.strictEqual(response, undefined);
			assert.strictEqual(traces.length, 1);
			assert.strictEqual(
				traces[0].route.toString(),
				"[Route: GET https://example.com/query -> 200]",
			);
			assert.deepStrictEqual(traces[0].messages, [
				"✅ URL matches.",
				"✅ Method matches: GET.",
				"❌ Query string does not match. Expected name=Alice but received name=undefined.",
			]);
		});

		it("should return response and traces with multiple messages when a route doesn't match URL parameters", async () => {
			server.get(
				{
					url: "/users/:id",
					params: {
						id: "123",
					},
				},
				{ status: 200, body: "OK" },
			);

			const request = createRequest({
				method: "GET",
				url: `${BASE_URL}/users/456`,
			});

			const { response, traces } = await server.traceReceive(request);
			assert.strictEqual(response, undefined);
			assert.strictEqual(traces.length, 1);
			assert.strictEqual(
				traces[0].route.toString(),
				"[Route: GET https://example.com/users/:id -> 200]",
			);
			assert.deepStrictEqual(traces[0].messages, [
				"✅ URL matches.",
				"✅ Method matches: GET.",
				"❌ URL parameters do not match. Expected id=123 but received id=456.",
			]);
		});

		it("should return response and traces with multiple messages when a route doesn't match headers", async () => {
			server.get(
				{
					url: "/headers",
					headers: { Accept: "application/json" },
				},
				{ status: 200, body: "OK" },
			);

			const request = createRequest({
				method: "GET",
				url: `${BASE_URL}/headers`,
				headers: { Accept: "text/html" },
			});

			const { response, traces } = await server.traceReceive(request);
			assert.strictEqual(response, undefined);
			assert.strictEqual(traces.length, 1);
			assert.strictEqual(
				traces[0].route.toString(),
				"[Route: GET https://example.com/headers -> 200]",
			);
			assert.deepStrictEqual(traces[0].messages, [
				"✅ URL matches.",
				"✅ Method matches: GET.",
				"❌ Headers do not match. Expected accept=application/json but received accept=text/html.",
			]);
		});

		it("should return response and traces with multiple messages when a route doesn't match body", async () => {
			server.post(
				{
					url: "/submit",
					body: {
						key: "value",
					},
				},
				{ status: 201, body: "Created" },
			);

			const request = createRequest({
				method: "POST",
				url: `${BASE_URL}/submit`,
				body: { key: "val" },
			});

			const { response, traces } = await server.traceReceive(request);
			assert.strictEqual(response, undefined);
			assert.strictEqual(traces.length, 1);
			assert.strictEqual(
				traces[0].route.toString(),
				"[Route: POST https://example.com/submit -> 201]",
			);
			assert.deepStrictEqual(traces[0].messages, [
				"✅ URL matches.",
				"✅ Method matches: POST.",
				"✅ Headers match.",
				'❌ Body does not match. Expected {"key":"value"} but received {"key":"val"}.',
			]);
		});

		it("should return multiple traces when multiple routes don't match", async () => {
			server.get("/test", { status: 200, body: "OK" });
			server.post("/test", { status: 201, body: "Created" });

			const request = createRequest({
				method: "OPTIONS",
				url: `${BASE_URL}/test`,
			});

			const { response, traces } = await server.traceReceive(request);
			assert.strictEqual(response, undefined);
			assert.strictEqual(traces.length, 2);
			assert.strictEqual(
				traces[0].route.toString(),
				"[Route: GET https://example.com/test -> 200]",
			);
			assert.deepStrictEqual(traces[0].messages, [
				"✅ URL matches.",
				"❌ Method does not match. Expected GET but received OPTIONS.",
			]);
			assert.strictEqual(
				traces[1].route.toString(),
				"[Route: POST https://example.com/test -> 201]",
			);
			assert.deepStrictEqual(traces[1].messages, [
				"✅ URL matches.",
				"❌ Method does not match. Expected POST but received OPTIONS.",
			]);
		});

		it("should return JSON response when body is object", async () => {
			server.get("/test", {
				status: 200,
				body: { foo: "bar" },
			});

			const request = createRequest({
				method: "GET",
				url: `${BASE_URL}/test`,
			});

			const { response } = await server.traceReceive(request);
			assert.strictEqual(response.status, 200);
			assert.strictEqual(response.statusText, "OK");
			assert.strictEqual(
				response.headers.get("content-type"),
				"application/json",
			);
		});
	});

	describe("Query Strings", () => {
		it("should match a route with all query string parameters present", async () => {
			server.get(
				{
					url: "/query",
					query: {
						id: "123",
						name: "Alice",
					},
				},
				{ status: 200, body: "OK" },
			);

			const request = createRequest({
				method: "GET",
				url: `${BASE_URL}/query?id=123&name=Alice`,
			});

			const response = await server.receive(request);
			assert.strictEqual(response.status, 200);
			assert.strictEqual(response.statusText, "OK");
			assert.strictEqual(await getResponseBody(response), "OK");
		});

		it("should match a route with partially matching query string parameters", async () => {
			server.get(
				{
					url: "/query",
					query: {
						id: "123",
					},
				},
				{ status: 200, body: "OK" },
			);

			const request = createRequest({
				method: "GET",
				url: `${BASE_URL}/query?id=123&name=Alice`,
			});

			const response = await server.receive(request);
			assert.strictEqual(response.status, 200);
			assert.strictEqual(response.statusText, "OK");
			assert.strictEqual(await getResponseBody(response), "OK");
		});

		it("should not match a route when query string parameters are missing", async () => {
			server.get(
				{
					url: "/query",
					query: {
						id: "123",
						name: "Alice",
					},
				},
				{ status: 200, body: "OK" },
			);

			const request = createRequest({
				method: "GET",
				url: `${BASE_URL}/query?id=123`,
			});

			const response = await server.receive(request);
			assert.strictEqual(response, undefined);
		});

		it("should not match a route when query string parameters don't match", async () => {
			server.get(
				{
					url: "/query",
					query: {
						id: "123",
						name: "Alice",
					},
				},
				{ status: 200, body: "OK" },
			);

			const request = createRequest({
				method: "GET",
				url: `${BASE_URL}/query?id=123&name=Bob`,
			});

			const response = await server.receive(request);
			assert.strictEqual(response, undefined);
		});
	});

	describe("Params", () => {
		it("should match a route with all URL parameters present", async () => {
			server.get(
				{
					url: "/users/:id",
					params: {
						id: "123",
					},
				},
				{ status: 200, body: "OK" },
			);

			const request = createRequest({
				method: "GET",
				url: `${BASE_URL}/users/123`,
			});

			const response = await server.receive(request);
			assert.strictEqual(response.status, 200);
			assert.strictEqual(response.statusText, "OK");
			assert.strictEqual(await getResponseBody(response), "OK");
		});

		it("should not match a route with matching URL parameters in subpath", async () => {
			server.get(
				{
					url: "/users/:id",
					params: {
						id: "123",
					},
				},
				{ status: 200, body: "OK" },
			);

			const request = createRequest({
				method: "GET",
				url: `${BASE_URL}/users/123/name/Alice`,
			});

			const response = await server.receive(request);
			assert.strictEqual(response, undefined);
		});

		it("should not match a route when URL parameters are missing", async () => {
			server.get(
				{
					url: "/users/:id",
					params: {
						id: "123",
					},
				},
				{ status: 200, body: "OK" },
			);

			const request = createRequest({
				method: "GET",
				url: `${BASE_URL}/users`,
			});

			const response = await server.receive(request);
			assert.strictEqual(response, undefined);
		});

		it("should not match a route when URL parameters don't match", async () => {
			server.get(
				{
					url: "/users/:id",
					params: {
						id: "123",
					},
				},
				{ status: 200, body: "OK" },
			);

			const request = createRequest({
				method: "GET",
				url: `${BASE_URL}/users/456`,
			});

			const response = await server.receive(request);
			assert.strictEqual(response, undefined);
		});
	});

	describe("Headers", () => {
		const methods = [
			"get",
			"post",
			"put",
			"delete",
			"patch",
			"head",
			"options",
		];
		const expectedStatus = {
			get: 200,
			post: 201,
			put: 200,
			delete: 204,
			patch: 200,
			head: 200,
			options: 200,
		};
		const expectedBody = {
			post: "Created",
			put: "Updated",
			patch: "Patched",
		};

		const expectedStatusText = {
			get: "OK",
			post: "Created",
			put: "OK",
			delete: "No Content",
			patch: "OK",
			head: "OK",
			options: "OK",
		};

		methods.forEach(method => {
			it(`should add a ${method.toUpperCase()} route with headers and match the request`, async () => {
				server[method](
					{
						url: "/headers",
						headers: { Accept: "application/json" },
					},
					{
						status: expectedStatus[method],
						body: expectedBody[method],
					},
				);

				const request = createRequest({
					method: method.toUpperCase(),
					url: `${BASE_URL}/headers`,
					headers: { Accept: "application/json" },
				});

				const response = await server.receive(request);
				assert.strictEqual(response.status, expectedStatus[method]);
				assert.strictEqual(
					response.statusText,
					expectedStatusText[method],
				);
				if (expectedBody[method] !== undefined) {
					assert.strictEqual(
						await getResponseBody(response),
						expectedBody[method],
					);
				}
			});
		});

		it("should not match the request if headers don't match", async () => {
			server.get(
				{ url: "/headers", headers: { Accept: "application/json" } },
				{
					status: 200,
					body: "OK",
					headers: { "Content-Type": "application/json" },
				},
			);

			const request = createRequest({
				method: "GET",
				url: `${BASE_URL}/headers`,
				headers: { Accept: "text/html" },
			});

			const response = await server.receive(request);
			assert.strictEqual(response, undefined);
		});
	});

	describe("Body Matching", () => {
		it("should add a POST route and match the request with a string body", async () => {
			server.post(
				{ url: "/submit", body: "data" },
				{ status: 201, body: "Created" },
			);

			const request = createRequest({
				method: "POST",
				url: `${BASE_URL}/submit`,
				body: "data",
			});

			const response = await server.receive(request);
			assert.strictEqual(response.status, 201);
			assert.strictEqual(response.statusText, "Created");
			assert.strictEqual(await getResponseBody(response), "Created");
		});

		it("should add a POST route and match the request with a JSON body", async () => {
			server.post(
				{ url: "/submit", body: { key: "value" } },
				{ status: 201, body: "Created" },
			);

			const request = createRequest({
				method: "POST",
				url: `${BASE_URL}/submit`,
				body: { key: "value" },
			});

			const response = await server.receive(request);
			assert.strictEqual(response.status, 201);
			assert.strictEqual(response.statusText, "Created");
			assert.strictEqual(await getResponseBody(response), "Created");
		});

		it("should add a POST route and match the request with FormData", async () => {
			const formData = new FormData();
			formData.append("key", "value");

			server.post(
				{ url: "/submit", body: formData },
				{ status: 201, body: "Created" },
			);

			const request = createRequest({
				method: "POST",
				url: `${BASE_URL}/submit`,
				body: formData,
			});

			const response = await server.receive(request);
			assert.strictEqual(response.status, 201);
			assert.strictEqual(response.statusText, "Created");
			assert.strictEqual(await getResponseBody(response), "Created");
		});

		it("should not match the request with a partial JSON body", async () => {
			server.post(
				{ url: "/submit", body: { key: "value", extra: "data" } },
				{ status: 201, body: "Created" },
			);

			const request = createRequest({
				method: "POST",
				url: `${BASE_URL}/submit`,
				body: { key: "value" },
			});

			const response = await server.receive(request);
			assert.strictEqual(response, undefined);
		});

		it("should match the request when request has more JSON keys than expected", async () => {
			server.post(
				{ url: "/submit", body: { key: "value" } },
				{ status: 201, body: "Created" },
			);

			const request = createRequest({
				method: "POST",
				url: `${BASE_URL}/submit`,
				body: { key: "value", extra: "data" },
			});

			const response = await server.receive(request);
			assert.strictEqual(response.status, 201);
			assert.strictEqual(response.statusText, "Created");
			assert.strictEqual(await getResponseBody(response), "Created");
		});

		it("should match the request when request has more FormData values than expected", async () => {
			const formData = new FormData();
			formData.append("key", "value");

			server.post(
				{ url: "/submit", body: formData },
				{ status: 201, body: "Created" },
			);

			const receivedFormData = new FormData();
			receivedFormData.append("key", "value");
			receivedFormData.append("extra", "data");

			const request = createRequest({
				method: "POST",
				url: `${BASE_URL}/submit`,
				body: receivedFormData,
			});

			const response = await server.receive(request);
			assert.strictEqual(response.status, 201);
			assert.strictEqual(response.statusText, "Created");
			assert.strictEqual(await getResponseBody(response), "Created");
		});

		it("should not match the request if body does not match", async () => {
			server.post(
				{ url: "/submit", body: { key: "value" } },
				{ status: 201, body: "Created" },
			);

			const request = createRequest({
				method: "POST",
				url: `${BASE_URL}/submit`,
				body: { key: "different" },
			});

			const response = await server.receive(request);
			assert.strictEqual(response, undefined);
		});
		
		it("should match the request when the body is an ArrayBuffer", async () => {
			
			const buffer = new TextEncoder().encode("Created").buffer;
			
			server.post(
				{ url: "/submit", body: buffer },
				{ status: 201, body: "Created" },
			);

			const request = createRequest({
				method: "POST",
				url: `${BASE_URL}/submit`,
				body: new TextEncoder().encode("Created").buffer,
			});

			const response = await server.receive(request);
			assert.strictEqual(response.status, 201);
			assert.strictEqual(response.statusText, "Created");
			assert.strictEqual(await getResponseBody(response), "Created");
		});
		
		it("should not match the request when a different ArrayBuffer is used", async () => {
			const buffer = new TextEncoder().encode("Created").buffer;
			const differentBuffer = new TextEncoder().encode("Different").buffer;

			server.post(
				{ url: "/submit", body: buffer },
				{ status: 201, body: "Created" },
			);

			const request = createRequest({
				method: "POST",
				url: `${BASE_URL}/submit`,
				headers: {
					"content-type": "application/octet-stream"
				},
				body: differentBuffer,
			});

			const response = await server.receive(request);
			assert.strictEqual(response, undefined);
		});
	});

	describe("called()", () => {
		it("should return true when a route has been called", async () => {
			server.get("/test", { status: 200, body: "OK" });
			const request = createRequest({
				method: "GET",
				url: `${BASE_URL}/test`,
			});

			await server.receive(request);
			assert.strictEqual(server.called("/test"), true);
		});

		it("should return false when a route has not been called", () => {
			server.get("/test", { status: 200, body: "OK" });
			assert.strictEqual(server.called("/test"), false);
		});

		it("should return false when a GET route is called with POST", async () => {
			server.get("/test", { status: 200, body: "OK" });
			const request = createRequest({
				method: "POST",
				url: `${BASE_URL}/test`,
			});

			await server.receive(request);
			assert.strictEqual(server.called("/test"), false);
		});
	});

	describe("allRoutesCalled()", () => {
		it("should return true when all routes have been called", async () => {
			server.get("/test", { status: 200, body: "OK" });
			const request = createRequest({
				method: "GET",
				url: `${BASE_URL}/test`,
			});

			await server.receive(request);
			assert.strictEqual(server.allRoutesCalled(), true);
		});

		it("should return false when all routes have not been called", () => {
			server.get("/test", { status: 200, body: "OK" });
			assert.strictEqual(server.allRoutesCalled(), false);
		});

		it("should return false when one route is called and one is not", async () => {
			server.get("/test", { status: 200, body: "OK" });
			server.get("/test2", { status: 200, body: "OK" });
			const request = createRequest({
				method: "GET",
				url: `${BASE_URL}/test`,
			});

			await server.receive(request);
			assert.strictEqual(server.allRoutesCalled(), false);
		});
	});

	describe("assertAllRoutesCalled()", () => {
		it("should throw an error if a route is not matched", () => {
			server.get("/test", { status: 200, body: "OK" });

			assert.throws(() => {
				server.assertAllRoutesCalled();
			}, /Expected all routes to be called/u);
		});

		it("should not throw an error if all routes are matched", async () => {
			server.get("/test", { status: 200, body: "OK" });
			const request = createRequest({
				method: "GET",
				url: `${BASE_URL}/test`,
			});

			await server.receive(request);
			server.assertAllRoutesCalled();
		});
	});

	describe("Input validation", () => {
		it("should throw an error if method is missing", () => {
			assert.throws(
				() => {
					server.route({ url: "/test" }, { status: 200, body: "OK" });
				},
				/Request pattern must include a method/u,
			);
		});

		it("should throw an error if url is empty", () => {
			assert.throws(
				() => {
					server.route({ method: "GET", url: "" }, { status: 200, body: "OK" });
				},
				/Request pattern must include a URL/u,
			);
		});

		it("should throw an error if method is empty", () => {
			assert.throws(
				() => {
					server.route({ method: "", url: BASE_URL }, { status: 200, body: "OK" });
				},
				/Request pattern must include a method/u,
			);
		});

		it("should throw an error if method is not a string", () => {
			assert.throws(
				() => {
					server.route({ method: 303, url: BASE_URL }, { status: 200, body: "OK" });
				},
				/Request pattern method must be a string/u,
			);
		});

		it("should throw an error if URL is not a string", () => {
			assert.throws(
				() => {
					server.route({ method: "GET", url: 303 }, { status: 200, body: "OK" });
				},
				/Request pattern URL must be a string/u,
			);
		});

		it("should throw an error if headers is not an object", () => {
			assert.throws(
				() => {
					server.route({ method: "GET", url: BASE_URL, headers: 808 }, { status: 200, body: "OK" });
				},
				/Request pattern headers must be an object/u,
			);
		});

		it("should throw an error if body is not a string, object, or FormData", () => {
			assert.throws(
				() => {
					server.route({ method: "GET", url: BASE_URL, body: 303 }, { status: 200, body: "OK" });
				},
				/Request pattern body must be a string, object, or FormData/u,
			);
		});
		
		verbs.forEach(verb => {
			
			const method = verb.toLowerCase();
			
			it(`should throw an error when ${method}() is called with a request pattern method`, () => {
				assert.throws(() => {
					server[method]({ method: "POST", url: "/test" }, { status: 200, body: "OK" }, "GET");
				}, /Request pattern must not include a method/u);
			});
			
			it(`should throw an error when ${method}() is called with a response pattern without a status`, () => {
				assert.throws(() => {
					server[method]({ url: "/test" }, {});
				}, /Response pattern must include a status/u);
			});
			
			it(`should throw an error when ${method}() is called with a response pattern with an invalid status`, () => {
				assert.throws(() => {
					server[method]({ url: "/test" }, { status: "foo" });
				}, /Response pattern status must be a number/u);
			});
			
			it(`should throw an error when ${method}() is called with a response pattern with a boolean body`, () => {
				assert.throws(() => {
					server[method]({ url: "/test" }, { status: 200, body: true });
				}, /Response pattern body must be a string, object, ArrayBuffer/u);
			});
			
			it(`should throw an error when ${method}() is called with a response pattern with an invalid numeric status`, () => {
				assert.throws(() => {
					server[method]({ url: "/test" }, { status: 6000 });
				}, /Response pattern status 6000 is not a valid HTTP status code/u);
			});
			
		});
		
	});
});
