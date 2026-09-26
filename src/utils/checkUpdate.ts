import axios from "axios";
import { compare } from "compare-versions";
import DeviceInfo from "react-native-device-info";

// 听风语自研更新源：发布到听风语仓库的 release/version.json，不再指向上游 MusicFree
const updateList = [
    "https://raw.githubusercontent.com/liudonger/TingFengYu/master/release/version.json",
];

interface IUpdateInfo {
    needUpdate: boolean;
    data: {
        version: string;
        changeLog: string[];
        download: string[];
    };
}

export default async function checkUpdate(): Promise<IUpdateInfo | undefined> {
    const currentVersion = DeviceInfo.getVersion();
    for (let i = 0; i < updateList.length; ++i) {
        try {
            const rawInfo = (await axios.get(updateList[i])).data;
            if (compare(rawInfo.version, currentVersion, ">")) {
                return {
                    needUpdate: true,
                    data: rawInfo,
                };
            }
        } catch {}
    }
}
