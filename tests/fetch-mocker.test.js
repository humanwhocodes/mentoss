/**
 * @fileoverview Tests for the FetchMocker class.
 * @autor Nicholas C. Zakas
 */

/* global AbortSignal, queueMicrotask, AbortController */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import assert from "node:assert";
import { MockServer } from "../src/mock-server.js";
import { FetchMocker } from "../src/fetch-mocker.js";

//-----------------------------------------------------------------------------
// Data
//-----------------------------------------------------------------------------

const BASE_URL = "https://api.example.com";
const ALT_BASE_URL = "https://api.example.org";

const NO_ROUTE_MATCHED_NO_PARTIAL_MATCHES = `
No route matched for GET https://api.example.com/goodbye.

Full Request:

GET https://api.example.com/goodbye

Partial matches:

No partial matches found.`.trim();

const NO_ROUTE_MATCHED_TWO_PARTIAL_MATCHES = `
No route matched for GET https://api.example.com/user/settings.

Full Request:

GET https://api.example.com/user/settings

Partial matches:

🚧 [Route: GET https://api.example.com/user/:id -> 200]:
  ✅ URL matches.
  ✅ Method matches: GET.
  ❌ URL parameters do not match. Expected id=1 but received id=settings.

🚧 [Route: GET https://api.example.com/user/settings -> 200]:
  ✅ URL matches.
  ✅ Method matches: GET.
  ❌ Query string does not match. Expected page=profile but received page=undefined.`.trim();

const NO_ROUTE_MATCHED_HEADERS_BODY = `
No route matched for POST https://api.example.com/user/settings.

Full Request:

POST https://api.example.com/user/settings
Authorization: Bearer XYZ
Content-Type: application/json

{"name":"value"}

Partial matches:

🚧 [Route: POST https://api.example.com/user/:id -> 200]:
  ✅ URL matches.
  ✅ Method matches: POST.
  ❌ URL parameters do not match. Expected id=1 but received id=settings.

🚧 [Route: POST https://api.example.com/user/settings -> 200]:
  ✅ URL matches.
  ✅ Method matches: POST.
  ❌ Headers do not match. Expected authorization=Bearer ABC but received authorization=Bearer XYZ.`.trim();

const PREFLIGHT_FAILED = `
Access to fetch at 'https://api.example.com/hello' from origin 'https://api.example.org' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: It does not have HTTP ok status.
`.trim();

//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------

