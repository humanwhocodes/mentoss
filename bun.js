const request = new Request("https://example.com", { credentials: "include" });

console.log(request.credentials); // "same-origin"
