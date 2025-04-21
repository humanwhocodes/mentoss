/**
 * @fileoverview A custom request class that allows for more control over requests.
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { assertValidNoCorsRequestInit } from "./cors.js";

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

/**
 * Creates a custom request class that extends a given Request class.
 * @param {typeof Request} RequestClass The class to extend.
 * @returns {typeof Request} The custom request class.
 */
export function createCustomRequest(RequestClass) {
	return class CustomRequest extends RequestClass {
		/**
		 * The ID of the request.
		 * @type {string}
		 */
		id = Math.random().toString(36).slice(2);

		/**
		 * Creates a new instance.
		 * @param {string|Request|URL} input The URL or Request object to fetch.
		 * @param {RequestInit} [init] The options for the fetch.
		 */
		constructor(input, init) {
			/*
			 * Not all runtimes validate the `mode` property correctly.
			 * To ensure consistency across runtimes, we do the validation
			 * and throw a consistent error.
			 */
			if (init?.mode === "no-cors") {
				assertValidNoCorsRequestInit(init);
			}

			super(input, init);

			// ensure id is not writable
			Object.defineProperty(this, "id", { writable: false });

			/*
			 * Default setting for `mode` is "cors" in the fetch API.
			 * Not all runtimes follow the spec, so we need to ensure
			 * that the `mode` property is set correctly.
			 */
			const expectedMode = init?.mode ?? "cors";

			if (expectedMode !== this.mode) {
				Object.defineProperty(this, "mode", {
					configurable: true,
					enumerable: true,
					value: expectedMode,
					writable: false,
				});
			}
			
			/*
			 * Default setting for `redirect` is "follow" in the fetch API.
			 * Not all runtimes follow the spec, so we need to ensure
			 * that the `redirect` property is set correctly.
			 */
			const expectedRedirect = init?.redirect ?? "follow";
			
			if (expectedRedirect !== this.redirect) {
				Object.defineProperty(this, "redirect", {
					configurable: true,
					enumerable: true,
					value: expectedRedirect,
					writable: false,
				});
			}

			/*
			 * Not all runtimes properly support the `credentials` property.
			 * Bun's fetch implementation sets credentials to "include" by default
			 * and doesn't allow overwriting that value when creating a Request.
			 * We therefore need to hack it together to make sure this works in
			 * Bun correctly.
			 * https://github.com/oven-sh/bun/issues/17052
			 *
			 * Deno doesn't support the `credentials` property on Request and
			 * it's undefined so we need to fix that as well.
			 */
			const expectedCredentials = init?.credentials ?? "same-origin";

			if (expectedCredentials !== this.credentials) {
				Object.defineProperty(this, "credentials", {
					configurable: true,
					enumerable: true,
					value: expectedCredentials,
					writable: false,
				});
			}
		}

		/**
		 * Clones the request. Clones shared the same ID.
		 * @returns {CustomRequest} A new instance of the request.
		 */
		clone() {
			/*
			 * This is a bit hacky. You can't create a new Request from
			 * one that has already been used, so we first need to create
			 * a clone of the request. Sadly, the clone is always a Request
			 * instance, so we need to create a new CustomRequest instance
			 * from that clone. This is the only way to ensure that the
			 * clone has the same class as the original request.
			 */
			const clonedRequest = new CustomRequest(super.clone());
			Object.defineProperty(clonedRequest, "id", { value: this.id });
			return clonedRequest;
		}
	};
}
