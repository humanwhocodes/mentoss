# Mentoss: The Fetch Mocker

by [Nicholas C. Zakas](https://humanwhocodes.com)

If you find this useful, please consider supporting my work with a [donation](https://humanwhocodes.com/donate) or [nominate me](https://stars.github.com/nominate/) for a GitHub Star.

## Description

A utility for mocking out `fetch()` requests and responses.

## Installation

```shell
npm install mentoss
```

## Usage

There are two primary classes in Mentoss:

1. `MockServer` - a server implementation where you can mock out requests and responses
1. `FetchMocker` - the utility that creates a new `fetch()` function that calls one or more `MockServers`

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
```

## License

Copyright 2024 Nicholas C. Zakas

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

- [Nock](https://github.com/nock/nock) - HTTP server mocking and expectations library for Node.js.
- [MSW (Mock Service Worker)](https://mswjs.io/) - API mocking library for browser and Node.js.
- [Fetch Mock](http://www.wheresrhys.co.uk/fetch-mock/) - Mock HTTP requests made using `fetch`.
