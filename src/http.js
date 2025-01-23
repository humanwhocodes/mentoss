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
    [511, "Network Authentication Required"]
]);

// the methods allowed for simple requests
const corsSimpleMethods = new Set(["GET", "HEAD", "POST"]);

// the headers allowed for simple requests
const coreSimpleHeaders = new Set([
    "accept",
    "accept-language",
    "content-language",
    "content-type",
    "range"
]);

// the content types allowed for simple requests
const corsSimpleContentTypes = new Set([
    "application/x-www-form-urlencoded",
    "multipart/form-data",
    "text/plain"
]);

export const CORS_ALLOW_ORIGIN = "Access-Control-Allow-Origin";
export const CORS_ALLOW_CREDENTIALS = "Access-Control-Allow-Credentials";
export const CORS_EXPOSE_HEADERS = "Access-Control-Expose-Headers";
export const CORS_ALLOW_METHODS = "Access-Control-Allow-Methods";
export const CORS_ALLOW_HEADERS = "Access-Control-Allow-Headers";
export const CORS_MAX_AGE = "Access-Control-Max-Age";


//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

/**
 * Checks if a Range header value is a simple range according to the Fetch API spec.
 * @see https://fetch.spec.whatwg.org/#http-headers
 * @param {string} range The range value to check.
 * @returns {boolean} `true` if the range is a simple range, `false` otherwise.
 */
function isSimpleRangeHeader(range) {
    
    // range must start with "bytes="
    if (!range.startsWith("bytes=")) {
        return false;
    }
    
    const ranges = range.slice(6).split(",");
    
    // only one range is allowed
    if (ranges.length > 1) {
        return false;
    }
    
    // range should be in the format 0-255, -255, or 0-
    const rangeParts = ranges[0].split("-");
    
    if (rangeParts.length > 2) {
        return false;
    }
    
    const firstIsNumber = /^\d+/.test(rangeParts[0]);
    const secondIsNumber = /^\d+/.test(rangeParts[1]);
    
    // if the first part is missing, the second must be a number
    if (rangeParts[0] === "") {
        return secondIsNumber;
    }
    
    // if the second part is missing, the first must be a number
    if (rangeParts[1] === "") {
        return firstIsNumber;
    }
    
    // if both parts are present, they must both be numbers
    return firstIsNumber && secondIsNumber;
}

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

/**
 * Determines if a request is a simple CORS request.
 * @param {Request} request The request to check.
 * @returns {boolean} `true` if the request is a simple CORS request, `false` otherwise.
 */
export function isCorsSimpleRequest(request) {
    
    // if it's not a simple method then it's not a simple request
    if (!corsSimpleMethods.has(request.method)) {
        return false;
    }
 
    // check all headers to ensure they're allowed
    const headers = request.headers;
    
    for (const header of headers.keys()) {
        if (!coreSimpleHeaders.has(header)) {
            return false;
        }
    }
    
    // check the content type
    const contentType = headers.get("content-type");
    
    if (contentType && !corsSimpleContentTypes.has(contentType)) {
        return false;
    }
    
    // check the Range header
    const range = headers.get("range");
    
    if (range && !isSimpleRangeHeader(range)) {
        return false;
    }
    
    return true;
}
