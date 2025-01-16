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
	body?: HttpBody;
}

export interface ResponsePattern {
	status: number;
	headers?: Record<string, string>;
	body?: string | any | ArrayBuffer | null;
}
