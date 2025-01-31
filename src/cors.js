/**
 * @fileoverview CORS utilities for Fetch API requests.
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Data
//-----------------------------------------------------------------------------

// the methods allowed for simple requests
export const safeMethods = new Set(["GET", "HEAD", "POST"]);

// the headers allowed for simple requests
export const safeRequestHeaders = new Set([
	"accept",
	"accept-language",
	"content-language",
	"content-type",
	"range",
]);

// the headers that are forbidden to be sent with requests
export const forbiddenRequestHeaders = new Set([
	"accept-charset",
	"accept-encoding",
	"access-control-request-headers",
	"access-control-request-method",
	"connection",
	"content-length",
	"cookie",
	"cookie2",
	"date",
	"dnt",
	"expect",
	"host",
	"keep-alive",
	"origin",
	"referer",
	"te",
	"trailer",
	"transfer-encoding",
	"upgrade",
	"user-agent",
	"via",
]);

// the headers that can be used to override the method
const methodOverrideRequestHeaders = new Set([
	"x-http-method",
	"x-http-method-override",
	"x-method-override",
]);

// the headers that are always allowed to be read from responses
export const safeResponseHeaders = new Set([
	"cache-control",
	"content-language",
	"content-type",
	"expires",
	"last-modified",
	"pragma",
]);

// the headers that are forbidden to be read from responses
export const forbiddenResponseHeaders = new Set([
	"set-cookie",
	"set-cookie2",
]);


// the content types allowed for simple requests
const simpleRequestContentTypes = new Set([
	"application/x-www-form-urlencoded",
	"multipart/form-data",
	"text/plain",
]);

// the methods that are forbidden to be used with CORS
const forbiddenMethods = new Set(["CONNECT", "TRACE", "TRACK"]);


export const CORS_ALLOW_ORIGIN = "Access-Control-Allow-Origin";
export const CORS_ALLOW_CREDENTIALS = "Access-Control-Allow-Credentials";
export const CORS_EXPOSE_HEADERS = "Access-Control-Expose-Headers";
export const CORS_ALLOW_METHODS = "Access-Control-Allow-Methods";
export const CORS_ALLOW_HEADERS = "Access-Control-Allow-Headers";
export const CORS_MAX_AGE = "Access-Control-Max-Age";
export const CORS_REQUEST_METHOD = "Access-Control-Request-Method";
export const CORS_REQUEST_HEADERS = "Access-Control-Request-Headers";
export const CORS_ORIGIN = "Origin";

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

/**
 * Checks if a method is forbidden for CORS.
 * @param {string} header The header to check.
 * @param {string} value The value to check.
 * @returns {boolean} `true` if the method is forbidden, `false` otherwise.
 * @see https://fetch.spec.whatwg.org/#forbidden-method
 */
function isForbiddenMethodOverride(header, value) {
	return methodOverrideRequestHeaders.has(header)
		&& forbiddenMethods.has(value.toUpperCase());
}

/**
 * Checks if a request header is forbidden for CORS.
 * @param {string} header The header to check.
 * @param {string} value The value to check.
 * @returns {boolean} `true` if the header is forbidden, `false` otherwise.
 * @see https://fetch.spec.whatwg.org/#forbidden-header-name
 */
function isForbiddenRequestHeader(header, value) { // eslint-disable-line no-unused-vars
	return forbiddenRequestHeaders.has(header)
		|| header.startsWith("proxy-")
		|| header.startsWith("sec-")
		|| isForbiddenMethodOverride(header, value);
}

/**
 * Checks if a Range header value is a simple range according to the Fetch API spec.
 * @see https://fetch.spec.whatwg.org/#http-headers
 * @param {string} range The range value to check.
 * @returns {boolean} `true` if the range is a simple range, `false` otherwise.
 */
function isSimpleRangeHeader(range) {
	// range must start with "bytes="
	if (!range.startsWith("bytes=")) {
		return false;
	}

	const ranges = range.slice(6).split(",");

	// only one range is allowed
	if (ranges.length > 1) {
		return false;
	}

	// range should be in the format 0-255, -255, or 0-
	const rangeParts = ranges[0].split("-");

	if (rangeParts.length > 2) {
		return false;
	}

	const firstIsNumber = /^\d+/.test(rangeParts[0]);
	const secondIsNumber = /^\d+/.test(rangeParts[1]);

	// if the first part is missing, the second must be a number
	if (rangeParts[0] === "") {
		return secondIsNumber;
	}

	// if the second part is missing, the first must be a number
	if (rangeParts[1] === "") {
		return firstIsNumber;
	}

	// if both parts are present, they must both be numbers
	return firstIsNumber && secondIsNumber;
}



//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

/**
 * Represents an error that occurs when a CORS request is blocked.
 */
export class CorsError extends Error {
	
	/**
	 * The name of the error.
	 * @type {string}
	 */
	name = "CorsError";
	
	/**
	 * Creates a new instance.
	 * @param {string} requestUrl The URL of the request.
	 * @param {string} origin The origin of the client making the request.
	 * @param {string} message The error message.
	 */
	constructor(requestUrl, origin, message) {
		super(`Access to fetch at '${requestUrl}' from origin '${origin}' has been blocked by CORS policy: ${message}`);
	}
}

/**
 * Asserts that the response has the correct CORS headers.
 * @param {Response} response The response to check.
 * @param {string} origin The origin to check against.
 * @returns {void}
 * @throws {Error} When the response doesn't have the correct CORS headers.
 */
export function assertCorsResponse(response, origin) {
	const originHeader = response.headers.get(CORS_ALLOW_ORIGIN);

	if (!originHeader) {
		throw new CorsError(
			response.url,
			origin,
			"Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource."
		);
	}

	if (originHeader !== "*" && originHeader !== origin) {
		throw new CorsError(
			response.url,
			origin,
			`The 'Access-Control-Allow-Origin' header has a value '${originHeader}' that is not equal to the supplied origin.`,
		);
	}
}

