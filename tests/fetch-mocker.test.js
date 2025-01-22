/**
 * @fileoverview Tests for the FetchMocker class.
 * @autor Nicholas C. Zakas
 */

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

		server.get({
			url: "/user/:id",
			params: { id: "1" },
		}, 200);
		
		server.get({
			url: "/user/settings",
			query: { page: "profile" },
		}, 200);
		
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
		
		server.post({
			url: "/user/:id",
			params: { id: "1" },
		}, 200);
		
		server.post({
			url: "/user/settings",
			headers: { Authorization: "Bearer ABC" },
		}, 200);
		
		await assert.rejects(fetchMocker.fetch(BASE_URL + "/user/settings", {
			method: "POST",
			headers: {
				"Authorization": "Bearer XYZ",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ name: "value" }),
		}), {
			name: "Error",
			message: NO_ROUTE_MATCHED_HEADERS_BODY,
		});
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
});
