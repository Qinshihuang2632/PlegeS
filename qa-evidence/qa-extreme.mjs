/*
 * QA 回归: 挑战模式幽灵容器/死区检查 (qa-extreme.mjs)
 * 验证: 开局 4 尖端可点; 移除尖端后 2×2 层解锁卡可点(无幽灵容器拦截);
 *       elementFromPoint 命中链检查(不应命中已移除卡的容器)
 */
import { chromium } from 'playwright-core';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = process.env.QA_URL || 'http://127.0.0.1:8799/hlgx/hua';

const rec = (k, v) => { console.log('### ' + k + '\n' + JSON.stringify(v, null, 2)); };
let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
    if (cond) { pass++; console.log('  ✓ ' + name); }
    else { fail++; console.log('  ✗ ' + name + ' ' + detail); }
};

const DUMP = () => [...document.querySelectorAll('.hlgx-tile-board')].map((f, i) => {
    const p = f.parentElement;
    const pr = p.getBoundingClientRect();
    return {
        i,
        layer: +(f.querySelector('.hlgx-tile-layer')?.textContent || '0'),
        removed: f.classList.contains('hlgx-tile-removed'),
        blocked: f.classList.contains('hlgx-tile-blocked'),
        cx: +(pr.x + pr.width / 2).toFixed(1),
        cy: +(pr.y + pr.height / 2).toFixed(1),
        facePE: getComputedStyle(f).pointerEvents,
        parentPE: getComputedStyle(p).pointerEvents,
    };
});

const HIT = ([x, y]) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return { hit: null };
    const stack = document.elementsFromPoint(x, y).slice(0, 4).map(e => ({
        cls: (e.className && e.className.toString() || '').slice(0, 60),
        pe: getComputedStyle(e).pointerEvents,
    }));
    return {
        hitIsGhostParent: !!el.closest('.hlgx-tile-removed') || (el.classList.contains('absolute') && !el.querySelector('.hlgx-tile-board')),
        hitIsFace: !!el.closest('.hlgx-tile-board'),
        stack,
    };
};

const trayCount = () => document.querySelectorAll('.hlgx-tray-cell').length;

(async () => {
    const browser = await chromium.launch({ executablePath: EDGE, headless: false, args: ['--window-size=1300,950'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // 跳过引导
    const skip = page.getByRole('button', { name: '跳过' });
    if (await skip.count()) { await skip.first().click(); await page.waitForTimeout(400); }

    // 昵称窗: 确认开始(已有记忆昵称则直接开局)
    const confirmBtn = page.getByRole('button', { name: '确认开始' });
    if (await confirmBtn.count()) {
        const input = page.locator('#hlgx-name');
        if (await input.count()) await input.fill('QA极端');
        await confirmBtn.first().click();
        await page.waitForTimeout(800);
    }

    // 切到挑战模式
    await page.getByRole('button', { name: '挑战' }).click();
    await page.waitForTimeout(1200);

    let tiles = await page.evaluate(DUMP);
    rec('挑战开局卡牌', { total: tiles.length, removed: tiles.filter(t => t.removed).length, blocked: tiles.filter(t => t.blocked).length });

    const vis = tiles.filter(t => !t.removed && !t.blocked);
    check('开局可见卡 = 32(4尖端+8×8十字28)', vis.length === 32, '实际 ' + vis.length);
    const tips = vis.filter(t => t.layer === 1);
    check('顶层尖端 4 张', tips.length === 4, '实际 ' + tips.length);

    // 点击全部 4 尖端
    for (const t of tips) {
        const before = await page.evaluate(trayCount);
        await page.mouse.click(t.cx, t.cy);
        await page.waitForTimeout(350);
        const after = await page.evaluate(trayCount);
        check(`点击尖端(层${t.layer}) 入槽`, after > before, `tray ${before}->${after}`);
    }

    // 尖端移除后: 第二层(层2, 75 大卡 16 张)解锁卡点击(重点: 幽灵容器检查)
    // 注意: 手牌槽 8 张, 取 4 尖端 + 3 张 2×2 = 7 张, 槽内安全(满槽会触发失败结算弹窗)
    tiles = await page.evaluate(DUMP);
    const l2 = tiles.filter(t => !t.removed && !t.blocked && t.layer === 2);
    check('第二层解锁卡 16 张(尖端取走后全部露出)', l2.length === 16, '实际 ' + l2.length);
    let ghostBlocked = 0;
    for (const t of l2.slice(0, 3)) {
        const hit = await page.evaluate(HIT, [t.cx, t.cy]);
        if (hit.hitIsGhostParent) ghostBlocked++;
        const before = await page.evaluate(trayCount);
        await page.mouse.click(t.cx, t.cy);
        await page.waitForTimeout(300);
        const after = await page.evaluate(trayCount);
        check('点击第二层卡 入槽(无幽灵拦截)', after > before, `tray ${before}->${after} hit=${JSON.stringify(hit)}`);
    }
    check('elementFromPoint 无幽灵容器命中', ghostBlocked === 0, '幽灵命中 ' + ghostBlocked);

    // 移除若干 2×2 卡后, 3×3 层解锁卡点击
    tiles = await page.evaluate(DUMP);
    const l3 = tiles.filter(t => !t.removed && !t.blocked && t.layer === 3);
    if (l3.length > 0) {
        const t = l3[0];
        const hit = await page.evaluate(HIT, [t.cx, t.cy]);
        const before = await page.evaluate(trayCount);
        await page.mouse.click(t.cx, t.cy);
        await page.waitForTimeout(300);
        const after = await page.evaluate(trayCount);
        check('点击第三层卡 入槽', after > before, `hit=${JSON.stringify(hit)}`);
    }

    console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
    await browser.close();
    process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
