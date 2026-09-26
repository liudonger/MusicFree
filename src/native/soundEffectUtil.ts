/**
 * soundEffectUtil.ts —— 听风语车载音效原生能力 JS 封装
 * 对接 NativeSoundEffect（10段EQ / 7大预设 / 重低音 / 环绕）
 */
import { NativeModules } from "react-native";

const { NativeSoundEffect } = NativeModules;

/** 7 大预设（与原生 applyPreset 一致，顺序即展示顺序） */
export const SOUND_EFFECT_PRESETS = [
    "澎湃外放",
    "臻享环绕",
    "DTS",
    "悦耳人声",
    "剧院模式",
    "重低音",
    "均衡",
] as const;

export type SoundEffectPreset = (typeof SOUND_EFFECT_PRESETS)[number];

/** 音域回响（混响）模式 */
export const REVERB_PRESETS = [
    "关闭",
    "小房间",
    "中房间",
    "大房间",
    "中厅",
    "大厅",
    "舞台",
] as const;

export type ReverbPreset = (typeof REVERB_PRESETS)[number];

export interface IBandInfo {
    bands: number;
    min: number;
    max: number;
    centerFreqs: number[];
}

/** 原生能力是否可用 */
export const soundEffectAvailable = !!NativeSoundEffect;

/** 自动探测当前活跃播放会话并挂载音效，返回 session id */
export function attachToActiveSession(): Promise<number> {
    if (!NativeSoundEffect?.attachToActiveSession) {
        return Promise.reject(new Error("音效模块不可用"));
    }
    return NativeSoundEffect.attachToActiveSession();
}

/** 查询 EQ 频段数量/范围/中心频率 */
export function getBandInfo(): Promise<IBandInfo> {
    if (!NativeSoundEffect?.getBandInfo) {
        return Promise.reject(new Error("音效模块不可用"));
    }
    return NativeSoundEffect.getBandInfo();
}

/** 查询当前各频段增益（mB），用于回显滑块 */
export function getBandLevels(): Promise<number[]> {
    if (!NativeSoundEffect?.getBandLevels) {
        return Promise.reject(new Error("音效模块不可用"));
    }
    return NativeSoundEffect.getBandLevels();
}

/** 设置单个频段增益（mB） */
export function setBandLevel(band: number, level: number) {
    NativeSoundEffect?.setBandLevel?.(band, level);
}

/** 设置自定义 EQ（增益数组，mB） */
export function setEqualizer(levels: number[]) {
    NativeSoundEffect?.setEqualizer?.(levels);
}

/** 应用预设音效 */
export function applyPreset(preset: SoundEffectPreset) {
    NativeSoundEffect?.applyPreset?.(preset);
}

/** 重低音强度 0..1 */
export function setBassBoost(strength: number) {
    NativeSoundEffect?.setBassBoost?.(strength);
}

/** 环绕强度 0..1 */
export function setVirtualizer(strength: number) {
    NativeSoundEffect?.setVirtualizer?.(strength);
}

/** 音域回响（混响）模式 */
export function setReverb(preset: ReverbPreset) {
    NativeSoundEffect?.setReverb?.(preset);
}

/** 复位所有音效 */
export function resetEffects() {
    NativeSoundEffect?.resetEffects?.();
}