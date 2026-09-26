/**
 * playUrlCache.ts —— 播放地址热缓存（P1 播放提速）
 * 缓存"插件解析出的真实播放地址"，命中后跳过网络解析，实现秒开。
 * 键：platform:hash:quality，带 TTL 过期（在线 12h / 离线 7 天）。
 */
import getOrCreateMMKV from "@/utils/getOrCreateMMKV";
import { safeParse } from "@/utils/jsonUtil";
import Network from "@/utils/network";

const store = getOrCreateMMKV("cache.playUrl");

const ONLINE_TTL = 12 * 60 * 60 * 1000; // 12 小时
const OFFLINE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 天
const MAX_ENTRIES = 1200;

export interface IPlayUrlCacheEntry {
    url: string;
    headers?: Record<string, string>;
    userAgent?: string;
    pluginHash: string;
    ts: number;
}

function buildKey(platform: string, id: string, quality: string): string {
    return `${platform}::${id}::${quality}`;
}

/** 读取热缓存；未命中/过期返回 null */
export function getPlayUrl(
    platform: string,
    id: string,
    quality: string,
    pluginHash: string,
): IPlayUrlCacheEntry | null {
    if (!platform || !id) {
        return null;
    }
    const key = buildKey(platform, id, quality);
    const raw = store.getString(key);
    if (!raw) {
        return null;
    }
    const entry = safeParse<IPlayUrlCacheEntry>(raw);
    if (!entry?.url) {
        return null;
    }
    // 插件变更后缓存失效（防止旧插件地址被新插件误用）
    if (entry.pluginHash && entry.pluginHash !== pluginHash) {
        store.delete(key);
        return null;
    }
    const ttl = Network.isOffline ? OFFLINE_TTL : ONLINE_TTL;
    if (Date.now() - (entry.ts ?? 0) > ttl) {
        store.delete(key);
        return null;
    }
    return entry;
}

/** 写入热缓存 */
export function setPlayUrl(
    platform: string,
    id: string,
    quality: string,
    entry: Omit<IPlayUrlCacheEntry, "ts">,
) {
    if (!platform || !id || !entry?.url) {
        return;
    }
    // 超限清理：删除最旧的一半
    const keys = store.getAllKeys();
    if (keys.length >= MAX_ENTRIES) {
        const sorted = keys
            .map(k => ({ k, ts: Number(store.getString(k + "::ts") ?? 0) }))
            .sort((a, b) => a.ts - b.ts);
        for (let i = 0; i < Math.floor(MAX_ENTRIES / 2); ++i) {
            store.delete(sorted[i]?.k ?? "");
        }
    }
    const key = buildKey(platform, id, quality);
    store.set(key, JSON.stringify({ ...entry, ts: Date.now() } as IPlayUrlCacheEntry));
    store.set(key + "::ts", String(Date.now()));
}

/** 删除热缓存（解析失败/失效时调用） */
export function removePlayUrl(platform: string, id: string, quality: string) {
    if (!platform || !id) {
        return;
    }
    const key = buildKey(platform, id, quality);
    store.delete(key);
    store.delete(key + "::ts");
}