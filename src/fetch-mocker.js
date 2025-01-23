/**
 * @fileoverview The FetchMocker class.
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { stringifyRequest } from "./util.js";
import { isCorsSimpleRequest, CORS_ALLOW_ORIGIN } from "./http.js";

//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/** @typedef {import("./types.js").RequestPattern} RequestPattern */
/** @typedef {import("./types.js").ResponsePattern} ResponsePattern */
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

${traces.map(trace => {
	
	let traceMessage = `🚧 ${trace.route.toString()}:`;
		
	trace.messages.forEach(message => {
		traceMessage += `\n  ${message}`;
	});
	
	return traceMessage;
}).join("\n\n") || "No partial matches found."}`;
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

/**
 * Asserts that the response has the correct CORS headers.
 * @param {Response} response The response to check.
 * @param {string} origin The origin to check against.
 * @returns {void}
 * @throws {Error} When the response doesn't have the correct CORS headers.
 */
function assertCorsResponse(response, origin) {
	
	const originHeader = response.headers.get(CORS_ALLOW_ORIGIN);

	if (!originHeader) {
		throw new Error(`Access to fetch at '${response.url}' from origin '${origin}' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.`);
	}
	
	if (originHeader !== "*" && originHeader !== origin) {
		throw new Error(`Access to fetch at '${response.url}' from origin '${origin}' has been blocked by CORS policy: The 'Access-Control-Allow-Origin' header has a value '${originHeader}' that is not equal to the supplied origin.`);
	}
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
	 * @param {typeof Response} [options.CustomResponse] The Response constructor to use.
	 * @param {typeof Request} [options.CustomRequest] The Request constructor to use.
	 */
	constructor({
		servers,
		baseUrl,
		CustomRequest = globalThis.Request,
		CustomResponse = globalThis.Response,
	}) {
		this.#servers = servers;
		this.#baseUrl = createBaseUrl(baseUrl);
		this.#Response = CustomResponse;
		this.#Request = CustomRequest;

		// create the function here to bind to `this`
		this.fetch = async (input, init) => {
			
			// adjust any relative URLs
			const fixedInput = typeof input === "string" && this.#baseUrl
				? new URL(input, this.#baseUrl).toString()
				: input;
			
			const request = new this.#Request(fixedInput, init);
			const allTraces = [];
			let useCors = false;
			
			// if there's a base URL then we need to check for CORS
			if (this.#baseUrl) {
				const requestUrl = new URL(request.url);
				
				if (!isSameOrigin(requestUrl, this.#baseUrl)) {
					
					useCors = true;
					
					// add the origin header to the request
					request.headers.append("origin", this.#baseUrl.origin);
					
					// if it's not a simple request then we'll need a preflight check
					if (!isCorsSimpleRequest(request)) {
						// const preflightRequest = new this.#Request(request.url, {
						// 	method: "OPTIONS",
						// 	headers:{
						// 		"Access-Control-Request-Method": request.method,
						// 		"Access-Control-Request-Headers": [...request.headers.keys()].join(","),
						// 		"origin": this.#baseUrl.origin,
						// 	},
						// });
						
						// const preflightResponse = await this.fetch(preflightRequest);
						
						// if (preflightResponse.status >= 400) {
						// 	throw new Error(`Request to ${requestUrl.origin} from ${this.#baseUrl.origin} is blocked by CORS policy.`);
					}
					
					// if the preflight response is successful, then we can make the actual request
				}
			}

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
					
					if (useCors && this.#baseUrl) {
						assertCorsResponse(response, this.#baseUrl.origin);
					}	
					
					return response;
				}
				
				allTraces.push(...traces);
			}
			
			/*
			 * To find possible traces, filter out all of the traces that only
			 * have one message. This is because a single message means that
			 * the URL wasn't matched, so there's no point in reporting that.
			 */
			const possibleTraces = allTraces.filter(trace => trace.messages.length > 1);

			// throw an error saying the route wasn't matched
			throw new Error(formatNoRouteMatchedMessage(request, init?.body, possibleTraces));
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
