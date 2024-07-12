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

function rtspRequestHandle(ws, req) {
    const url = req.query.url;
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

    try {
        ffmpeg(url)
            .addInputOption("-rtsp_transport", "tcp", "-buffer_size", "102400")
            .on("start", function () {
                logDivider();
                console.log("开始转码：");
                console.log("url", url);
            })
            .on("error", function (err) {
                if (err.message === "Output stream closed") return;

                logDivider();
                console.log("！！！出错了：", err.message);
                console.log("url", url);
            })
            .outputOptions("-c:v", "libx264", "-b:v", "2000k", "-r", "24", "-preset", "veryfast")
            .outputFormat("flv")
            .videoCodec("copy")
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
