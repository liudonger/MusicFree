/**
 * musicJsonAdapter.ts —— 听风语「双音源兼容」核心
 *
 * 将音悦 V3.3.3 风格的「规则化 JSON 音源」（music.json）自动转换为
 * 听风语 标准 JS 插件源码，实现两类音源生态的兼容统一。
 *
 * 设计说明：
 * 1. 支持常见的规则化音源 JSON 结构（顶层数组 / 音源列表 / sources 等）
 * 2. 字段名自适应归一化（中英文、大小写别名）
 * 3. 支持 {keyword} / {page} 模板参数与 JSON 路径提取（data.list 形式）
 * 4. 输出为标准 听风语 插件 JS 源码字符串，交由 PluginManager 安装
 */
import { nanoid } from "nanoid";

/** 归一化后的音源规则 */
export interface IMusicJsonSourceRule {
    /** 音源名（platform） */
    name: string;
    /** 搜索请求地址，支持 {keyword} {page} 模板 */
    searchUrl: string;
    /** 请求方法 */
    searchMethod?: "GET" | "POST";
    /** 请求参数（POST body 或 URL query），支持 {keyword} {page} 模板 */
    searchParams?: Record<string, string>;
    /** 请求头 */
    searchHeaders?: Record<string, string>;
    /** 搜索结果数组的 JSON 路径，如 data.list */
    searchResultPath: string;
    /** 结果字段映射 */
    searchMapping: {
        title?: string;
        artist?: string;
        album?: string;
        artwork?: string;
        duration?: string;
        id?: string;
        url?: string;
    };
    /** 播放地址模板，支持 {id} 等（可选，缺省时直接使用搜索结果中的 url 字段） */
    playUrl?: string;
    playMethod?: "GET" | "POST";
    playParams?: Record<string, string>;
    playHeaders?: Record<string, string>;
    /** 播放地址响应中的真实地址 JSON 路径 */
    playResultPath?: string;
    /** 插件版本 */
    version?: string;
}

/** 音悦 music.json 可能的顶层结构 key */
const LIST_KEYS = [
    "音源列表",
    "sources",
    "sourceList",
    "data",
    "list",
    "plugins",
];

/** 字段名归一化表：别名 -> 归一化字段 */
const FIELD_ALIASES: Record<string, string> = {
    name: "name",
    名称: "name",
    音源名: "name",
    sourceName: "name",
    title: "name",

    searchUrl: "searchUrl",
    搜索地址: "searchUrl",
    搜索url: "searchUrl",
    搜索URL: "searchUrl",
    url: "searchUrl",
    api: "searchUrl",
    apiUrl: "searchUrl",
    search: "searchUrl",

    method: "searchMethod",
    请求方式: "searchMethod",

    searchResultPath: "searchResultPath",
    结果路径: "searchResultPath",
    列表路径: "searchResultPath",
    resultPath: "searchResultPath",
    dataPath: "searchResultPath",
    listPath: "searchResultPath",

    playUrl: "playUrl",
    播放地址: "playUrl",
    播放url: "playUrl",
    play: "playUrl",
    playApi: "playUrl",

    playResultPath: "playResultPath",
    播放结果路径: "playResultPath",
    playDataPath: "playResultPath",

    version: "version",
    版本: "version",
};

/** 结果字段映射表：音源 JSON 中的字段名 -> 归一化音乐字段 */
const MAPPING_ALIASES: Record<string, keyof IMusicJsonSourceRule["searchMapping"]> = {
    title: "title",
    歌名: "title",
    歌曲名: "title",
    song: "title",
    name: "title",
    songName: "title",

    artist: "artist",
    歌手: "artist",
    singer: "artist",
    author: "artist",
    artistName: "artist",

    album: "album",
    专辑: "album",
    albumName: "album",

    artwork: "artwork",
    封面: "artwork",
    pic: "artwork",
    picUrl: "artwork",
    cover: "artwork",
    coverUrl: "artwork",
    img: "artwork",
    image: "artwork",

    duration: "duration",
    时长: "duration",
    time: "duration",
    interval: "duration",

    id: "id",
    歌曲id: "id",
    songId: "id",
    rid: "id",
    hash: "id",

    url: "url",
    链接: "url",
    playLink: "url",
    audio: "url",
    src: "url",
};

/** 归一化字段名 */
function normalizeField(key: string): string | null {
    const k = String(key).trim();
    return FIELD_ALIASES[k] ?? FIELD_ALIASES[k.toLowerCase()] ?? null;
}

