/**
 * @fileoverview The FetchMocker class.
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/** @typedef {import("./types.js").RequestPattern} RequestPattern */
/** @typedef {import("./types.js").ResponsePattern} ResponsePattern */
/** @typedef {import("./mock-server.js").MockServer} MockServer */

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

		// create the function here to bind to `this`
		this.fetch = async (input, init) => {
			const request = new this.#Request(input, init);

			/*
			 * Note: Each server gets its own copy of the request so that it
			 * can read the body without interfering with any other servers.
			 */
			for (const server of this.#servers) {
				const requestClone = request.clone();
				const response = await server.receive(
					requestClone,
					this.#Response,
				);
				if (response) {
					return response;
				}
			}

			// throw an error saying the route wasn't matched
			throw new Error(
				`No route matched for ${request.method} ${request.url}`,
			);
		};
	}

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
}
