const path = require("path");
const expressWebSocket = require("express-ws");
const webSocketStream = require("websocket-stream/stream");
const ffmpeg = require("fluent-ffmpeg");
const { logDivider } = require("../utils");

const ffmpegPath = path.join(__dirname, "../../ffmpeg-master-latest-win64-gpl-shared/bin/ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * @param {import('express').Express} app
 */
module.exports = (app) => {
    expressWebSocket(app, null, {
        wsOptions: {
            // 在 WebSocket 通信过程中对每个消息进行压缩
            perMessageDeflate: true,
        },
    });

    // FIX swagger 不支持 ws 协议的接口，可能要换个文档生成的工具
    /**
     * @openapi
     * /rtsp/:id/:
     *   get:
     *     summary: 转码 RTSP 视频流接口
     *     description: 接受 RTSP 视频流地址，并允许指定输出视频的宽度、高度和比特率进行转码处理。
     *     parameters:
     *       - in: query
     *         name: url
     *         schema:
     *           type: string
     *         required: true
     *         description: 需要转码的 RTSP 地址。
     *       - in: query
     *         name: width
     *         schema:
     *           type: integer
     *           default: -1
     *         description: 输出的视频宽度。默认值-1表示自动计算或使用源视频宽度。
     *       - in: query
     *         name: height
     *         schema:
     *           type: integer
     *           default: -1
     *         description: 输出的视频高度。默认值-1表示自动计算或使用源视频高度。
     *       - in: query
     *         name: bitrate
     *         schema:
     *           type: string
     *           default: 2000k
     *         description: 输出视频的比特率。默认为2000k。
     */
    app.ws("/rtsp/:id/", (ws, req) => {
        const stream = webSocketStream(ws, {
            binary: true,
            browserBufferTimeout: 1000 * 5,
        });

        /**
         * 输出选项
         */
        const outputOptions = [
            // 频编码器
            ["-c:v", "libx264"],
            // 预设
            ["-preset", "veryfast"],
            // 视频格式
            ["-f", "flv"],
            // 禁用音频
            ["-an"],
            // 帧率
            ["-r", "24"],
        ];

        const { url, width = -1, height = -1, bitrate } = req.query;

        // 设置分辨率。-1 为自动计算
        const scale = `${width}x${height}`;
        scale !== "-1x-1" && outputOptions.push(["-vf", `scale=${width}:${height}`]);

        // 设置比特率
        bitrate && outputOptions.push(["-b:v", bitrate]);

        ffmpeg(url)
            .addInputOption("-rtsp_transport", "tcp", "-buffer_size", "102400")
            .outputOptions(outputOptions.flat())
            .on("start", function () {
                logDivider();

                console.log("开始转码：", url);
                console.log("输出分辨率：", scale.replace(/-1/g, "自动"));
                console.log("输出比特率：", bitrate || "自动");
            })
            .on("codecData", function (info) {
                // console.log("流编解码器数据：", info);
            })
            .on("error", function (err) {
                logDivider();

                if (err.message === "Output stream closed") {
                    console.log("断开连接：", url);
                    return;
                }

                console.log("！！！出错了：", err.message);
                console.log("url", url);
                console.log("");
                console.log("转码失败，关闭 WebSocket 连接");
            })
            .pipe(stream);
    });
};
