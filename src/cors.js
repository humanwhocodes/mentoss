/**
 * @fileoverview CORS utilities for Fetch API requests.
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Data
//-----------------------------------------------------------------------------

// the methods allowed for simple requests
export const corsSafeMethods = new Set(["GET", "HEAD", "POST"]);

// the headers allowed for simple requests
export const corsSafeHeaders = new Set([
	"accept",
	"accept-language",
	"content-language",
	"content-type",
	"range",
]);

// the content types allowed for simple requests
const corsSimpleContentTypes = new Set([
	"application/x-www-form-urlencoded",
	"multipart/form-data",
	"text/plain",
]);

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
 * Asserts that the response has the correct CORS headers.
 * @param {Response} response The response to check.
 * @param {string} origin The origin to check against.
 * @returns {void}
 * @throws {Error} When the response doesn't have the correct CORS headers.
 */
export function assertCorsResponse(response, origin) {
	const originHeader = response.headers.get(CORS_ALLOW_ORIGIN);

	if (!originHeader) {
		throw new Error(
			`Access to fetch at '${response.url}' from origin '${origin}' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.`,
		);
	}

	if (originHeader !== "*" && originHeader !== origin) {
		throw new Error(
			`Access to fetch at '${response.url}' from origin '${origin}' has been blocked by CORS policy: The 'Access-Control-Allow-Origin' header has a value '${originHeader}' that is not equal to the supplied origin.`,
		);
	}

	const exposedHeaders = response.headers.get(CORS_EXPOSE_HEADERS);

	if (exposedHeaders) {
		throw new Error("Access-Control-Expose-Headers is not yet supported.");
	}
}

/**
 * Determines if a request is a simple CORS request.
 * @param {Request} request The request to check.
 * @returns {boolean} `true` if the request is a simple CORS request, `false` otherwise.
 */
export function isCorsSimpleRequest(request) {
	// if it's not a simple method then it's not a simple request
	if (!corsSafeMethods.has(request.method)) {
		return false;
	}

	// check all headers to ensure they're allowed
	const headers = request.headers;

	for (const header of headers.keys()) {
		if (!corsSafeHeaders.has(header)) {
			return false;
		}
	}

	// check the content type
	const contentType = headers.get("content-type");

	if (contentType && !corsSimpleContentTypes.has(contentType)) {
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
	 * The exposed headers for this URL.
	 * @type {Set<string>}
	 */
	exposedHeaders = new Set();

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

		const exposeHeaders = headers.get(CORS_EXPOSE_HEADERS);
		if (exposeHeaders) {
			this.exposedHeaders = new Set(
				exposeHeaders.toLowerCase().split(", "),
			);
		}

		this.maxAge = Number(headers.get(CORS_MAX_AGE)) || Infinity;
	}

	/**
	 * Validates a method against the preflight data.
	 * @param {string} method The method to validate.
	 * @returns {void}
	 * @throws {Error} When the method is not allowed.
	 */
	#validateMethod(method) {
		if (
			!this.allowAllMethods &&
			!corsSafeMethods.has(method) &&
			!this.allowedMethods.has(method)
		) {
			throw new Error(
				`Request is blocked by CORS policy: Method ${method} is not allowed.`,
			);
		}
	}

	/**
	 * Validates a set of headers against the preflight data.
	 * @param {Headers} headers The headers to validate.
	 * @returns {void}
	 * @throws {Error} When the headers are not allowed.
	 */
	#validateHeaders(headers) {
		for (const header of headers.keys()) {
			// simple headers are always allowed
			if (corsSafeHeaders.has(header)) {
				continue;
			}

			// Authorization is only allowed if explicitly mentioned
			if (
				header === "authorization" &&
				!this.allowedHeaders.has(header)
			) {
				throw new Error(
					`Request is blocked by CORS policy: Header ${header} is not allowed.`,
				);
			}

			if (!this.allowAllHeaders && !this.allowedHeaders.has(header)) {
				throw new Error(
					`Request is blocked by CORS policy: Header ${header} is not allowed.`,
				);
			}
		}
	}

	/**
	 * Validates a request against the preflight data.
	 * @param {Request} request The request to validate.
	 * @returns {void}
	 * @throws {Error} When the request is not allowed.
	 */
	validate(request) {
		this.#validateMethod(request.method);
		this.#validateHeaders(request.headers);
	}
}
