# TingFengYu

**中文** | [English](./readme-en.md)

A vehicle music player forked from [MusicFree](https://github.com/maotoumao/MusicFree) (AGPL-3.0), customized for Geely Galaxy Starship 7 (Flyme Auto) — a personal, non-commercial project.

> This project is derived from MusicFree and licensed under AGPL-3.0. Redistribution must retain the original source:
> https://github.com/maotoumao/MusicFree
>
> Personal research and in-car use only. Not for commercial use or distribution.

## Features

- Vehicle adaptation: large-screen UI, audio focus management, foreground keep-alive playback service
- QR-code source sync over LAN: upload plugins from phone, auto-import on vehicle
- Dual source format compatibility: MusicFree JS plugins + music.json (auto-conversion)
- Sound effects: 10-band equalizer with 7 presets
- Plugin ecosystem fully compatible with MusicFree plugins

## Build

Requirements: Node 22+ / JDK 17 / Android SDK 35 + Build Tools 35.0.0 + NDK 26.1

```bash
npm install
cd android
gradlew assembleRelease -x lintVitalAnalyzeRelease
```

Output: `android/app/build/outputs/apk/release/app-arm64-v8a-release.apk`

## License

AGPL-3.0. See [LICENSE](./LICENSE).