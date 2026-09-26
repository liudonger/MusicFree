# 听风语 TingFengYu

**中文** | [English](./readme-en.md)

基于 [MusicFree](https://github.com/maotoumao/MusicFree)（AGPL-3.0）二次开发的车载音乐播放器，专为吉利银河星舰7（Flyme Auto 车机）打造的个人自用项目。

> ⚠️ 本项目基于 MusicFree 二次开发，遵循 AGPL-3.0 协议开源，二次分发必须保留原项目出处：
> https://github.com/maotoumao/MusicFree
>
> 本项目不商用、不分发，仅供个人研究与车机自用。

## 特性

- 🚗 **车载深度适配**：大屏 UI、音频焦点管理、前台保活播放服务
- 📱 **扫码同步音源**：局域网扫码二维码，手机上传音源，车机自动导入
- 🔄 **双音源格式兼容**：支持 MusicFree JS 插件 与 音悦风格 music.json（自动转换）
- 🎵 **音效系统**：十段均衡器 + 澎湃外放/臻享环绕/DTS/悦耳人声/剧院模式/重低音/均衡 七大预设
- 🧩 插件化音源生态（与 MusicFree 插件完全兼容）

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
