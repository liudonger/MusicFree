import { useAppConfig } from "@/core/appConfig";
import Theme from "@/core/theme";
import useCheckUpdate from "@/hooks/useCheckUpdate";
import { useListenOrientationChange } from "@/hooks/useOrientation";
import { getDefaultStore, useAtomValue } from "jotai";
import { useEffect } from "react";
import { AppState, NativeEventSubscription, useColorScheme } from "react-native";
import bootstrapAtom from "./bootstrap.atom";
import { initTrackPlayer } from "./bootstrap";
import { showDialog } from "@/components/dialogs/useDialog";
import i18n from "@/core/i18n";
import {
    startKeepAliveService,
    stopKeepAliveService,
} from "@/native/vehicleUtil";

export function BootstrapComponent() {
    const bootstrapState = useAtomValue(bootstrapAtom);

    useListenOrientationChange();
    useCheckUpdate();

    const followSystem = useAppConfig("theme.followSystem");
    // 听风语车载模式
    const vehicleEnabled = useAppConfig("vehicle.enabled");
    const vehicleKeepAlive = useAppConfig("vehicle.keepAlive");

    const colorScheme = useColorScheme();

    // 车载模式：按配置启动/停止前台保活
    useEffect(() => {
        if (vehicleEnabled) {
            if (vehicleKeepAlive ?? true) {
                startKeepAliveService();
            } else {
                stopKeepAliveService();
            }
        } else {
            stopKeepAliveService();
        }
    }, [vehicleEnabled, vehicleKeepAlive]);

    useEffect(() => {
        if (followSystem) {
            if (colorScheme === "dark") {
                Theme.setTheme("p-dark");
            } else if (colorScheme === "light") {
                Theme.setTheme("p-light");
            }
        }
    }, [colorScheme, followSystem]);

    useEffect(() => {
        let appStateEventSubscription: NativeEventSubscription | null = null;

        const reinitializeTrackPlayerWithDialog = () => {
            showDialog("LoadingDialog", {
                title: i18n.t("dialog.loading.reinitializeTrackPlayer"), 
                promise: initTrackPlayer(),
                onResolve(data, hideDialog) {
                    hideDialog();
                },
                onReject(reason, hideDialog) {
                    hideDialog();
                },
            });
        };

        if (bootstrapState.state === "TrackPlayerError") {
            if (AppState.currentState === "active") {
                reinitializeTrackPlayerWithDialog();
            } else {
                appStateEventSubscription = AppState.addEventListener("change", (nextState) => {
                    if (nextState === "active" && getDefaultStore().get(bootstrapAtom).state === "TrackPlayerError") {
                        reinitializeTrackPlayerWithDialog();
                    }
                });
            }
        }

        return () => {
            if (appStateEventSubscription) {
                appStateEventSubscription.remove();
            }
        };
    }, [bootstrapState]);

    return null;
}
