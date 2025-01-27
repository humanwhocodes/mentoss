/**
 * @fileoverview The MockServer class.
 * @author Nicholas C. Zakas
 */

/* global Response, FormData */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { RequestMatcher } from "./request-matcher.js";
import { statusTexts } from "./http.js";
import { getBody } from "./util.js";

//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/** @typedef {import("./types.js").RequestPattern} RequestPattern */
/** @typedef {import("./types.js").ResponsePattern} ResponsePattern */

/**
 * @typedef {Object} Trace
 * @property {Route} route The route that was checked.
 * @property {boolean} matches Whether the route matches the request.
 * @property {string[]} messages The messages explaining why the route doesn't match.
 */

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

/**
 * Asserts that a request pattern is valid.
 * @param {RequestPattern} requestPattern The request pattern to check.
 * @returns {void}
 * @throws {TypeError} If the request pattern is invalid.
 */
export function assertValidRequestPattern(requestPattern) {
	if (!requestPattern.url) {
		throw new TypeError("Request pattern must include a URL.");
	}

	if (!requestPattern.method) {
		throw new TypeError("Request pattern must include a method.");
	}

	if (typeof requestPattern.method !== "string") {
		throw new TypeError("Request pattern method must be a string.");
	}

	if (typeof requestPattern.url !== "string") {
		throw new TypeError("Request pattern URL must be a string.");
	}

	if (requestPattern.headers && typeof requestPattern.headers !== "object") {
		throw new TypeError("Request pattern headers must be an object.");
	}

	if (requestPattern.body) {
		const isString = typeof requestPattern.body === "string";
		const isObject = typeof requestPattern.body === "object";
		const isFormData = requestPattern.body instanceof FormData;

		if (!isString && !isObject && !isFormData) {
			throw new TypeError(
				"Request pattern body must be a string, object, or FormData.",
			);
		}
	}
}

/**
 * Represents a route that the server can respond to.
 */
export class Route {
	/**
	 * The request pattern for the route.
	 * @type {RequestPattern}
	 */
	#request;

	/**
	 * The response pattern for the route.
	 * @type {ResponsePattern}
	 */
	#response;

	/**
	 * The matcher for the route.
	 * @type {RequestMatcher}
	 */
	#matcher;

	/**
	 * The full URL for the route.
	 * @type {string}
	 */
	#url;

	/**
	 * Creates a new instance.
	 * @param {Object} options The route options.
	 * @param {RequestPattern} options.request The request to match.
	 * @param {ResponsePattern} options.response The response to return.
	 * @param {string} options.baseUrl The base URL for the server.
	 */
	constructor({ request, response, baseUrl }) {
		this.#request = request;
		this.#response = response;
		this.#matcher = new RequestMatcher({ baseUrl, ...request });
		this.#url = new URL(request.url, baseUrl).href;
	}

	/**
	 * Checks if the route matches a request.
	 * @param {RequestPattern} request The request to check.
	 * @returns {boolean} `true` if the route matches, `false` if not.
	 */
	matches(request) {
		return this.#matcher.matches(request);
	}

	/**
	 * Traces the details of the request to see why it doesn't match.
	 * @param {RequestPattern} request The request to check.
	 * @returns {{matches:boolean, messages:string[]}} The trace match result.
	 */
	traceMatches(request) {
		return this.#matcher.traceMatches(request);
	}

