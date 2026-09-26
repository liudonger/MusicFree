import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";

/**
 * 电影镜头：播放页电影感视觉层。
 * 顶部/底部暗角 + 中央品牌绿氛围光晕，营造沉浸式观影氛围。
 */
const CinematicOverlay = memo(function CinematicOverlay({ strong = false }: { strong?: boolean }) {
    const vignette = strong ? 0.68 : 0.52;
    return (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {/* 顶部暗角 */}
            <LinearGradient
                colors={[`rgba(0,0,0,${vignette})`, "rgba(0,0,0,0)"]}
                style={styles.topVignette}
            />
            {/* 底部暗角 */}
            <LinearGradient
                colors={["rgba(0,0,0,0)", `rgba(0,0,0,${vignette})`]}
                style={styles.bottomVignette}
            />
            {/* 中央品牌绿氛围光 */}
            <LinearGradient
                colors={["rgba(76,175,80,0.20)", "rgba(76,175,80,0)"]}
                style={styles.centerGlow}
            />
            {/* 左右淡出，收拢视线 */}
            <LinearGradient
                colors={["rgba(0,0,0,0.25)", "rgba(0,0,0,0)"]}
                style={styles.leftFade}
            />
            <LinearGradient
                colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.25)"]}
                style={styles.rightFade}
            />
        </View>
    );
});

export default CinematicOverlay;

const styles = StyleSheet.create({
    topVignette: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "36%",
    },
    bottomVignette: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "40%",
    },
    centerGlow: {
        position: "absolute",
        top: "20%",
        left: "12%",
        right: "12%",
        height: "34%",
    },
    leftFade: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        width: "14%",
    },
    rightFade: {
        position: "absolute",
        top: 0,
        bottom: 0,
        right: 0,
        width: "14%",
    },
});
