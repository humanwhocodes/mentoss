# Mentoss: Fetch 模拟器

由 [Nicholas C. Zakas](https://humanwhocodes.com) 开发

如果你觉得这个工具有用，请考虑通过[捐赠](https://humanwhocodes.com/donate)支持我的工作，或者[提名我](https://stars.github.com/nominate/)成为 GitHub Star。

## 描述

一个用于模拟 `fetch()` 请求和响应的实用工具。

## 文档

请访问[官方网站](https://mentoss.dev)。

## 安装

```shell
npm install mentoss
```

## 使用方法

Mentoss 中有三个主要类：

1. `MockServer` - 服务器实现，可以模拟请求和响应
2. `FetchMocker` - 创建新的 `fetch()` 函数的实用工具，调用一个或多个 `MockServers`
3. `MockAgent` - 拦截 undici 请求并将其路由到 `MockServers` 的 undici Dispatcher

### 与 `fetch()` 一起使用（浏览器和 Node.js）

通常，你需要先创建一个 `MockServer`，然后创建一个 `FetchMocker`，如下所示：

```js
import { MockServer, FetchMocker } from "mentoss";

// 创建一个具有给定基础 URL 的新服务器
const server = new MockServer("https://api.example.com");

// 简单的模拟路由
server.get("/foo/bar", 200);

// 返回特定响应
server.post("/foo/baz", {
	status: 200,
	body: { message: "成功" },
	headers: {
		"Content-Type": "application/json",
	},
});

// 匹配更多请求
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

// 创建一个模拟的 fetch 函数
const mocker = new FetchMocker([server]);

// 使用模拟的 fetch
const response = await mocker.fetch("https://api.example.com/foo/bar");
console.log(response.status); // 200
```

### 与 undici 一起使用（Node.js）

```js
import { MockServer, MockAgent } from "mentoss";

// 创建一个具有给定基础 URL 的新服务器
const server = new MockServer("https://api.example.com");

// 简单的模拟路由
server.get("/foo/bar", 200);

// 创建一个模拟代理
const agent = new MockAgent([server]);

// 使用模拟代理
const response = await agent.fetch("https://api.example.com/foo/bar");
console.log(response.status); // 200
```

## 功能特性

- 🚀 **零依赖**：无需额外依赖
- 🎯 **类型安全**：完全支持 TypeScript
- 🔄 **灵活匹配**：支持 URL、方法、头部、正文匹配
- 📝 **详细日志**：轻松调试请求和响应
- 🌐 **跨平台**：支持浏览器和 Node.js
- ⚡ **高性能**：快速模拟和响应

## 高级用法

### 动态响应

```js
server.get("/users/:id", (request) => {
  const id = request.params.id;
  return {
    status: 200,
    body: { id, name: `用户 ${id}` },
  };
});
```

### 请求验证

```js
server.post(
  {
    url: "/users",
    body: {
      name: "张三",
      email: "zhangsan@example.com",
    },
  },
  {
    status: 201,
    body: { id: 1, name: "张三" },
  }
);
```

### 错误模拟

```js
server.get("/error", {
  status: 500,
  body: { error: "服务器内部错误" },
});
```

## 许可证

MIT

---

> 项目地址：[humanwhocodes/mentoss](https://github.com/humanwhocodes/mentoss)
> 文档：[mentoss.dev](https://mentoss.dev)
