/**
 * @fileoverview Tests for the MockAgent class.
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import assert from "node:assert";
import { MockServer } from "../src/mock-server.js";
import { MockAgent } from "../src/mock-agent.js";

//-----------------------------------------------------------------------------
// Data
//-----------------------------------------------------------------------------

const API_URL = "https://api.example.com";

//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------

describe("MockAgent", () => {
	describe("constructor", () => {
		it("should throw an error if no servers are provided", () => {
			assert.throws(
				() => {
					new MockAgent({});
				},
				{
					name: "TypeError",
					message: "At least one server is required.",
				},
			);
		});

		it("should throw an error if servers array is empty", () => {
			assert.throws(
				() => {
					new MockAgent({ servers: [] });
				},
				{
					name: "TypeError",
					message: "At least one server is required.",
				},
			);
		});

		it("should create an instance with one server", () => {
			const server = new MockServer(API_URL);
			const agent = new MockAgent({ servers: [server] });
			assert.ok(agent);
		});

		it("should create an instance with multiple servers", () => {
			const server1 = new MockServer("https://api1.example.com");
			const server2 = new MockServer("https://api2.example.com");
			const agent = new MockAgent({ servers: [server1, server2] });
			assert.ok(agent);
		});
	});

	describe("dispatch()", () => {
		it("should dispatch a GET request successfully", async () => {
			const server = new MockServer(API_URL);
			server.get("/hello", { status: 200, body: "Hello, World!" });

			const agent = new MockAgent({ servers: [server] });

			let statusCode;
			let headers;
			let bodyData;
			let completed = false;

			const handler = {
				onHeaders(status, hdrs) {
					statusCode = status;
					headers = hdrs;
				},
				onData(chunk) {
					bodyData = chunk.toString();
				},
				onComplete() {
					completed = true;
				},
				onError(err) {
					throw err;
				},
			};

			const result = agent.dispatch(
				{
					origin: API_URL,
					path: "/hello",
					method: "GET",
				},
				handler,
			);

			assert.strictEqual(result, true);

			// Wait for async processing
			await new Promise(resolve => setTimeout(resolve, 100));

			assert.strictEqual(statusCode, 200);
			assert.strictEqual(bodyData, "Hello, World!");
			assert.strictEqual(completed, true);
		});

		it("should dispatch a POST request with body", async () => {
			const server = new MockServer(API_URL);
			server.post("/data", { status: 201, body: { success: true } });

			const agent = new MockAgent({ servers: [server] });

			let statusCode;
			let bodyData;
			let completed = false;

			const handler = {
				onHeaders(status) {
					statusCode = status;
				},
				onData(chunk) {
					bodyData = chunk.toString();
				},
				onComplete() {
					completed = true;
				},
				onError(err) {
					throw err;
				},
			};

			const result = agent.dispatch(
				{
					origin: API_URL,
					path: "/data",
					method: "POST",
					body: JSON.stringify({ name: "test" }),
					headers: { "content-type": "application/json" },
				},
				handler,
			);

			assert.strictEqual(result, true);

			// Wait for async processing
			await new Promise(resolve => setTimeout(resolve, 100));

			assert.strictEqual(statusCode, 201);
			assert.ok(bodyData.includes("success"));
			assert.strictEqual(completed, true);
		});

		it("should handle headers as array format", async () => {
			const server = new MockServer(API_URL);
			server.get("/test", { status: 200 });

			const agent = new MockAgent({ servers: [server] });

			let statusCode;
			let completed = false;

			const handler = {
				onHeaders(status) {
					statusCode = status;
				},
				onComplete() {
					completed = true;
				},
				onError(err) {
					throw err;
				},
			};

			agent.dispatch(
				{
					origin: API_URL,
					path: "/test",
					method: "GET",
					headers: ["accept", "application/json", "user-agent", "test"],
				},
				handler,
			);

			// Wait for async processing
			await new Promise(resolve => setTimeout(resolve, 100));

			assert.strictEqual(statusCode, 200);
			assert.strictEqual(completed, true);
		});

		it("should handle headers with array values", async () => {
			const server = new MockServer(API_URL);
			server.get("/test", { status: 200 });

			const agent = new MockAgent({ servers: [server] });

			let statusCode;
			let completed = false;

			const handler = {
				onHeaders(status) {
					statusCode = status;
				},
				onComplete() {
					completed = true;
				},
				onError(err) {
					throw err;
				},
			};

			agent.dispatch(
				{
					origin: API_URL,
					path: "/test",
					method: "GET",
					headers: {
						accept: ["application/json", "text/html"],
					},
				},
				handler,
			);

			// Wait for async processing
			await new Promise(resolve => setTimeout(resolve, 100));

			assert.strictEqual(statusCode, 200);
			assert.strictEqual(completed, true);
		});

		it("should call onError when route is not found", async () => {
			const server = new MockServer(API_URL);
			server.get("/hello", { status: 200 });

			const agent = new MockAgent({ servers: [server] });

			let errorReceived = false;
			let errorMessage;

			const handler = {
				onHeaders() {},
				onData() {},
				onComplete() {},
				onError(err) {
					errorReceived = true;
					errorMessage = err.message;
				},
			};

			agent.dispatch(
				{
					origin: API_URL,
					path: "/notfound",
					method: "GET",
				},
				handler,
			);

			// Wait for async processing
			await new Promise(resolve => setTimeout(resolve, 100));

			assert.strictEqual(errorReceived, true);
			assert.ok(errorMessage.includes("No route matched"));
		});

		it("should return false when agent is closed", async () => {
			const server = new MockServer(API_URL);
			server.get("/hello", { status: 200 });

			const agent = new MockAgent({ servers: [server] });
			await agent.close();

			let errorReceived = false;

			const handler = {
				onHeaders() {},
				onData() {},
				onComplete() {},
				onError() {
					errorReceived = true;
				},
			};

			const result = agent.dispatch(
				{
					origin: API_URL,
					path: "/hello",
					method: "GET",
				},
				handler,
			);

			assert.strictEqual(result, false);

			// Wait a bit to ensure onError is called
			await new Promise(resolve => setTimeout(resolve, 50));

			assert.strictEqual(errorReceived, true);
		});

		it("should work with multiple servers", async () => {
			const server1 = new MockServer("https://api1.example.com");
			server1.get("/hello", { status: 200, body: "Server 1" });

			const server2 = new MockServer("https://api2.example.com");
			server2.get("/hello", { status: 200, body: "Server 2" });

			const agent = new MockAgent({ servers: [server1, server2] });

			let bodyData1;
			let bodyData2;

			const handler1 = {
				onHeaders() {},
				onData(chunk) {
					bodyData1 = chunk.toString();
				},
				onComplete() {},
				onError(err) {
					throw err;
				},
			};

			const handler2 = {
				onHeaders() {},
				onData(chunk) {
					bodyData2 = chunk.toString();
				},
				onComplete() {},
				onError(err) {
					throw err;
				},
			};

			agent.dispatch(
				{
					origin: "https://api1.example.com",
					path: "/hello",
					method: "GET",
				},
				handler1,
			);

			agent.dispatch(
				{
					origin: "https://api2.example.com",
					path: "/hello",
					method: "GET",
				},
				handler2,
			);

			// Wait for async processing
			await new Promise(resolve => setTimeout(resolve, 100));

			assert.strictEqual(bodyData1, "Server 1");
			assert.strictEqual(bodyData2, "Server 2");
		});
	});

	describe("close()", () => {
		it("should close the agent", async () => {
			const server = new MockServer(API_URL);
			const agent = new MockAgent({ servers: [server] });

			await agent.close();

			// Verify agent rejects new requests
			const handler = {
				onError() {},
			};

			const result = agent.dispatch(
				{
					origin: API_URL,
					path: "/test",
					method: "GET",
				},
				handler,
			);

			assert.strictEqual(result, false);
		});
	});

	describe("destroy()", () => {
		it("should destroy the agent", async () => {
			const server = new MockServer(API_URL);
			const agent = new MockAgent({ servers: [server] });

			await agent.destroy();

			// Verify agent rejects new requests
			const handler = {
				onError() {},
			};

			const result = agent.dispatch(
				{
					origin: API_URL,
					path: "/test",
					method: "GET",
				},
				handler,
			);

			assert.strictEqual(result, false);
		});
	});

	describe("called()", () => {
		it("should return true when a request was made", async () => {
			const server = new MockServer(API_URL);
			server.get("/hello", { status: 200 });

			const agent = new MockAgent({ servers: [server] });

			const handler = {
				onHeaders() {},
				onData() {},
				onComplete() {},
				onError() {},
			};

			agent.dispatch(
				{
					origin: API_URL,
					path: "/hello",
					method: "GET",
				},
				handler,
			);

			// Wait for async processing
			await new Promise(resolve => setTimeout(resolve, 100));

			assert.strictEqual(
				agent.called({ method: "GET", url: `${API_URL}/hello` }),
				true,
			);
		});

		it("should return false when a request was not made", () => {
			const server = new MockServer(API_URL);
			server.get("/hello", { status: 200 });

			const agent = new MockAgent({ servers: [server] });

			assert.strictEqual(
				agent.called({ method: "GET", url: `${API_URL}/notcalled` }),
				false,
			);
		});

		it("should accept a string as a shorthand for GET request", async () => {
			const server = new MockServer(API_URL);
			server.get("/hello", { status: 200 });

			const agent = new MockAgent({ servers: [server] });

			const handler = {
				onHeaders() {},
				onData() {},
				onComplete() {},
				onError() {},
			};

			agent.dispatch(
				{
					origin: API_URL,
					path: "/hello",
					method: "GET",
				},
				handler,
			);

			// Wait for async processing
			await new Promise(resolve => setTimeout(resolve, 100));

			assert.strictEqual(agent.called(`${API_URL}/hello`), true);
		});
	});

	describe("allRoutesCalled()", () => {
		it("should return true when all routes were called", async () => {
			const server = new MockServer(API_URL);
			server.get("/hello", { status: 200 });
			server.post("/data", { status: 201 });

			const agent = new MockAgent({ servers: [server] });

			const handler = {
				onHeaders() {},
				onData() {},
				onComplete() {},
				onError() {},
			};

			agent.dispatch(
				{
					origin: API_URL,
					path: "/hello",
					method: "GET",
				},
				handler,
			);

			agent.dispatch(
				{
					origin: API_URL,
					path: "/data",
					method: "POST",
				},
				handler,
			);

			// Wait for async processing
			await new Promise(resolve => setTimeout(resolve, 100));

			assert.strictEqual(agent.allRoutesCalled(), true);
		});

		it("should return false when not all routes were called", () => {
			const server = new MockServer(API_URL);
			server.get("/hello", { status: 200 });
			server.post("/data", { status: 201 });

			const agent = new MockAgent({ servers: [server] });

			assert.strictEqual(agent.allRoutesCalled(), false);
		});
	});

	describe("uncalledRoutes", () => {
		it("should return an empty array when all routes were called", async () => {
			const server = new MockServer(API_URL);
			server.get("/hello", { status: 200 });

			const agent = new MockAgent({ servers: [server] });

			const handler = {
				onHeaders() {},
				onData() {},
				onComplete() {},
				onError() {},
			};

			agent.dispatch(
				{
					origin: API_URL,
					path: "/hello",
					method: "GET",
				},
				handler,
			);

			// Wait for async processing
			await new Promise(resolve => setTimeout(resolve, 100));

			assert.deepStrictEqual(agent.uncalledRoutes, []);
		});

		it("should return uncalled routes", () => {
			const server = new MockServer(API_URL);
			server.get("/hello", { status: 200 });
			server.post("/data", { status: 201 });

			const agent = new MockAgent({ servers: [server] });

			const routes = agent.uncalledRoutes;
			assert.strictEqual(routes.length, 2);
			assert.ok(routes[0].includes("GET"));
			assert.ok(routes[1].includes("POST"));
		});
	});

	describe("assertAllRoutesCalled()", () => {
		it("should not throw when all routes were called", async () => {
			const server = new MockServer(API_URL);
			server.get("/hello", { status: 200 });

			const agent = new MockAgent({ servers: [server] });

			const handler = {
				onHeaders() {},
				onData() {},
				onComplete() {},
				onError() {},
			};

			agent.dispatch(
				{
					origin: API_URL,
					path: "/hello",
					method: "GET",
				},
				handler,
			);

			// Wait for async processing
			await new Promise(resolve => setTimeout(resolve, 100));

			assert.doesNotThrow(() => {
				agent.assertAllRoutesCalled();
			});
		});

		it("should throw when not all routes were called", () => {
			const server = new MockServer(API_URL);
			server.get("/hello", { status: 200 });
			server.post("/data", { status: 201 });

			const agent = new MockAgent({ servers: [server] });

			assert.throws(
				() => {
					agent.assertAllRoutesCalled();
				},
				{
					name: "Error",
					message: /Not all routes were called/,
				},
			);
		});
	});

	describe("clearAll()", () => {
		it("should clear all servers", async () => {
			const server = new MockServer(API_URL);
			server.get("/hello", { status: 200 });

			const agent = new MockAgent({ servers: [server] });

			const handler = {
				onHeaders() {},
				onData() {},
				onComplete() {},
				onError() {},
			};

			agent.dispatch(
				{
					origin: API_URL,
					path: "/hello",
					method: "GET",
				},
				handler,
			);

			// Wait for async processing
			await new Promise(resolve => setTimeout(resolve, 100));

			// Before clearing, route should be called
			assert.strictEqual(agent.called(`${API_URL}/hello`), true);

			// Clear all data
			agent.clearAll();

			// After clearing, route should not be called anymore
			assert.strictEqual(agent.called(`${API_URL}/hello`), false);
		});
	});

	describe("mockGlobal", () => {
			it("should replace global fetch", () => {
				const server = new MockServer(API_URL);
				const mockAgent = new MockAgent({
					servers: [server],
				});
	
				const originalFetch = globalThis[Symbol.for('undici.globalDispatcher.1')];
	
				try {
					mockAgent.mockGlobal();
	
					assert.strictEqual(globalThis[Symbol.for('undici.globalDispatcher.1')], mockAgent);
				} finally {
					globalThis[Symbol.for('undici.globalDispatcher.1')] = originalFetch;
				}
			});
		});
	
		describe("unmockGlobal", () => {
			it("should restore global fetch", () => {
				const server = new MockServer(API_URL);
				const mockAgent = new MockAgent({
					servers: [server],
				});
	
				const originalFetch = globalThis[Symbol.for('undici.globalDispatcher.1')];
	
				try {
					mockAgent.mockGlobal();
					mockAgent.unmockGlobal();
	
					assert.strictEqual(globalThis[Symbol.for('undici.globalDispatcher.1')], originalFetch);
				} finally {
					globalThis[Symbol.for('undici.globalDispatcher.1')] = originalFetch;
				}
			});
		});
	
});
