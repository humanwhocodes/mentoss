/**
 * @fileoverview The RequestMatcher class.
 * @author Nicholas C. Zakas
 */

/* globals FormData, URLPattern */

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
	 * @type {Record<string, string>|undefined}
	 */
	#query;

	/**
	 * Creates a new instance.
	 * @param {object} options The options for the route.
	 * @param {string} options.method The method to match.
	 * @param {string} options.url The URL to match.
	 * @param {string} options.baseUrl The base URL to prepend to the url.
	 * @param {HttpBody} [options.body] The body to match.
	 * @param {Record<string, string>} [options.headers] The headers to match.
	 * @param {Record<string, string>} [options.query] The query string to match.
	 */
	constructor({ method, url, baseUrl, body = null, headers = {}, query }) {
		this.#method = method;
		this.#pattern = new URLPattern(url, baseUrl);
		this.#body = body;
		this.#headers = headers;
		this.#query = query;
	}

	/**
	 * Checks if the request matches the matcher.
	 * @param {RequestPattern} request The request to check.
	 * @returns {boolean} True if the request matches, false if not.
	 */
	matches(request) {
		// first check the method
		if (request.method.toLowerCase() !== this.#method.toLowerCase()) {
			return false;
		}

		// then check the URL
		if (!this.#pattern.test(request.url)) {
			return false;
		}

		// then check query string
		const expectedQuery = this.#query;
		
		if (expectedQuery) {
			const actualQuery = request.query;
			
			if (!actualQuery) {
				return false;
			}
			
			for (const [key, value] of Object.entries(expectedQuery)) {
				if (actualQuery[key] !== value) {
					return false;
				}
			}
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
					return false;
				}
			}
		}

		// then check the body
		if (this.#body !== undefined && this.#body !== null) {
			// if there's no body on the actual request then it can't match
			if (request.body === null || request.body === undefined) {
				return false;
			}

			if (typeof this.#body === "string") {
				if (this.#body !== request.body) {
					return false;
				}
			} else if (this.#body instanceof FormData) {
				if (!(request.body instanceof FormData)) {
					return false;
				}

				for (const [key, value] of this.#body.entries()) {
					if (request.body.get(key) !== value) {
						return false;
					}
				}
			} else {
				// body must be an object here to run a check
				if (typeof request.body !== "object") {
					return false;
				}

				// body is an object so proceed
				if (!deepCompare(request.body, this.#body)) {
					return false;
				}
			}
		}

		return true;
	}
}
