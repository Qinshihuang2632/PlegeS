/*
 * QA 复现脚本(只读测试, 不修改任何游戏代码)
 * 化了个学 · 卡牌点击无响应缺陷
 */
import { chromium } from 'playwright-core';
import fs from 'fs';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = process.env.QA_URL || 'http://127.0.0.1:8799/hlgx/hua';
const OUT = 'D:\\program\\game one\\qa-evidence';

const log = [];
const rec = (k, v) => { log.push({ step: k, data: v }); console.log('### ' + k + '\n' + JSON.stringify(v, null, 2)); };

/* 页面内: 采集所有棋盘卡牌的两层结构信息 */
const DUMP = () => {
    const faces = [...document.querySelectorAll('.hlgx-tile-board')];
    return faces.map((f, i) => {
        const p = f.parentElement;
        const pr = p.getBoundingClientRect();
        const fr = f.getBoundingClientRect();
        const pcs = getComputedStyle(p);
        const fcs = getComputedStyle(f);
        return {
            i,
            formula: f.querySelector('.hlgx-tile-f')?.textContent || '',
            name: f.querySelector('.hlgx-tile-n')?.textContent || '',
            removed: f.classList.contains('hlgx-tile-removed'),
            blocked: f.classList.contains('hlgx-tile-blocked'),
            faceClass: f.className,
            parentClass: p.className,
            parentInlineStyle: p.getAttribute('style'),
            parentZ: pcs.zIndex,
            parentPE: pcs.pointerEvents,
            facePE: fcs.pointerEvents,
            faceTransform: fcs.transform,
            faceOpacity: fcs.opacity,
            parentRect: { x: +pr.x.toFixed(1), y: +pr.y.toFixed(1), w: +pr.width.toFixed(1), h: +pr.height.toFixed(1), cx: +(pr.x + pr.width / 2).toFixed(1), cy: +(pr.y + pr.height / 2).toFixed(1) },
            faceRect: { w: +fr.width.toFixed(1), h: +fr.height.toFixed(1) },
        };
    });
};

/* 页面内: elementFromPoint 命中链 */
const HIT = ([x, y]) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return { hit: null };
    const chain = document.elementsFromPoint(x, y).slice(0, 5).map(e => ({
        tag: e.tagName.toLowerCase(),
        cls: e.className && e.className.toString().slice(0, 90),
        z: getComputedStyle(e).zIndex,
        pe: getComputedStyle(e).pointerEvents,
        txt: (e.textContent || '').trim().slice(0, 24),
    }));
    const face = el.closest('.hlgx-tile-board');
    return {
        hitTag: el.tagName.toLowerCase(),
        hitClass: el.className && el.className.toString(),
        hitPE: getComputedStyle(el).pointerEvents,
        hitZ: getComputedStyle(el).zIndex,
        hitOuterHTML: el.outerHTML.slice(0, 320),
        hitIsBareAbsoluteContainer: el.classList.contains('absolute') && !face,
        containerHoldsRemovedTile: !!el.querySelector('.hlgx-tile-removed'),
        containerChildFormula: el.querySelector('.hlgx-tile-f')?.textContent || null,
        stack: chain,
    };
};

const trayCount = () => document.querySelectorAll('.hlgx-tray-cell').length;

const shot = async (page, n) => { await page.screenshot({ path: `${OUT}\\${n}.png` }); return `${n}.png`; };

