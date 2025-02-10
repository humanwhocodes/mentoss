/**
 * @fileoverview A class that represents cookie-based credentials.
 * @author Nicholas C. Zakas
 */

/* global Headers */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { parseUrl } from "./util.js";

//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/** @typedef {import("./types.js").Credentials} Credentials */

/**
 * @typedef {Object} CookieInfo
 * @property {string} name The name of the cookie.
 * @property {string} value The value of the cookie.
 * @property {string} [domain] The domain of the cookie.
 * @property {string} [path] The path of the cookie.
 * @property {boolean} [secure] The secure flag of the cookie.
 * @property {boolean} [httpOnly] The HTTP-only flag of the cookie.
 */

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

/**
 * Asserts that a string is a valid domain that does not include a protocol or path.
 * @param {string|undefined} domain The domain string to verify.
 * @throws {Error} If the domain is not valid.
 */
function assertValidDomain(domain) {
	if (!domain) {
		throw new TypeError("Domain is required.");
	}

	const domainPattern = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,}$/;
	if (!domainPattern.test(domain)) {
		throw new TypeError(`Invalid domain: ${domain}`);
	}
}

/**
 * Represents a cookie.
 * @implements {CookieInfo}
 */
class Cookie {
	/**
	 * The name of the cookie.
	 * @type {string}
	 */
	name;

	/**
	 * The value of the cookie.
	 * @type {string}
	 */
	value;

	/**
	 * The domain of the cookie.
	 * @type {string}
	 */
	domain;

	/**
	 * The path of the cookie.
	 * @type {string}
	 */
	path;

	/**
	 * The secure flag of the cookie.
	 * @type {boolean}
	 */
	secure;

	/**
	 * The HTTP-only flag of the cookie.
	 * @type {boolean}
	 */
	httpOnly;

	/**
	 * Creates a new CookieData instance.
	 * @param {Object} options The options for the cookie.
	 * @param {string} options.name The name of the cookie.
	 * @param {string} options.value The value of the cookie.
	 * @param {string|undefined} options.domain The domain of the cookie.
	 * @param {string} [options.path=""] The path of the cookie.
	 * @param {boolean} [options.secure=false] The secure flag of the cookie.
	 * @param {boolean} [options.httpOnly=false] The HTTP-only flag of the cookie.
	 */
	constructor({
		name,
		value,
		domain,
		path = "/",
		secure = false,
		httpOnly = false,
	}) {
		assertValidDomain(domain);

		if (!name) {
			throw new TypeError("Cookie name is required.");
		}

		if (!value) {
			throw new TypeError("Cookie value is required.");
		}

		this.name = name;
		this.value = value;
		this.domain = /** @type {string} */ (domain);
		this.path = path;
		this.secure = secure;
		this.httpOnly = httpOnly;
	}

	/**
	 * Gets a unique key for this cookie. This is used to store the cookie
	 * in the credentials map to uniquely identify cookies based on their
	 * properties.
	 * @returns {string}
	 */
	get key() {
		return Cookie.getKey(this.name, this.domain, this.path, this.secure);
	}

	/**
	 * Checks if this cookie is a credential for the given request.
	 * @param {Request} request The request to check.
	 * @return {boolean} True if this cookie is a credential for the request.
	 */
	isCredentialForRequest(request) {
		const url = parseUrl(request.url);

		return (
			url.hostname.endsWith(this.domain) &&
			url.pathname.startsWith(this.path) &&
			(this.secure ? url.protocol === "https:" : true)
		);
	}

	/**
	 * Converts this cookie to a cookie header string.
	 * @return {string} The cookie header string.
	 */
	toCookieHeaderString() {
		return `${encodeURIComponent(this.name)}=${encodeURIComponent(this.value)}`;
	}

	/**
	 * Returns a string representation of the cookie.
	 * @return {string} The string representation of the cookie.
	 */
	toString() {
		let cookieString = `🍪 [Cookie: ${this.name}=${this.value}`;

		if (this.domain) {
			cookieString += `; Domain=${this.domain}`;
		}

		if (this.path) {
			cookieString += `; Path=${this.path}`;
		}

		if (this.secure) {
			cookieString += `; Secure`;
		}

		if (this.httpOnly) {
			cookieString += `; HttpOnly`;
		}

		return cookieString + "]";
	}
	
