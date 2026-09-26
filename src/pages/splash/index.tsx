import React, { useEffect } from "react";
import { Image, StyleSheet, StatusBar, useWindowDimensions } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { ROUTE_PATH } from "@/core/router";

// 开屏素材（与项目内统一使用 require 加载资源，避免 TS 模块声明问题）
const splash9 = require("@/assets/splash/splash_9_16.png");
const splash83 = require("@/assets/splash/splash_8_3_web.png");

/**
 * 听风语品牌开屏页：
 * 手机竖屏展示 9:16 场景图（绿树/戴耳机小孩/音符），车机横屏自动切换 8:3 宽幅图；
 * 展示约 2.4s 后淡出进入主页。配合原生系统 SplashScreen（白色底 + 听风语 Logo）无缝衔接。
 */
export default function Splash() {
    const navigation = useNavigation<any>();
    const { width, height } = useWindowDimensions();
    const landscape = width > height;
    const opacity = useSharedValue(1);

    useEffect(() => {
        opacity.value = withDelay(
            1200,
            withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        );
        const timer = setTimeout(() => {
            navigation.reset({
                index: 0,
                routes: [{ name: ROUTE_PATH.HOME }],
            });
        }, 2300);
        return () => clearTimeout(timer);
    }, [navigation, opacity]);

    const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            <StatusBar hidden />
            <Image
                source={landscape ? splash83 : splash9}
                style={styles.img}
                resizeMode="cover"
            />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#2E7D32",
    },
    img: {
        width: "100%",
        height: "100%",
    },
});
