/**
 * @fileoverview A class that represents cookie-based credentials.
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/**
 * @typedef {Object} Cookie
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
 * @param {string} domain The domain string to verify.
 * @throws {Error} If the domain is not valid.
 */
function assertValidDomain(domain) {
    const domainPattern = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,}$/;
    if (!domainPattern.test(domain)) {
        throw new TypeError(`Invalid domain: ${domain}`);
    }
}

/**
 * @implements {Cookie}
 */
class CookieData {
    
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
     * @param {string} options.domain The domain of the cookie.
     * @param {string} [options.path=""] The path of the cookie.
     * @param {boolean} [options.secure=false] The secure flag of the cookie.
     * @param {boolean} [options.httpOnly=false] The HTTP-only flag of the cookie.
     */
    constructor({ name, value, domain, path = "", secure = false, httpOnly = false }) {
        this.name = name;
        this.value = value;
        this.domain = domain;
        this.path = path;
        this.secure = secure;
        this.httpOnly = httpOnly;
    }
    
    toString() {
        let cookieString = `${this.name}=${this.value}`;

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

        return cookieString;
    }
}

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

/**
 * A class that represents cookie-based credentials.
 */
export class CookieCredentials {
    
    /**
     * The domain for the cookie credentials.
     * @type {string}
     */
    #domain;
    
    /**
     * The cookies for the cookie credentials.
     * @type {Map<string, string>}
     */
    #cookies = new Map();
    
    /**
     * Creates a new CookieCredentials instance.
     * @param {string} domain The domain for the cookie credentials.
     */
    constructor(domain) {
        assertValidDomain(domain);
        this.#domain = domain;
    }
    
    /**
     * Gets the domain for the cookie credentials.
     * @returns {string} The domain for the cookie credentials.
     */
    get domain() {
        return this.#domain;
    }
    
    /**
     * Sets a cookie for the cookie credentials.
     * @param {Cookie} cookie The cookie to set.
     * @returns {void}
     */
    setCookie(cookie) {
        const cookieData = new CookieData(cookie);
        this.#cookies.set(cookie.name, cookieData);
    }
}
