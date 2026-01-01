/**
 * @fileoverview The MockAgent class for undici.
 * @author Nicholas C. Zakas
 */

/* globals Buffer */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { NoRouteMatchedError } from "./util.js";
import { Readable } from "node:stream";

//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/** @typedef {import("./mock-server.js").MockServer} MockServer */

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

/**
 * Converts undici headers format to a Headers object.
 * @param {Record<string, string | string[]> | string[] | Iterable<[string, string]>} headers The headers to convert.
 * @returns {Headers} The converted headers.
 */
function convertUndiciHeaders(headers) {
	const result = new Headers();

	if (Array.isArray(headers)) {
		// Headers can be an array of strings like ['key1', 'value1', 'key2', 'value2']
		for (let i = 0; i < headers.length; i += 2) {
			result.append(headers[i], headers[i + 1]);
		}
	} else if (headers && typeof headers === "object") {
		// Or an object like { key: value } or { key: [value1, value2] }
		for (const [key, value] of Object.entries(headers)) {
			if (Array.isArray(value)) {
				for (const v of value) {
					result.append(key, v);
				}
			} else {
				result.append(key, value);
			}
		}
	}

	return result;
}

/**
 * Converts a body to a Buffer for undici.
 * @param {any} body The body to convert.
 * @returns {Promise<Buffer>} The converted body.
 */
async function convertBodyToBuffer(body) {
	if (!body) {
		return Buffer.alloc(0);
	}

	if (Buffer.isBuffer(body)) {
		return body;
	}

	if (typeof body === "string") {
		return Buffer.from(body);
	}

	if (body instanceof ArrayBuffer) {
		return Buffer.from(body);
	}

	if (body instanceof Uint8Array) {
		return Buffer.from(body);
	}

	// Handle streams
	if (body instanceof Readable) {
		const chunks = [];
		for await (const chunk of body) {
			chunks.push(chunk);
		}
		return Buffer.concat(chunks);
	}

	// Handle iterables
	if (
		typeof body[Symbol.iterator] === "function" ||
		typeof body[Symbol.asyncIterator] === "function"
	) {
		const chunks = [];
		for await (const chunk of body) {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
		}
		return Buffer.concat(chunks);
	}

	// Default: stringify the body
	return Buffer.from(JSON.stringify(body));
}

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

/**
 * A class for mocking HTTP requests in undici.
 * Implements the undici Dispatcher interface.
 */
export class MockAgent {
	/**
	 * The registered servers for the agent.
	 * @type {MockServer[]}
	 */
	#servers = [];

	/**
	 * Whether the agent has been closed.
	 * @type {boolean}
	 */
	#closed = false;

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
	 * Creates a new instance.
	 * @param {object} options Options for the instance.
	 * @param {MockServer[]} options.servers The servers to use.
	 * @param {typeof Response} [options.CustomResponse] The Response constructor to use.
	 * @param {typeof Request} [options.CustomRequest] The Request constructor to use.
	 */
	constructor({
		servers,
		CustomRequest = globalThis.Request,
		CustomResponse = globalThis.Response,
	}) {
		this.#servers = servers;
		this.#Response = CustomResponse;
		this.#Request = CustomRequest;

		// must be at least one server
		if (!servers || servers.length === 0) {
			throw new TypeError("At least one server is required.");
		}
	}

	/**
	 * Dispatches an HTTP request through the mock servers.
	 * @param {object} options The dispatch options.
	 * @param {string|URL} options.origin The origin of the request.
	 * @param {string} options.path The path of the request.
	 * @param {string} [options.method='GET'] The HTTP method.
	 * @param {any} [options.body] The request body.
	 * @param {Record<string, string | string[]> | string[] | Iterable} [options.headers] The request headers.
	 * @param {object} handler The handler for the response.
	 * @param {Function} handler.onConnect Callback when connection is established.
	 * @param {Function} handler.onHeaders Callback when headers are received.
	 * @param {Function} handler.onData Callback when data is received.
	 * @param {Function} handler.onComplete Callback when request is complete.
	 * @param {Function} handler.onError Callback when an error occurs.
	 * @returns {boolean} Returns true if the request was dispatched successfully.
	 */
	dispatch(options, handler) {
		if (this.#closed) {
			if (handler.onError) {
				handler.onError(new Error("MockAgent is closed"));
			}
			return false;
		}

		// Process the request asynchronously
		this.#processRequest(options, handler).catch(err => {
			if (handler.onError) {
				handler.onError(err);
			}
		});

		return true;
	}

	/**
	 * Processes a request internally.
	 * @param {object} options The dispatch options.
	 * @param {object} handler The handler for the response.
	 * @returns {Promise<void>} A promise that resolves when the request is complete.
	 */
	async #processRequest(options, handler) {
		try {
			const { origin, path, method = "GET", body, headers = {} } = options;

			// Construct the full URL
			const url = new URL(path, origin).href;

			// Convert headers to the format expected by Request
			const requestHeaders = convertUndiciHeaders(headers);

			// Create a Request object
			const request = new this.#Request(url, {
				method,
				headers: requestHeaders,
				body: body ? await convertBodyToBuffer(body) : null,
			});

			// Notify that connection is established
			if (handler.onConnect) {
				handler.onConnect(() => {
					// abort function - for now we don't support aborting
				});
			}

			// Try to get a response from the servers
			const response = await this.#internalFetch(request, body);

			// Send headers to handler
			if (handler.onHeaders) {
				const responseHeaders = [];
				for (const [key, value] of response.headers) {
					responseHeaders.push(key, value);
				}

				handler.onHeaders(
					response.status,
					responseHeaders,
					() => {
						// resume function - for now we don't need to pause/resume
					},
				);
			}

			// Send body data to handler
			if (handler.onData) {
				const bodyText = await response.text();
				if (bodyText) {
					const bodyBuffer = Buffer.from(bodyText);
					handler.onData(bodyBuffer);
				}
			}

			// Notify completion
			if (handler.onComplete) {
				handler.onComplete([]);
			}
		} catch (err) {
			if (handler.onError) {
				handler.onError(err);
			}
		}
	}

	/**
	 * An internal fetch() implementation that runs against the given servers.
	 * @param {Request} request The request to fetch.
	 * @param {any} body The body of the request.
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
				// Set response.url and type
				Object.defineProperties(response, {
					url: { value: request.url },
					type: { value: "default" },
				});
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
		throw new NoRouteMatchedError(request, body, possibleTraces);
	}

	/**
	 * Closes the agent. No new requests will be accepted after this.
	 * @returns {Promise<void>} A promise that resolves when the agent is closed.
	 */
	async close() {
		this.#closed = true;
	}

	/**
	 * Destroys the agent immediately. This is an alias for close().
	 * @returns {Promise<void>} A promise that resolves when the agent is destroyed.
	 */
	async destroy() {
		return this.close();
	}

	// #region: Testing Helpers

	/**
	 * Determines if a request was made.
	 * @param {string|import("./types.js").RequestPattern} request The request to match.
	 * @returns {boolean} `true` if the request was made, `false` otherwise.
	 */
	called(request) {
		const requestPattern =
			typeof request === "string"
				? { method: "GET", url: request }
				: request;

		return this.#servers.some(server => {
			try {
				return server.called(requestPattern);
			} catch (err) {
				// If the server throws an error, it means no routes match
				return false;
			}
		});
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

	/**
	 * Clears all data from the servers.
	 * @returns {void}
	 */
	clearAll() {
		this.#servers.forEach(server => server.clear());
	}

	// #endregion: Testing Helpers
}