/** 归一化映射字段名 */
function normalizeMappingField(key: string): keyof IMusicJsonSourceRule["searchMapping"] | null {
    const k = String(key).trim();
    return MAPPING_ALIASES[k] ?? MAPPING_ALIASES[k.toLowerCase()] ?? null;
}

/** 从任意对象中提取字符串值（支持嵌套路径 data.list.0.name） */
function pick(obj: any, path?: string): any {
    if (!path) {
        return undefined;
    }
    const keys = String(path)
        .replace(/\[(\d+)\]/g, ".$1")
        .split(".");
    let tmp = obj;
    for (const key of keys) {
        if (tmp == null) {
            return undefined;
        }
        tmp = tmp[key];
    }
    return tmp;
}

/** 模板替换 {keyword} / {page} / {id} 等 */
function renderTemplate(
    template: string,
    vars: Record<string, string | number>,
): string {
    return template.replace(/\{(\w+)\}/g, (_, name: string) => {
        const val = vars[name];
        return val === undefined ? "" : String(val);
    });
}

/** 解析音悦 style music.json 文本，返回归一化规则数组 */
export function parseMusicJson(content: string): IMusicJsonSourceRule[] {
    const raw = JSON.parse(content);
    let list: any[] = [];

    if (Array.isArray(raw)) {
        list = raw;
    } else if (raw && typeof raw === "object") {
        for (const key of LIST_KEYS) {
            if (Array.isArray(raw[key])) {
                list = raw[key];
                break;
            }
        }
        // 兜底：取第一个数组值
        if (list.length === 0) {
            for (const key of Object.keys(raw)) {
                if (Array.isArray(raw[key])) {
                    list = raw[key];
                    break;
                }
            }
        }
    }

    return list
        .filter(it => it && typeof it === "object")
        .map(item => normalizeRule(item))
        .filter(rule => rule.name && rule.searchUrl) as IMusicJsonSourceRule[];
}

/** 归一化单个音源规则条目 */
function normalizeRule(item: Record<string, any>): Partial<IMusicJsonSourceRule> {
    const rule: Record<string, any> = {};
    const searchMapping: Record<string, string> = {};

    for (const rawKey of Object.keys(item)) {
        const key = normalizeField(rawKey);
        const value = item[rawKey];
        if (key === "name") {
            rule.name = String(value ?? "");
        } else if (key === "searchUrl") {
            rule.searchUrl = String(value ?? "");
        } else if (key === "searchMethod") {
            const m = String(value ?? "GET").toUpperCase();
            rule.searchMethod = m === "POST" ? "POST" : "GET";
        } else if (key === "searchResultPath") {
            rule.searchResultPath = String(value ?? "");
        } else if (key === "playUrl") {
            rule.playUrl = String(value ?? "");
        } else if (key === "playMethod") {
            const m = String(value ?? "GET").toUpperCase();
            rule.playMethod = m === "POST" ? "POST" : "GET";
        } else if (key === "playResultPath") {
            rule.playResultPath = String(value ?? "");
        } else if (key === "version") {
            rule.version = String(value ?? "");
        } else {
            const mapKey = normalizeMappingField(rawKey);
            if (mapKey) {
                searchMapping[mapKey] = String(value ?? "");
            }
        }
    }

    // 兼容：把 searchUrl 里的 query 参数拆到 searchParams
    const params: Record<string, string> = {};
    for (const rawKey of Object.keys(item)) {
        if (/^(params|参数|query|searchParams|请求参数)$/i.test(rawKey) && item[rawKey] && typeof item[rawKey] === "object") {
            Object.assign(params, item[rawKey]);
        }
    }
    if (Object.keys(params).length > 0) {
        rule.searchParams = params;
    }
    const headers: Record<string, string> = {};
    for (const rawKey of Object.keys(item)) {
        if (/^(headers|请求头)$/i.test(rawKey) && item[rawKey] && typeof item[rawKey] === "object") {
            Object.assign(headers, item[rawKey]);
        }
    }
    if (Object.keys(headers).length > 0) {
        rule.searchHeaders = headers;
    }

    rule.searchMapping = searchMapping;
    return rule as Partial<IMusicJsonSourceRule>;
}