	/**
	 * Returns a unique key for a cookie based on its properties.
	 * @param {string} name The name of the cookie.
	 * @param {string} domain The domain of the cookie.
	 * @param {string} [path="/"] The path of the cookie.
	 * @param {boolean} [secure=false] The secure flag of the cookie.
	 * @returns {string} The unique key for the cookie.
	 */
	static getKey(name, domain, path = "/", secure = false) {
		return JSON.stringify([name, domain, path, secure]);
	}
}

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

/**
 * A class that represents cookie-based credentials.
 * @implements {Credentials}
 */
export class CookieCredentials {
	/**
	 * The domain for the cookie credentials.
	 * @type {string|undefined}
	 */
	#domain;

	/**
	 * The cookies for the cookie credentials.
	 * @type {Map<string,Cookie>}
	 */
	#cookies = new Map();

	/**
	 * The base URL for the cookie credentials. This will be overwritten
	 * by the fetch mocker when in use.
	 * @type {string}
	 */
	#basePath = "/";

	/**
	 * Creates a new CookieCredentials instance.
	 * @param {string|URL} [baseUrl] The base URL for the credentials
	 */
	constructor(baseUrl) {
		if (baseUrl) {
			const url = parseUrl(baseUrl);
			this.#domain = url.hostname;
			this.#basePath = url.pathname;
		}
	}

	/**
	 * Gets the domain for the cookie credentials.
	 * @returns {string|undefined} The domain for the cookie credentials.
	 */
	get domain() {
		return this.#domain;
	}

	/**
	 * Gets the base path for the cookie credentials.
	 * @return {string} The base path for the cookie credentials.
	 */
	get basePath() {
		return this.#basePath;
	}

	/**
	 * Sets a cookie for the cookie credentials.
	 * @param {CookieInfo} cookieInfo The cookie to set.
	 * @returns {void}
	 * @throws {TypeError} If the cookie already exists.
	 * @throws {TypeError} If the cookie domain does not match the credentials domain.
	 */
	setCookie(cookieInfo) {
		const cookie = new Cookie({
			domain: this.#domain,
			path: this.#basePath,
			...cookieInfo,
		});
		const cookieKey = cookie.key;

		if (this.#cookies.has(cookieKey)) {
			throw new TypeError(`Cookie already exists: ${cookie.toString()}`);
		}

		if (this.#domain && !cookie.domain.endsWith(this.#domain)) {
			throw new TypeError(
				`Cookie domain must end with ${this.#domain}: ${cookie.toString()}`,
			);
		}

		this.#cookies.set(cookie.key, cookie);
	}

	/**
	 * Deletes a cookie from the cookie credentials.
	 * @param {Omit<CookieInfo, "value">} cookieInfo The cookie to delete.
	 * @returns {void}
	 * @throws {TypeError} If the cookie does not exist.
	 */
	deleteCookie(cookieInfo) {
		
		
		if (!cookieInfo.name) {
			throw new TypeError("Cookie name is required.");
		}
		
		if (!cookieInfo.domain && !this.#domain) {
			throw new TypeError("Domain is required to delete a cookie.");
		}
		
		const cookieKey = Cookie.getKey(cookieInfo.name, String(cookieInfo.domain ?? this.#domain), cookieInfo.path, cookieInfo.secure);

		if (!this.#cookies.has(cookieKey)) {
			throw new TypeError(`Cookie does not exist: ${cookieInfo.toString()}`);
		}

		this.#cookies.delete(cookieKey);
	}

	/**
	 * Gets the credentials headers for the given request.
	 * @param {Request} request The request to get the credentials for.
	 * @return {Headers} The credentials headers for the request.
	 */
	getHeadersForRequest(request) {
		const headers = new Headers();
		const cookies = [];

		for (const cookie of this.#cookies.values()) {
			if (cookie.isCredentialForRequest(request)) {
				cookies.push(cookie.toCookieHeaderString());
			}
		}

		if (cookies.length > 0) {
			headers.append("Cookie", cookies.join("; "));
		}

		return headers;
	}

	/**
	 * Clears all cookies from the cookie credentials.
	 * @returns {void}
	 */
	clear() {
		this.#cookies.clear();
	}
}
