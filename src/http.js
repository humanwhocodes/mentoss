/**
 * @fileoverview HTTP status codes and text
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Data
//-----------------------------------------------------------------------------

export const statusTexts = new Map([
	[100, "Continue"],
	[101, "Switching Protocols"],
	[102, "Processing"],
	[200, "OK"],
	[201, "Created"],
	[202, "Accepted"],
	[203, "Non-Authoritative Information"],
	[204, "No Content"],
	[205, "Reset Content"],
	[206, "Partial Content"],
	[207, "Multi-Status"],
	[208, "Already Reported"],
	[226, "IM Used"],
	[300, "Multiple Choices"],
	[301, "Moved Permanently"],
	[302, "Found"],
	[303, "See Other"],
	[304, "Not Modified"],
	[305, "Use Proxy"],
	[307, "Temporary Redirect"],
	[308, "Permanent Redirect"],
	[400, "Bad Request"],
	[401, "Unauthorized"],
	[402, "Payment Required"],
	[403, "Forbidden"],
	[404, "Not Found"],
	[405, "Method Not Allowed"],
	[406, "Not Acceptable"],
	[407, "Proxy Authentication Required"],
	[408, "Request Timeout"],
	[409, "Conflict"],
	[410, "Gone"],
	[411, "Length Required"],
	[412, "Precondition Failed"],
	[413, "Payload Too Large"],
	[414, "URI Too Long"],
	[415, "Unsupported Media Type"],
	[416, "Range Not Satisfiable"],
	[417, "Expectation Failed"],
	[418, "I'm a teapot"],
	[421, "Misdirected Request"],
	[422, "Unprocessable Entity"],
	[423, "Locked"],
	[424, "Failed Dependency"],
	[425, "Too Early"],
	[426, "Upgrade Required"],
	[428, "Precondition Required"],
	[429, "Too Many Requests"],
	[431, "Request Header Fields Too Large"],
	[451, "Unavailable For Legal Reasons"],
	[500, "Internal Server Error"],
	[501, "Not Implemented"],
	[502, "Bad Gateway"],
	[503, "Service Unavailable"],
	[504, "Gateway Timeout"],
	[505, "HTTP Version Not Supported"],
	[506, "Variant Also Negotiates"],
	[507, "Insufficient Storage"],
	[508, "Loop Detected"],
	[509, "Bandwidth Limit Exceeded"],
	[510, "Not Extended"],
	[511, "Network Authentication Required"],
]);

export const verbs = [
	"GET",
	"POST",
	"PUT",
	"DELETE",
	"PATCH",
	"HEAD",
	"OPTIONS",
	// "CONNECT",
	// "TRACE"
];

const redirectStatuses = new Set([301, 302, 303, 307, 308]);
const methodChangingRedirectStatuses = new Set([301, 302, 303]);
const bodyPreservingRedirectStatuses = new Set([307, 308]);

// methods that don't need request bodies
const bodylessMethods = new Set(["GET", "HEAD"]);

const requestBodyHeaders = new Set([
	"content-encoding",
	"content-language",
	"content-location",
	"content-type",
]);

/**
 * Checks if a status code represents a redirect
 * @param {number} status The HTTP status code
 * @returns {boolean} True if the status code is a redirect status
 */
export function isRedirectStatus(status) {
	return redirectStatuses.has(status);
}

/**
 * Checks if a status code is a redirect that changes the method to GET
 * @param {number} status The HTTP status code
 * @returns {boolean} True if the status code is a method-changing redirect status
 */
export function isMethodChangingRedirectStatus(status) {
	return methodChangingRedirectStatuses.has(status);
}

/**
 * Checks if a status code is a body-preserving redirect
 * @param {number} status The HTTP status code
 * @returns {boolean} True if the status code is a body-preserving redirect status
 */
export function isBodyPreservingRedirectStatus(status) {
	return bodyPreservingRedirectStatuses.has(status);
}

/**
 * Checks if a method is considered a safe method (GET or HEAD)
 * @param {string} method The HTTP method
 * @returns {boolean} True if the method is a safe method
 */
export function isBodylessMethod(method) {
	return bodylessMethods.has(method);
}

/**
 * Checks if a header is a request body header
 * @param {string} header The HTTP header name
 * @returns {boolean} True if the header is a request body header
 */
export function isRequestBodyHeader(header) {
	return requestBodyHeaders.has(header);
}
