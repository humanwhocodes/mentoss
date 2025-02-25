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

/**
 * Additional information that's helpful for evaluating a request.
 */
export interface RequestInfo {
	
	/**
	 * The cookies sent with the request.
	 */
	cookies: Map<string, string>;
	
	/**
	 * The URL parameters found in the request.
	 */
	params: Record<string, string|undefined>;
	
	/**
	 * The query parameters found in the request.
	 */
	query: URLSearchParams;
}

/**
 * Create a response based on the request.
 * @param request The request to create a response for.
 * @returns The response to send back.
 */
export type ResponseCreator = (request: Request, requestInfo: RequestInfo) => ResponsePattern | number | Promise<ResponsePattern> | Promise<number>;

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
