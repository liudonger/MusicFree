/**
 * syncUtil.ts —— 听风语扫码同步 JS 封装
 * 对接 NativeVehicleSync（局域网 HTTP 服务 / 二维码地址获取 / 上传事件）
 */
import { NativeModules, NativeEventEmitter } from "react-native";

const { NativeVehicleSync } = NativeModules;

const syncEmitter = NativeVehicleSync
    ? new NativeEventEmitter(NativeVehicleSync)
    : null;

export interface ISyncFileEvent {
    filename?: string;
    savedName?: string;
}

/** 获取车机局域网 IP（二维码地址用） */
export function getLocalIpAddress(): Promise<string> {
    if (!NativeVehicleSync?.getLocalIpAddress) {
        return Promise.resolve("");
    }
    return NativeVehicleSync.getLocalIpAddress();
}

/** 启动同步服务，返回实际监听端口 */
export function startSyncServer(port: number): Promise<boolean> {
    if (!NativeVehicleSync?.startSyncServer) {
        return Promise.resolve(false);
    }
    return NativeVehicleSync.startSyncServer(port);
}

/** 停止同步服务 */
export function stopSyncServer() {
    if (!NativeVehicleSync?.stopSyncServer) {
        return;
    }
    NativeVehicleSync.stopSyncServer();
}

/** 订阅文件上传完成事件（用于刷新插件列表） */
export function addSyncFileListener(
    listener: (event: ISyncFileEvent) => void,
) {
    if (!syncEmitter) {
        return () => {};
    }
    const sub = syncEmitter.addListener(
        "vehicleSyncFileUploaded",
        listener,
    );
    return () => sub.remove();
}
