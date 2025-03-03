/**
 * @fileoverview The RequestMatcher class.
 * @author Nicholas C. Zakas
 */

/* globals FormData, URLPattern, URLSearchParams */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import "urlpattern-polyfill";

//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/** @typedef {import("./types.js").RequestPattern} RequestPattern */
/** @typedef {import("./types.js").HttpBody} HttpBody */

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

/**
 * Deeply compares two objects. `actual` is considered to match `expected`
 * if all properties in `expected` are present in `actual` and have the same
 * value. All properties in `actual` need not be present in `expected`.
 * @param {Record<string, any>} actual The first object to compare.
 * @param {Record<string, any>} expected The second object to compare.
 * @returns {boolean} True if the objects are deeply equal, false if not.
 */
function deepCompare(actual, expected) {
	return Object.entries(expected).every(([key, value]) => {
		if (value && typeof value === "object") {
			return deepCompare(actual[key], value);
		} else {
			return value === actual[key];
		}
	});
}

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

/**
 * Represents a matcher for a request.
 */
export class RequestMatcher {
	/**
	 * The method to match.
	 * @type {string}
	 */
	#method = "";

	/**
	 * The URL pattern to match.
	 * @type {URLPattern}
	 * @readonly
	 */
	#pattern;

	/**
	 * The body of the request to match.
	 * @type {HttpBody}
	 */
	#body;

	/**
	 * The headers to match.
	 * @type {Record<string, string>}
	 */
	#headers;

	/**
	 * The query string to match.
	 * @type {Record<string, string> | undefined}
	 */
	#query;

	/**
	 * The URL parameters to match.
	 * @type {Record<string, string> | undefined}
	 */
	#params;

