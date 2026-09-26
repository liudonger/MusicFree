import React, { useMemo } from "react";
import { Image, StyleSheet, View } from "react-native";
import { ImgAsset } from "@/constants/assetsConst";
import { useCurrentMusic } from "@/core/trackPlayer";
import { useAppConfig } from "@/core/appConfig";
import ParticleField from "@/components/visual/ParticleField";
import CinematicOverlay from "@/components/visual/CinematicOverlay";

export default function Background() {
    const musicItem = useCurrentMusic();
    const vehicleEnabled = useAppConfig("vehicle.enabled");

    const artworkSource = useMemo(() => {
        if (!musicItem?.artwork) {
            return ImgAsset.albumDefault;
        }

        if (typeof musicItem.artwork === "string") {
            return {
                uri: musicItem.artwork,
            };
        }
        return musicItem.artwork;
    }, [musicItem?.artwork]);

    return (
        <>
            <View style={style.background} />
            <Image style={style.blur} blurRadius={50} source={artworkSource} />
            {/* 听风语粒子视觉：车载大屏更多粒子 */}
            <ParticleField density={vehicleEnabled ? 26 : 14} />
            {/* 电影镜头氛围层 */}
            <CinematicOverlay strong={!!vehicleEnabled} />
        </>
    );
}

const style = StyleSheet.create({
    background: {
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#000",
    },
    blur: {
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.5,
    },
});
