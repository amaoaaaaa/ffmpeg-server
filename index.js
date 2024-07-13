const express = require("express");
const expressWebSocket = require("express-ws");
const ffmpeg = require("fluent-ffmpeg");
const webSocketStream = require("websocket-stream/stream");

ffmpeg.setFfmpegPath("E:/tools/ffmpeg-master-latest-win64-gpl-shared/bin/ffmpeg");

function localServer() {
    const app = express();

    app.use(express.static(__dirname));

    expressWebSocket(app, null, {
        perMessageDeflate: true,
    });

    app.ws("/rtsp/:id/", rtspRequestHandle);

    app.listen(6183);

    console.log("服务已启动在端口：6183");
}

/**
 * 处理转码
 * @param {*} ws
 * @param {import('express').Request} req
 */
function rtspRequestHandle(ws, req) {
    const stream = webSocketStream(
        ws,
        {
            binary: true,
            browserBufferTimeout: 1000000,
        },
        {
            browserBufferTimeout: 1000000,
        }
    );

    /**
     * 需要转码的 rtsp 地址
     */
    const url = req.query.url;

    /**
     * 输出的视频宽度
     */
    const width = req.query.width || "-1";
    /**
     * 输出的视频高度
     */
    const height = req.query.height || "-1";
    /**
     * 分辨率设置。从请求参数设置输出的分辨率，-1 为自动计算，如果宽高都是 -1，则不设置 scale
     */
    const scale = `${width}:${height}` === "-1:-1" ? [] : ["-vf", `scale=${width}:${height}`];

    /**
     * 输出的比特率，默认：2000k
     */
    const bitRate = req.query.bitRate || "2000k";

    try {
        ffmpeg(url)
            .addInputOption("-rtsp_transport", "tcp", "-buffer_size", "102400")
            .on("start", function () {
                logDivider();

                console.log("开始转码：", url);
                console.log(
                    "输出分辨率：",
                    !scale.length
                        ? "自动"
                        : `${width.replace("-1", "自动")}x${height.replace("-1", "自动")}`
                );
                console.log("输出码率：", bitRate);
            })
            .on("error", function (err) {
                logDivider();

                if (err.message === "Output stream closed") {
                    console.log("断开连接：", url);
                    return;
                }

                console.log("！！！出错了：", err.message);
                console.log("url", url);
            })
            // 设置视频编码器、比特率、帧率和预设
            .outputOptions("-c:v", "libx264", "-b:v", bitRate, "-r", "24", "-preset", "veryfast")
            // 设置输出视频分辨率
            .outputOptions(scale)
            // 设置输出格式
            .outputFormat("flv")
            // 禁用音频
            .noAudio()
            .pipe(stream);
    } catch (error) {
        console.log("ffmpeg 转码出错：", error);
    }
}

/**
 * 在控制台输出分割线
 */
function logDivider() {
    console.log("");
    console.log("--------------------------------------------------------------");
    console.log("");
}

localServer();