	/**
	 * Creates a Response object from a route's response pattern. If the body
	 * is an object then the response will be JSON; if the body is a string
	 * then the response will be text; otherwise the response will be bytes.
	 * @param {typeof Response} PreferredResponse The Response constructor to use.
	 * @returns {Response} The response to return.
	 */
	createResponse(PreferredResponse) {
		const { body, ...init } = this.#response;

		if (!init.status) {
			init.status = 200;
		}

		const statusText = statusTexts.get(init.status);

		// if the body is an object, return JSON
		if (typeof body === "object") {
			return new PreferredResponse(JSON.stringify(body), {
				...init,
				statusText,
				headers: {
					"content-type": "application/json",
					...init.headers,
				},
			});
		}

		// if the body is a string, return text
		if (typeof body === "string") {
			return new PreferredResponse(body, {
				...init,
				statusText,
				headers: {
					"content-type": "text/plain",
					...init.headers,
				},
			});
		}

		// otherwise return the body as bytes
		return new PreferredResponse(body, {
			...init,
			statusText,
			headers: {
				"content-type": "application/octet-stream",
				...init.headers,
			},
		});
	}

	/**
	 * Returns a string representation of the route.
	 * @returns {string} The string representation of the route.
	 */
	toString() {
		return `[Route: ${this.#request.method.toUpperCase()} ${this.#url} -> ${this.#response.status}]`;
	}
}

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

/**
 * Represents a server that can respond to requests from `fetch()`.
 */
export class MockServer {
	/**
	 * The routes that the server can respond to.
	 * @type {Array<Route>}
	 */
	#unmatchedRoutes = [];

	/**
	 * The routes the server has already responded to.
	 * @type {Array<Route>}
	 */
	#matchedRoutes = [];

	/**
	 * The base URL for the server.
	 * @type {string}
	 * @readonly
	 */
	baseUrl = "";

	/**
	 * Creates a new instance.
	 * @param {string} baseUrl The base URL for the server.
	 */
	constructor(baseUrl) {
		this.baseUrl = baseUrl;
	}

	/**
	 * Adds a new route to the mock server.
	 * @param {string} method The HTTP method for the route (e.g., 'GET', 'POST').
	 * @param {string|object} request The request URL as a string or an object containing request details.
	 * @param {number|object} response The response status code as a number or an object containing response details.
	 */
	#addRoute(method, request, response) {
		const routeRequest =
			typeof request === "string" ? { url: request } : request;
		const routeResponse =
			typeof response === "number" ? { status: response } : response;

