const express = require("express");
const webSocketMiddleware = require("./middleware/webSocket");
const swaggerMiddleware = require("./middleware/swagger");

const app = express();
const port = 6183;

// 处理 WebSocket 请求
webSocketMiddleware(app);

// 生成接口文档
swaggerMiddleware(app);

app.listen(port);

console.log(`服务已启动在端口：${port}`);
console.log(`接口文档：http://127.0.0.1:${port}/swagger/`);
