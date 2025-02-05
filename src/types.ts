/**
 * @fileoverview Types for Mentoss.
 * @author Nicholas C. Zakas
 */

export type HttpBody = string | object | ArrayBuffer | FormData | null;

export interface RequestPattern {
	method: string;
	url: string;
	headers?: Record<string, string>;
	query?: Record<string, string>;
	params?: Record<string, string>;
	body?: HttpBody;
}

export type MethodlessRequestPattern = Omit<RequestPattern, "method">;

export interface ResponsePattern {
	/**
	 * The status code of the response.
	 */
	status: number;

	/**
	 * The headers of the response.
	 */
	headers?: Record<string, string>;

	/**
	 * The body of the response.
	 */
	body?: string | any | ArrayBuffer | null;

	/**
	 * The number of milliseconds to delay the response by.
	 */
	delay?: number;
}

export interface Credentials {
	/**
	 * Returne the credential headers for a given request.
	 */
	getHeadersForRequest(request: Request): Headers;

	/**
	 * Clear all credentials.
	 */
	clear(): void;
}
