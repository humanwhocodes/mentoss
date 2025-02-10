/**
 * @fileoverview A custom request class that allows for more control over requests.
 * @author Nicholas C. Zakas
 */


//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

/**
 * Creates a custom request class that extends a given Request class.
 * @param {typeof Request} RequestClass The class to extend.
 * @returns {typeof Request} The custom request class.
 */
export function createCustomRequest(RequestClass) {
    
    return class CustomRequest extends RequestClass {

        /**
         * The ID of the request.
         * @type {string}
         */
        id = Math.random().toString(36).slice(2);
        
        /**
         * Creates a new instance.
         * @param {string|Request|URL} input The URL or Request object to fetch.
         * @param {RequestInit} [init] The options for the fetch.
         */
        constructor(input, init) {
            super(input, init);
            
            // ensure id is not writable
            Object.defineProperty(this, "id", { writable: false });
            
            /*
             * Not all runtimes properly support the `credentials` property.
			 * Bun's fetch implementation sets credentials to "include" by default
			 * and doesn't allow overwriting that value when creating a Request.
			 * We therefore need to hack it together to make sure this works in
			 * Bun correctly.
			 * https://github.com/oven-sh/bun/issues/17052
             * 
             * Deno doesn't support the `credentials` property on Request and
             * it's undefined so we need to fix that as well.
			 */
            const expectedCredentials = init?.credentials ?? "same-origin";
            
			if (expectedCredentials !== this.credentials) {
				Object.defineProperty(this, "credentials", {
					configurable: true,
					enumerable: true,
					value: expectedCredentials,
					writable: false,
				});
			}
        }
        
        /**
         * Clones the request. Clones shared the same ID.
         * @returns {CustomRequest} A new instance of the request.
         */
        clone() {
            const clonedRequest = new CustomRequest(this);
            Object.defineProperty(clonedRequest, "id", { value: this.id });
            return clonedRequest;
        }
    };
}
