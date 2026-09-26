import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import rpx from "@/utils/rpx";
import AppBar from "@/components/base/appBar";
import ThemeText from "@/components/base/themeText";
import ThemeSwitch from "@/components/base/switch";
import Toast from "@/utils/toast";
import useColors from "@/hooks/useColors";
import Slider from "@react-native-community/slider";
import {
    SOUND_EFFECT_PRESETS,
    SoundEffectPreset,
    REVERB_PRESETS,
    ReverbPreset,
    attachToActiveSession,
    getBandInfo,
    getBandLevels,
    setBandLevel,
    applyPreset,
    setBassBoost,
    setVirtualizer,
    setReverb,
    resetEffects,
    soundEffectAvailable,
    IBandInfo,
} from "@/native/soundEffectUtil";

/**
 * 听风语·均衡器（仿 MineRadio 风格）：
 * 预设音效 + 自定义 10 段 EQ + 音域回响 + 重低音/环绕，原生 AudioEffect 实现。
 */
export default function SoundEffectSetting() {
    const colors = useColors();
    const [attached, setAttached] = useState(false);
    const [bandInfo, setBandInfo] = useState<IBandInfo | null>(null);
    const [levels, setLevels] = useState<number[]>([]);
    const [preset, setPreset] = useState<SoundEffectPreset>("均衡");
    const [reverb, setReverbState] = useState<ReverbPreset>("关闭");
    const [bass, setBass] = useState(false);
    const [virtual, setVirtual] = useState(false);

    const refreshLevels = useCallback(async () => {
        try {
            const arr = await getBandLevels();
            if (Array.isArray(arr)) {
                setLevels(arr);
            }
        } catch (_) {}
    }, []);

    useEffect(() => {
        if (!soundEffectAvailable) {
            Toast.warn("当前设备不支持音效模块");
            return;
        }
        attachToActiveSession()
            .then(async () => {
                setAttached(true);
                const info = await getBandInfo();
                setBandInfo(info);
                await refreshLevels();
            })
            .catch((e: any) => {
                setAttached(false);
                Toast.warn(e?.message ?? "音效初始化失败");
            });
    }, [refreshLevels]);

    const onPresetPress = useCallback(
        (p: SoundEffectPreset) => {
            applyPreset(p);
            setPreset(p);
            setBass(p === "重低音");
            setVirtual(p === "DTS" || p === "剧院模式");
            setTimeout(refreshLevels, 120);
        },
        [refreshLevels],
    );

    const onReverbPress = useCallback((r: ReverbPreset) => {
        setReverb(r);
        setReverbState(r);
    }, []);

    const onBandChange = useCallback(
        (band: number, value: number) => {
            const next = [...levels];
            next[band] = Math.round(value);
            setLevels(next);
            setBandLevel(band, Math.round(value));
        },
        [levels],
    );

    const onReset = useCallback(() => {
        resetEffects();
        setPreset("均衡");
        setReverbState("关闭");
        setBass(false);
        setVirtual(false);
        if (bandInfo) {
            setLevels(new Array(bandInfo.bands).fill(0));
        }
        Toast.success("音效已复位");
    }, [bandInfo]);

    if (!soundEffectAvailable) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <AppBar>均衡器</AppBar>
                <ThemeText style={styles.notice}>当前设备不支持音效能力</ThemeText>
            </View>
        );
    }

    const bands = bandInfo?.bands ?? 0;
    const rangeMin = bandInfo?.min ?? -1500;
    const rangeMax = bandInfo?.max ?? 1500;
    const freqLabels = bandInfo?.centerFreqs ?? [];

    const chipStyle = (active: boolean): any => [
        styles.chip,
        active
            ? { backgroundColor: colors.primary, borderColor: colors.primary }
            : { backgroundColor: colors.card, borderColor: colors.border },
    ];
    const chipTextStyle = (active: boolean): any => [
        styles.chipText,
        active && { color: colors.text },
    ];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <AppBar>均衡器（听风语）</AppBar>
            <ScrollView contentContainerStyle={styles.content}>
                {!attached ? (
                    <View style={styles.noticeWrap}>
                        <ThemeText style={styles.notice}>
                            未检测到播放会话：请先播放一首歌，再进入本页开启均衡器
                        </ThemeText>
                    </View>
                ) : (
                    <>
                        {/* 预设音效 */}
                        <ThemeText style={styles.sectionTitle}>预设音效</ThemeText>
                        <View style={styles.chipWrap}>
                            {SOUND_EFFECT_PRESETS.map(p => (
                                <TouchableOpacity
                                    key={p}
                                    style={chipStyle(preset === p)}
                                    onPress={() => onPresetPress(p)}
                                >
                                    <ThemeText style={chipTextStyle(preset === p)}>{p}</ThemeText>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* 自定义 EQ 滑块 */}
                        <View style={styles.eqHeader}>
                            <ThemeText style={styles.sectionTitle}>自定义均衡器（{bands} 段）</ThemeText>
                            <ThemeText style={styles.eqHint}>拖动滑块调整各频段增益</ThemeText>
                        </View>
                        {bands > 0 && (
                            <View style={[styles.eqRow, { backgroundColor: colors.card }]}>
                                {levels.map((lv, i) => (
                                    <View key={i} style={styles.eqItem}>
                                        <ThemeText style={styles.gainText}>
                                            {lv > 0 ? "+" : ""}
                                            {(lv / 10).toFixed(0)}dB
                                        </ThemeText>
                                        <Slider
                                            style={styles.slider}
                                            minimumValue={rangeMin}
                                            maximumValue={rangeMax}
                                            value={lv}
                                            step={50}
                                            minimumTrackTintColor={colors.primary}
                                            maximumTrackTintColor={colors.border}
                                            thumbTintColor={colors.primary}
                                            onValueChange={(v: number) => onBandChange(i, v)}
                                        />
                                        <ThemeText style={styles.freqLabel}>
                                            {freqLabels[i]
                                                ? freqLabels[i] >= 1000
                                                    ? `${(freqLabels[i] / 1000).toFixed(1)}K`
                                                    : `${freqLabels[i]}Hz`
                                                : `段${i + 1}`}
                                        </ThemeText>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* 音域回响（混响） */}
                        <ThemeText style={styles.sectionTitle}>音域回响</ThemeText>
                        <View style={styles.chipWrap}>
                            {REVERB_PRESETS.map(r => (
                                <TouchableOpacity
                                    key={r}
                                    style={chipStyle(reverb === r)}
                                    onPress={() => onReverbPress(r)}
                                >
                                    <ThemeText style={chipTextStyle(reverb === r)}>{r}</ThemeText>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* 增强效果 */}
                        <ThemeText style={styles.sectionTitle}>增强效果</ThemeText>
                        <View style={[styles.enhanceCard, { backgroundColor: colors.card }]}>
                            <View style={styles.enhanceItem}>
                                <ThemeText>重低音</ThemeText>
                                <ThemeSwitch
                                    value={bass}
                                    onValueChange={(v: boolean) => {
                                        setBass(v);
                                        setBassBoost(v ? 0.8 : 0);
                                    }}
                                />
                            </View>
                            <View style={styles.enhanceDivider} />
                            <View style={styles.enhanceItem}>
                                <ThemeText>环绕声</ThemeText>
                                <ThemeSwitch
                                    value={virtual}
                                    onValueChange={(v: boolean) => {
                                        setVirtual(v);
                                        setVirtualizer(v ? 0.7 : 0);
                                    }}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.resetBtn, { borderColor: colors.primary }]}
                            onPress={onReset}
                        >
                            <ThemeText style={{ color: colors.primary }}>复位音效</ThemeText>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: rpx(24), paddingBottom: rpx(48) },
    noticeWrap: { paddingTop: rpx(120) },
    notice: { textAlign: "center", opacity: 0.7, lineHeight: rpx(36) },
    sectionTitle: { fontSize: rpx(28), fontWeight: "600", marginTop: rpx(28), marginBottom: rpx(16) },
    chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: rpx(12) },
    chip: {
        borderWidth: 1,
        borderRadius: rpx(18),
        paddingHorizontal: rpx(22),
        paddingVertical: rpx(14),
        marginBottom: rpx(4),
    },
    chipText: { fontSize: rpx(26) },
    eqHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
    eqHint: { fontSize: rpx(20), opacity: 0.5 },
    eqRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        borderRadius: rpx(16),
        padding: rpx(16),
    },
    eqItem: { width: "18%", alignItems: "center", marginBottom: rpx(18) },
    gainText: { fontSize: rpx(20), opacity: 0.8 },
    slider: { width: "100%", height: rpx(120), transform: [{ rotate: "-90deg" }] },
    freqLabel: { fontSize: rpx(20), opacity: 0.6 },
    enhanceCard: {
        flexDirection: "row",
        justifyContent: "space-around",
        borderRadius: rpx(16),
        paddingVertical: rpx(20),
        paddingHorizontal: rpx(12),
    },
    enhanceItem: { flexDirection: "row", alignItems: "center", gap: rpx(12) },
    enhanceDivider: { width: 1, backgroundColor: "#8882" },
    resetBtn: {
        marginTop: rpx(36),
        borderWidth: 1,
        borderRadius: rpx(16),
        paddingVertical: rpx(18),
        alignItems: "center",
    },
});
