const swaggerJsdoc = require("swagger-jsdoc");
const { serve, setup } = require("swagger-ui-express");

/**
 * @type {import('swagger-jsdoc').Options}
 */
const options = {
    swaggerDefinition: {
        openapi: "3.0.0",
        info: {
            title: "RTSP 转码服务",
            version: "1.0.0",
            description: "用于把 RTSP 协议的流转成 WebSocket 协议，提供给前端播放",
        },
        servers: [
            {
                url: "ws://192.168.1.9:6183",
            },
        ],
    },
    // 这里的路径要以入口文件 index.js 作为相对路径
    apis: ["./src/middleware/webSocket.js"],
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * @param {import('express').Express} app
 */
module.exports = (app) => {
    app.use("/swagger", serve, setup(swaggerSpec));
};
