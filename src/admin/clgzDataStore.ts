/*
 * 错了个字 · 笔迹样本本地存储 (src/admin/clgzDataStore.ts)
 * ======================================================
 * 管理后台「数据采集」页的样本库: IndexedDB(浏览器本地, 容量远超 localStorage)。
 * 样本为原始笔画点序列(训练时按需渲染位图, 任何分辨率/增广都可重做)。
 * 工作流: 后台攒样本 → 「导出 JSONL」下载文件 → 存入仓库 clgz-character-data/samples/
 *   (该目录已 gitignore, 训练数据不入 git —— clgz_ml_plan.md 红线)。
 */
import { CLGZ_SUBJECTS } from "@/game3/chars";

export type ClgzLabel = "correct" | "sloppy_correct" | "partial" | "wrong_char" | "scribble";
export type ClgzDevice = "finger" | "stylus" | "mouse";

export const CLGZ_LABELS: { key: ClgzLabel; zh: string; hint: string }[] = [
    { key: "correct", zh: "正确", hint: "认真书写的正确字形" },
    { key: "sloppy_correct", zh: "潦草正确", hint: "快写/连笔但结构仍对" },
    { key: "partial", zh: "残缺", hint: "少笔画/半字" },
    { key: "wrong_char", zh: "错别字", hint: "写成了别的字" },
    { key: "scribble", zh: "乱画", hint: "涂鸦/无意义线条" },
];

export interface ClgzSample {
    uid: string;          // 去重主键(导入时跳过已存在)
    char: string;         // 目标字
    word: string;         // 提示词(考察语境)
    label: ClgzLabel;
    device: ClgzDevice;
    writer: string;       // 书写人代号(按书写人划分 train/test —— 铁律)
    canvasSize: number;   // 采集时画框边长(坐标参照系)
    strokes: { points: { x: number; y: number }[] }[];
    savedAt: string;      // ISO 时间
}

/** 题库去重字表(同一字多次出现取第一个提示词), 采集页字格与「最少样本优先」用 */
export const BANK_CHARS: { ch: string; word: string }[] = (() => {
    const seen = new Map<string, string>();
    for (const subj of CLGZ_SUBJECTS) {
        for (const c of subj.chars) {
            if (!seen.has(c.ch)) seen.set(c.ch, c.word);
        }
    }
    return [...seen.entries()].map(([ch, word]) => ({ ch, word }));
})();

const DB_NAME = "clgz-ml-data";
const STORE = "samples";

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: "uid" });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("IndexedDB 打开失败"));
    });
}

function txDone(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("IndexedDB 事务失败"));
    });
}

export function newUid(s: Pick<ClgzSample, "char" | "label" | "writer" | "device">): string {
    return `${s.char}-${s.label}-${s.writer}-${s.device}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function putSample(s: ClgzSample): Promise<void> {
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(s);
    await txDone(tx);
    db.close();
}

export async function putSamples(list: ClgzSample[]): Promise<number> {
    let added = 0;
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const s of list) {
        // put 语义: uid 相同覆盖(幂等), 导入重复文件不会产生重复样本
        store.put(s);
        added++;
    }
    await txDone(tx);
    db.close();
    return added;
}

/** 每字样本数(流式统计, 不整库载入内存) */
export async function countByChar(): Promise<Map<string, number>> {
    const db = await openDb();
    const counts = new Map<string, number>();
    await new Promise<void>((resolve, reject) => {
        const req = db.transaction(STORE, "readonly").objectStore(STORE).openCursor();
        req.onsuccess = () => {
            const cur = req.result;
            if (!cur) { resolve(); return; }
            const s = cur.value as ClgzSample;
            counts.set(s.char, (counts.get(s.char) ?? 0) + 1);
            cur.continue();
        };
        req.onerror = () => reject(req.error ?? new Error("IndexedDB 读取失败"));
    });
    db.close();
    return counts;
}

export async function totalCount(): Promise<number> {
    const db = await openDb();
    const n = await new Promise<number>((resolve, reject) => {
        const req = db.transaction(STORE, "readonly").objectStore(STORE).count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("IndexedDB 读取失败"));
    });
    db.close();
    return n;
}

export async function allSamples(): Promise<ClgzSample[]> {
    const db = await openDb();
    const list = await new Promise<ClgzSample[]>((resolve, reject) => {
        const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
        req.onsuccess = () => resolve(req.result as ClgzSample[]);
        req.onerror = () => reject(req.error ?? new Error("IndexedDB 读取失败"));
    });
    db.close();
    return list;
}

export async function clearSamples(): Promise<void> {
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    await txDone(tx);
    db.close();
}

/** 导出 JSONL 文本(训练侧与 clgz-character-data/samples/ 的存储格式) */
export function toJl(list: ClgzSample[]): string {
    return list.map((s) => JSON.stringify(s)).join("\n") + (list.length ? "\n" : "");
}

/** 解析 JSONL(容错: 跳过坏行/缺字段行), 返回合法样本 */
export function parseJl(text: string): { samples: ClgzSample[]; bad: number } {
    const samples: ClgzSample[] = [];
    let bad = 0;
    for (const line of text.split(/\r?\n/)) {
        const t = line.trim();
        if (!t) continue;
        try {
            const o = JSON.parse(t) as Partial<ClgzSample>;
            if (typeof o.char === "string" && o.char.length === 1
                && typeof o.label === "string" && CLGZ_LABELS.some((l) => l.key === o.label)
                && Array.isArray(o.strokes) && o.strokes.length > 0) {
                samples.push({
                    uid: o.uid ?? newUid(o as Pick<ClgzSample, "char" | "label" | "writer" | "device">),
                    char: o.char,
                    word: String(o.word ?? ""),
                    label: o.label as ClgzLabel,
                    device: (o.device as ClgzDevice) ?? "mouse",
                    writer: String(o.writer ?? "unknown"),
                    canvasSize: Number(o.canvasSize) || 280,
                    strokes: o.strokes,
                    savedAt: String(o.savedAt ?? new Date().toISOString()),
                });
            } else { bad++; }
        } catch { bad++; }
    }
    return { samples, bad };
}

function download(name: string, mime: string, content: string): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function exportJl(list: ClgzSample[]): void {
    const d = new Date();
    const ts = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
    download(`clgz-samples-${ts}.jsonl`, "application/x-ndjson", toJl(list));
}
