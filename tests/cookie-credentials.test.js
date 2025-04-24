/**
 * @fileoverview Tests for the CookieCredentials class.
 * @author Nicholas C. Zakas
 */

/* global Request */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import assert from "node:assert";
import { CookieCredentials } from "../src/cookie-credentials.js";

//-----------------------------------------------------------------------------
// Data
//-----------------------------------------------------------------------------

const BASE_DOMAIN = "example.com";
const BASE_URL = `https://${BASE_DOMAIN}`;
const SUB_DOMAIN = "sub.example.com";
const SUB_URL = `https://${SUB_DOMAIN}`;

//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------

describe("CookieCredentials", () => {
	describe("constructor", () => {
		it("should create instance with undefined domain and / basePath when called with no argument", () => {
			const credentials = new CookieCredentials();
			assert.strictEqual(credentials.domain, undefined);
			assert.strictEqual(credentials.basePath, "/");
		});

		it("should create instance with valid domain and / basePath when called with a string", () => {
			const credentials = new CookieCredentials(BASE_URL);
			assert.strictEqual(credentials.domain, BASE_DOMAIN);
			assert.strictEqual(credentials.basePath, "/");
		});

		it("should create instance with valid domain and basePath when called with a string and basePath", () => {
			const credentials = new CookieCredentials(BASE_URL + "/admin");
			assert.strictEqual(credentials.domain, BASE_DOMAIN);
			assert.strictEqual(credentials.basePath, "/admin");
		});

		it("should throw an error when called with an invalid URL", () => {
			assert.throws(() => {
				new CookieCredentials("invalid-url");
			}, /Invalid URL/gi);
		});
	});

	describe("setCookie()", () => {
		describe("Base URL set", () => {
			it("should set a cookie successfully", () => {
				const credentials = new CookieCredentials(BASE_URL);
				credentials.setCookie({
					name: "session",
					value: "123",
				});
				assert.strictEqual(credentials.domain, BASE_DOMAIN);
			});

			it("should throw an error when setting a duplicate cookie", () => {
				const credentials = new CookieCredentials(BASE_URL);
				credentials.setCookie({
					name: "session",
					value: "123",
				});

				assert.throws(() => {
					credentials.setCookie({
						name: "session",
						value: "456",
					});
				}, /Cookie already exists/gi);
			});

			it("should throw an error when setting a cookie with a different domain", () => {
				const credentials = new CookieCredentials(SUB_URL);

				assert.throws(() => {
					credentials.setCookie({
						name: "session",
						value: "123",
						domain: BASE_DOMAIN,
					});
				}, /Cookie domain must end with sub\.example\.com/gi);
			});
		});

		describe("No base URL set", () => {
			it("should set a cookie successfully", () => {
				const credentials = new CookieCredentials();
				credentials.setCookie({
					name: "session",
					value: "123",
					domain: BASE_DOMAIN,
				});
			});

			it("should throw an error when setting a duplicate cookie", () => {
				const credentials = new CookieCredentials();
				credentials.setCookie({
					name: "session",
					value: "123",
					domain: BASE_DOMAIN,
				});

				assert.throws(() => {
					credentials.setCookie({
						name: "session",
						value: "456",
						domain: BASE_DOMAIN,
					});
				}, /Cookie already exists/gi);
			});

			it("should throw an error when setting a cookie without a domain", () => {
				const credentials = new CookieCredentials();

				assert.throws(() => {
					credentials.setCookie({
						name: "session",
						value: "123",
					});
				}, /domain is required/gi);
			});

			it("should throw an error when name is missing", () => {
				const credentials = new CookieCredentials();

				assert.throws(() => {
					credentials.setCookie({
						value: "123",
						domain: BASE_DOMAIN,
					});
				}, /name is required/gi);
			});

			it("should throw an error when value is missing", () => {
				const credentials = new CookieCredentials();

				assert.throws(() => {
					credentials.setCookie({
						name: "session",
						domain: BASE_DOMAIN,
					});
				}, /value is required/gi);
			});
		});

		describe("with sameSite", () => {
			it("should set a cookie with sameSite=strict", () => {
				const credentials = new CookieCredentials(BASE_URL);
				credentials.setCookie({
					name: "session",
					value: "123",
					sameSite: "strict",
				});
			});

			it("should set a cookie with sameSite=lax", () => {
				const credentials = new CookieCredentials(BASE_URL);
				credentials.setCookie({
					name: "session",
					value: "123",
					sameSite: "lax",
				});
			});

			it("should set a cookie with sameSite=none if secure=true", () => {
				const credentials = new CookieCredentials(BASE_URL);
				credentials.setCookie({
					name: "session",
					value: "123",
					sameSite: "none",
					secure: true,
				});
			});

			it("should throw an error when sameSite=none without secure=true", () => {
				const credentials = new CookieCredentials(BASE_URL);

				assert.throws(() => {
					credentials.setCookie({
						name: "session",
						value: "123",
						sameSite: "none",
					});
				}, /SameSite=None requires Secure flag to be true/gi);
			});

			it("should throw an error with invalid sameSite value", () => {
				const credentials = new CookieCredentials(BASE_URL);

				assert.throws(() => {
					credentials.setCookie({
						name: "session",
						value: "123",
						sameSite: "invalid",
					});
				}, /Invalid sameSite value/gi);
			});
		});
	});

	describe("deleteCookie()", () => {
		describe("Base URL set", () => {
			it("should delete an existing cookie", () => {
				const credentials = new CookieCredentials(BASE_URL);
				credentials.setCookie({
					name: "session",
					value: "123",
				});

				credentials.deleteCookie({
					name: "session",
					value: "123",
				});
			});

			it("should throw an error when deleting a non-existent cookie", () => {
				const credentials = new CookieCredentials(BASE_URL);

				assert.throws(() => {
					credentials.deleteCookie({
						name: "session",
						value: "123",
					});
				}, /Cookie does not exist/gi);
			});
		});

		describe("No base URL set", () => {
			it("should delete an existing cookie", () => {
				const credentials = new CookieCredentials();
				credentials.setCookie({
					name: "session",
					value: "123",
					domain: BASE_DOMAIN,
				});

				credentials.deleteCookie({
					name: "session",
					value: "123",
					domain: BASE_DOMAIN,
				});
			});

			it("should throw an error when deleting a non-existent cookie", () => {
				const credentials = new CookieCredentials();

				assert.throws(() => {
					credentials.deleteCookie({
						name: "session",
						value: "123",
						domain: BASE_DOMAIN,
					});
				}, /Cookie does not exist/gi);
			});

			it("should throw an error when name is missing", () => {
				const credentials = new CookieCredentials();

				assert.throws(() => {
					credentials.deleteCookie({
						value: "123",
						domain: BASE_DOMAIN,
					});
				}, /name is required/gi);
			});

			it("should throw an error when domain is missing", () => {
				const credentials = new CookieCredentials();

				assert.throws(() => {
					credentials.deleteCookie({
						name: "session",
					});
				}, /Domain is required/gi);
			});
		});
	});

	describe("getHeadersForRequest()", () => {
		describe("Base URL set", () => {
			it("should return headers with matching cookies", () => {
				const credentials = new CookieCredentials(BASE_URL);
				credentials.setCookie({
					name: "session",
					value: "123",
				});

				const headers = credentials.getHeadersForRequest(
					new Request(BASE_URL),
				);
				assert.strictEqual(headers.get("Cookie"), "session=123");
			});

			it("should not return headers with non-matching cookies", () => {
				const credentials = new CookieCredentials(SUB_URL);
				credentials.setCookie({
					name: "session",
					value: "123",
				});

				const headers = credentials.getHeadersForRequest(
					new Request(BASE_URL),
				);
				assert.strictEqual(headers.get("Cookie"), null);
			});

			it("should return headers with matching cookies for subdirectory", () => {
				const credentials = new CookieCredentials(BASE_URL);
				credentials.setCookie({
					name: "session",
					value: "123",
				});

				const headers = credentials.getHeadersForRequest(
					new Request(BASE_URL + "/admin"),
				);
				assert.strictEqual(headers.get("Cookie"), "session=123");
			});

			it("should not return headers with non-matching cookies for subdirectory", () => {
				const credentials = new CookieCredentials(BASE_URL);
				credentials.setCookie({
					name: "session",
					value: "123",
					path: "/admin",
				});

				const headers = credentials.getHeadersForRequest(
					new Request(BASE_URL),
				);

				assert.strictEqual(headers.get("Cookie"), null);
			});

			it("should not return headers when the cookie is deleted", () => {
				const credentials = new CookieCredentials(BASE_URL);
				credentials.setCookie({
					name: "session",
					value: "123",
				});
				credentials.deleteCookie({
					name: "session",
					value: "123",
				});

				const headers = credentials.getHeadersForRequest(
					new Request(BASE_URL),
				);
				assert.strictEqual(headers.get("Cookie"), null);
			});
		});

		describe("No base URL set", () => {
			it("should return headers with matching cookies", () => {
				const credentials = new CookieCredentials();
				credentials.setCookie({
					name: "session",
					value: "123",
					domain: BASE_DOMAIN,
				});

				const headers = credentials.getHeadersForRequest(
					new Request(BASE_URL),
				);
				assert.strictEqual(headers.get("Cookie"), "session=123");
			});

			it("should not return headers with non-matching cookies", () => {
				const credentials = new CookieCredentials();
				credentials.setCookie({
					name: "session",
					value: "123",
					domain: SUB_DOMAIN,
				});

				const headers = credentials.getHeadersForRequest(
					new Request(BASE_URL),
				);
				assert.strictEqual(headers.get("Cookie"), null);
			});

			it("should not return headers with path that doesn't match request", () => {
				const credentials = new CookieCredentials();
				credentials.setCookie({
					name: "session",
					value: "123",
					domain: BASE_DOMAIN,
					path: "/admin",
				});

				const headers = credentials.getHeadersForRequest(
					new Request(BASE_URL),
				);
				assert.strictEqual(headers.get("Cookie"), null);
			});

			it("should not return headers when the cookie is deleted", () => {
				const credentials = new CookieCredentials();
				credentials.setCookie({
					name: "session",
					value: "123",
					domain: BASE_DOMAIN,
				});
				credentials.deleteCookie({
					name: "session",
					value: "123",
					domain: BASE_DOMAIN,
				});

				const headers = credentials.getHeadersForRequest(
					new Request(BASE_URL),
				);
				assert.strictEqual(headers.get("Cookie"), null);
			});

			it("should not return headers when clear() is called", () => {
				const credentials = new CookieCredentials();
				credentials.setCookie({
					name: "session",
					value: "123",
					domain: BASE_DOMAIN,
				});
				credentials.clear();

				const headers = credentials.getHeadersForRequest(
					new Request(BASE_URL),
				);
				assert.strictEqual(headers.get("Cookie"), null);
			});
		});

		describe("with sameSite", () => {
			it("should include cookie with sameSite=strict for same-origin requests", () => {
				const credentials = new CookieCredentials(BASE_URL);
				credentials.setCookie({
					name: "session",
					value: "123",
					sameSite: "strict",
				});

				const request = new Request(BASE_URL);
				const headers = credentials.getHeadersForRequest(request);
				assert.strictEqual(headers.get("Cookie"), "session=123");
			});

			it("should not include cookie with sameSite=strict for cross-origin requests", () => {
				const credentials = new CookieCredentials(BASE_URL);
				credentials.setCookie({
					name: "session",
					value: "123",
					sameSite: "strict",
				});

				const request = new Request(BASE_URL);
				// Simulate a cross-origin request by adding an Origin header
				request.headers.set("Origin", "https://different-origin.com");

				const headers = credentials.getHeadersForRequest(request);
				assert.strictEqual(headers.get("Cookie"), null);
			});

			it("should include cookie with sameSite=lax for cross-origin GET requests", () => {
				const credentials = new CookieCredentials(BASE_URL);
				credentials.setCookie({
					name: "session",
					value: "123",
					sameSite: "lax",
				});

				const request = new Request(BASE_URL, { method: "GET" });
				// Simulate a cross-origin request by adding an Origin header
				request.headers.set("Origin", "https://different-origin.com");

				const headers = credentials.getHeadersForRequest(request);
				assert.strictEqual(headers.get("Cookie"), "session=123");
			});

			it("should not include cookie with sameSite=lax for cross-origin POST requests", () => {
				const credentials = new CookieCredentials(BASE_URL);
				credentials.setCookie({
					name: "session",
					value: "123",
					sameSite: "lax",
				});

				const request = new Request(BASE_URL, { method: "POST" });
				// Simulate a cross-origin request by adding an Origin header
				request.headers.set("Origin", "https://different-origin.com");

				const headers = credentials.getHeadersForRequest(request);
				assert.strictEqual(headers.get("Cookie"), null);
			});

			it("should include cookie with sameSite=none for cross-origin requests", () => {
				const credentials = new CookieCredentials(BASE_URL);
				credentials.setCookie({
					name: "session",
					value: "123",
					sameSite: "none",
					secure: true,
				});

				const request = new Request(BASE_URL, { method: "POST" });
				// Simulate a cross-origin request by adding an Origin header
				request.headers.set("Origin", "https://different-origin.com");

				const headers = credentials.getHeadersForRequest(request);
				assert.strictEqual(headers.get("Cookie"), "session=123");
			});
		});
	});
});
