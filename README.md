# ffmpeg-server
一个 nodejs + express + ffmpeg 的视频转码服务，用于将 rtsp 协议的流转换成前端可以播放的 flv

### 启动

```
node index.js
```

### 前端使用
```
`ws://host:8888/rtsp/${id}/?url=rtsp://127.0.0.1:8554/video`
```
#### Vue 中使用 flv.js 播放转换后的地址
```
<template>
  <div class="flv">
    <video muted ref="player" class="player"></video>
  </div>
</template>
<script>
import flvjs from "flv.js";

export default {
  name: "FlvPlayer",
  props: {
    // 直接用 WebSocket 协议播放：ws://host:8888/rtsp/${id}/?url=rtsp://127.0.0.1:8554/video
    url: String,
  },
  methods: {
    init() {
      let video = this.$refs.player;

      if (!flvjs.isSupported() || !video) return;

      const player = flvjs.createPlayer(
        {
          type: "flv",
          isLive: true,
          hasVideo: true,
          hasAudio: false,
          url: this.url,
        },
        {
          cors: true, // 是否跨域
          enableStashBuffer: false,
          fixAudioTimestampGap: false,
          isLive: true,
          lazyLoad: true,
          deferLoadAfterSourceOpen: false,
          autoCleanupSourceBuffer: true, // 是否自动清理缓存
        }
      );

      player.attachMediaElement(video);
      player.load();
      player.play();

      this.player = player;
    },
  },
  mounted() {
    this.init();
  },
  beforeDestroy() {
    if (this.player) {
      try {
        this.player.pause();
        this.player.unload();
        this.player.detachMediaElement();
        this.player.destroy();
      } catch (error) {
        console.error(error);
      }
    }
  },
};
</script>
<style scoped lang="less">
.flv {
  position: relative;
  width: 100%;
  height: 100%;

  .player {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
</style>

```