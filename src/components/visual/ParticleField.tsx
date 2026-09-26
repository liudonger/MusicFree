import React, { memo, useEffect, useMemo } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

/**
 * 粒子视觉：漂浮的音符粒子背景（品牌绿/白）。
 * 供播放页、均衡器、车载大屏使用，营造"音乐在空气里流动"的氛围。
 */
interface Particle {
    x: number; // 横向基准位置（百分比）
    y: number; // 起始高度（百分比，底部起）
    size: number;
    note: string;
    duration: number;
    delay: number;
    opacity: number;
}

const NOTES = ["♩", "♪", "♫", "♬", "𝄞"];

function ParticleItem({ p }: { p: Particle }) {
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withDelay(
            p.delay,
            withRepeat(
                withTiming(1, { duration: p.duration, easing: Easing.inOut(Easing.quad) }),
                -1,
                false,
            ),
        );
    }, [p.delay, p.duration, progress]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: progress.value * p.size * 0.6 },
            { translateY: -progress.value * p.size * 4 },
            { rotate: `${progress.value * 18}deg` },
        ],
        opacity: p.opacity * (1 - progress.value * 0.45),
    }));

    return (
        <View
            style={[
                styles.particle,
                { left: `${p.x}%`, top: `${p.y}%` },
            ]}>
            <Animated.View style={animatedStyle}>
                <Text style={[styles.note, { fontSize: p.size, color: p.note === "𝄞" ? "#C8E6C9" : "#A5D6A7" }]}>
                    {p.note}
                </Text>
            </Animated.View>
        </View>
    );
}

interface IProps {
    density?: number; // 粒子数量
    animated?: boolean; // 是否动画（false 时静态装饰）
}

const ParticleField = memo(function ParticleField({ density = 12, animated = true }: IProps) {
    const { width, height } = useWindowDimensions();

    const particles = useMemo<Particle[]>(() => {
        const list: Particle[] = [];
        const count = Math.min(Math.max(density, 4), 40);
        for (let i = 0; i < count; i++) {
            list.push({
                x: 4 + Math.random() * 92,
                y: 30 + Math.random() * 65,
                size: 18 + Math.random() * 34,
                note: NOTES[Math.floor(Math.random() * NOTES.length)],
                duration: 6000 + Math.random() * 9000,
                delay: Math.random() * 6000,
                opacity: 0.25 + Math.random() * 0.45,
            });
        }
        return list;
    }, [density, width, height]);

    return (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {particles.map((p, i) => (
                <ParticleItem key={`${i}-${p.note}`} p={p} />
            ))}
        </View>
    );
});

export default ParticleField;

const styles = StyleSheet.create({
    particle: {
        position: "absolute",
    },
    note: {
        fontWeight: "600",
        textShadowColor: "rgba(0,0,0,0.35)",
        textShadowRadius: 6,
    },
});