describe("FetchMocker", () => {
	it("should return a matched response for a GET request", async () => {
		const server = new MockServer(BASE_URL);
		const fetchMocker = new FetchMocker({
			servers: [server],
		});

		server.get("/hello", {
			status: 200,
			body: "Hello world!",
		});

		const { fetch } = fetchMocker;
		const response = await fetch(BASE_URL + "/hello");
		const body = await response.text();
		assert.strictEqual(response.status, 200);
		assert.strictEqual(response.statusText, "OK");
		assert.deepStrictEqual(body, "Hello world!");
	});

	it("should return a matched response for a GET request with a query string", async () => {
		const server = new MockServer(BASE_URL);
		const fetchMocker = new FetchMocker({
			servers: [server],
		});

		server.get("/hello", {
			status: 200,
			body: "Hello world!",
		});

		const response = await fetchMocker.fetch(
			BASE_URL + "/hello?name=world",
		);
		const body = await response.text();
		assert.strictEqual(response.status, 200);
		assert.strictEqual(response.statusText, "OK");
		assert.deepStrictEqual(body, "Hello world!");
	});

	it("should return a matched response for a GET request with a URL pattern", async () => {
		const server = new MockServer(BASE_URL);
		const fetchMocker = new FetchMocker({
			servers: [server],
		});

		server.get("/hello/:name", {
			status: 200,
			body: "Hello, world!",
		});

		const response = await fetchMocker.fetch(BASE_URL + "/hello/world");
		const body = await response.text();
		assert.strictEqual(response.status, 200);
		assert.strictEqual(response.statusText, "OK");
		assert.deepStrictEqual(body, "Hello, world!");
	});

	it("should return a matched response for a GET request when the first argument is a URL instance", async () => {
		const server = new MockServer(BASE_URL);
		const fetchMocker = new FetchMocker({
			servers: [server],
		});

		server.get("/hello", {
			status: 200,
			body: "Hello world!",
		});

		const response = await fetchMocker.fetch(new URL("/hello", BASE_URL));
		const body = await response.text();
		assert.strictEqual(response.status, 200);
		assert.strictEqual(response.statusText, "OK");
		assert.deepStrictEqual(body, "Hello world!");
	});

	it("should return a matched response for a POST request", async () => {
		const server = new MockServer(BASE_URL);
		const fetchMocker = new FetchMocker({
			servers: [server],
		});

		server.post("/hello", {
			status: 200,
			body: "Hello world!",
		});

		const response = await fetchMocker.fetch(BASE_URL + "/hello", {
			method: "POST",
		});
		const body = await response.text();
		assert.strictEqual(response.status, 200);
		assert.strictEqual(response.statusText, "OK");
		assert.deepStrictEqual(body, "Hello world!");
	});

	it("should throw an error when there is no route match and no partial matches", async () => {
		const server = new MockServer(BASE_URL);
		const fetchMocker = new FetchMocker({
			servers: [server],
		});

		server.get("/hello", {
			status: 200,
			body: "Hello world!",
		});

		await assert.rejects(fetchMocker.fetch(BASE_URL + "/goodbye"), {
			name: "Error",
			message: NO_ROUTE_MATCHED_NO_PARTIAL_MATCHES,
		});
	});

	it("should throw an error when there is no route match and two partial matches", async () => {
		const server = new MockServer(BASE_URL);
		const fetchMocker = new FetchMocker({
			servers: [server],
		});

		server.get(
			{
				url: "/user/:id",
				params: { id: "1" },
			},
			200,
		);

		server.get(
			{
				url: "/user/settings",
				query: { page: "profile" },
			},
			200,
		);

		await assert.rejects(fetchMocker.fetch(BASE_URL + "/user/settings"), {
			name: "Error",
			message: NO_ROUTE_MATCHED_TWO_PARTIAL_MATCHES,
		});
	});

	it("should throw an error when there is no route match and two partial matches with headers and body", async () => {
		const server = new MockServer(BASE_URL);

		const fetchMocker = new FetchMocker({
			servers: [server],
		});

		server.post(
			{
				url: "/user/:id",
				params: { id: "1" },
			},
			200,
		);

		server.post(
			{
				url: "/user/settings",
				headers: { Authorization: "Bearer ABC" },
			},
			200,
		);

		await assert.rejects(
			fetchMocker.fetch(BASE_URL + "/user/settings", {
				method: "POST",
				headers: {
					Authorization: "Bearer XYZ",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ name: "value" }),
			}),
			{
				name: "Error",
				message: NO_ROUTE_MATCHED_HEADERS_BODY,
			},
		);
	});

	it("should throw when base URL is empty", () => {
		const server = new MockServer(BASE_URL);

		assert.throws(
			() => {
				new FetchMocker({
					servers: [server],
					baseUrl: "",
				});
			},
			{ message: "Base URL cannot be an empty string." },
		);
	});

	it("should throw when base URL is not a string or URL", () => {
		const server = new MockServer(BASE_URL);

		assert.throws(
			() => {
				new FetchMocker({
					servers: [server],
					baseUrl: 303,
				});
			},
			{ message: "Base URL must be a string or URL object." },
		);
	});

	describe("called()", () => {
		it("should return true when a request has been matched by a server", async () => {
			const server = new MockServer(BASE_URL);
			const fetchMocker = new FetchMocker({
				servers: [server],
			});

			server.get("/hello", {
				status: 200,
				body: "Hello world!",
			});

			await fetchMocker.fetch(BASE_URL + "/hello");
			assert.ok(fetchMocker.called(BASE_URL + "/hello"));
		});

		it("should return true when a request has been matched by a server with a URL pattern", async () => {
			const server = new MockServer(BASE_URL);
			const fetchMocker = new FetchMocker({
				servers: [server],
			});

			server.get("/hello/:name", {
				status: 200,
				body: "Hello, world!",
			});

			await fetchMocker.fetch(BASE_URL + "/hello/world");
			assert.ok(fetchMocker.called(BASE_URL + "/hello/:name"));
		});

		it("should return false when a request has not been matched by a server", async () => {
			const server = new MockServer(BASE_URL);
			const fetchMocker = new FetchMocker({
				servers: [server],
			});

			server.get("/hello", {
				status: 200,
				body: "Hello world!",
			});

			await fetchMocker.fetch(BASE_URL + "/hello");
			assert.ok(!fetchMocker.called(BASE_URL + "/goodbye"));
		});

		it("should return true when a request object has been matched by a server", async () => {
			const server = new MockServer(BASE_URL);
			const fetchMocker = new FetchMocker({
				servers: [server],
			});

			server.get("/hello", {
				status: 200,
				body: "Hello world!",
			});

			await fetchMocker.fetch(BASE_URL + "/hello");
			assert.ok(
				fetchMocker.called({
					method: "GET",
					url: BASE_URL + "/hello",
				}),
			);
		});
	});

	describe("allRoutesCalled()", () => {
		const ALT_BASE_URL = "https://api.example.org";

		it("should return true when all routes on all servers have been called", async () => {
			const server1 = new MockServer(BASE_URL);
			const server2 = new MockServer(ALT_BASE_URL);
			const fetchMocker = new FetchMocker({
				servers: [server1, server2],
			});

			server1.get("/hello", {
				status: 200,
				body: "Hello world!",
			});

			server2.get("/goodbye", {
				status: 200,
				body: "Goodbye world!",
			});

			await fetchMocker.fetch(BASE_URL + "/hello");
			await fetchMocker.fetch(ALT_BASE_URL + "/goodbye");
			assert.ok(fetchMocker.allRoutesCalled());
		});

		it("should return false when not all routes on all servers have been called", async () => {
			const server1 = new MockServer(BASE_URL);
			const server2 = new MockServer(ALT_BASE_URL);
			const fetchMocker = new FetchMocker({
				servers: [server1, server2],
			});

			server1.get("/hello", {
				status: 200,
				body: "Hello world!",
			});

			server2.get("/goodbye", {
				status: 200,
				body: "Goodbye world!",
			});

			await fetchMocker.fetch(BASE_URL + "/hello");
			assert.ok(!fetchMocker.allRoutesCalled());
		});
	});

	describe("Relative URLs", () => {
		it("should throw an error when using a relative URL and no baseUrl", async () => {
			const server = new MockServer(BASE_URL);
			const fetchMocker = new FetchMocker({ servers: [server] });

			await assert.rejects(fetchMocker.fetch("/hello"), {
				name: "TypeError",
				message: "Failed to parse URL from /hello",
			});
		});

		it("should return 200 when using a relative URL and a baseUrl", async () => {
			const server = new MockServer(BASE_URL);
			const fetchMocker = new FetchMocker({
				servers: [server],
				baseUrl: BASE_URL,
			});

			server.get("/hello", 200);

			const response = await fetchMocker.fetch("/hello");
			assert.strictEqual(response.status, 200);
		});

		it("should return 200 when using a relative URL and a baseUrl URL()", async () => {
			const server = new MockServer(BASE_URL);
			const fetchMocker = new FetchMocker({
				servers: [server],
				baseUrl: new URL(BASE_URL),
			});

			server.get("/hello", 200);

			const response = await fetchMocker.fetch("/hello");
			assert.strictEqual(response.status, 200);
		});
	});

	describe("CORS", () => {
		describe("Simple Requests", () => {
			it("should throw an error when the server does not return an access-control-allow-origin header", async () => {
				const server = new MockServer(BASE_URL);
				const fetchMocker = new FetchMocker({
					servers: [server],
					baseUrl: ALT_BASE_URL,
				});
				const url = new URL("/hello", BASE_URL);
				const origin = new URL(ALT_BASE_URL).origin;

				server.get("/hello", 200);

				await assert.rejects(fetchMocker.fetch(url), {
					name: "CorsError",
					message: `Access to fetch at '${url.href}' from origin '${origin}' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.`,
				});
			});

			it("should throw an error when the server returns an access-control-allow-origin header that doesn't match the origin", async () => {
				const server = new MockServer(BASE_URL);
				const fetchMocker = new FetchMocker({
					servers: [server],
					baseUrl: ALT_BASE_URL,
				});
				const url = new URL("/hello", BASE_URL);
				const origin = new URL(ALT_BASE_URL).origin;

				server.get("/hello", {
					status: 200,
					headers: {
						"Access-Control-Allow-Origin": "https://api.example.com",
					},
				});

				await assert.rejects(fetchMocker.fetch(url), {
					name: "CorsError",
					message: `Access to fetch at '${url.href}' from origin '${origin}' has been blocked by CORS policy: The 'Access-Control-Allow-Origin' header has a value 'https://api.example.com' that is not equal to the supplied origin.`,
				});
			});

			it("should not throw an error when the server returns an access-control-allow-origin header that matches the origin", async () => {
				const server = new MockServer(BASE_URL);
				const fetchMocker = new FetchMocker({
					servers: [server],
					baseUrl: ALT_BASE_URL,
				});
				const url = new URL("/hello", BASE_URL);
				const origin = new URL(ALT_BASE_URL).origin;

				server.get("/hello", {
					status: 200,
					headers: { "Access-Control-Allow-Origin": origin },
				});

				const response = await fetchMocker.fetch(url);
				assert.strictEqual(response.status, 200);
			});

			it("should not throw an error when making a call to the same origin", async () => {
				const server = new MockServer(BASE_URL);
				const fetchMocker = new FetchMocker({
					servers: [server],
					baseUrl: BASE_URL,
				});
				const url = new URL("/hello", BASE_URL);

				server.get("/hello", 200);

				const response = await fetchMocker.fetch(url);
				assert.strictEqual(response.status, 200);
			});

			it("should throw an error when a request is made with credentials:include", async () => {
				const server = new MockServer(BASE_URL);
				const fetchMocker = new FetchMocker({
					servers: [server],
					baseUrl: ALT_BASE_URL,
				});
				const url = new URL("/hello", BASE_URL);
				const origin = new URL(ALT_BASE_URL).origin;

				server.get("/hello", {
					status: 200,
					headers: { "Access-Control-Allow-Origin": origin },
				});

				await assert.rejects(
					fetchMocker.fetch(url, {
						credentials: "include",
					}),
					/Credentialed requests are not yet supported/i,
				);
			});
		});

		describe("Preflighted Requests", () => {
			describe("Access-Control-Allow-Headers", () => {
				it("should throw an error when the Authorization header is used", async () => {
					const server = new MockServer(BASE_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", BASE_URL);
					const origin = new URL(ALT_BASE_URL).origin;

					server.get("/hello", 200);
					server.options("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-Origin": origin,
						},
					});

					await assert.rejects(
						fetchMocker.fetch(url, {
							method: "POST",
							headers: { Authorization: "Bearer 1234" },
						}),
						/Header Authorization is not allowed/i,
					);
				});

				it("should throw an error when the Authorization header is used with Access-Control-Requested-Headers=*", async () => {
					const server = new MockServer(BASE_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", BASE_URL);
					const origin = new URL(ALT_BASE_URL).origin;

					server.get("/hello", 200);
					server.options("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-Origin": origin,
							"Access-Control-Allow-Headers": "*",
						},
					});

					await assert.rejects(
						fetchMocker.fetch(url, {
							method: "POST",
							headers: { Authorization: "Bearer 1234" },
						}),
						/Header Authorization is not allowed/i,
					);
				});

				it("should succeed when the Authorization header is used with Access-Control-Requested-Headers=Authorization", async () => {
					const server = new MockServer(BASE_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", BASE_URL);
					const origin = new URL(ALT_BASE_URL).origin;

					server.get("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-Origin": origin,
						},
					});

					server.options("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-Origin": origin,
							"Access-Control-Allow-Headers": "Authorization",
						},
					});

					const response = await fetchMocker.fetch(url, {
						method: "GET",
						headers: { Authorization: "Bearer 1234" },
					});

					assert.strictEqual(response.status, 200);
				});

				it("should succeed when the Foo header is used with Access-Control-Requested-Headers=Foo", async () => {
					const server = new MockServer(BASE_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", BASE_URL);
					const origin = new URL(ALT_BASE_URL).origin;

					server.get("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-Origin": origin,
						},
					});

					server.options("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-Origin": origin,
							"Access-Control-Allow-Headers": "Foo",
						},
					});

					const response = await fetchMocker.fetch(url, {
						method: "GET",
						headers: { Foo: "Bar" },
					});

					assert.strictEqual(response.status, 200);
				});

				it("should succeed when the Foo header is used with Access-Control-Request-Headers=*", async () => {
					const server = new MockServer(BASE_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", BASE_URL);
					const origin = new URL(ALT_BASE_URL).origin;

					server.get("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-Origin": origin,
						},
					});

					server.options("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-Origin": origin,
							"Access-Control-Allow-Headers": "*",
						},
					});

					const response = await fetchMocker.fetch(url, {
						method: "GET",
						headers: { Foo: "Bar" },
					});

					assert.strictEqual(response.status, 200);
				});

				it("should throw when the preflight request fails", async () => {
					const server = new MockServer(BASE_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", BASE_URL);
					const origin = new URL(ALT_BASE_URL).origin;

					server.get("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-Origin": origin,
						},
					});

					server.options("/hello", {
						status: 500,
						headers: {
							"Access-Control-Allow-Origin": origin,
							"Access-Control-Allow-Headers": "*",
						},
					});

					await assert.rejects(
						async () => {
							await fetchMocker.fetch(url, {
								method: "GET",
								headers: { Foo: "Bar" },
							});
						},
						{ message: PREFLIGHT_FAILED },
					);
				});
			});

			describe("Access-Control-Allow-Methods", () => {
				it("should throw an error when PATCH is used without Access-Control-Allow-Methods", async () => {
					const server = new MockServer(BASE_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", BASE_URL);
					const origin = new URL(ALT_BASE_URL).origin;

					server.get("/hello", 200);
					server.options("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-Origin": origin,
						},
					});

					await assert.rejects(
						fetchMocker.fetch(url, {
							method: "PATCH",
						}),
						/Method PATCH is not allowed/,
					);
				});

				it("should throw an error when PATCH is used with Access-Control-Allow-Methods=DELETE", async () => {
					const server = new MockServer(BASE_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", BASE_URL);
					const origin = new URL(ALT_BASE_URL).origin;

					server.get("/hello", 200);
					server.options("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-Origin": origin,
							"Access-Control-Allow-Methods": "DELETE",
						},
					});

					await assert.rejects(
						fetchMocker.fetch(url, {
							method: "PATCH",
						}),
						/Method PATCH is not allowed/,
					);
				});

				it("should succeed when PATCH is used with Access-Control-Allow-Methods=PATCH", async () => {
					const server = new MockServer(BASE_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", BASE_URL);
					const origin = new URL(ALT_BASE_URL).origin;

					server.patch("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-Origin": origin,
						},
					});

					server.options("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-Origin": origin,
							"Access-Control-Allow-Methods": "PATCH",
						},
					});

					const response = await fetchMocker.fetch(url, {
						method: "PATCH",
					});

					assert.strictEqual(response.status, 200);
				});

				it("should succeed when PATCH is used with Access-Control-Allow-Methods=*", async () => {
					const server = new MockServer(BASE_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", BASE_URL);
					const origin = new URL(ALT_BASE_URL).origin;

					server.patch("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-Origin": origin,
						},
					});

					server.options("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-Origin": origin,
							"Access-Control-Allow-Methods": "*",
						},
					});

					const response = await fetchMocker.fetch(url, {
						method: "PATCH",
					});

					assert.strictEqual(response.status, 200);
				});

				it("should succeed when GET is used without Access-Control-Allow-Methods", async () => {
					const server = new MockServer(BASE_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", BASE_URL);
					const origin = new URL(ALT_BASE_URL).origin;

					server.get("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-Origin": origin,
						},
					});

					server.options("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-Origin": origin,
						},
					});

					const response = await fetchMocker.fetch(url, {
						method: "GET",
					});

					assert.strictEqual(response.status, 200);
				});
			});

			describe("Access-Control-Allow-Origin", () => {
				it("should throw an error when OPTIONS does not return an Access-Control-Allow-Origin header", async () => {
					const server = new MockServer(BASE_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", BASE_URL);
					const origin = new URL(ALT_BASE_URL).origin;

					server.get("/hello", 200);
					server.options("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-HEADERS": "Custom",
						},
					});

					await assert.rejects(
						fetchMocker.fetch(url, { headers: { Custom: "Foo" } }),
						{
							name: "CorsError",
							message: `Access to fetch at '${url.href}' from origin '${origin}' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.`,
						},
					);
				});

				it("should throw an error when OPTIONS returns an Access-Control-Allow-Origin header that doesn't match the origin", async () => {
					const server = new MockServer(BASE_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", BASE_URL);
					const origin = new URL(ALT_BASE_URL).origin;

					server.get("/hello", 200);
					server.options("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-Origin":
								"https://api.example.com",
							"Access-Control-Allow-HEADERS": "Custom",
						},
					});

					await assert.rejects(
						fetchMocker.fetch(url, { headers: { Custom: "Foo" } }),
						{
							name: "CorsError",
							message: `Access to fetch at '${url.href}' from origin '${origin}' has been blocked by CORS policy: The 'Access-Control-Allow-Origin' header has a value 'https://api.example.com' that is not equal to the supplied origin.`,
						},
					);
				});

				it("should succeed when the server returns an Access-Control-Allow-Origin header that matches the origin", async () => {
					const server = new MockServer(BASE_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", BASE_URL);
					const origin = new URL(ALT_BASE_URL).origin;

					server.get("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-Origin": origin,
						},
					});
					server.options("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-Origin": origin,
						},
					});

					const response = await fetchMocker.fetch(url);
					assert.strictEqual(response.status, 200);
				});
			});

		});
		
		describe("Access-Control-Expose-Headers", () => {
			
			let server, fetchMocker, url, origin;

			beforeEach(() => {
				server = new MockServer(BASE_URL);
				fetchMocker = new FetchMocker({
					servers: [server],
					baseUrl: ALT_BASE_URL,
				});
				url = new URL("/hello", BASE_URL);
				origin = new URL(ALT_BASE_URL).origin;
			});
			
			it("should not allow the response to contain X-Mentoss header when not exposed with preflight", async () => {
				
				server.get("/hello", {
					status: 200,
					headers: {
						"Access-Control-Allow-Origin": origin,
						"Access-Control-Expose-Headers": "X-Mentoss",
						"X-Mentoss": "Bar"
					},
				});
				
				server.options("/hello", {
					status: 200,
					headers: {
						"Access-Control-Allow-Origin": origin,
						"Access-Control-Allow-Headers": "X-Mentoss",
					},
				});
				
				const response = await fetchMocker.fetch(url, {
					headers: {
						"X-Mentoss": "Foo"
					}
				});
			
				assert.strictEqual(response.headers.get("X-Mentoss"), "Bar");
			});
			
			it("should not allow the response to contain Set-Cookie header when not exposed", async () => {
				
				server.get("/hello", {
					status: 200,
					headers: {
						"Access-Control-Allow-Origin": origin,
						"Set-Cookie": "Foo"
					},
				});
				
				const response = await fetchMocker.fetch(url);
				
				assert.strictEqual(response.headers.get("Set-Cookie"), null);
			});
			
			it("should not allow the response to contain Set-Cookie even when exposed", async () => {
				
				server.get("/hello", {
					status: 200,
					headers: {
						"Access-Control-Allow-Origin": origin,
						"Access-Control-Expose-Headers": "Set-Cookie",
						"Set-Cookie": "Foo"
					},
				});
				
				const response = await fetchMocker.fetch(url);
				
				assert.strictEqual(response.headers.get("Set-Cookie"), null);
			});

		});
	});

	describe("mockGlobal", () => {
		it("should replace global fetch", () => {
			const server = new MockServer(BASE_URL);
			const fetchMocker = new FetchMocker({
				servers: [server],
			});

			const originalFetch = globalThis.fetch;

			try {
				fetchMocker.mockGlobal();

				assert.strictEqual(globalThis.fetch, fetchMocker.fetch);
			} finally {
				globalThis.fetch = originalFetch;
			}
		});
	});

	describe("unmockGlobal", () => {
		it("should restore global fetch", () => {
			const server = new MockServer(BASE_URL);
			const fetchMocker = new FetchMocker({
				servers: [server],
			});

			const originalFetch = globalThis.fetch;

			try {
				fetchMocker.mockGlobal();
				fetchMocker.unmockGlobal();

				assert.strictEqual(globalThis.fetch, originalFetch);
			} finally {
				globalThis.fetch = originalFetch;
			}
		});
	});
	
	describe("Passing an AbortSignal", () => {
		
		it("should throw an abort error when passed an aborted signal", async () => {
			const server = new MockServer(BASE_URL);
			const fetchMocker = new FetchMocker({
				servers: [server],
			});

			server.get("/hello", {
				status: 200,
				body: "Hello world!",
			});

			await assert.rejects(
				fetchMocker.fetch(BASE_URL + "/hello", {
					signal: AbortSignal.abort("Foo"),
				}),
				/Foo/,
			);
		});
		
		it("should throw an abort error when the request is aborted", async () => {
			const server = new MockServer(BASE_URL);
			const fetchMocker = new FetchMocker({
				servers: [server],
			});

			server.get("/hello", {
				status: 200,
				body: "Hello world!",
				delay: 100
			});

			const controller = new AbortController();

			queueMicrotask(() => controller.abort());
			
			await assert.rejects(
				fetchMocker.fetch(BASE_URL + "/hello", {
					signal: controller.signal,
				}),
				/aborted/,
			);
		});
		
	});
});
