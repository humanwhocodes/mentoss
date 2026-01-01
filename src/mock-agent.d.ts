/**
 * @fileoverview Type definitions for MockAgent.
 * @author Nicholas C. Zakas
 */

import type { MockServer } from "./mock-server.js";

export interface DispatchOptions {
	origin: string | URL;
	path: string;
	method?: string;
	body?: any;
	headers?: Record<string, string | string[]> | string[] | Array<[string, string]>;
}

export interface DispatchHandler {
	onConnect?: (abort: () => void) => void;
	onHeaders?: (statusCode: number, headers: string[], resume: () => void) => void;
	onData?: (chunk: Buffer) => void;
	onComplete?: (trailers: string[]) => void;
	onError?: (err: Error) => void;
}

export interface MockAgentOptions {
	servers: MockServer[];
	CustomRequest?: typeof Request;
	CustomResponse?: typeof Response;
}

export class MockAgent {
	constructor(options: MockAgentOptions);
	
	dispatch(options: DispatchOptions, handler: DispatchHandler): boolean;
	close(): Promise<void>;
	destroy(): Promise<void>;
	
	called(request: string | import("./types.js").RequestPattern): boolean;
	allRoutesCalled(): boolean;
	get uncalledRoutes(): string[];
	assertAllRoutesCalled(): void;
	clearAll(): void;
}
