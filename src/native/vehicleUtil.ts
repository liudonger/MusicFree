/**
 * vehicleUtil.ts —— 听风语车载原生能力 JS 封装
 * 对接 NativeVehicle（音频焦点 / 前台保活服务）
 */
import { NativeModules, NativeEventEmitter } from "react-native";

const { NativeVehicle } = NativeModules;

const vehicleEmitter = NativeVehicle
    ? new NativeEventEmitter(NativeVehicle)
    : null;

export interface IVehicleAudioFocusEvent {
    /** 1=获得焦点 2=永久丢失 3=临时丢失 4=可降低音量 */
    state: number;
    type: string;
}

/** 请求音频焦点（音乐播放场景） */
export function requestAudioFocus(): Promise<boolean> {
    if (!NativeVehicle?.requestAudioFocus) {
        return Promise.resolve(true);
    }
    return NativeVehicle.requestAudioFocus();
}

/** 释放音频焦点 */
export function abandonAudioFocus() {
    if (!NativeVehicle?.abandonAudioFocus) {
        return;
    }
    NativeVehicle.abandonAudioFocus();
}

/** 当前是否持有音频焦点 */
export function hasAudioFocus(): boolean {
    if (!NativeVehicle?.hasAudioFocus) {
        return true;
    }
    return NativeVehicle.hasAudioFocus();
}

/** 启动前台保活服务（车载熄屏/后台保持播放） */
export function startKeepAliveService(
    title = "听风语",
    content = "车载音乐播放中",
) {
    if (!NativeVehicle?.startKeepAliveService) {
        return;
    }
    NativeVehicle.startKeepAliveService(title, content);
}

/** 停止前台保活服务 */
export function stopKeepAliveService() {
    if (!NativeVehicle?.stopKeepAliveService) {
        return;
    }
    NativeVehicle.stopKeepAliveService();
}

/** 订阅音频焦点变化（导航播报等） */
export function addAudioFocusListener(
    listener: (event: IVehicleAudioFocusEvent) => void,
) {
    if (!vehicleEmitter) {
        return () => {};
    }
    const sub = vehicleEmitter.addListener(
        "vehicleAudioFocusChange",
        listener,
    );
    return () => sub.remove();
}