/**
 * Processes a CORS response to ensure it's valid and doesn't contain
 * any forbidden headers.
 * @param {Response} response The response to process.
 * @param {string} origin The origin of the request.
 * @returns {Response} The processed response.
 */
export function processCorsResponse(response, origin) {
	
	// first check that the response is allowed
	assertCorsResponse(response, origin);
	
	// check if the Access-Control-Expose-Headers header is present
	const exposedHeaders = response.headers.get(CORS_EXPOSE_HEADERS);
	const allowedHeaders = exposedHeaders
		? new Set(exposedHeaders.toLowerCase().split(", "))
		: new Set();
	
	// next filter out any headers that aren't allowed
	for (const key of response.headers.keys()) {
		
		// first check if the header is always allowed
		if (safeResponseHeaders.has(key)) {
			continue;
		}

		// next check if the header is never allowed
		if (forbiddenResponseHeaders.has(key)) {
			response.headers.delete(key);
			continue;
		}
		
		// finally check if the header is allowed by the server
		if (!allowedHeaders.has(key)) {
			response.headers.delete(key);
		}
	}
	
	return response;
}

/**
 * Determines if a request is a simple CORS request.
 * @param {Request} request The request to check.
 * @returns {boolean} `true` if the request is a simple CORS request, `false` otherwise.
 */
export function isCorsSimpleRequest(request) {
	// if it's not a simple method then it's not a simple request
	if (!safeMethods.has(request.method)) {
		return false;
	}

	// check all headers to ensure they're allowed
	const headers = request.headers;

	for (const header of headers.keys()) {
		if (!safeRequestHeaders.has(header)) {
			return false;
		}
	}

	// check the content type
	const contentType = headers.get("content-type");

	if (contentType && !simpleRequestContentTypes.has(contentType)) {
		return false;
	}

	// check the Range header
	const range = headers.get("range");

	if (range && !isSimpleRangeHeader(range)) {
		return false;
	}

	return true;
}

/**
 * A class for storing CORS preflight data.
 */
export class CorsPreflightData {
	/**
	 * The allowed methods for this URL.
	 * @type {Set<string>}
	 */
	allowedMethods = new Set();

	/**
	 * Whether all methods are allowed for this URL.
	 * @type {boolean}
	 */
	allowAllMethods = false;

	/**
	 * The allowed headers for this URL.
	 * @type {Set<string>}
	 **/
	allowedHeaders = new Set();

	/**
	 * Whether all headers are allowed for this URL.
	 * @type {boolean}
	 */
	allowAllHeaders = false;

	/**
	 * Whether credentials are allowed for this URL.
	 * @type {boolean}
	 */
	allowCredentials = false;

	/**
	 * The maximum age for this URL.
	 * @type {number}
	 */
	maxAge;

	/**
	 * Creates a new instance.
	 * @param {Headers} headers The headers to use.
	 */
	constructor(headers) {
		const allowMethods = headers.get(CORS_ALLOW_METHODS);
		if (allowMethods) {
			this.allowedMethods = new Set(
				allowMethods.toUpperCase().split(", "),
			);
			this.allowAllMethods = this.allowedMethods.has("*");
		}

		const allowHeaders = headers.get(CORS_ALLOW_HEADERS);
		if (allowHeaders) {
			this.allowedHeaders = new Set(
				allowHeaders.toLowerCase().split(", "),
			);
			this.allowAllHeaders = this.allowedHeaders.has("*");
		}

		this.allowCredentials = headers.get(CORS_ALLOW_CREDENTIALS) === "true";

		this.maxAge = Number(headers.get(CORS_MAX_AGE)) || Infinity;
		
		// Note: Access-Control-Expose-Headers is not honored on preflight requests
	}

	/**
	 * Validates a method against the preflight data.
	 * @param {Request} request The request with the method to validate.
	 * @param {string} origin The origin of the request.
	 * @returns {void}
	 * @throws {Error} When the method is not allowed.
	 */
	#validateMethod(request, origin) {
		
		const method = request.method.toUpperCase();
		
		if (
			!this.allowAllMethods &&
			!safeMethods.has(method) &&
			!this.allowedMethods.has(method)
		) {
			throw new CorsError(
				request.url,
				origin,
				`Method ${method} is not allowed.`,
			);
		}
	}

	/**
	 * Validates a set of headers against the preflight data.
	 * @param {Request} request The request with headers to validate.
	 * @param {string} origin The origin of the request.
	 * @returns {void}
	 * @throws {Error} When the headers are not allowed.
	 */
	#validateHeaders(request, origin) {
		
		const { headers } = request;
		
		for (const header of headers.keys()) {
			// simple headers are always allowed
			if (safeRequestHeaders.has(header)) {
				continue;
			}

			// Authorization is only allowed if explicitly mentioned
			if (
				header === "authorization" &&
				!this.allowedHeaders.has(header)
			) {
				throw new CorsError(
					request.url,
					origin,
					`Header ${header} is not allowed.`,
				);
			}

			if (!this.allowAllHeaders && !this.allowedHeaders.has(header)) {
				throw new CorsError(
					request.url,
					origin,
					`Header ${header} is not allowed.`,
				);
			}
		}
	}

	/**
	 * Validates a request against the preflight data.
	 * @param {Request} request The request to validate.
	 * @param {string} origin The origin of the request.
	 * @returns {void}
	 * @throws {Error} When the request is not allowed.
	 */
	validate(request, origin) {
		this.#validateMethod(request, origin);
		this.#validateHeaders(request, origin);
	}
}
