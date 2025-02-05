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
import { CookieCredentials } from "../src/cookie-credentials.js";

//-----------------------------------------------------------------------------
// Data
//-----------------------------------------------------------------------------

const BASE_DOMAIN = "example.com";
const BASE_URL = "https://example.com";
const API_DOMAIN = "api.example.com";
const API_URL = "https://api.example.com";
const SUB_URL = "https://api.example.com";
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
	describe("constructor", () => {
		it("should throw an error if no servers are provided", () => {
			assert.throws(
				() => {
					new FetchMocker({});
				},
				{
					name: "TypeError",
					message: "At least one server is required.",
				},
			);
		});

		it("should throw an error if baseUrl is not a string or URL", () => {
			assert.throws(
				() => {
					new FetchMocker({
						servers: [new MockServer(API_URL)],
						baseUrl: 123,
					});
				},
				{
					name: "TypeError",
					message: "Base URL must be a string or URL object.",
				},
			);
		});

		it("should throw an error if baseUrl is an empty string", () => {
			assert.throws(
				() => {
					new FetchMocker({
						servers: [new MockServer(API_URL)],
						baseUrl: "",
					});
				},
				{
					name: "TypeError",
					message: "Base URL cannot be an empty string.",
				},
			);
		});

		it("should throw an error if credentials are provided and baseUrl is not set", () => {
			assert.throws(
				() => {
					new FetchMocker({
						servers: [new MockServer(API_URL)],
						credentials: [new CookieCredentials(BASE_URL)],
					});
				},
				{
					name: "TypeError",
					message: "Credentials can only be used with a base URL.",
				},
			);
		});
	});

	it("should return a matched response for a GET request", async () => {
		const server = new MockServer(API_URL);
		const fetchMocker = new FetchMocker({
			servers: [server],
		});

		server.get("/hello", {
			status: 200,
			body: "Hello world!",
		});

		const { fetch } = fetchMocker;
		const response = await fetch(API_URL + "/hello");
		const body = await response.text();
		assert.strictEqual(response.status, 200);
		assert.strictEqual(response.statusText, "OK");
		assert.deepStrictEqual(body, "Hello world!");
	});

	it("should return a matched response for a GET request with a query string", async () => {
		const server = new MockServer(API_URL);
		const fetchMocker = new FetchMocker({
			servers: [server],
		});

		server.get("/hello", {
			status: 200,
			body: "Hello world!",
		});

		const response = await fetchMocker.fetch(API_URL + "/hello?name=world");
		const body = await response.text();
		assert.strictEqual(response.status, 200);
		assert.strictEqual(response.statusText, "OK");
		assert.deepStrictEqual(body, "Hello world!");
	});

	it("should return a matched response for a GET request with a URL pattern", async () => {
		const server = new MockServer(API_URL);
		const fetchMocker = new FetchMocker({
			servers: [server],
		});

		server.get("/hello/:name", {
			status: 200,
			body: "Hello, world!",
		});

		const response = await fetchMocker.fetch(API_URL + "/hello/world");
		const body = await response.text();
		assert.strictEqual(response.status, 200);
		assert.strictEqual(response.statusText, "OK");
		assert.deepStrictEqual(body, "Hello, world!");
	});

	it("should return a matched response for a GET request when the first argument is a URL instance", async () => {
		const server = new MockServer(API_URL);
		const fetchMocker = new FetchMocker({
			servers: [server],
		});

		server.get("/hello", {
			status: 200,
			body: "Hello world!",
		});

		const response = await fetchMocker.fetch(new URL("/hello", API_URL));
		const body = await response.text();
		assert.strictEqual(response.status, 200);
		assert.strictEqual(response.statusText, "OK");
		assert.deepStrictEqual(body, "Hello world!");
	});

	it("should return a matched response for a POST request", async () => {
		const server = new MockServer(API_URL);
		const fetchMocker = new FetchMocker({
			servers: [server],
		});

		server.post("/hello", {
			status: 200,
			body: "Hello world!",
		});

		const response = await fetchMocker.fetch(API_URL + "/hello", {
			method: "POST",
		});
		const body = await response.text();
		assert.strictEqual(response.status, 200);
		assert.strictEqual(response.statusText, "OK");
		assert.deepStrictEqual(body, "Hello world!");
	});

	it("should throw an error when there is no route match and no partial matches", async () => {
		const server = new MockServer(API_URL);
		const fetchMocker = new FetchMocker({
			servers: [server],
		});

		server.get("/hello", {
			status: 200,
			body: "Hello world!",
		});

		await assert.rejects(fetchMocker.fetch(API_URL + "/goodbye"), {
			name: "Error",
			message: NO_ROUTE_MATCHED_NO_PARTIAL_MATCHES,
		});
	});

	it("should throw an error when there is no route match and two partial matches", async () => {
		const server = new MockServer(API_URL);
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

		await assert.rejects(fetchMocker.fetch(API_URL + "/user/settings"), {
			name: "Error",
			message: NO_ROUTE_MATCHED_TWO_PARTIAL_MATCHES,
		});
	});

	it("should throw an error when there is no route match and two partial matches with headers and body", async () => {
		const server = new MockServer(API_URL);

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
			fetchMocker.fetch(API_URL + "/user/settings", {
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
		const server = new MockServer(API_URL);

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
		const server = new MockServer(API_URL);

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
			const server = new MockServer(API_URL);
			const fetchMocker = new FetchMocker({
				servers: [server],
			});

			server.get("/hello", {
				status: 200,
				body: "Hello world!",
			});

			await fetchMocker.fetch(API_URL + "/hello");
			assert.ok(fetchMocker.called(API_URL + "/hello"));
		});

		it("should return true when a request has been matched by a server with a URL pattern", async () => {
			const server = new MockServer(API_URL);
			const fetchMocker = new FetchMocker({
				servers: [server],
			});

			server.get("/hello/:name", {
				status: 200,
				body: "Hello, world!",
			});

			await fetchMocker.fetch(API_URL + "/hello/world");
			assert.ok(fetchMocker.called(API_URL + "/hello/:name"));
		});

		it("should return false when a request has not been matched by a server", async () => {
			const server = new MockServer(API_URL);
			const fetchMocker = new FetchMocker({
				servers: [server],
			});

			server.get("/hello", {
				status: 200,
				body: "Hello world!",
			});

			await fetchMocker.fetch(API_URL + "/hello");
			assert.ok(!fetchMocker.called(API_URL + "/goodbye"));
		});

		it("should return true when a request object has been matched by a server", async () => {
			const server = new MockServer(API_URL);
			const fetchMocker = new FetchMocker({
				servers: [server],
			});

			server.get("/hello", {
				status: 200,
				body: "Hello world!",
			});

			await fetchMocker.fetch(API_URL + "/hello");
			assert.ok(
				fetchMocker.called({
					method: "GET",
					url: API_URL + "/hello",
				}),
			);
		});
	});

	describe("allRoutesCalled()", () => {
		const ALT_BASE_URL = "https://api.example.org";

		it("should return true when all routes on all servers have been called", async () => {
			const server1 = new MockServer(API_URL);
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

			await fetchMocker.fetch(API_URL + "/hello");
			await fetchMocker.fetch(ALT_BASE_URL + "/goodbye");
			assert.ok(fetchMocker.allRoutesCalled());
		});

		it("should return false when not all routes on all servers have been called", async () => {
			const server1 = new MockServer(API_URL);
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

			await fetchMocker.fetch(API_URL + "/hello");
			assert.ok(!fetchMocker.allRoutesCalled());
		});
	});

	describe("uncalledRoutes", () => {
		it("should return all uncalled routes from all servers when none are called", async () => {
			const server1 = new MockServer(API_URL);
			const server2 = new MockServer(ALT_BASE_URL);
			const fetchMocker = new FetchMocker({
				servers: [server1, server2],
			});

			server1.get("/hello", {
				status: 200,
				body: "Hello world!",
			});

			server2.post("/goodbye", {
				status: 200,
				body: "Goodbye world!",
			});

			assert.deepStrictEqual(fetchMocker.uncalledRoutes, [
				`🚧 [Route: GET ${API_URL}/hello -> 200]`,
				`🚧 [Route: POST ${ALT_BASE_URL}/goodbye -> 200]`,
			]);
		});

		it("should return all uncalled routes from all servers when some are called", async () => {
			const server1 = new MockServer(API_URL);
			const server2 = new MockServer(ALT_BASE_URL);
			const fetchMocker = new FetchMocker({
				servers: [server1, server2],
			});

			server1.get("/hello", {
				status: 200,
				body: "Hello world!",
			});

			server2.post("/goodbye", {
				status: 200,
				body: "Goodbye world!",
			});

			await fetchMocker.fetch(API_URL + "/hello");

			assert.deepStrictEqual(fetchMocker.uncalledRoutes, [
				`🚧 [Route: POST ${ALT_BASE_URL}/goodbye -> 200]`,
			]);
		});

		it("should return an empty array when all routes are called", async () => {
			const server1 = new MockServer(API_URL);
			const server2 = new MockServer(ALT_BASE_URL);
			const fetchMocker = new FetchMocker({
				servers: [server1, server2],
			});

			server1.get("/hello", {
				status: 200,
				body: "Hello world!",
			});

			server2.post("/goodbye", {
				status: 200,
				body: "Goodbye world!",
			});

			await fetchMocker.fetch(API_URL + "/hello");
			await fetchMocker.fetch(ALT_BASE_URL + "/goodbye", {
				method: "POST",
			});

			assert.deepStrictEqual(fetchMocker.uncalledRoutes, []);
		});
	});

	describe("assertAllRoutesCalled()", () => {
		it("should not throw when all routes on all servers have been called", async () => {
			const server1 = new MockServer(API_URL);
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

			await fetchMocker.fetch(API_URL + "/hello");
			await fetchMocker.fetch(ALT_BASE_URL + "/goodbye");

			fetchMocker.assertAllRoutesCalled();
		});

		it("should throw when not all routes on all servers have been called", async () => {
			const server1 = new MockServer(API_URL);
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

			await fetchMocker.fetch(API_URL + "/hello");

			assert.throws(() => fetchMocker.assertAllRoutesCalled(), {
				message: `Not all routes were called. Uncalled routes:\n${fetchMocker.uncalledRoutes.join("\n")}`,
			});
		});
	});

	describe("Relative URLs", () => {
		it("should throw an error when using a relative URL and no baseUrl", async () => {
			const server = new MockServer(API_URL);
			const fetchMocker = new FetchMocker({ servers: [server] });

			await assert.rejects(
				fetchMocker.fetch("/hello"),
				/Failed [\w\W]+\/hello/iu,
			);
		});

		it("should return 200 when using a relative URL and a baseUrl", async () => {
			const server = new MockServer(API_URL);
			const fetchMocker = new FetchMocker({
				servers: [server],
				baseUrl: API_URL,
			});

			server.get("/hello", 200);

			const response = await fetchMocker.fetch("/hello");
			assert.strictEqual(response.status, 200);
		});

		it("should return 200 when using a relative URL and a baseUrl URL()", async () => {
			const server = new MockServer(API_URL);
			const fetchMocker = new FetchMocker({
				servers: [server],
				baseUrl: new URL(API_URL),
			});

			server.get("/hello", 200);

			const response = await fetchMocker.fetch("/hello");
			assert.strictEqual(response.status, 200);
		});

		describe("Cookies", () => {
			[undefined, "same-origin", "include"].forEach(credentials => {
				it(
					"should include cookie credentials when credentials=" +
						credentials,
					async () => {
						const server = new MockServer(API_URL);
						const cookies = new CookieCredentials(BASE_URL);
						const fetchMocker = new FetchMocker({
							servers: [server],
							credentials: [cookies],
							baseUrl: API_URL,
						});

						cookies.setCookie({
							name: "session",
							value: "123",
						});

						server.get(
							{
								url: "/hello",
								headers: {
									Cookie: "session=123",
								},
							},
							200,
						);

						const response = await fetchMocker.fetch("/hello", {
							credentials,
						});
						assert.strictEqual(response.status, 200);
					},
				);

				it(
					"should include cookie credenitials when credentials=" +
						credentials +
						" and credentials don't have domain set",
					async () => {
						const server = new MockServer(API_URL);
						const cookies = new CookieCredentials();
						const fetchMocker = new FetchMocker({
							servers: [server],
							credentials: [cookies],
							baseUrl: API_URL,
						});

						cookies.setCookie({
							name: "session",
							value: "123",
							domain: API_DOMAIN,
						});

						server.get(
							{
								url: "/hello",
								headers: {
									Cookie: "session=123",
								},
							},
							200,
						);

						const response = await fetchMocker.fetch("/hello", {
							credentials,
						});
						assert.strictEqual(response.status, 200);
					},
				);
			});

			it("should not include cookie credentials when credentials:omit", async () => {
				const server = new MockServer(API_URL);
				const cookies = new CookieCredentials(BASE_URL);
				const fetchMocker = new FetchMocker({
					servers: [server],
					credentials: [cookies],
					baseUrl: API_URL,
				});

				cookies.setCookie({
					name: "session",
					value: "123",
				});

				server.get(
					{
						url: "/hello",
						headers: {
							Cookie: "session=123",
						},
					},
					200,
				);

				await assert.rejects(
					fetchMocker.fetch("/hello", {
						credentials: "omit",
					}),
					/No route matched/iu,
				);
			});

			it("should not include cookie credentials when credentials:omit and cookie credentials don't have domain", async () => {
				const server = new MockServer(API_URL);
				const cookies = new CookieCredentials();
				const fetchMocker = new FetchMocker({
					servers: [server],
					credentials: [cookies],
					baseUrl: API_URL,
				});

				cookies.setCookie({
					name: "session",
					value: "123",
					domain: BASE_DOMAIN,
				});

				server.get(
					{
						url: "/hello",
						headers: {
							Cookie: "session=123",
						},
					},
					200,
				);

				await assert.rejects(
					fetchMocker.fetch("/hello", {
						credentials: "omit",
					}),
					/No route matched/iu,
				);
			});

			it("should not include cookie credentials when cookie credentials are not for the base domain", async () => {
				const server = new MockServer(BASE_URL);
				const cookies = new CookieCredentials(SUB_URL);
				const fetchMocker = new FetchMocker({
					servers: [server],
					credentials: [cookies],
					baseUrl: API_URL,
				});

				cookies.setCookie({
					name: "session",
					value: "123",
				});

				server.get(
					{
						url: "/hello",
						headers: {
							Cookie: "session=123",
						},
					},
					200,
				);

				await assert.rejects(
					fetchMocker.fetch("/hello"),
					/No route matched/iu,
				);
			});

			it("should not include cookie credentials when the path doesn't match", async () => {
				const server = new MockServer(API_URL);
				const cookies = new CookieCredentials(API_URL);
				const fetchMocker = new FetchMocker({
					servers: [server],
					credentials: [cookies],
					baseUrl: API_URL,
				});

				cookies.setCookie({
					name: "session",
					value: "123",
					path: "/other",
				});

				server.get(
					{
						url: "/hello",
						headers: {
							Cookie: "session=123",
						},
					},
					200,
				);

				await assert.rejects(
					fetchMocker.fetch("/hello"),
					/No route matched/iu,
				);
			});
		});
	});

	describe("CORS", () => {
		describe("Simple Requests", () => {
			it("should throw an error when the server does not return an access-control-allow-origin header", async () => {
				const server = new MockServer(API_URL);
				const fetchMocker = new FetchMocker({
					servers: [server],
					baseUrl: ALT_BASE_URL,
				});
				const url = new URL("/hello", API_URL);
				const origin = new URL(ALT_BASE_URL).origin;

				server.get("/hello", 200);

				await assert.rejects(fetchMocker.fetch(url), {
					name: "CorsError",
					message: `Access to fetch at '${url.href}' from origin '${origin}' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.`,
				});
			});

			it("should throw an error when the server returns an access-control-allow-origin header that doesn't match the origin", async () => {
				const server = new MockServer(API_URL);
				const fetchMocker = new FetchMocker({
					servers: [server],
					baseUrl: ALT_BASE_URL,
				});
				const url = new URL("/hello", API_URL);
				const origin = new URL(ALT_BASE_URL).origin;

				server.get("/hello", {
					status: 200,
					headers: {
						"Access-Control-Allow-Origin":
							"https://api.example.com",
					},
				});

				await assert.rejects(fetchMocker.fetch(url), {
					name: "CorsError",
					message: `Access to fetch at '${url.href}' from origin '${origin}' has been blocked by CORS policy: The 'Access-Control-Allow-Origin' header has a value 'https://api.example.com' that is not equal to the supplied origin.`,
				});
			});

			it("should not throw an error when the server returns an access-control-allow-origin header that matches the origin", async () => {
				const server = new MockServer(API_URL);
				const fetchMocker = new FetchMocker({
					servers: [server],
					baseUrl: ALT_BASE_URL,
				});
				const url = new URL("/hello", API_URL);
				const origin = new URL(ALT_BASE_URL).origin;

				server.get("/hello", {
					status: 200,
					headers: { "Access-Control-Allow-Origin": origin },
				});

				const response = await fetchMocker.fetch(url);
				assert.strictEqual(response.status, 200);
			});

			it("should not throw an error when making a call to the same origin", async () => {
				const server = new MockServer(API_URL);
				const fetchMocker = new FetchMocker({
					servers: [server],
					baseUrl: API_URL,
				});
				const url = new URL("/hello", API_URL);

				server.get("/hello", 200);

				const response = await fetchMocker.fetch(url);
				assert.strictEqual(response.status, 200);
			});
		});

		describe("Preflighted Requests", () => {
			describe("Access-Control-Allow-Headers", () => {
				it("should throw an error when the Authorization header is used", async () => {
					const server = new MockServer(API_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", API_URL);
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
					const server = new MockServer(API_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", API_URL);
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
					const server = new MockServer(API_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", API_URL);
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
					const server = new MockServer(API_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", API_URL);
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
					const server = new MockServer(API_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", API_URL);
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
					const server = new MockServer(API_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", API_URL);
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
					const server = new MockServer(API_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", API_URL);
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
					const server = new MockServer(API_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", API_URL);
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
					const server = new MockServer(API_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", API_URL);
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
					const server = new MockServer(API_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", API_URL);
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
					const server = new MockServer(API_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", API_URL);
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
					const server = new MockServer(API_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", API_URL);
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
					const server = new MockServer(API_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", API_URL);
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
					const server = new MockServer(API_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
					});
					const url = new URL("/hello", API_URL);
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
				server = new MockServer(API_URL);
				fetchMocker = new FetchMocker({
					servers: [server],
					baseUrl: ALT_BASE_URL,
				});
				url = new URL("/hello", API_URL);
				origin = new URL(ALT_BASE_URL).origin;
			});

			it("should not allow the response to contain X-Mentoss header when not exposed with preflight", async () => {
				server.get("/hello", {
					status: 200,
					headers: {
						"Access-Control-Allow-Origin": origin,
						"Access-Control-Expose-Headers": "X-Mentoss",
						"X-Mentoss": "Bar",
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
						"X-Mentoss": "Foo",
					},
				});

				assert.strictEqual(response.headers.get("X-Mentoss"), "Bar");
			});

			it("should not allow the response to contain Set-Cookie header when not exposed", async () => {
				server.get("/hello", {
					status: 200,
					headers: {
						"Access-Control-Allow-Origin": origin,
						"Set-Cookie": "Foo",
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
						"Set-Cookie": "Foo",
					},
				});

				const response = await fetchMocker.fetch(url);

				assert.strictEqual(response.headers.get("Set-Cookie"), null);
			});
		});

		describe("Access-Control-Allow-Credentials", () => {
			describe("Simple Requests", () => {
				it("should throw an error when the server does not include access-control-allow-credentials=true", async () => {
					const server = new MockServer(API_URL);
					const cookies = new CookieCredentials(API_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
						credentials: [cookies],
					});
					const url = new URL("/hello", API_URL);
					const origin = new URL(ALT_BASE_URL).origin;

					cookies.setCookie({
						name: "session",
						value: "123",
					});

					server.get(
						{
							url: "/hello",
							headers: {
								Cookie: "session=123",
							},
						},
						{
							status: 200,
							headers: {
								"Access-Control-Allow-Origin": origin,
							},
						},
					);

					await assert.rejects(
						fetchMocker.fetch(url, {
							credentials: "include",
						}),
						/Access-Control-Allow-Credentials/iu,
					);

					server.assertAllRoutesCalled();
				});

				it("should throw an error when the server returns access-control-allow-credentials=false", async () => {
					const server = new MockServer(API_URL);
					const cookies = new CookieCredentials(API_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
						credentials: [cookies],
					});
					const url = new URL("/hello", API_URL);
					const origin = new URL(ALT_BASE_URL).origin;

					cookies.setCookie({
						name: "session",
						value: "123",
					});

					server.get(
						{
							url: "/hello",
							headers: {
								Cookie: "session=123",
							},
						},
						{
							status: 200,
							headers: {
								"Access-Control-Allow-Origin": origin,
								"Access-Control-Allow-Credentials": "false",
							},
						},
					);

					await assert.rejects(
						fetchMocker.fetch(url, {
							credentials: "include",
						}),
						/Access-Control-Allow-Credentials/iu,
					);

					server.assertAllRoutesCalled();
				});

				it("should succeed when access-control-allow-credentials=true", async () => {
					const server = new MockServer(API_URL);
					const cookies = new CookieCredentials(API_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
						credentials: [cookies],
					});
					const url = new URL("/hello", API_URL);
					const origin = new URL(ALT_BASE_URL).origin;

					cookies.setCookie({
						name: "session",
						value: "123",
					});

					server.get(
						{
							url: "/hello",
							headers: {
								Cookie: "session=123",
							},
						},
						{
							status: 200,
							headers: {
								"Access-Control-Allow-Origin": origin,
								"Access-Control-Allow-Credentials": "true",
							},
						},
					);

					const response = await fetchMocker.fetch(url, {
						credentials: "include",
					});

					assert.strictEqual(response.status, 200);
				});

				it("should throw an error when the server sets access-control-allow-origin=* and access-control-allow-credentials=true", async () => {
					const server = new MockServer(API_URL);
					const cookies = new CookieCredentials(API_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
						credentials: [cookies],
					});
					const url = new URL("/hello", API_URL);

					cookies.setCookie({
						name: "session",
						value: "123",
					});

					server.get(
						{
							url: "/hello",
							headers: {
								Cookie: "session=123",
							},
						},
						{
							status: 200,
							headers: {
								"Access-Control-Allow-Origin": "*",
								"Access-Control-Allow-Credentials": "true",
							},
						},
					);

					await assert.rejects(
						fetchMocker.fetch(url, {
							credentials: "include",
						}),
						/Access-Control-Allow-Credentials/iu,
					);

					server.assertAllRoutesCalled();
				});

				it("should throw an error when the server sets access-control-allow-headers=* and access-control-allow-credentials=true", async () => {
					const server = new MockServer(API_URL);
					const cookies = new CookieCredentials(API_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
						credentials: [cookies],
					});
					const url = new URL("/hello", API_URL);
					const origin = new URL(ALT_BASE_URL).origin;

					cookies.setCookie({
						name: "session",
						value: "123",
					});

					server.get(
						{
							url: "/hello",
							headers: {
								Cookie: "session=123",
							},
						},
						{
							status: 200,
							headers: {
								"Access-Control-Allow-Origin": origin,
								"Access-Control-Allow-Credentials": "true",
								"Access-Control-Allow-Headers": "*",
							},
						},
					);

					await assert.rejects(
						fetchMocker.fetch(url, {
							credentials: "include",
						}),
						/Access-Control-Allow-Credentials/iu,
					);

					server.assertAllRoutesCalled();
				});

				it("should throw an error when the server sets access-control-allow-methods=* and access-control-allow-credentials=true", async () => {
					const server = new MockServer(API_URL);
					const cookies = new CookieCredentials(API_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
						credentials: [cookies],
					});
					const url = new URL("/hello", API_URL);
					const origin = new URL(ALT_BASE_URL).origin;

					cookies.setCookie({
						name: "session",
						value: "123",
					});

					server.get(
						{
							url: "/hello",
							headers: {
								Cookie: "session=123",
							},
						},
						{
							status: 200,
							headers: {
								"Access-Control-Allow-Origin": origin,
								"Access-Control-Allow-Credentials": "true",
								"Access-Control-Allow-Methods": "*",
							},
						},
					);

					await assert.rejects(
						fetchMocker.fetch(url, {
							credentials: "include",
						}),
						/Access-Control-Allow-Credentials/iu,
					);

					server.assertAllRoutesCalled();
				});
			});

			describe("Preflighted Requests", () => {
				it("should throw an error when the preflight response does not have access-control-allow-credentials=true", async () => {
					const server = new MockServer(API_URL);
					const cookies = new CookieCredentials(API_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
						credentials: [cookies],
					});
					const url = new URL("/hello", API_URL);
					const origin = new URL(ALT_BASE_URL).origin;

					cookies.setCookie({
						name: "session",
						value: "123",
					});

					server.get(
						{
							url: "/hello",
							headers: {
								Custom: "Foo",
							},
						},
						{
							status: 200,
							headers: {
								"Access-Control-Allow-Origin": origin,
								"Access-Control-Allow-Credentials": "true",
							},
						},
					);

					server.options("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-Origin": origin,
							"Access-Control-Allow-Headers": "Custom",
						},
					});

					await assert.rejects(
						fetchMocker.fetch(url, {
							credentials: "include",
							headers: {
								Custom: "Foo",
							},
						}),
						/Access-Control-Allow-Credentials/iu,
					);
				});

				it("should throw an error when the preflight response has access-control-allow-credentials=false", async () => {
					const server = new MockServer(API_URL);
					const cookies = new CookieCredentials(API_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
						credentials: [cookies],
					});
					const url = new URL("/hello", API_URL);
					const origin = new URL(ALT_BASE_URL).origin;

					cookies.setCookie({
						name: "session",
						value: "123",
					});

					server.get(
						{
							url: "/hello",
							headers: {
								Custom: "Foo",
							},
						},
						{
							status: 200,
							headers: {
								"Access-Control-Allow-Origin": origin,
							},
						},
					);

					server.options("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-Origin": origin,
							"Access-Control-Allow-Headers": "Custom",
							"Access-Control-Allow-Credentials": "false",
						},
					});

					await assert.rejects(
						fetchMocker.fetch(url, {
							credentials: "include",
							headers: {
								Custom: "Foo",
							},
						}),
						/Access-Control-Allow-Credentials/iu,
					);
				});

				it("should throw an error when the preflight response has access-control-allow-origin=* and access-control-allow-credentials=true", async () => {
					const server = new MockServer(API_URL);
					const cookies = new CookieCredentials(API_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
						credentials: [cookies],
					});

					const url = new URL("/hello", API_URL);
					const origin = new URL(ALT_BASE_URL).origin;

					cookies.setCookie({
						name: "session",
						value: "123",
					});

					server.get(
						{
							url: "/hello",
							headers: {
								Custom: "Foo",
							},
						},
						{
							status: 200,
							headers: {
								"Access-Control-Allow-Origin": origin,
							},
						},
					);

					server.options("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-Origin": "*",
							"Access-Control-Allow-Headers": "Custom",
							"Access-Control-Allow-Credentials": "true",
						},
					});

					await assert.rejects(
						fetchMocker.fetch(url, {
							credentials: "include",
							headers: {
								Custom: "Foo",
							},
						}),
						/Access-Control-Allow-Credentials/iu,
					);
				});

				it("should throw an error when the preflight response has access-control-allow-headers=* and access-control-allow-credentials=true", async () => {
					const server = new MockServer(API_URL);
					const cookies = new CookieCredentials(API_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
						credentials: [cookies],
					});
					const url = new URL("/hello", API_URL);
					const origin = new URL(ALT_BASE_URL).origin;

					cookies.setCookie({
						name: "session",
						value: "123",
					});

					server.get(
						{
							url: "/hello",
							headers: {
								Custom: "Foo",
							},
						},
						{
							status: 200,
							headers: {
								"Access-Control-Allow-Origin": origin,
							},
						},
					);

					server.options("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-Origin": origin,
							"Access-Control-Allow-Headers": "*",
							"Access-Control-Allow-Credentials": "true",
						},
					});

					await assert.rejects(
						fetchMocker.fetch(url, {
							credentials: "include",
							headers: {
								Custom: "Foo",
							},
						}),
						/Access-Control-Allow-Credentials/iu,
					);
				});

				it("should throw an error when the preflight response has access-control-allow-methods=* and access-control-allow-credentials=true", async () => {
					const server = new MockServer(API_URL);
					const cookies = new CookieCredentials(API_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
						credentials: [cookies],
					});
					const url = new URL("/hello", API_URL);
					const origin = new URL(ALT_BASE_URL).origin;

					cookies.setCookie({
						name: "session",
						value: "123",
					});

					server.get(
						{
							url: "/hello",
							headers: {
								Custom: "Foo",
							},
						},
						{
							status: 200,
							headers: {
								"Access-Control-Allow-Origin": origin,
							},
						},
					);

					server.options("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-Origin": origin,
							"Access-Control-Allow-Methods": "*",
							"Access-Control-Allow-Credentials": "true",
							"Access-Control-Allow-Headers": "Custom",
						},
					});

					await assert.rejects(
						fetchMocker.fetch(url, {
							credentials: "include",
							headers: {
								Custom: "Foo",
							},
						}),
						/Access-Control-Allow-Credentials/iu,
					);
				});

				it("should succeed when the preflight response and actual response has access-control-allow-credentials=true", async () => {
					const server = new MockServer(API_URL);
					const cookies = new CookieCredentials(API_URL);
					const fetchMocker = new FetchMocker({
						servers: [server],
						baseUrl: ALT_BASE_URL,
						credentials: [cookies],
					});
					const url = new URL("/hello", API_URL);
					const origin = new URL(ALT_BASE_URL).origin;

					cookies.setCookie({
						name: "session",
						value: "123",
					});

					server.get(
						{
							url: "/hello",
							headers: {
								Custom: "Foo",
								Cookie: "session=123",
							},
						},
						{
							status: 200,
							headers: {
								"Access-Control-Allow-Origin": origin,
								"Access-Control-Allow-Credentials": "true",
							},
						},
					);

					server.options("/hello", {
						status: 200,
						headers: {
							"Access-Control-Allow-Origin": origin,
							"Access-Control-Allow-Headers": "Custom",
							"Access-Control-Allow-Credentials": "true",
						},
					});

					const response = await fetchMocker.fetch(url, {
						credentials: "include",
						headers: {
							Custom: "Foo",
						},
					});

					assert.strictEqual(response.status, 200);
				});
			});
		});
	});

	describe("mockGlobal", () => {
		it("should replace global fetch", () => {
			const server = new MockServer(API_URL);
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
			const server = new MockServer(API_URL);
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
			const server = new MockServer(API_URL);
			const fetchMocker = new FetchMocker({
				servers: [server],
			});

			server.get("/hello", {
				status: 200,
				body: "Hello world!",
			});

			await assert.rejects(
				fetchMocker.fetch(API_URL + "/hello", {
					signal: AbortSignal.abort("Foo"),
				}),
				/Foo/,
			);
		});

		it("should throw an abort error when the request is aborted", async () => {
			const server = new MockServer(API_URL);
			const fetchMocker = new FetchMocker({
				servers: [server],
			});

			server.get("/hello", {
				status: 200,
				body: "Hello world!",
				delay: 100,
			});

			const controller = new AbortController();

			queueMicrotask(() => controller.abort());

			await assert.rejects(
				fetchMocker.fetch(API_URL + "/hello", {
					signal: controller.signal,
				}),
				/aborted/,
			);
		});
	});

	describe("clearAll()", () => {
		it("should clear all routes from all servers", async () => {
			const server1 = new MockServer(API_URL);
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

			fetchMocker.clearAll();

			assert.deepStrictEqual(fetchMocker.uncalledRoutes, []);
		});

		it("should clear all credentials", async () => {
			const server = new MockServer(API_URL);
			const cookies = new CookieCredentials(API_URL);
			const fetchMocker = new FetchMocker({
				servers: [server],
				credentials: [cookies],
				baseUrl: API_URL,
			});

			cookies.setCookie({
				name: "session",
				value: "123",
			});

			server.get(
				{
					url: "/hello",
					headers: {
						Cookie: "session=123",
					},
				},
				200,
			);

			fetchMocker.clearAll();

			await assert.rejects(
				fetchMocker.fetch("/hello"),
				/No route matched/iu,
			);
		});
	});
});
