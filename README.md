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

## Development

To work on Mentoss, you'll need:

* [Git](https://git-scm.com/)
* [Node.js](https://nodejs.org)

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

## Prior Art

This project takes inspiration (but not code) from a number of other projects:

* [Fetch Mock](https://www.wheresrhys.co.uk/fetch-mock/)
* [MSW](https://mswjs.io/)

## License

Apache 2.0

## Frequently Asked Questions

### What does "Mentoss" even mean?

One day, I was sitting around thinking, "you know, I really wish there was a better fetch mocker." Then I thought, "fetch mocker" sounds a lot like "fresh maker," like the [old Mentos commercial](https://www.youtube.com/watch?v=JqgqgcE8Zck). Then I thought, you can't just name a package "fetch mocker" because it's too generic. I'd like to call it Mentos as a joke, but then I worried about the company coming after me for trademark infringement. So I figured I'd add an "s" at the end, to make "OSS" the suffix.

[npm]: https://npmjs.com/
[yarn]: https://yarnpkg.com/
