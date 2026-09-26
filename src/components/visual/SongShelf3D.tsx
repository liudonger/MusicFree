import React, { memo, useCallback, useRef } from "react";
import {
    NativeScrollEvent,
    NativeSyntheticEvent,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import Animated, {
    Extrapolation,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
} from "react-native-reanimated";
import FastImage from "react-native-fast-image";
import rpx from "@/utils/rpx";
import { ImgAsset } from "@/constants/assetsConst";
import ThemeText from "@/components/base/themeText";

/**
 * 3D 歌单架：横向滚动的 3D 视差书架。
 * 中间卡片放大正立，两侧卡片旋转缩放后退，底部书架底座，营造实体唱片架效果。
 */
interface IProps {
    sheets: IMusic.IMusicSheetItemBase[];
    onPressSheet: (sheet: IMusic.IMusicSheetItemBase) => void;
    cardWidth?: number; // 覆盖默认卡片宽（车载大屏可传更大值）
}

const DEFAULT_CARD_W = 200;
const CARD_RATIO = 1.06; // 高/宽

const SongShelf3D = memo(function SongShelf3D({
    sheets,
    onPressSheet,
    cardWidth = DEFAULT_CARD_W,
}: IProps) {
    const { width: screenW } = useWindowDimensions();
    const scrollX = useSharedValue(0);

    const cardW = Math.min(cardWidth, screenW * 0.5);
    const cardH = cardW * CARD_RATIO;
    const gap = cardW * 0.22;

    const onScroll = useCallback(
        (e: NativeSyntheticEvent<NativeScrollEvent>) => {
            scrollX.value = e.nativeEvent.contentOffset.x;
        },
        [scrollX],
    );

    return (
        <View style={styles.wrap}>
            <Animated.ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                    styles.shelfContent,
                    { paddingHorizontal: (screenW - cardW) / 2 },
                ]}
                snapToInterval={cardW + gap}
                decelerationRate="fast"
                scrollEventThrottle={16}
                onScroll={onScroll}
            >
                {sheets.map((sheet, i) => (
                    <ShelfCard
                        key={`${sheet.platform}-${sheet.id}`}
                        sheet={sheet}
                        index={i}
                        cardW={cardW}
                        cardH={cardH}
                        gap={gap}
                        scrollX={scrollX}
                        onPress={onPressSheet}
                    />
                ))}
            </Animated.ScrollView>
            {/* 书架底座 */}
            <View style={[styles.base, { width: cardW * 3.6, left: (screenW - cardW * 3.6) / 2 }]}>
                <View style={styles.baseShine} />
            </View>
        </View>
    );
});

interface ICardProps {
    sheet: IMusic.IMusicSheetItemBase;
    index: number;
    cardW: number;
    cardH: number;
    gap: number;
    scrollX: Animated.SharedValue<number>;
    onPress: (sheet: IMusic.IMusicSheetItemBase) => void;
}

function ShelfCard({ sheet, index, cardW, cardH, gap, scrollX, onPress }: ICardProps) {
    const itemW = cardW + gap;

    const animatedStyle = useAnimatedStyle(() => {
        const input = [
            (index - 1) * itemW,
            index * itemW,
            (index + 1) * itemW,
        ];
        const scale = interpolate(scrollX.value, input, [0.78, 1, 0.78], Extrapolation.CLAMP);
        const rotateY = interpolate(scrollX.value, input, [14, 0, -14], Extrapolation.CLAMP);
        const translateY = interpolate(scrollX.value, input, [26, 0, 26], Extrapolation.CLAMP);
        const opacity = interpolate(scrollX.value, input, [0.55, 1, 0.55], Extrapolation.CLAMP);
        return {
            opacity,
            transform: [
                { perspective: 700 },
                { rotateY: `${rotateY}deg` },
                { scale },
                { translateY },
            ],
        };
    });

    return (
        <Animated.View style={[styles.cardSlot, { width: cardW, marginRight: gap }, animatedStyle]}>
            <TouchableOpacity activeOpacity={0.85} onPress={() => onPress(sheet)}>
                <View style={[styles.coverBox, { width: cardW, height: cardH }]}>
                    <FastImage
                        style={styles.cover}
                        source={
                            sheet.coverImg || sheet.artwork
                                ? { uri: (sheet.coverImg ?? sheet.artwork) as string }
                                : ImgAsset.albumDefault
                        }
                        resizeMode={FastImage.resizeMode.cover}
                    />
                    <View style={styles.coverGloss} />
                </View>
                <ThemeText numberOfLines={1} style={styles.title}>
                    {sheet.title}
                </ThemeText>
            </TouchableOpacity>
        </Animated.View>
    );
}

export default SongShelf3D;

const styles = StyleSheet.create({
    wrap: {
        marginTop: rpx(16),
        marginBottom: rpx(8),
    },
    shelfContent: {
        paddingVertical: rpx(28),
    },
    cardSlot: {
        alignItems: "center",
    },
    coverBox: {
        borderRadius: rpx(18),
        overflow: "hidden",
        backgroundColor: "#1E1E1E",
        shadowColor: "#000",
        shadowOpacity: 0.45,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
    },
    cover: {
        width: "100%",
        height: "100%",
    },
    coverGloss: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.14)",
        borderRadius: rpx(18),
    },
    title: {
        marginTop: rpx(12),
        textAlign: "center",
        fontSize: rpx(24),
        opacity: 0.9,
        maxWidth: "90%",
    },
    base: {
        position: "absolute",
        bottom: 0,
        height: rpx(18),
        borderRadius: rpx(9),
        backgroundColor: "rgba(76,175,80,0.18)",
        overflow: "hidden",
    },
    baseShine: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "50%",
        backgroundColor: "rgba(255,255,255,0.10)",
    },
});
