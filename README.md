# Mentoss: The Fetch Mocker

by [Nicholas C. Zakas](https://humanwhocodes.com)

If you find this useful, please consider supporting my work with a [donation](https://humanwhocodes.com/donate) or [nominate me](https://stars.github.com/nominate/) for a GitHub Star.

## Description

A utility for mocking out `fetch()` requests and responses.

## Documentation

See the [website](https://mentoss.dev).

## Installation

```shell
npm install mentoss
```

## Usage

There are three primary classes in Mentoss:

1. `MockServer` - a server implementation where you can mock out requests and responses
2. `FetchMocker` - the utility that creates a new `fetch()` function that calls one or more `MockServers`
3. `MockAgent` - an undici Dispatcher that intercepts undici requests and routes them to `MockServers`

### Using with `fetch()` (browser and Node.js)

In general, you'll create a `MockServer` first and then create a `FetchMocker`, like this:

```js
import { MockServer, FetchMocker } from "mentoss";

// create a new server with the given base URL
const server = new MockServer("https://api.example.com");

// simple mocked route
server.get("/foo/bar", 200);

// return specific response
server.post("/foo/baz", {
	status: 200,
	body: { message: "Success" },
	headers: {
		"Content-Type": "application/json",
	},
});

// match more of the request
server.post(
	{
		url: "/foo/boom",
		headers: {
			"Content-type": "application/json",
		},
		body: {
			test: true,
		},
	},
	404,
);

// create a mocker that uses the server
const mocker = new FetchMocker({
	servers: [server],
});

// here's your shiny new fetch() function if you want to use it directly
const { fetch } = mocker;

// or overwrite the global
mocker.mockGlobal();

// make a request
const response = await fetch("https://api.example.com/foo/bar");

// check that the request was made
assert(mocker.called("https://api.example.com/foo/bar"));

// check that all routes were called
assert(mocker.allRoutesCalled());

// clear the server to start over
server.clear();

// clear everything in the mocker (including servers)
mocker.clearAll();
```

### Using with undici (Node.js only)

If you're using [undici](https://undici.nodejs.org/) for HTTP requests, you can use `MockAgent` as a dispatcher:

```js
import { MockServer, MockAgent } from "mentoss";
import { request } from "undici";

// create a new server with the given base URL
const server = new MockServer("https://api.example.com");

// simple mocked route
server.get("/foo/bar", { status: 200, body: "OK" });

// create an agent that uses the server
const agent = new MockAgent({
	servers: [server],
});

// make a request using the agent as a dispatcher
const { statusCode, body } = await request("https://api.example.com/foo/bar", {
	dispatcher: agent,
});

// check that the request was made
assert(agent.called("https://api.example.com/foo/bar"));

// check that all routes were called
assert(agent.allRoutesCalled());

// clear the agent
agent.clearAll();
```

Note: `MockAgent` does not support `baseUrl` or `credentials` options, as these are only relevant for browser contexts.

## Development

To work on Mentoss, you'll need:

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org)

Make sure both are installed by visiting the links and following the instructions to install.

Now you're ready to clone the repository:

```bash
git clone https://github.com/humanwhocodes/mentoss.git
```

Then, enter the directory and install the dependencies:

```bash
cd mentoss
npm install
```

After that, you can run the tests via:

```bash
npm test
```

## Tips

### Use Mentoss with Jest

[Jest](https://jestjs.io) doesn't support ESM-only modules (like Mentoss) by default. You'll need to update how you call Jest in your `package.json` file to enable ESM support:

```diff
"scripts": {
-    "test": "jest",
+    "test": "node --experimental-vm-modules ./node_modules/.bin/jest"
}
```

Read more about ESM support in the [Jest documentation](https://jestjs.io/docs/ecmascript-modules).

## License

Copyright 2024-2025 Nicholas C. Zakas

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

## Prior Art

This project takes inspiration (but not code) from a number of other projects:

- [Nock](https://github.com/nock/nock) - HTTP server mocking and expectations library for Node.js.
- [MSW (Mock Service Worker)](https://mswjs.io/) - API mocking library for browser and Node.js.
- [Fetch Mock](http://www.wheresrhys.co.uk/fetch-mock/) - Mock HTTP requests made using `fetch`.

## License

Apache 2.0

## Frequently Asked Questions

### What does "Mentoss" even mean?

One day, I was sitting around thinking, "you know, I really wish there was a better fetch mocker." Then I thought, "fetch mocker" sounds a lot like "fresh maker," like the [old Mentos commercial](https://www.youtube.com/watch?v=JqgqgcE8Zck). Then I thought, you can't just name a package "fetch mocker" because it's too generic. I'd like to call it Mentos as a joke, but then I worried about the company coming after me for trademark infringement. So I figured I'd add an "s" at the end, to make "OSS" the suffix.
