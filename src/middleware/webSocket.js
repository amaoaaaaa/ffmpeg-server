const path = require("path");
const expressWebSocket = require("express-ws");
const webSocketStream = require("websocket-stream/stream");
const ffmpeg = require("fluent-ffmpeg");
const { logDivider, toEven, Log } = require("../utils");

const ffmpegPath = path.join(__dirname, "../../ffmpeg-master-latest-win64-gpl-shared/bin/ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * 根据 rtsp 源视频的尺寸和自定义分辨率，计算缩放后的宽高。避免分辨率出现奇数导致转码失败
 * @param {String} rtspUrl - rtsp 地址
 * @param {Number} customizeWidth - 自定义宽度
 * @param {Number}  customizeHeight - 自定义高度
 *
 * @typedef {Object} ComputedScaleRes
 * @property {Number} width - 缩放后的宽度
 * @property {Number} height - 缩放后的高度
 * @property {Number} sourceWidth - rtsp 视频宽度
 * @property {Number} sourceHeight - rtsp 视频高度
 *
 * @returns {Promise<ComputedScaleRes>} 宽高的数值
 */
const computedScale = async (rtspUrl, customizeWidth, customizeHeight) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(rtspUrl, (err, metadata) => {
            if (err) return reject("获取 rtsp 元数据失败");

            const videoStream = metadata.streams.find((stream) => stream.codec_type === "video");

            if (!videoStream) return reject("找不到视频流");

            const sourceWidth = videoStream.width;
            const sourceHeight = videoStream.height;

            // 未设置宽度，则计算宽度
            if (customizeWidth === -1) {
                /**
                 *        ?           sourceWidth
                 * --------------- = --------------
                 * customizeHeight    sourceHeight
                 */

                customizeWidth = Math.floor(customizeHeight * (sourceWidth / sourceHeight));
            }

            // 未计算高度，则计算高度
            if (customizeHeight === -1) {
                /**
                 * customizeWidth     sourceWidth
                 * --------------- = --------------
                 *        ?           sourceHeight
                 */

                customizeHeight = Math.floor(customizeWidth / (sourceWidth / sourceHeight));
            }

            resolve({
                // HACK 这里强行把奇数分辨率转成偶数，可能会导致一点点🤏的画面比例变形
                width: toEven(customizeWidth),
                height: toEven(customizeHeight),
                sourceWidth,
                sourceHeight,
            });
        });
    });
};

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
     *         description: 输出视频的比特率。
     */
    app.ws("/rtsp/:id/", async (ws, req) => {
        /** 简单的 console.log 输出管理 */
        const log = new Log();

        const { url, bitrate } = req.query;

        log.add("准备开始转码：", url);

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

        try {
            // 设置分辨率。-1 为自动计算
            const width = req.query.width || -1;
            const height = req.query.height || -1;
            const scale = `${width} x ${height}`;

            if (scale !== "-1 x -1") {
                const newScale = await computedScale(url, Number(width), Number(height));

                outputOptions.push(["-vf", `scale=${newScale.width}:${newScale.height}`]);

                const { sourceWidth, sourceHeight } = newScale;
                log.add("rtsp 分辨率：", sourceWidth, "x", sourceHeight);
                log.add("自定义分辨率：", scale.replace(/-1/g, "自动"));
                log.add("输出的分辨率：", newScale.width, "x", newScale.height);
            } else {
                log.add("输出的分辨率：", "自动");
            }

            // 设置比特率
            bitrate && outputOptions.push(["-b:v", bitrate]);
            log.add("输出的比特率：", bitrate || "自动");

            const stream = webSocketStream(ws, {
                binary: true,
                browserBufferTimeout: 1000 * 5,
            });

            ffmpeg(url)
                .addInputOption("-rtsp_transport", "tcp", "-buffer_size", "102400")
                .outputOptions(outputOptions.flat())
                .on("start", function () {
                    log.add("开始转码...");

                    logDivider();
                    log.echo();
                })
                .on("error", function (err) {
                    if (err.message === "Output stream closed") {
                        logDivider();
                        console.log("断开连接：", url);
                        return;
                    }

                    throw new Error(err.message);
                })
                .pipe(stream);
        } catch (error) {
            log.add("处理 rtsp 转码出错：", error);

            // 关闭 WebSocket 连接
            ws.close();
            log.add("关闭 WebSocket 连接", url);

            logDivider();
            log.echo();
        }
    });
};
