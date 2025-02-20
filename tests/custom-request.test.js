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

    it("should maintain standard Request functionality", () => {
        const request = new CustomRequest(TEST_URL);
        
        assert.strictEqual(request.url, TEST_URL);
        assert.ok(request instanceof Request);
    });
    
    describe("mode", () => {
        
        it("should allow mode to be set to 'no-cors'", () => {
            const request = new CustomRequest(TEST_URL, { mode: "no-cors" });
            
            assert.strictEqual(request.mode, "no-cors");
        });
        
        it("should have a default mode of 'cors'", () => {
            const request = new CustomRequest(TEST_URL);
            
            assert.strictEqual(request.mode, "cors");
        });
    });
    
    
    describe("clone()", () => {

        it("should have the same class as the original request", () => {
            const request = new CustomRequest(TEST_URL);
            const clonedRequest = request.clone();
            
            assert.ok(clonedRequest instanceof CustomRequest);
        });

        it("should preserve ID when cloning", () => {
            const request = new CustomRequest(TEST_URL);
            const clonedRequest = request.clone();

            assert.strictEqual(clonedRequest.id, request.id);
        });

        it("should allow reading of body in cloned request", async () => {
            const request = new CustomRequest(TEST_URL, { method: "POST", body: "Hello, world!" });
            const clonedRequest = request.clone();
            const body = await clonedRequest.text();
            
            assert.strictEqual(body, "Hello, world!");
        });
        
        it("should allow reading of body in two cloned requests", async () => {
            const request = new CustomRequest(TEST_URL, { method: "POST", body: "Hello, world!" });
            const clonedRequest1 = request.clone();
            const clonedRequest2 = request.clone();
            const body1 = await clonedRequest1.text();
            const body2 = await clonedRequest2.text();
            
            assert.strictEqual(body1, "Hello, world!");
            assert.strictEqual(body2, "Hello, world!");
        });
        
    });
    
});
