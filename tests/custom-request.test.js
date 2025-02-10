/**
 * @fileoverview Tests for the custom request class.
 * @author Nicholas C. Zakas
 */

/* global Request */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import assert from "node:assert";
import { createCustomRequest } from "../src/custom-request.js";

//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------

describe("createCustomRequest()", () => {

    let CustomRequest;
    const TEST_URL = "https://example.com/";
    
    beforeEach(() => {
        CustomRequest = createCustomRequest(Request);
    });

    it("should create requests with unique IDs", () => {
        const request1 = new CustomRequest(TEST_URL);
        const request2 = new CustomRequest(TEST_URL);
        
        assert.ok(typeof request1.id === "string");
        assert.ok(request1.id.length > 0);
        assert.notStrictEqual(request1.id, request2.id);
    });

    it("should not allow ID to be modified", () => {
        const request = new CustomRequest(TEST_URL);
        const originalId = request.id;
        
        assert.throws(() => {
            request.id = "new-id";
        }, TypeError);
        
        assert.strictEqual(request.id, originalId);
    });

    it("should preserve ID when cloning", () => {
        const request = new CustomRequest(TEST_URL);
        const clonedRequest = request.clone();
        
        assert.strictEqual(clonedRequest.id, request.id);
    });

    it("should maintain standard Request functionality", () => {
        const request = new CustomRequest(TEST_URL);
        
        assert.strictEqual(request.url, TEST_URL);
        assert.ok(request instanceof Request);
    });
});
