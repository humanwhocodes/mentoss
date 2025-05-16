/**
 * @fileoverview The MockServer class.
 * @author Nicholas C. Zakas
 */

/* global Response, FormData, setTimeout */

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
/** @typedef {import("./types.js").MethodlessRequestPattern} MethodlessRequestPattern */
/** @typedef {import("./types.js").ResponsePattern} ResponsePattern */
/** @typedef {import("./types.js").ResponseCreator} ResponseCreator */

/**
 * @typedef {Object} Trace
 * @property {string} title The route that was checked.
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
function assertValidRequestPattern(requestPattern) {
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
 * Asserts that a request pattern does not have a method.
 * @param {any} request The request pattern to check.
 * @returns {void}
 * @throws {TypeError} If the request pattern has a method.
 */
function assertNoMethod(request) {
	if (request.method) {
		throw new TypeError("Request pattern must not include a method.");
	}
}

/**
 * Asserts that a response pattern is valid.
 * @param {ResponsePattern} responsePattern The response pattern to check.
 * @returns {void}
 * @throws {TypeError} If the response pattern is invalid.
 */
function assertValidResponsePattern(responsePattern) {
	if (!responsePattern) {
		throw new TypeError("Response pattern is required.");
	}

	if (!("status" in responsePattern)) {
		throw new TypeError("Response pattern must include a status.");
	}

	if (responsePattern.status && typeof responsePattern.status !== "number") {
		throw new TypeError("Response pattern status must be a number.");
	}

	if (responsePattern.status && !statusTexts.has(responsePattern.status)) {
		throw new TypeError(
			`Response pattern status ${responsePattern.status} is not a valid HTTP status code.`,
		);
	}

	if (
		responsePattern.headers &&
		typeof responsePattern.headers !== "object"
	) {
		throw new TypeError("Response pattern headers must be an object.");
	}

	if (responsePattern.body) {
		const isString = typeof responsePattern.body === "string";
		const isObject = typeof responsePattern.body === "object";
		const isFormData = responsePattern.body instanceof FormData;
		const isArrayBuffer = responsePattern.body instanceof ArrayBuffer;

		if (!isString && !isFormData && !isArrayBuffer && !isObject) {
			throw new TypeError(
				"Response pattern body must be a string, object, ArrayBuffer, or FormData.",
			);
		}
	}
}

/**
 * Parses cookies from a Cookie header value
 * @param {string|null} cookieHeader The Cookie header value
 * @returns {Map<string,string>} A map of cookie names to values
 */