	/**
	 * Creates a new instance.
	 * @param {object} options The options for the route.
	 * @param {string} options.method The method to match.
	 * @param {string} options.url The URL to match.
	 * @param {string} options.baseUrl The base URL to prepend to the url.
	 * @param {HttpBody} [options.body] The body to match.
	 * @param {Record<string, string>} [options.headers] The headers to match.
	 * @param {Record<string, string>} [options.query] The query string to match.
	 * @param {Record<string, string>} [options.params] The URL parameters to match.
	 */
	constructor({
		method,
		url,
		baseUrl,
		body = null,
		headers = {},
		query,
		params,
	}) {
		this.#method = method;
		
		/*
		 * URLPattern treats a leading slash as being an absolute path from
		 * the domain in the base URL (if present). So if the URL is /api
		 * and the base URL is https://example.com/v1, the URLPattern will
		 * match https://example.com/api. To avoid this, we remove the leading
		 * slash from the URL if it's present and add a trailing slash to the
		 * base URL if it's not present.
		 */
		this.#pattern = new URLPattern(
			url.startsWith("/") ? url.slice(1) : url,
			!baseUrl || baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
		);
		this.#body = body;
		this.#headers = headers;
		this.#query = query;
		this.#params = params;
	}

	/**
	 * Checks if the request matches the matcher. Traces all of the details to help
	 * with debugging.
	 * @param {RequestPattern} request The request to check.
	 * @returns {{matches:boolean, messages:string[], params:Record<string, string|undefined>, query:URLSearchParams}} True if the request matches, false if not.
	 */
	traceMatches(request) {
		
		/*
		 * Check the URL first. This is helpful for tracing when requests don't match
		 * because people more typically get the method wrong rather than the URL.
		 */
		const urlMatch = this.#pattern.exec(request.url);
		if (!urlMatch) {
			return {
				matches: false,
				messages: ["❌ URL does not match."],
				params: {},
				query: new URLSearchParams(),
			};
		}

		const messages = ["✅ URL matches."];
		const params = urlMatch.pathname.groups;
		const query = new URL(request.url).searchParams;

		// Method check
		if (request.method.toLowerCase() !== this.#method.toLowerCase()) {
			return {
				matches: false,
				messages: [
					...messages,
					`❌ Method does not match. Expected ${this.#method.toUpperCase()} but received ${request.method.toUpperCase()}.`,
					],
				params,
				query,
			};
		}

		messages.push(`✅ Method matches: ${this.#method.toUpperCase()}.`);

		// then check query string
		const expectedQuery = this.#query;

		if (expectedQuery) {
			const actualQuery = request.query;

			if (!actualQuery) {
				return {
					matches: false,
					messages: [
						...messages,
						"❌ Query string does not match. Expected query string but received none.",
					],
					params,
					query,
				};
			}

			for (const [key, value] of Object.entries(expectedQuery)) {
				if (actualQuery[key] !== value) {
					return {
						matches: false,
						messages: [
							...messages,
							`❌ Query string does not match. Expected ${key}=${value} but received ${key}=${actualQuery[key]}.`,
						],
						params,
						query,
					};
				}
			}
		}

		// then check URL parameters
		const expectedParams = this.#params;

		if (expectedParams) {
			const actualParams = urlMatch.pathname.groups;

			if (!actualParams) {
				return {
					matches: false,
					messages: [
						...messages,
						"❌ URL parameters do not match. Expected parameters but received none.",
					],
					params,
					query,
				};
			}

			for (const [key, value] of Object.entries(expectedParams)) {
				if (actualParams[key] !== value) {
					return {
						matches: false,
						messages: [
							...messages,
							`❌ URL parameters do not match. Expected ${key}=${value} but received ${key}=${actualParams[key]}.`,
						],
						params,
						query,
					};
				}
			}

			messages.push("✅ URL parameters match.");
		}

		// then check the headers in a case-insensitive manner
		if (request.headers) {
			const expectedHeaders = Object.entries(this.#headers).map(
				([key, value]) => [key.toLowerCase(), value],
			);
			const actualHeaders = Object.entries(request.headers).map(
				([key, value]) => [key.toLowerCase(), value],
			);

			for (const [key, value] of expectedHeaders) {
				const actualValue = actualHeaders.find(
					([actualKey]) => actualKey === key,
				);
				if (!actualValue || actualValue[1] !== value) {
					return {
						matches: false,
						messages: [
							...messages,
							`❌ Headers do not match. Expected ${key}=${value} but received ${key}=${actualValue ? actualValue[1] : "none"}.`,
						],
						params,
						query,
					};
				}
			}

			messages.push("✅ Headers match.");
		}

		// then check the body
		if (this.#body !== undefined && this.#body !== null) {
			// if there's no body on the actual request then it can't match
			if (request.body === null || request.body === undefined) {
				return {
					matches: false,
					messages: [
						...messages,
						"❌ Body does not match. Expected body but received none.",
					],
					params,
					query,
				};
			}

			if (typeof this.#body === "string") {
				if (this.#body !== request.body) {
					return {
						matches: false,
						messages: [
							...messages,
							`❌ Body does not match. Expected ${this.#body} but received ${request.body}`,
						],
						params,
						query,
					};
				}

				messages.push(`✅ Body matches`);
			} else if (this.#body instanceof FormData) {
				if (!(request.body instanceof FormData)) {
					return {
						matches: false,
						messages: [
							...messages,
							"❌ Body does not match. Expected FormData but received none.",
						],
						params,
						query,
					};
				}

				for (const [key, value] of this.#body.entries()) {
					if (request.body.get(key) !== value) {
						return {
							matches: false,
							messages: [
								...messages,
								`❌ Body does not match. Expected ${key}=${value} but received ${key}=${request.body.get(key)}.`,
							],
							params,
							query,
						};
					}
				}

				messages.push("✅ Body matches.");
			} else if (this.#body instanceof ArrayBuffer) {
				if (!(request.body instanceof ArrayBuffer)) {
					return {
						matches: false,
						messages: [
							...messages,
							`❌ Body does not match. Expected ArrayBuffer but received ${request.body.constructor.name}.`,
						],
						params,
						query,
					};
				}

				// compare array buffers
				if (request.body.byteLength !== this.#body.byteLength) {
					return {
						matches: false,
						messages: [
							...messages,
							`❌ Body does not match. Expected array buffer byte length ${this.#body.byteLength} but received ${request.body.byteLength}`,
						],
						params,
						query,
					};
				}

				// convert into uint8arrays to compare
				const expectedBody = new Uint8Array(this.#body);
				const actualBody = new Uint8Array(request.body);

				for (let i = 0; i < expectedBody.length; i++) {
					if (expectedBody[i] !== actualBody[i]) {
						return {
							matches: false,
							messages: [
								...messages,
								`❌ Body does not match. Expected byte ${i} to be ${expectedBody[i]} but received ${actualBody[i]}.`,
							],
							params,
							query,
						};
					}
				}

				messages.push("✅ Body matches.");
			} else {
				// body must be an object here to run a check
				if (typeof request.body !== "object") {
					return {
						matches: false,
						messages: [
							...messages,
							"❌ Body does not match. Expected object but received none.",
						],
						params,
						query,
					};
				}
				
				// body is an object so proceed
				if (!deepCompare(request.body, this.#body)) {
					return {
						matches: false,
						messages: [
							...messages,
							`❌ Body does not match. Expected ${JSON.stringify(this.#body)} but received ${JSON.stringify(request.body)}.`,
						],
						params,
						query,
					};
				}

				messages.push("✅ Body matches.");
			}
		}

		return {
			matches: true,
			messages,
			params,
			query,
		};
	}

	/**
	 * Checks if the request matches the matcher.
	 * @param {RequestPattern} request The request to check.
	 * @returns {boolean} True if the request matches, false if not.
	 */
	matches(request) {
		return this.traceMatches(request).matches;
	}
}
