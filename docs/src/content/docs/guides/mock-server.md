---
title: Creating a Mock Server
description: Mock servers are how you define what requests and responses you want
---

A *mock server* in Mentoss is how you define what requests you're expecting to send and what responses should be returned for those requests. Mock servers are different from real servers in that mock servers don't run on a port and aren't open to network requests. Instead, mock servers exist only in memory, eliminating any concerns about side effects or security issues.

You can assign one or more mock servers to a `FetchMocker` instance, therefore limiting the requests a mocked `fetch()` call can make.

## Create a new `MockServer` instance

To get started, import the `MockServer` class and create a new instance. The only argument is the base URL for the server. For example, to create a new `MockServer` that responds to requests for `https://api.example.com`, you would create an instance as follows:

```js
import { MockServer } from "mentoss";

const server = new MockServer("https://api.example.com");
```

With your server created, the next step is to add some routes.

## Add routes to a `MockServer`

You can add routes to a `MockServer` by calling one of several methods:

* `get(request, response)`
* `post(request, response)`
* `put(request, response)`
* `delete(request, response)`
* `patch(request, response)`
* `options(request, response)`
* `head(request, response)`

Each method accepts two arguments: a request pattern and a response pattern. These patterns can be a single value or an object with multiple properties, depending on your desired behavior for the route.

### Add a simple route to a `MockServer`

At its simplest, you can add a route by passing a URL for the request pattern and a status code for the response pattern, as in this example:

```js
import { MockServer } from "mentoss";

const server = new MockServer("https://api.example.com");

server.get("/ping", 200);
```

This instructs the server to respond to GET requests for `https://api.example.com/ping` with a 200 status code.

### Use URL parameters in the request URL

If you'd like the server to respond to a request to any URL that matches a particular pattern, you can do so by using placeholder parameters directly in the URL. Here's an example:

```js
import { MockServer } from "mentoss";

const server = new MockServer("https://api.example.com");

server.get("/users/:userId", 200);
```

This instructs the server to respond to GET requests for any URL that matches the pattern `https://api.example.com/users/:userId` with a 200 status code. The `:userId` part of the URL is a placeholder that can match any value, so URLs like `https://api.example.com/users/123` or `https://api.example.com/users/456` match the pattern. This is helpful if you aren't quite sure what the exact URL will be during a test.

### Include complex request patterns in routes

If you'd like to only respond to requests that match other fields in addition to the method and URL, then you should use a request pattern object instead. Request pattern objects allow you to specify additional fields that should match from the request. Possible keys are:

* `url` (required) - the URL to match.
* `query` - query string parameters to match. Note that any URL containing all of the query string parameters is considered a match, even if the URL contains more query string parameters then are mentioned in the request pattern.
* `params` - URL parameters to match.
* `headers` - HTTP headers to match. Similar to `query`, a request containing all headers in the request pattern is considered a match even if the request contains additional headers.
* `body` - the body of the request to match. This can be a string, `FormData`, or an object (in which case it's treated as JSON). For objects and `FormData`, the matching works similar to `query` and `headers`.

Here are some examples:

```js
import { MockServer } from "mentoss";

const server = new MockServer("https://api.example.com");

// match /users/123
server.get({
    url: "/users/:userId",
    params: {
        userId: "123"
    }
}, 200);

// match /users?userId=123
server.get({
    url: "/users",
    query: {
        userId: "123"
    }
}, 200);

// match JSON request to /users/:userId
server.post({
    url: "/users/:userId",
    params: {
        userId: "123"
    },
    headers: {
        "Content-Type": "application/json"
    },
    body: {
        name: "John Doe"
    }
}, 200);
```