		this.#unmatchedRoutes.push(
			new Route({
				request: /** @type {RequestPattern} */ ({
					method,
					...routeRequest,
				}),
				response: /** @type {ResponsePattern} */ (routeResponse),
				baseUrl: this.baseUrl,
			}),
		);
	}

	/**
	 * Adds a new route to the server.
	 * @param {RequestPattern} request
	 * @param {ResponsePattern|number} response
	 */
	route(request, response) {
		// assert that method is provided
		if (!request.method) {
			throw new Error("Request pattern must include a method.");
		}

		this.#addRoute(request.method, request, response);
	}

	/**
	 * Adds a new route that responds to a POST request.
	 * @param {RequestPattern|string} request The request to match.
	 * @param {ResponsePattern|number} response The response to return.
	 */
	post(request, response) {
		this.#addRoute("POST", request, response);
	}

	/**
	 * Adds a new route that responds to a GET request.
	 * @param {RequestPattern|string} request The request to match.
	 * @param {ResponsePattern|number} response The response to return.
	 */
	get(request, response) {
		this.#addRoute("GET", request, response);
	}

	/**
	 * Adds a new route that responds to a PUT request.
	 * @param {RequestPattern|string} request The request to match.
	 * @param {ResponsePattern|number} response The response to return.
	 */
	put(request, response) {
		this.#addRoute("PUT", request, response);
	}

	/**
	 * Adds a new route that responds to a DELETE request.
	 * @param {RequestPattern|string} request The request to match.
	 * @param {ResponsePattern|number} response The response to return.
	 */
	delete(request, response) {
		this.#addRoute("DELETE", request, response);
	}

	/**
	 * Adds a new route that responds to a PATCH request.
	 * @param {RequestPattern|string} request The request to match.
	 * @param {ResponsePattern|number} response The response to return.
	 */
	patch(request, response) {
		this.#addRoute("PATCH", request, response);
	}

	/**
	 * Adds a new route that responds to a HEAD request.
	 * @param {RequestPattern|string} request The request to match.
	 * @param {ResponsePattern|number} response The response to return.
	 */
	head(request, response) {
		this.#addRoute("HEAD", request, response);
	}

	/**
	 * Adds a new route that responds to an OPTIONS request.
	 * @param {RequestPattern|string} request The request to match.
	 * @param {ResponsePattern|number} response The response to return.
	 */
	options(request, response) {
		this.#addRoute("OPTIONS", request, response);
	}

	/**
	 * Generates a `Response` for the given `Request` if a route matches.
	 * @param {Request} request The request to respond to.
	 * @param {typeof Response} [PreferredResponse] The Response constructor to use.
	 * @returns {Promise<Response|undefined>} The response to return.
	 */
	async receive(request, PreferredResponse = Response) {
		return (await this.traceReceive(request, PreferredResponse)).response;
	}

	/**
	 * Traces the details of the request to see why it doesn't match.
	 * @param {Request} request The request to check.
	 * @param {typeof Response} [PreferredResponse] The Response constructor to use.
	 * @returns {Promise<{response:Response|undefined,traces: Array<Trace>}>} The trace match result.
	 */
	async traceReceive(request, PreferredResponse = Response) {
		// convert into a RequestPattern so each route doesn't have to read the body
		const requestPattern = {
			method: request.method,
			url: request.url,
			headers: Object.fromEntries([...request.headers.entries()]),
			query: Object.fromEntries(
				new URL(request.url).searchParams.entries(),
			),
			body: await getBody(request),
		};

		const traces = [];

		/*
		 * Search for the first route that matches the request and return
		 * the response. When there's a match, remove the route from the
		 * list of routes so it can't be matched again.
		 */

		for (let i = 0; i < this.#unmatchedRoutes.length; i++) {
			const route = this.#unmatchedRoutes[i];
			const trace = route.traceMatches(requestPattern);

			if (trace.matches) {
				this.#unmatchedRoutes.splice(i, 1);
				this.#matchedRoutes.push(route);

				/*
				 * Response constructor doesn't allow setting the URL so we
				 * need to set it after creating the response.
				 */
				const response = route.createResponse(PreferredResponse);
				Object.defineProperty(response, "url", { value: request.url });

				return { response, traces };
			}

			traces.push({ ...trace, route });
		}

		return { response: undefined, traces };
	}

	/**
	 * Determines if a route has been called.
	 * @param {RequestPattern|string} request The request pattern to check.
	 * @returns {boolean} `true` if the route was called, `false` if not.
	 */
	called(request) {
		const requestPattern =
			typeof request === "string"
				? { method: "GET", url: request }
				: request;

		assertValidRequestPattern(requestPattern);

		// if the URL doesn't being with the baseUrl then add it
		if (!requestPattern.url.startsWith(this.baseUrl)) {
			requestPattern.url = new URL(requestPattern.url, this.baseUrl).href;
		}

		return this.#matchedRoutes.some(route => route.matches(requestPattern));
	}

	/**
	 * Determines if all routes have been called.
	 * @returns {boolean} `true` if all routes have been called, `false` if not.
	 */
	allRoutesCalled() {
		return this.#unmatchedRoutes.length === 0;
	}

	/**
	 * Clears all routes and history from the server.
	 * @returns {void}
	 */
	clear() {
		this.#unmatchedRoutes = [];
		this.#matchedRoutes = [];
	}

	/**
	 * Asserts that all routes have been called.
	 * @returns {void}
	 * @throws {Error} If any routes have not been called.
	 */
	assertAllRoutesCalled() {
		if (this.#unmatchedRoutes.length > 0) {
			const urls = this.#unmatchedRoutes.map(route => route.toString());
			throw new Error(
				`Expected all routes to be called but the following routes were not called:\n\n${urls.join("\n")}`,
			);
		}
	}
}
