/**
 * @fileoverview The FetchMocker class.
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { stringifyRequest } from "./util.js";
import {
	isCorsSimpleRequest,
	CorsPreflightData,
	assertCorsResponse,
	processCorsResponse,
	validateCorsRequest,
	CORS_REQUEST_METHOD,
	CORS_REQUEST_HEADERS,
	CORS_ORIGIN,
	CorsPreflightError,
	getUnsafeHeaders,
} from "./cors.js";
import { createCustomRequest } from "./custom-request.js";

//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/** @typedef {import("./types.js").RequestPattern} RequestPattern */
/** @typedef {import("./types.js").Credentials} Credentials */
/** @typedef {import("./mock-server.js").MockServer} MockServer */
/** @typedef {import("./mock-server.js").Trace} Trace */

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

/**
 * Formats a message for when no route is matched.
 * @param {Request} request The request that wasn't matched.
 * @param {string|any|FormData|null} body The body of the request.
 * @param {Trace[]} traces The traces from the servers.
 * @returns {string} The formatted message.
 */
function formatNoRouteMatchedMessage(request, body, traces) {
	return `No route matched for ${request.method} ${request.url}.

Full Request:

${stringifyRequest(request, body)}

Partial matches:

${
	traces
		.map(trace => {
			let traceMessage = `${trace.title}:`;

			trace.messages.forEach(message => {
				traceMessage += `\n  ${message}`;
			});

			return traceMessage;
		})
		.join("\n\n") || "No partial matches found."
}`;
}

/**
 * Creates a base URL from a URL or string. This is also validates
 * the URL to ensure it's valid. Empty strings are invalid.
 * @param {string|URL|undefined} baseUrl The base URL to create.
 * @returns {URL|undefined} The created base URL.
 * @throws {TypeError} When the base URL is an empty string.
 * @throws {TypeError} When the base URL is not a string or URL.
 */
function createBaseUrl(baseUrl) {
	if (baseUrl === undefined) {
		return undefined;
	}

	if (baseUrl === "") {
		throw new TypeError("Base URL cannot be an empty string.");
	}

	if (baseUrl instanceof URL) {
		return baseUrl;
	}

	if (typeof baseUrl !== "string") {
		throw new TypeError("Base URL must be a string or URL object.");
	}

	return new URL(baseUrl);
}

/**
 * Determines if two URL are of the same origin based on the same origin
 * policy instituted by browsers.
 * @param {URL} requestUrl The URL of the request.
 * @param {URL} baseUrl The base URL to compare against.
 * @returns {boolean} `true` if the URLs are of the same origin, `false` otherwise.
 */
function isSameOrigin(requestUrl, baseUrl) {
	return requestUrl.origin === baseUrl.origin;
}

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

/**
 * A class for mocking the `fetch` function.
 */
export class FetchMocker {
	/**
	 * The registered servers for `fetch`.
	 * @type {MockServer[]}
	 */
	#servers = [];

	/**
	 * The credentials for `fetch`.
	 * @type {Credentials[]}
	 */
	#credentials;

	/**
	 * The CORS preflight data for each URL.
	 * @type {Map<string, CorsPreflightData>}
	 */
	#corsPreflightData = new Map();

	/**
	 * The Response constructor to use.
	 * @type {typeof Response}
	 */
	#Response;

	/**
	 * The Request constructor to use.
	 * @type {typeof Request}
	 */
	#Request;

	/**
	 * The base URL to use for relative URLs.
	 * @type {URL|undefined}
	 */
	#baseUrl;

	/**
	 * The global fetch function.
	 * @type {typeof fetch}
	 */
	#globalFetch = globalThis.fetch;

	/**
	 * The created fetch function.
	 * @type {typeof fetch}
	 */
	fetch;

