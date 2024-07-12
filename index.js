var express = require("express");
var expressWebSocket = require("express-ws");
var ffmpeg = require("fluent-ffmpeg");
var webSocketStream = require("websocket-stream/stream");

var poct = "udp";

ffmpeg.setFfmpegPath("E:/tools/ffmpeg-master-latest-win64-gpl-shared/bin/ffmpeg");

function localServer() {
    let app = express();

    app.use(express.static(__dirname));

    expressWebSocket(app, null, {
        perMessageDeflate: true,
    });

    app.ws("/rtsp/:id/", rtspRequestHandle);

    app.listen(8888);

    console.log("express 已启动，端口：8888");
}

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
    let url = req.query.url;

    try {
        ffmpeg(url)
            .addInputOption("-rtsp_transport", "tcp", "-buffer_size", "102400")
            .on("start", function () {
                logDivider();
                console.log("开始处理：");
                console.log("url", url);
            })
            .on("codecData", function () {
                // console.log("Stream codecData.");
            })
            .on("error", function (err) {
                logDivider();
                console.log("！！！出错了：", err.message);
                console.log("url", url);

                // if (poct == "udp") {
                //     poct = "tcp";
                //     rtspRequestHandle(ws, req);
                // }

                // console.log(url, "An error occured: ", err.message);
            })
            .on("end", function () {
                // console.log("Stream end!");
                // 摄像机断线的处理
            })
            .outputOptions("-c:v", "libx264")
            .outputFormat("flv")
            .videoCodec("copy")
            .noAudio()
            .pipe(stream);
    } catch (error) {
        // if (poct == "udp") {
        //     poct = "tcp";
        //     rtspRequestHandle(ws, req);
        // }
        console.log("catch (error) ", error);
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