/** 生成单个音源的标准 听风语 插件 JS 源码 */
export function generatePluginCode(rule: IMusicJsonSourceRule): string {
    const platform = String(rule.name).trim();
    const version = rule.version ?? "1.0.0";
    const searchUrl = rule.searchUrl;
    const searchMethod = rule.searchMethod ?? "GET";
    const searchResultPath = rule.searchResultPath || "data";
    const mapping = rule.searchMapping || {};
    const playUrl = rule.playUrl;
    const playMethod = rule.playMethod ?? "GET";
    const playResultPath = rule.playResultPath;

    // 将规则 JSON 序列化嵌入插件源码
    const ruleJson = JSON.stringify({
        searchUrl,
        searchMethod,
        searchParams: rule.searchParams ?? {},
        searchHeaders: rule.searchHeaders ?? {},
        searchResultPath,
        mapping,
        playUrl,
        playMethod,
        playParams: rule.playParams ?? {},
        playHeaders: rule.playHeaders ?? {},
        playResultPath,
    });

    return `
'use strict';
const axios = require('axios');
const crypto = require('crypto-js');

const RULE = ${ruleJson};

const get = (obj, path) => {
  if (!path) return undefined;
  const keys = String(path).replace(/\\[(\\d+)\\]/g, '.$1').split('.');
  let tmp = obj;
  for (const k of keys) {
    if (tmp == null) return undefined;
    tmp = tmp[k];
  }
  return tmp;
};

const render = (tpl, vars) => tpl.replace(/\\{(\\w+)\\}/g, (_, n) => vars[n] === undefined ? '' : String(vars[n]));

const toQuery = (params) => Object.keys(params || {}).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');

async function request(url, method, params, headers) {
  const finalUrl = url.includes('?') ? url + '&' + toQuery(params) : url + '?' + toQuery(params);
  if ((method || 'GET').toUpperCase() === 'GET') {
    return (await axios.get(finalUrl, { headers })).data;
  }
  return (await axios.post(url, params || {}, { headers })).data;
}

module.exports = {
  platform: ${JSON.stringify(platform)},
  version: ${JSON.stringify(version)},
  author: '听风语适配器',
  description: '由 music.json 音源规则自动转换生成（听风语双音源兼容模块）',
  async search(query, page, type) {
    try {
      const vars = { keyword: query, page: page || 1, type: type || 'music' };
      const url = render(RULE.searchUrl, vars);
      const data = await request(url, RULE.searchMethod, renderParams(RULE.searchParams, vars), RULE.searchHeaders || {});
      const list = get(data, RULE.searchResultPath);
      if (!Array.isArray(list)) return { isEnd: true, data: [] };
      const m = RULE.mapping || {};
      const items = list.map((it, idx) => {
        const item = {
          id: m.id ? String(get(it, m.id)) : ('auto_' + crypto.MD5(JSON.stringify(it)).toString()),
          platform: ${JSON.stringify(platform)},
          title: m.title ? String(get(it, m.title) || '') : (it.title || it.name || '未知歌曲'),
          artist: m.artist ? String(get(it, m.artist) || '') : (it.artist || it.singer || '未知歌手'),
          album: m.album ? String(get(it, m.album) || '') : (it.album || ''),
          artwork: m.artwork ? String(get(it, m.artwork) || '') : (it.artwork || it.pic || it.cover || ''),
          duration: m.duration ? Number(get(it, m.duration) || 0) / 1000 : (Number(it.duration || 0) / 1000),
          url: m.url ? String(get(it, m.url) || '') : (it.url || ''),
        };
        return item;
      }).filter(it => it.title);
      return { isEnd: true, data: items };
    } catch (e) {
      return { isEnd: true, data: [] };
    }
  },
  async getMediaSource(musicItem, quality) {
    try {
      if (!RULE.playUrl) {
        return musicItem.url ? { url: musicItem.url } : null;
      }
      const vars = { id: musicItem.id, hash: musicItem.id, title: musicItem.title, quality: quality || 'standard' };
      const url = render(RULE.playUrl, vars);
      const data = await request(url, RULE.playMethod, renderParams(RULE.playParams || {}, vars), RULE.playHeaders || {});
      if (RULE.playResultPath) {
        const u = get(data, RULE.playResultPath);
        return u ? { url: String(u) } : null;
      }
      return data && (data.url || data.playUrl || data.src) ? { url: String(data.url || data.playUrl || data.src) } : null;
    } catch (e) {
      return null;
    }
  }
};

function renderParams(params, vars) {
  const out = {};
  Object.keys(params || {}).forEach(k => { out[k] = render(String(params[k]), vars); });
  return out;
}
`;
}

/** 将音悦 music.json 文本转换为多条插件 JS 源码（供安装） */
export function convertMusicJsonToPlugins(content: string): { name: string; code: string }[] {
    const rules = parseMusicJson(content);
    return rules.map(rule => ({
        name: rule.name,
        code: generatePluginCode(rule),
    }));
}

/** 生成唯一插件文件名 */
export function generatePluginFilename(): string {
    return `${nanoid()}.js`;
}