	/**
	 * Creates a new instance.
	 * @param {object} options Options for the instance.
	 * @param {MockServer[]} options.servers The servers to use.
	 * @param {string|URL} [options.baseUrl] The base URL to use for relative URLs.
	 * @param {Credentials[]} [options.credentials] The credentials to use.
	 * @param {typeof Response} [options.CustomResponse] The Response constructor to use.
	 * @param {typeof Request} [options.CustomRequest] The Request constructor to use.
	 */
	constructor({
		servers,
		baseUrl,
		credentials = [],
		CustomRequest = globalThis.Request,
		CustomResponse = globalThis.Response,
	}) {
		this.#servers = servers;
		this.#credentials = credentials;
		this.#baseUrl = createBaseUrl(baseUrl);
		this.#Response = CustomResponse;
		this.#Request = createCustomRequest(CustomRequest);

		// must be least one server
		if (!servers || servers.length === 0) {
			throw new TypeError("At least one server is required.");
		}

		// credentials can only be used if there is a base URL
		if (credentials.length > 0 && !baseUrl) {
			throw new TypeError(
				"Credentials can only be used with a base URL.",
			);
		}

		// create the function here to bind to `this`
		this.fetch = async (input, init) => {
			// first check to see if the request has been aborted
			const signal = init?.signal;
			signal?.throwIfAborted();

			// TODO: For some reason this causes Mocha tests to fail with "multiple done"
			// signal?.addEventListener("abort", () => {
			// 	throw new Error("Fetch was aborted.");
			// });

			// adjust any relative URLs
			const fixedInput =
				typeof input === "string" && this.#baseUrl
					? new URL(input, this.#baseUrl).toString()
					: input;

			const request = new this.#Request(fixedInput, init);
			let useCors = false;
			let useCorsCredentials = false;
			let preflightData;

			// if there's a base URL then we need to check for CORS
			if (this.#baseUrl) {
				const requestUrl = new URL(request.url);

				if (isSameOrigin(requestUrl, this.#baseUrl)) {
					// if we aren't explicitly blocking credentials then add them
					if (request.credentials !== "omit") {
						this.#attachCredentialsToRequest(request);
					}
				} else {
					useCors = true;
					const includeCredentials =
						request.credentials === "include";
						
					validateCorsRequest(request, this.#baseUrl.origin);

					if (isCorsSimpleRequest(request)) {
						if (includeCredentials) {
							useCorsCredentials = true;
							this.#attachCredentialsToRequest(request);
						}
					} else {
						preflightData = await this.#preflightFetch(request);
						preflightData.validate(request, this.#baseUrl.origin);

						if (includeCredentials) {
							if (!preflightData.allowCredentials) {
								throw new CorsPreflightError(
									request.url,
									this.#baseUrl.origin,
									"No 'Access-Control-Allow-Credentials' header is present on the requested resource.",
								);
							}

							useCorsCredentials = true;
							this.#attachCredentialsToRequest(request);
						}
					}

					// add the origin header to the request
					request.headers.append("origin", this.#baseUrl.origin);

					// if the preflight response is successful, then we can make the actual request
				}
			}

			signal?.throwIfAborted();

			const response = await this.#internalFetch(request, init?.body);

			if (useCors && this.#baseUrl) {
				processCorsResponse(
					response,
					this.#baseUrl.origin,
					useCorsCredentials,
				);
			}

			signal?.throwIfAborted();

			return response;
		};
	}

	/**
	 * Attaches credentials to a request.
	 * @param {Request} request The request to attach credentials to.
	 * @returns {void}
	 */
	#attachCredentialsToRequest(request) {
		if (this.#credentials.length === 0) {
			return;
		}

		for (const credentials of this.#credentials) {
			const credentialHeaders = credentials.getHeadersForRequest(request);

			if (credentialHeaders) {
				for (const [key, value] of credentialHeaders) {
					request.headers.append(key, value);
				}
			}
		}
	}

	/**
	 * An internal fetch() implementation that runs against the given servers.
	 * @param {Request} request The request to fetch.
	 * @param {string|any|FormData|null} body The body of the request.
	 * @returns {Promise<Response>} The response from the fetch.
	 * @throws {Error} When no route is matched.
	 */
	async #internalFetch(request, body = null) {
		const allTraces = [];

		/*
		 * Note: Each server gets its own copy of the request so that it
		 * can read the body without interfering with any other servers.
		 */
		for (const server of this.#servers) {
			const requestClone = request.clone();
			const { response, traces } = await server.traceReceive(
				requestClone,
				this.#Response,
			);

			if (response) {
				return response;
			}

			allTraces.push(...traces);
		}

		/*
		 * To find possible traces, filter out all of the traces that only
		 * have one message. This is because a single message means that
		 * the URL wasn't matched, so there's no point in reporting that.
		 */
		const possibleTraces = allTraces.filter(
			trace => trace.messages.length > 1,
		);

		// throw an error saying the route wasn't matched
		throw new Error(
			formatNoRouteMatchedMessage(request, body, possibleTraces),
		);
	}

	/**
	 * Creates a preflight request for a URL.
	 * @param {Request} request The request to create a preflight request for.
	 * @returns {Request} The preflight request.
	 * @throws {Error} When there is no base URL.
	 * @see https://fetch.spec.whatwg.org/#cors-preflight-fetch
	 */
	#createPreflightRequest(request) {
		if (!this.#baseUrl) {
			throw new Error(
				"Cannot create preflight request without a base URL.",
			);
		}
		
		const nonsimpleHeaders = getUnsafeHeaders(request);
		
		/** @type {Record<string,string>} */
		const headers = {
			Accept: "*/*",
			[CORS_REQUEST_METHOD]: request.method,
			[CORS_ORIGIN]: this.#baseUrl.origin,
		};
		
		if (nonsimpleHeaders.length > 0) {
			headers[CORS_REQUEST_HEADERS] = nonsimpleHeaders.join(",");
		}

		return new this.#Request(request.url, {
			method: "OPTIONS",
			headers,
			mode: "cors",
			referrer: request.referrer,
			referrerPolicy: request.referrerPolicy,
		});
	}

