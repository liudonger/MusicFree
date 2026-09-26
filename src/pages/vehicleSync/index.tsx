import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import QRCode from "react-native-qrcode-svg";
import AppBar from "@/components/base/appBar";
import ThemeText from "@/components/base/themeText";
import ListItem from "@/components/base/listItem";
import { useAppConfig } from "@/core/appConfig";
import Toast from "@/utils/toast";
import {
    getLocalIpAddress,
    startSyncServer,
    stopSyncServer,
    addSyncFileListener,
} from "@/native/syncUtil";
import useColors from "@/hooks/useColors";
import pathConst from "@/constants/pathConst";
import PluginManager from "@/core/pluginManager";
import { readAsStringAsync } from "expo-file-system";

/**
 * 听风语扫码同步页：
 * 车机端启动局域网服务，生成二维码，手机扫码上传音源插件 / music.json。
 */
export default function VehicleSync() {
    const colors = useColors();
    const syncPort = useAppConfig("vehicle.syncPort") ?? 8920;

    const [address, setAddress] = useState("");
    const [running, setRunning] = useState(false);
    const [uploadCount, setUploadCount] = useState(0);

    const refreshQr = useCallback(async () => {
        try {
            const ip = await getLocalIpAddress();
            if (!ip) {
                Toast.warn("未获取到局域网地址，请确认已连接 WiFi");
                setAddress("");
                return;
            }
            setAddress(`http://${ip}:${syncPort}`);
        } catch (e: any) {
            Toast.warn(`获取地址失败: ${e?.message ?? ""}`);
        }
    }, [syncPort]);

    const start = useCallback(async () => {
        try {
            const ok = await startSyncServer(syncPort);
            setRunning(ok);
            if (ok) {
                Toast.success("同步服务已启动");
                await refreshQr();
            } else {
                Toast.warn("服务启动失败");
            }
        } catch (e: any) {
            Toast.warn(`服务启动失败: ${e?.message ?? ""}`);
        }
    }, [syncPort, refreshQr]);

    const stop = useCallback(() => {
        stopSyncServer();
        setRunning(false);
        Toast.success("同步服务已停止");
    }, []);

    useEffect(() => {
        // 进入页面自动启动服务
        start();
        const sub = addSyncFileListener(async event => {
            setUploadCount(c => c + 1);
            const savedName = event.savedName ?? event.filename ?? "";
            const fullPath = pathConst.pluginPath + savedName;
            try {
                if (savedName.endsWith(".json")) {
                    const content = await readAsStringAsync(fullPath);
                    const result =
                        await PluginManager.installPluginsFromMusicJson(
                            content,
                        );
                    Toast.success(result.message ?? "音源导入完成");
                } else if (savedName.endsWith(".js")) {
                    const result =
                        await PluginManager.installPluginFromLocalFile(
                            fullPath,
                            { useExpoFs: true, notCheckVersion: true },
                        );
                    Toast.success(result.message ?? "插件导入完成");
                } else {
                    Toast.success(`已接收文件：${savedName}`);
                }
            } catch (e: any) {
                Toast.warn(`导入失败: ${e?.message ?? ""}`);
            }
        });
        return () => {
            sub();
            stopSyncServer();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <View style={styles.wrapper}>
            <AppBar
                menu={[
                    {
                        icon: running ? "pause-circle-outline" : "play-circle",
                        title: running ? "停止服务" : "启动服务",
                        onPress: () => {
                            running ? stop() : start();
                        },
                    },
                ]}>
                扫码同步
            </AppBar>
            <View style={styles.body}>
                <ThemeText style={styles.title} fontWeight="bold">
                    手机扫码上传音源
                </ThemeText>
                <ThemeText style={styles.desc} fontColor="textSecondary">
                    手机与车机连接同一 WiFi 后，扫码上传 .js 插件或
                    music.json 音源，自动导入
                </ThemeText>

                <View
                    style={[
                        styles.qrWrap,
                        { backgroundColor: colors.card },
                    ]}>
                    {address ? (
                        <QRCode
                            value={address}
                            size={rpx(520)}
                            backgroundColor="#ffffff"
                            color="#000000"
                        />
                    ) : (
                        <ThemeText fontColor="textSecondary">
                            {running ? "正在获取地址…" : "服务未启动"}
                        </ThemeText>
                    )}
                </View>

                <ListItem withHorizontalPadding heightType="small">
                    <ListItem.Content title="同步地址" />
                    <ThemeText fontSize="subTitle">{address || "—"}</ThemeText>
                </ListItem>
                <ListItem withHorizontalPadding heightType="small">
                    <ListItem.Content title="服务状态" />
                    <ThemeText fontSize="subTitle">
                        {running ? "运行中" : "已停止"}
                    </ThemeText>
                </ListItem>
                <ListItem withHorizontalPadding heightType="small">
                    <ListItem.Content title="本次已接收文件" />
                    <ThemeText fontSize="subTitle">{uploadCount}</ThemeText>
                </ListItem>

                <ThemeText style={styles.tip} fontColor="textSecondary">
                    提示：上传完成后返回插件管理页即可看到新音源；同一局域网内传输，数据不会上传到外网。
                </ThemeText>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: "100%",
        height: "100%",
    },
    body: {
        flex: 1,
        alignItems: "center",
        paddingHorizontal: rpx(48),
        paddingTop: rpx(40),
    },
    title: {
        fontSize: rpx(36),
        marginBottom: rpx(12),
    },
    desc: {
        fontSize: rpx(24),
        textAlign: "center",
        marginBottom: rpx(40),
    },
    qrWrap: {
        width: rpx(600),
        height: rpx(600),
        borderRadius: rpx(24),
        alignItems: "center",
        justifyContent: "center",
        marginBottom: rpx(40),
    },
    tip: {
        fontSize: rpx(22),
        textAlign: "center",
        marginTop: rpx(40),
        paddingHorizontal: rpx(24),
    },
});
