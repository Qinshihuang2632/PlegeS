/*
 * 化了个学 · 违禁词检测单元测试
 * 覆盖: 常见违禁词命中 / 大小写不敏感 / 正常昵称不误伤 / 子串安全
 */
import { describe, expect, it } from "vitest";
import { BAD_WORDS, hasBadWord } from "./badwords";

describe("违禁词检测", () => {
    it("命中常见违禁词(辱骂/性/违法/缩写)", () => {
        for (const n of [
            "傻逼", "我是傻逼", "他妈的", "狗日的", "婊子", "贱人", "草泥马",
            "fuck", "SB玩家", "TMD", "wqnmlgb", "法轮功", "贩毒", "赌博", "色情", "约炮",
        ]) {
            expect(hasBadWord(n), `应命中: ${n}`).toBe(true);
        }
    });

    it("正常昵称不误伤(含形近/谐音/语气词/藏语用字)", () => {
        for (const n of [
            "小明", "帅帅", "氢氧化钠", "KMnO4", "学霸", "小可爱", "神的孩子",
            "摸鱼大师", "合金装备", "打工人", "草原", "奶牛", "手术", "厕所", "子弹",
            "王者", "大帅逼", "卧槽", "尼玛", "可爱小婊贝",
        ]) {
            expect(hasBadWord(n), `不应误伤: ${n}`).toBe(false);
        }
    });

    it("大小写不敏感", () => {
        expect(hasBadWord("Fuck")).toBe(true);
        expect(hasBadWord("ShiT")).toBe(true);
        expect(hasBadWord("CnM")).toBe(true);
    });

    it("命中违法物品/毒品词(化学游戏易联想, v2.1.9 扩充)", () => {
        for (const n of [
            "冰毒", "海洛因", "大麻", "摇头丸", "K粉", "可卡因", "吗啡", "鸦片",
            "甲基苯丙胺", "氯胺酮", "芬太尼", "笑气", "LSD", "迷幻蘑菇", "罂粟",
            "麻黄碱", "丧尸药", "白粉", "炸药", "雷管", "枪支", "走私", "洗钱",
        ]) {
            expect(hasBadWord(n), `应命中: ${n}`).toBe(true);
        }
        // 正常化学名不误伤
        expect(hasBadWord("盐酸")).toBe(false);
        expect(hasBadWord("氢氧化钾")).toBe(false);
        expect(hasBadWord("大麻叶提取物")).toBe(true);   // 含「大麻」
    });

    it("词表非空且全小写(与 functions/_lib/badwords.js 同步)", () => {
        expect(BAD_WORDS.length).toBeGreaterThan(30);
        expect(BAD_WORDS.every((w) => w === w.toLowerCase())).toBe(true);
    });
});