	/**
	 * Fetches the preflight data for a URL. Uses the local cache if available,
	 * otherwise fetches the data from the server.
	 * @param {Request} request The request to fetch preflight data for.
	 * @returns {Promise<CorsPreflightData>} The preflight data for the URL.
	 */
	async #preflightFetch(request) {
		if (!this.#baseUrl) {
			throw new Error("Cannot fetch preflight data without a base URL.");
		}

		// first check the cache
		let preflightData = this.#corsPreflightData.get(request.url);

		if (preflightData) {
			return preflightData;
		}

		// create the preflight request
		const preflightRequest = this.#createPreflightRequest(request);
		const preflightResponse = await this.#internalFetch(preflightRequest);

		// if the preflight response is successful, then we can make the actual request
		if (!preflightResponse.ok) {
			throw new CorsPreflightError(
				preflightRequest.url,
				this.#baseUrl.origin,
				"It does not have HTTP ok status.",
			);
		}

		assertCorsResponse(preflightResponse, this.#baseUrl.origin);

		// create the preflight data
		preflightData = new CorsPreflightData(preflightResponse.headers);

		// cache the preflight data
		this.#corsPreflightData.set(preflightRequest.url, preflightData);

		return preflightData;
	}

	// #region: Testing Helpers

	/**
	 * Determines if a request was made.
	 * @param {string|RequestPattern} request The request to match.
	 * @returns {boolean} `true` if the request was made, `false` otherwise.
	 */
	called(request) {
		const requestPattern =
			typeof request === "string"
				? { method: "GET", url: request }
				: request;

		return this.#servers.some(server => server.called(requestPattern));
	}

	/**
	 * Determines if all routes were called.
	 * @returns {boolean} `true` if all routes were called, `false` otherwise.
	 */
	allRoutesCalled() {
		return this.#servers.every(server => server.allRoutesCalled());
	}

	/**
	 * Gets the uncalled routes.
	 * @return {string[]} The uncalled routes.
	 */
	get uncalledRoutes() {
		return this.#servers.flatMap(server => server.uncalledRoutes);
	}

	/**
	 * Asserts that all routes were called.
	 * @returns {void}
	 * @throws {Error} When not all routes were called.
	 */
	assertAllRoutesCalled() {
		const uncalledRoutes = this.uncalledRoutes;

		if (uncalledRoutes.length > 0) {
			throw new Error(
				`Not all routes were called. Uncalled routes:\n${uncalledRoutes.join(
					"\n",
				)}`,
			);
		}
	}

	// #endregion: Testing Helpers

	/**
	 * Unmocks the global fetch function.
	 * @returns {void}
	 */
	mockGlobal() {
		globalThis.fetch = this.fetch;
	}

	/**
	 * Restores the global fetch function.
	 * @returns {void}
	 */
	unmockGlobal() {
		globalThis.fetch = this.#globalFetch;
	}

	/**
	 * Clears the CORS preflight cache.
	 * @returns {void}
	 */
	clearPreflightCache() {
		this.#corsPreflightData.clear();
	}

	/**
	 * Clears all data from the fetch mocker. This include the CORS preflight
	 * cache as well as the routes on the servers. The servers themselves
	 * remain intact.
	 * @returns {void}
	 */
	clearAll() {
		this.#servers.forEach(server => server.clear());
		this.#credentials.forEach(credentials => credentials.clear());
		this.clearPreflightCache();
	}
}