function parseCookies(cookieHeader) {
	const cookies = new Map();

	if (!cookieHeader) {
		return cookies;
	}

	cookieHeader.split(";").forEach(cookie => {
		const [name, value] = cookie.trim().split("=");
		cookies.set(decodeURIComponent(name), decodeURIComponent(value));
	});

	return cookies;
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
	 * The response to return for the route.
	 * @type {ResponsePattern|undefined}
	 */
	#response;

	/**
	 * The response pattern for the route.
	 * @type {ResponseCreator}
	 */
	#createResponse;

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
	 * @param {ResponsePattern|undefined} options.response The response to return.
	 * @param {ResponseCreator} options.createResponse The response creator to call.
	 * @param {string} options.baseUrl The base URL for the server.
	 */
	constructor({ request, response, createResponse, baseUrl }) {
		this.#request = request;
		this.#response = response;
		this.#createResponse = createResponse;
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
	 * @param {Request} request The request that was received.
	 * @param {typeof Response} PreferredResponse The Response constructor to use.
	 * @returns {Promise<Response>} The response to return.
	 */
	async createResponse(request, PreferredResponse) {
		const requestMatch = this.#matcher.traceMatches({
			method: request.method,
			url: request.url,
			headers: Object.fromEntries([...request.headers.entries()]),
		});

		const cookies = parseCookies(request.headers.get("cookie"));
		const response = await this.#createResponse(request, {
			cookies,
			params: requestMatch.params,
			query: requestMatch.query,
		});

		const { body, delay, ...init } =
			typeof response === "number" ? { status: response } : response;

		if (!init.status) {
			init.status = 200;
		}

		const statusText = statusTexts.get(init.status);

		// wait for the delay if there is one
		if (delay) {
			await new Promise(resolve => setTimeout(resolve, delay));
		}

		// if the body is an object, return JSON
		if (
			(body && typeof body === "object" && body.constructor === Object) ||
			Array.isArray(body)
		) {
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
		const status = this.#response?.status ?? "function";
		return `🚧 [Route: ${this.#request.method.toUpperCase()} ${this.#url} -> ${status}]`;
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
	#routes = [];

	/**
	 * The routes that have been matched.
	 * @type {WeakSet<Route>}
	 */
	#matched = new WeakSet();

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
	 * Returns the routes that have not been matched.
	 * @returns {Array<Route>} The unmatched routes.
	 */
	get #unmatchedRoutes() {
		return this.#routes.filter(route => !this.#matched.has(route));
	}

	/**
	 * Returns the routes that have been matched.
	 * @returns {Array<Route>} The matched routes.
	 */
	get #matchedRoutes() {
		return this.#routes.filter(route => this.#matched.has(route));
	}

	// #region: Adding Routes

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

		const requestPattern = /** @type {RequestPattern} */ ({
			method,
			...routeRequest,
		});

		assertValidRequestPattern(requestPattern);

		/** @type {ResponseCreator} */
		let createResponse;

		/** @type {ResponsePattern|undefined} */
		let responsePattern = undefined;

		/*
		 * We always want to create a new response function so that the
		 * route can more easily deal with generating responses. We
		 * don't always have a responsePattern if this is a function.
		 */
		if (typeof routeResponse === "function") {
			createResponse = /** @type {ResponseCreator} */ (routeResponse);
		} else {
			responsePattern = /** @type {ResponsePattern} */ (routeResponse);
			assertValidResponsePattern(responsePattern);
			createResponse = () =>
				/** @type {ResponsePattern} */ (responsePattern);
		}

		this.#routes.push(
			new Route({
				request: requestPattern,
				response: responsePattern,
				createResponse,
				baseUrl: this.baseUrl,
			}),
		);
	}

	/**
	 * Adds a new route to the server.
	 * @param {RequestPattern} request
	 * @param {ResponsePattern|ResponseCreator|number} response
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
	 * @param {MethodlessRequestPattern|string} request The request to match.
	 * @param {ResponsePattern|ResponseCreator|number} response The response to return.
	 */
	post(request, response) {
		assertNoMethod(request);
		this.#addRoute("POST", request, response);
	}

	/**
	 * Adds a new route that responds to a GET request.
	 * @param {MethodlessRequestPattern|string} request The request to match.
	 * @param {ResponsePattern|ResponseCreator|number} response The response to return.
	 */
	get(request, response) {
		assertNoMethod(request);
		this.#addRoute("GET", request, response);
	}

	/**
	 * Adds a new route that responds to a PUT request.
	 * @param {MethodlessRequestPattern|string} request The request to match.
	 * @param {ResponsePattern|ResponseCreator|number} response The response to return.
	 */
	put(request, response) {
		assertNoMethod(request);
		this.#addRoute("PUT", request, response);
	}

	/**
	 * Adds a new route that responds to a DELETE request.
	 * @param {MethodlessRequestPattern|string} request The request to match.
	 * @param {ResponsePattern|ResponseCreator|number} response The response to return.
	 */
	delete(request, response) {
		assertNoMethod(request);
		this.#addRoute("DELETE", request, response);
	}

	/**
	 * Adds a new route that responds to a PATCH request.
	 * @param {MethodlessRequestPattern|string} request The request to match.
	 * @param {ResponsePattern|ResponseCreator|number} response The response to return.
	 */
	patch(request, response) {
		assertNoMethod(request);
		this.#addRoute("PATCH", request, response);
	}

	/**
	 * Adds a new route that responds to a HEAD request.
	 * @param {MethodlessRequestPattern|string} request The request to match.
	 * @param {ResponsePattern|ResponseCreator|number} response The response to return.
	 */
	head(request, response) {
		assertNoMethod(request);
		this.#addRoute("HEAD", request, response);
	}

	/**
	 * Adds a new route that responds to an OPTIONS request.
	 * @param {MethodlessRequestPattern|string} request The request to match.
	 * @param {ResponsePattern|ResponseCreator|number} response The response to return.
	 */
	options(request, response) {
		assertNoMethod(request);
		this.#addRoute("OPTIONS", request, response);
	}

	// #endregion: Adding Routes

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
		// we need to clone the request before reading from it so we can use it again later
		const clonedRequest = request.clone();

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

		// save to avoid multiple calculations
		const routes = this.#unmatchedRoutes;
		const traces = [];

		/*
		 * Search for the first route that matches the request and return
		 * the response. When there's a match, remove the route from the
		 * list of routes so it can't be matched again.
		 */

		for (let i = 0; i < routes.length; i++) {
			const route = routes[i];
			const trace = route.traceMatches(requestPattern);

			if (trace.matches) {
				this.#matched.add(route);

				/*
				 * Response constructor doesn't allow setting the URL so we
				 * need to set it after creating the response.
				 */
				const response = await route.createResponse(
					clonedRequest,
					PreferredResponse,
				);

				return { response, traces };
			}

			traces.push({ ...trace, title: route.toString() });
		}

		/*
		 * If we made it here, then no route matched the request. We need to
		 * now check if any called routes match the request and produce a trace
		 * for each of them.
		 */
		const matchedRoutes = this.#matchedRoutes;

		for (let i = 0; i < matchedRoutes.length; i++) {
			const route = matchedRoutes[i];
			const trace = route.traceMatches(requestPattern);

			trace.messages.push("❌ Route was already called.");

			traces.push({ ...trace, title: route.toString() });
		}

		return { response: undefined, traces };
	}

	// #region Testing Helpers

	/**
	 * Traces the details of called routes to see if any match the given request pattern.
	 * For each called route, collects trace information. If no match is found in called routes, also checks unmatched routes.
	 * @param {RequestPattern|string} request The request pattern to check.
	 * @returns {{traces: Array<Trace>, matched: boolean}} Trace results and match status.
	 */
	traceCalled(request) {
		const requestPattern =
			typeof request === "string"
				? { method: "GET", url: request }
				: request;

		assertValidRequestPattern(requestPattern);

		// if the URL doesn't begin with the baseUrl then add it
		if (!requestPattern.url.startsWith(this.baseUrl)) {
			requestPattern.url = new URL(requestPattern.url, this.baseUrl).href;
		}

		const traces = [];
		const matchedRoutes = this.#matchedRoutes;
		const unmatchedRoutes = this.#unmatchedRoutes;

		for (const route of matchedRoutes) {
			const trace = route.traceMatches(requestPattern);
			if (trace.matches) {
				// Immediately return: match found, so traces is empty and matched is true
				return { traces: [], matched: true };
			}
			traces.push({ ...trace, title: route.toString() });
		}

		for (const route of unmatchedRoutes) {
			const trace = route.traceMatches(requestPattern);
			traces.push({ ...trace, title: route.toString() });
		}

		return { traces, matched: false };
	}

	/**
	 * Determines if a route has been called.
	 * @param {RequestPattern|string} request The request pattern to check.
	 * @returns {boolean} `true` if the route was called, `false` if not.
	 * @throws {Error} If both matched is false and traces is an empty array.
	 */
	called(request) {
		const { traces, matched } = this.traceCalled(request);
		if (!matched && traces.length === 0) {
			throw new Error(
				"This request pattern doesn't match any registered routes.",
			);
		}
		return matched;
	}

	/**
	 * Returns the routes that have not been called.
	 * @returns {string[]} The unmatched routes.
	 */
	get uncalledRoutes() {
		return this.#unmatchedRoutes.map(route => route.toString());
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
		this.#routes = [];
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
				`Not all routes were called. Uncalled routes::\n\n${urls.join("\n")}`,
			);
		}
	}

	// #endregion: Testing Helpers
}
