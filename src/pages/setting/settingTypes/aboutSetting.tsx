import React from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import rpx from "@/utils/rpx";
import { ImgAsset } from "@/constants/assetsConst";
import ThemeText from "@/components/base/themeText";
import LinkText from "@/components/base/linkText";
import useCheckUpdate from "@/hooks/useCheckUpdate.ts";
import useOrientation from "@/hooks/useOrientation";
import Divider from "@/components/base/divider";

export default function AboutSetting() {
    const checkAndShowResult = useCheckUpdate();
    const orientation = useOrientation();

    return (
        <View
            style={[
                style.wrapper,
                orientation === "horizontal"
                    ? {
                        flexDirection: "row",
                    }
                    : null,
            ]}>
            <View
                style={[
                    style.header,
                    orientation === "horizontal" ? style.horizontalSize : null,
                ]}>
                <TouchableOpacity
                    onPress={() => {
                        checkAndShowResult(true);
                    }}>
                    <Image
                        source={ImgAsset.author}
                        style={style.image}
                        resizeMode="contain"
                    />
                </TouchableOpacity>
                <ThemeText style={style.margin}>听风语 · 车载音乐播放器</ThemeText>
                <ThemeText style={style.margin}>
                    面向吉利银河星舰7（Flyme Auto 车机）
                </ThemeText>
                <View style={style.contactContainer}>
                    <ThemeText style={style.margin}>
                        个人自用项目 · 不商用 · 不分发
                    </ThemeText>
                </View>
            </View>
            <ScrollView
                contentContainerStyle={style.scrollViewContainer}
                style={style.scrollView}>
                <ThemeText fontSize="title">关于听风语: </ThemeText>
                <ThemeText style={style.content}>
                    「听风语」是基于开源项目{" "}
                    <ThemeText fontWeight="bold">MusicFree</ThemeText>{" "}
                    二次开发的车载音乐播放器，为吉利银河星舰7 车机场景深度定制：
                    车载大屏 UI、扫码同步音源、双音源格式兼容（music.json 与
                    JS 插件）、十段均衡器与多种音效预设、前台保活播放。
                </ThemeText>
                <ThemeText style={style.content}>
                    本项目为个人研究与车机自用，不用于商业用途，不分发传播。如需了解原项目功能与插件开发方式，请访问{" "}
                    <LinkText linkTo="https://musicfree.catcat.work">
                        原项目官方网站
                    </LinkText>
                    。
                </ThemeText>
                <Divider style={style.content} />

                <ThemeText style={style.content}>
                    本软件完全免费，并基于{" "}
                    <ThemeText fontWeight="bold">AGPL3.0 协议</ThemeText>{" "}
                    开源。由于代码源自 MusicFree，二次开发须遵守如下约定：
                </ThemeText>

                <ThemeText style={style.content}>
                    1. 二次分发版必须同样遵循 AGPL 3.0 协议，开源且免费
                </ThemeText>
                <ThemeText style={style.content}>
                    2. 合法合规使用代码，不要用于商业用途;
                    修改后的软件造成的任何问题由使用此代码的开发者承担
                </ThemeText>
                <ThemeText style={style.content}>
                    3.
                    打包、二次分发时请保留代码出处：https://github.com/maotoumao/MusicFree
                </ThemeText>
                <ThemeText style={style.content}>
                    4. 如果开源协议变更，将在原 Github 仓库更新，不另行通知
                </ThemeText>
                <ThemeText style={style.content}>
                    原项目代码已开源到{" "}
                    <LinkText linkTo="https://github.com/maotoumao/MusicFree">
                        Github
                    </LinkText>
                    ，如果打不开试试把链接中的 github 换成 gitcode。
                </ThemeText>

                <Divider style={style.content} />

                <ThemeText style={style.content}>
                    本软件需要通过插件来完成包括播放、搜索在内的大部分功能，如果你是从第三方下载的插件，
                    <ThemeText fontWeight="bold">
                        请一定谨慎识别这些插件的安全性，保护好自己。（注意：插件以及插件可能产生的数据与本软件无关，请使用者合理合法使用。）
                    </ThemeText>
                </ThemeText>

                <ThemeText style={style.content}>
                    <ThemeText fontWeight="bold">
                        还请注意本软件只是个人的业余项目，距离稳定版也有很长一段距离。
                    </ThemeText>
                    如果你在找成熟稳定的音乐软件，可以考虑其他优秀的软件。当然我会一直维护，让它变得尽可能的完善一些。
                </ThemeText>

                <ThemeText style={style.content}>
                    开发这个软件的最初目的是自用：在车里听歌更自由、更顺手。
                    如果它能在你的车机上派上用场，那这就是听风语存在的意义。
                </ThemeText>

                <ThemeText style={style.content}>by: 听风语项目组</ThemeText>
            </ScrollView>
        </View>
    );
}

const style = StyleSheet.create({
    wrapper: {
        width: "100%",
        flex: 1,
    },
    header: {
        width: rpx(750),
        height: rpx(400),
        justifyContent: "center",
        alignItems: "center",
    },
    contactContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: rpx(24),
    },
    horizontalSize: {
        width: rpx(600),
        height: "100%",
    },
    image: {
        width: rpx(150),
        height: rpx(150),
        borderRadius: rpx(28),
    },
    margin: {
        marginTop: rpx(24),
    },
    content: {
        marginTop: rpx(24),
        lineHeight: rpx(48),
    },
    wcChannel: {
        width: rpx(330),
        height: rpx(330),
        marginLeft: rpx(210),
        marginTop: rpx(24),
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: rpx(24),
        paddingVertical: rpx(48),
    },
    scrollViewContainer: {
        paddingBottom: rpx(96),
    },
});
