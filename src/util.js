/**
 * @fileoverview Various utility functions.
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

/**
 * Formats headers into a string that matches how they are displayed in
 * a network panel. Header names are capitalized and separated by a colon
 * from the header value.
 * @param {Headers} headers The headers to format.
 * @returns {string} The formatted headers.
 */
function formatHeaders(headers) {
	return Array.from(headers.entries())
		.map(
			([name, value]) =>
				`${name
					.split("-")
					.map(part => part.charAt(0).toUpperCase() + part.slice(1))
					.join("-")}: ${value}`,
		)
		.join("\n");
}

/**
 * Formats a body into a string that matches how it is displayed in a network
 * panel. If the body is an object, it is stringified as JSON. If the body is
 * a string, it is returned as-is. Otherwise, the body is converted to a string.
 * @param {string|any|FormData|null} body The body to format.
 * @returns {string} The formatted body.
 */
function formatBody(body) {
	if (!body) {
		return "";
	}

	if (typeof body === "string") {
		return body;
	}

	if (body.constructor === Object) {
		return JSON.stringify(body);
	}

	// TODO: Other types of bodies

	return body.toString();
}

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

/**
 * Represents an error that occurs when a URL is invalid.
 * @extends {Error}
 */
export class URLParseError extends Error {
	/**
	 * Creates a new URLParseError instance.
	 * @param {string} url The URL that caused the error.
	 */
	constructor(url) {
		super(`Invalid URL: ${url}`);
		this.name = "URLParseError";
	}
}

/**
 * Parses a URL and returns a URL object. This is used instead
 * of the URL constructor to provide a standard error message,
 * because different runtimes use different messages.
 * @param {string|URL} url The URL to parse.
 * @returns {URL} The parsed URL.
 */
export function parseUrl(url) {
	if (url instanceof URL) {
		return url;
	}

	try {
		return new URL(url);
	} catch {
		throw new URLParseError(url);
	}
}

/**
 * Reads the body from a request based on the HTTP headers.
 * @param {Request} request The request to read the body from.
 * @returns {Promise<string|any|FormData|null>} The body of the request.
 */
export async function getBody(request) {
	// first get the content type
	const contentType = request.headers.get("content-type");

	// if there's no content type, there's no body
	if (!contentType) {
		return Promise.resolve(null);
	}

	// next try to read the body as text to see if there's a body
	const text = await request.clone().text();

	// if there's no body, return null
	if (!text) {
		return Promise.resolve(null);
	}

	// if it's a text format then return a string
	if (contentType.startsWith("text")) {
		return text;
	}

	// if the content type is JSON, parse the body as JSON
	if (contentType.startsWith("application/json")) {
		return request.json();
	}

	// if the content type is form data, parse the body as form data
	if (contentType.startsWith("multipart/form-data")) {
		return request.formData();
	}

	// otherwise return the body as bytes
	return request.arrayBuffer();
}

/**
 * Creates a text representation of a request in the same format as it would
 * appear in a network panel.
 * @param {Request} request The request to stringify.
 * @param {string|any|FormData|null} body The body of the request
 * @returns {string} The stringified request.
 */
export function stringifyRequest(request, body) {
	let text = `${request.method} ${request.url}`;

	if (request.headers) {
		text += `\n${formatHeaders(request.headers)}`;
	}

	if (body) {
		text += `\n\n${formatBody(body)}`;
	}

	return text.trim();
}
