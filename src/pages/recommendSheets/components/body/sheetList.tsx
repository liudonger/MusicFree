import React, { memo, useCallback } from "react";
import rpx from "@/utils/rpx";
import { FlashList } from "@shopify/flash-list";
import useRecommendSheets from "../../hooks/useRecommendSheets";
import SheetItem from "@/components/mediaItem/sheetItem";
import useOrientation from "@/hooks/useOrientation";
import ListEmpty from "@/components/base/listEmpty";
import ListFooter from "@/components/base/listFooter";
import SongShelf3D from "@/components/visual/SongShelf3D";
import { useAppConfig } from "@/core/appConfig";
import { useNavigate } from "@/core/router";
import { ROUTE_PATH } from "@/core/router";

interface ISheetListProps {
    tag: ICommon.IUnique;
    pluginHash: string;
}

function SheetList(props: ISheetListProps) {
    const { tag, pluginHash } = props ?? {};

    const [query, sheets, status] = useRecommendSheets(pluginHash, tag);
    const vehicleEnabled = useAppConfig("vehicle.enabled");
    const navigate = useNavigate();

    function renderItem({ item }: { item: IMusic.IMusicSheetItemBase }) {
        return <SheetItem sheetInfo={item} pluginHash={pluginHash} />;
    }
    const orientation = useOrientation();

    const keyExtractor = useCallback(
        (item: any, i: number) => `${i}-${item.platform}-${item.id}`,
        [],
    );

    // 3D 歌单架：首屏前 10 个歌单，车载大屏用更宽的卡片
    const shelfSheets = sheets.slice(0, 10);

    return (
        <FlashList
            ListEmptyComponent={<ListEmpty state={status} onRetry={query} />}
            ListHeaderComponent={
                shelfSheets.length > 0 ? (
                    <SongShelf3D
                        sheets={shelfSheets}
                        cardWidth={vehicleEnabled ? rpx(340) : rpx(240)}
                        onPressSheet={sheet => {
                            navigate(ROUTE_PATH.PLUGIN_SHEET_DETAIL, {
                                pluginHash,
                                sheetInfo: sheet,
                            });
                        }}
                    />
                ) : null
            }
            ListFooterComponent={
                sheets.length ? <ListFooter
                    state={status}
                    onRetry={query}
                /> : null
            }
            onEndReached={() => {
                query();
            }}
            onEndReachedThreshold={0.1}
            estimatedItemSize={rpx(306)}
            numColumns={orientation === "vertical" ? 3 : 4}
            renderItem={renderItem}
            data={sheets}
            keyExtractor={keyExtractor}
        />
    );
}

export default memo(
    SheetList,
    (prev, curr) =>
        prev.tag.id === curr.tag.id && prev.pluginHash === curr.pluginHash,
);
