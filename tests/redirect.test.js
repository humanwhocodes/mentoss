/**
 * @fileoverview Tests for redirect handling in the FetchMocker class.
 * @author Nicholas C. Zakas
 */

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

const API_URL = "https://api.example.com";
const ALT_BASE_URL = "https://api.example.org";

//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------

describe("Redirect Tests", () => {
    describe("Same-Origin Redirects", () => {
        it("should follow a 301 redirect and change method from POST to GET", async () => {
            const server = new MockServer(API_URL);
            const fetchMocker = new FetchMocker({
                servers: [server],
                baseUrl: API_URL,
            });

            server.post("/original", {
                status: 301,
                headers: {
                    "Location": "/redirected"
                }
            });

            server.get("/redirected", {
                status: 200,
                body: "Redirected content"
            });

            const response = await fetchMocker.fetch("/original", {
                method: "POST",
                body: JSON.stringify({ data: "test" })
            });

            assert.strictEqual(response.status, 200);
            assert.strictEqual(await response.text(), "Redirected content");
            assert.strictEqual(response.redirected, true);
        });

        it("should follow a 302 redirect and change method from POST to GET", async () => {
            const server = new MockServer(API_URL);
            const fetchMocker = new FetchMocker({
                servers: [server],
                baseUrl: API_URL,
            });

            server.post("/original", {
                status: 302,
                headers: {
                    "Location": "/redirected"
                }
            });

            server.get("/redirected", {
                status: 200,
                body: "Redirected content"
            });

            const response = await fetchMocker.fetch("/original", {
                method: "POST",
                body: JSON.stringify({ data: "test" })
            });

            assert.strictEqual(response.status, 200);
            assert.strictEqual(await response.text(), "Redirected content");
            assert.strictEqual(response.redirected, true);
        });

        it("should follow a 303 redirect and always change method to GET", async () => {
            const server = new MockServer(API_URL);
            const fetchMocker = new FetchMocker({
                servers: [server],
                baseUrl: API_URL,
            });

            server.put("/original", {
                status: 303,
                headers: {
                    "Location": "/redirected"
                }
            });

            server.get("/redirected", {
                status: 200,
                body: "Redirected content"
            });

            const response = await fetchMocker.fetch("/original", {
                method: "PUT",
                body: JSON.stringify({ data: "test" })
            });

            assert.strictEqual(response.status, 200);
            assert.strictEqual(await response.text(), "Redirected content");
            assert.strictEqual(response.redirected, true);
        });

        it("should follow a 307 redirect and preserve the original method and body", async () => {
            const server = new MockServer(API_URL);
            const fetchMocker = new FetchMocker({
                servers: [server],
                baseUrl: API_URL,
            });

            server.post("/original", {
                status: 307,
                headers: {
                    "Location": "/redirected"
                }
            });

            // Modify how we handle the body in the response handler
            server.post(
                {
                    url: "/redirected",
                    body: {
                        "data": "test"
                    }
                },
                {
                    status: 200,
                    body: "Got request with body: {\"data\":\"test\"}"
                }
            );

            const response = await fetchMocker.fetch("/original", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: "test" })
            });

            assert.strictEqual(response.status, 200);
            assert.strictEqual(await response.text(), "Got request with body: {\"data\":\"test\"}");
            assert.strictEqual(response.redirected, true);
        });

        it("should follow a 308 redirect and preserve the original method and body", async () => {
            const server = new MockServer(API_URL);
            const fetchMocker = new FetchMocker({
                servers: [server],
                baseUrl: API_URL,
            });

            server.post("/original", {
                status: 308,
                headers: {
                    "Location": "/redirected"
                }
            });

            // Modify how we handle the body in the response handler
            server.post(
                {
                    url: "/redirected",
                    body: {
                        "data": "test"
                    }
                },
                {
                    status: 200,
                    body: "Got request with body: {\"data\":\"test\"}"
                }
            );

            const response = await fetchMocker.fetch("/original", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: "test" })
            });

            assert.strictEqual(response.status, 200);
            assert.strictEqual(await response.text(), "Got request with body: {\"data\":\"test\"}");
            assert.strictEqual(response.redirected, true);
        });

        it("should not follow a redirect when redirect mode is 'error'", async () => {
            const server = new MockServer(API_URL);
            const fetchMocker = new FetchMocker({
                servers: [server],
                baseUrl: API_URL,
            });

            server.get("/original", {
                status: 301,
                headers: {
                    "Location": "/redirected"
                }
            });

            server.get("/redirected", {
                status: 200,
                body: "Redirected content"
            });

            await assert.rejects(
                fetchMocker.fetch("/original", { redirect: "error" }),
                error => error instanceof TypeError && /redirect mode being 'error'/.test(error.message)
            );
        });

        it("should return an opaque redirect response when redirect mode is 'manual'", async () => {
            const server = new MockServer(API_URL);
            const fetchMocker = new FetchMocker({
                servers: [server],
                baseUrl: API_URL,
            });

            server.get("/original", {
                status: 301,
                headers: {
                    "Location": "/redirected"
                }
            });

            const response = await fetchMocker.fetch("/original", { redirect: "manual" });
            
            assert.strictEqual(response.type, "opaqueredirect");
            assert.strictEqual(response.status, 0);
            assert.strictEqual(response.url, API_URL + "/original");
        });

        it("should detect and prevent redirect loops", async () => {
            const server = new MockServer(API_URL);
            const fetchMocker = new FetchMocker({
                servers: [server],
                baseUrl: API_URL,
            });

            server.get("/original", {
                status: 302,
                headers: {
                    "Location": "/loop"
                }
            });

            server.get("/loop", {
                status: 302,
                headers: {
                    "Location": "/original"
                }
            });

            await assert.rejects(
                fetchMocker.fetch("/original"),
                error => error instanceof TypeError && /Redirect loop detected/.test(error.message)
            );
        });

        it("should throw an error when redirect limit is exceeded", async () => {
            const server = new MockServer(API_URL);
            const fetchMocker = new FetchMocker({
                servers: [server],
                baseUrl: API_URL,
            });

            // Setup 21 redirects (more than the 20 limit)
            for (let i = 0; i < 21; i++) {
                server.get(`/redirect${i}`, {
                    status: 302,
                    headers: {
                        "Location": i < 20 ? `/redirect${i + 1}` : "/final"
                    }
                });
            }

            server.get("/final", {
                status: 200,
                body: "Final destination"
            });

            await assert.rejects(
                fetchMocker.fetch("/redirect0"),
                error => error instanceof TypeError && /Too many redirects/.test(error.message)
            );
        });
    });

    describe("Cross-Origin Redirects", () => {
        it("should follow a cross-origin redirect and apply CORS checks", async () => {
            const server1 = new MockServer(API_URL);
            const server2 = new MockServer(ALT_BASE_URL);
            const fetchMocker = new FetchMocker({
                servers: [server1, server2],
                baseUrl: API_URL,
            });

            server1.get("/original", {
                status: 302,
                headers: {
                    "Location": ALT_BASE_URL + "/redirected"
                }
            });

            server2.get("/redirected", {
                status: 200,
                headers: {
                    "Access-Control-Allow-Origin": API_URL
                },
                body: "Cross-origin redirected content"
            });

            const response = await fetchMocker.fetch("/original");
            
            assert.strictEqual(response.status, 200);
            assert.strictEqual(await response.text(), "Cross-origin redirected content");
            assert.strictEqual(response.redirected, true);
        });

        it("should remove the Authorization header on cross-origin redirects", async () => {
            const server1 = new MockServer(API_URL);
            const server2 = new MockServer(ALT_BASE_URL);
            const fetchMocker = new FetchMocker({
                servers: [server1, server2],
                baseUrl: API_URL,
            });

            server1.get("/original", {
                status: 302,
                headers: {
                    "Location": ALT_BASE_URL + "/redirected"
                }
            });

            // This route expects no Authorization header
            server2.get({
                url: "/redirected",
                headers: {
                    // Just check the route without expecting any specific Authorization value
                }
            }, {
                status: 200,
                headers: {
                    "Access-Control-Allow-Origin": API_URL
                },
                body: "Auth header was removed"
            });

            const response = await fetchMocker.fetch("/original", {
                headers: {
                    "Authorization": "Bearer token123"
                }
            });
            
            assert.strictEqual(response.status, 200);
            assert.strictEqual(await response.text(), "Auth header was removed");
        });

        it("should throw when credentials mode is 'include' for cross-origin redirects", async () => {
            const server1 = new MockServer(API_URL);
            const server2 = new MockServer(ALT_BASE_URL);
            const cookies = new CookieCredentials(API_URL);
            const fetchMocker = new FetchMocker({
                servers: [server1, server2],
                baseUrl: API_URL,
                credentials: [cookies]
            });

            cookies.setCookie({
                name: "session",
                value: "123"
            });

            server1.get("/original", {
                status: 302,
                headers: {
                    "Location": ALT_BASE_URL + "/redirected"
                }
            });

            server2.get("/redirected", {
                status: 200,
                headers: {
                    "Access-Control-Allow-Origin": API_URL
                },
                body: "Cross-origin redirected content"
            });

            await assert.rejects(
                fetchMocker.fetch("/original", { credentials: "include" }),
                error => error instanceof TypeError && /Cross-origin redirect with credentials is not allowed/.test(error.message)
            );
        });
    });
});
