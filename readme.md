# 听风语 TingFengYu

**中文** | [English](./readme-en.md)

面向安卓车机深度定制的音乐播放器，专为吉利银河星舰7（Flyme Auto 车机）打造的个人自用项目。

> ⚠️ 本项目代码源自 AGPL-3.0 开源项目，遵循 AGPL-3.0 协议。若进行二次分发必须开源、免费并保留原项目出处：
> https://github.com/maotoumao/MusicFree
>
> 本项目不商用、不分发，仅供个人研究与车机自用。

## 特性

- 🚗 **车载深度适配**：大屏 UI、音频焦点管理、前台保活播放服务
- ⚡ **P1 播放提速**：URL 热缓存 + 多源竞速 + 插件预热，起播几乎零等待
- 📱 **扫码同步音源**：局域网扫码二维码，手机上传音源，车机自动导入
- 🔄 **双音源格式兼容**：支持标准 JS 插件 与 music.json 聚合音源（自动转换）
- 🎚️ **MineRadio 风格均衡器**：预设 + 自定义 10 段 EQ + 音域回响（混响 6 档）+ 重低音/环绕
- ✨ **沉浸视觉**：粒子音符背景、电影镜头氛围、3D 歌单架（车载大屏适配）
- 🧩 插件化音源生态（标准插件协议兼容）

## 构建

环境要求：Node 22+ / JDK 17 / Android SDK 35 + Build Tools 35.0.0 + NDK 26.1

```bash
npm install
cd android
gradlew assembleRelease -x lintVitalAnalyzeRelease
```

产物：`android/app/build/outputs/apk/release/app-arm64-v8a-release.apk`

## 协议

AGPL-3.0。详见 [LICENSE](./LICENSE)。
