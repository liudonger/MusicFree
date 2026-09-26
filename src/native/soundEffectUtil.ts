/**
 * soundEffectUtil.ts —— 听风语车载音效 JS 封装
 * 对接 NativeSoundEffect（EQ / 环绕 / 重低音 / 预设）
 */
import { NativeModules } from "react-native";

const { NativeSoundEffect } = NativeModules;

/** 内置音效预设 */
export const SOUND_PRESETS = [
    "澎湃外放",
    "臻享环绕",
    "DTS",
    "悦耳人声",
    "剧院模式",
    "重低音",
    "均衡",
] as const;

export type ISoundPreset = (typeof SOUND_PRESETS)[number];

/** 绑定播放器音频会话（RNTP 会话 ID 通常为 0） */
export function attachSession(session: number) {
    NativeSoundEffect?.attachSession?.(session);
}

/** 查询 EQ 增益范围 */
export function getBandLevelRange(): Promise<{ min: number; max: number } | null> {
    if (!NativeSoundEffect?.getBandLevelRange) {
        return Promise.resolve(null);
    }
    return NativeSoundEffect.getBandLevelRange().catch(() => null);
}

/** 设置单频段增益 */
export function setBandLevel(band: number, level: number) {
    NativeSoundEffect?.setBandLevel?.(band, level);
}

/** 设置自定义 EQ 数组 */
export function setEqualizer(levels: number[]) {
    NativeSoundEffect?.setEqualizer?.(levels);
}

/** 应用预设音效 */
export function applySoundPreset(preset: ISoundPreset) {
    NativeSoundEffect?.applyPreset?.(preset);
}

/** 设置重低音强度 */
export function setBassBoost(strength: number) {
    NativeSoundEffect?.setBassBoost?.(strength);
}

/** 设置环绕强度 */
export function setVirtualizer(strength: number) {
    NativeSoundEffect?.setVirtualizer?.(strength);
}

/** 复位音效 */
export function resetSoundEffects() {
    NativeSoundEffect?.resetEffects?.();
}