(async () => {
    const browser = await chromium.launch({ executablePath: EDGE, headless: false, args: ['--window-size=1300,950'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await shot(page, '01-进入页面-新手引导');

    /* 跳过引导 */
    const skip = page.getByRole('button', { name: '跳过' });
    if (await skip.count()) { await skip.first().click(); await page.waitForTimeout(500); }
    await shot(page, '02-昵称窗');

    /* 昵称 */
    await page.locator('#hlgx-name').fill('QA测试员');
    await page.getByRole('button', { name: '确认开始' }).click();
    await page.waitForTimeout(1500);
    await shot(page, '03-开局棋盘');

    let tiles = await page.evaluate(DUMP);
    rec('开局卡牌总数', { total: tiles.length, removed: tiles.filter(t => t.removed).length, blocked: tiles.filter(t => t.blocked).length });

    /* 棋盘几何中心 */
    const xs = tiles.map(t => t.parentRect.cx), ys = tiles.map(t => t.parentRect.cy);
    const bcx = (Math.min(...xs) + Math.max(...xs)) / 2, bcy = (Math.min(...ys) + Math.max(...ys)) / 2;
    rec('棋盘中心', { bcx: +bcx.toFixed(1), bcy: +bcy.toFixed(1) });

    /* 目标1: 最靠近中心、z 最高、可点击(未遮挡)的顶层卡牌 */
    const clickable = tiles.filter(t => !t.removed && !t.blocked);
    clickable.sort((a, b) => {
        const da = Math.hypot(a.parentRect.cx - bcx, a.parentRect.cy - bcy);
        const db = Math.hypot(b.parentRect.cx - bcx, b.parentRect.cy - bcy);
        if (Math.abs(da - db) > 6) return da - db;
        return (+b.parentZ) - (+a.parentZ);
    });
    const t1 = clickable[0];
    rec('步骤1-目标卡牌(中心最顶层)', t1);

    const before1 = await page.evaluate(trayCount);
    await shot(page, '04-步骤1-点击前');
    await page.mouse.click(t1.parentRect.cx, t1.parentRect.cy);
    await page.waitForTimeout(700);
    const after1 = await page.evaluate(trayCount);
    await shot(page, '05-步骤1-点击后');
    rec('步骤1-结果', { formula: t1.formula, trayBefore: before1, trayAfter: after1, success: after1 > before1 });

    /* 步骤2: 点击刚被解锁的正下方卡牌 */
    tiles = await page.evaluate(DUMP);
    const ghost = tiles.find(t => t.removed && Math.abs(t.parentRect.cx - t1.parentRect.cx) < 2 && Math.abs(t.parentRect.cy - t1.parentRect.cy) < 2);
    rec('步骤1-被移除卡牌的DOM残留(幽灵容器)', ghost);

    /* 被 ghost 覆盖区域内、现在已解锁的下层卡牌 */
    const under = tiles.filter(t => !t.removed && !t.blocked && t.i !== (ghost ? ghost.i : -1))
        .map(t => ({ t, ov: overlap(t.parentRect, ghost.parentRect) }))
        .filter(o => o.ov > 0.15)
        .sort((a, b) => b.ov - a.ov)
        .map(o => o.t);
    rec('步骤2-候选: 被幽灵容器覆盖且已解锁的卡牌', under.map(u => ({ i: u.i, f: u.formula, z: u.parentZ, cx: u.parentRect.cx, cy: u.parentRect.cy })));

    const results = [];
    const targets = under.slice(0, 4);
    let n = 6;
    for (const tg of targets) {
        const before = await page.evaluate(trayCount);
        await shot(page, `${String(n++).padStart(2, '0')}-点击前-${tg.formula}`);
        const hit = await page.evaluate(HIT, [tg.parentRect.cx, tg.parentRect.cy]);
        await page.mouse.click(tg.parentRect.cx, tg.parentRect.cy);
        await page.waitForTimeout(700);
        const after = await page.evaluate(trayCount);
        await shot(page, `${String(n++).padStart(2, '0')}-点击后-${tg.formula}-${after > before ? '成功' : '失败'}`);
        const r = { formula: tg.formula, name: tg.name, z: tg.parentZ, point: [tg.parentRect.cx, tg.parentRect.cy], trayBefore: before, trayAfter: after, success: after > before, elementFromPoint: hit };
        results.push(r);
        rec(`点击卡牌 ${tg.formula}`, r);
        if (after > before) { tiles = await page.evaluate(DUMP); }
    }

    const finalTiles = await page.evaluate(DUMP);
    fs.writeFileSync(`${OUT}\\evidence.json`, JSON.stringify({ log, results, finalTiles }, null, 2), 'utf8');
    await page.waitForTimeout(500);
    await browser.close();

    function overlap(a, b) {
        const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
        const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
        return (ix * iy) / (a.w * a.h);
    }
})().catch(e => { console.error('FAIL', e); process.exit(1); });
