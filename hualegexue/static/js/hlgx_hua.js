/*
 * 化了个学 · 消除小游戏逻辑 (hlgx_hua.js)
 * ==================================================
 * 分层:  7 层漏斗式堆叠,第 i 层 i×i(自上而下 49/36/25/16/9/4/1),
 *        每层完全被上一层覆盖,只有上层清空才逐步露出下层。
 * 玩法:  点击棋盘上未被遮挡的方块 → 进入底部消除槽(上限7块)
 *        「同类」= 物质类别相同(所有盐类互相可消,与化学式无关)。
 *        点击槽内方块选中,同类 ≥3 块(或某类仅剩的最后2块)点「消除选中」。
 * 配色:  卡牌颜色按棋盘位置决定,同层相邻卡牌颜色不同,与类别无关。
 */
"use strict";

/* ==================== 布局配置 ==================== */
const TILE_W = 50;        // 方块边长 px
const CELL = 58;          // 网格单元(含间隙)px
const TOOL_LIMIT = 3;     // 每个道具每局最多使用次数
const COLOR_COUNT = 8;    // 卡牌配色(位置决定): 同层相邻块颜色不同

/* 难度分级: 简单=槽10+5层 / 标准=槽10+7层 / 挑战=槽8+8层 */
const HLGX_DIFFICULTIES = {
    easy:      { label: "简单", tray: 10, layers: [1, 2, 3, 4, 5] },
    normal:    { label: "标准", tray: 10, layers: [1, 2, 3, 4, 5, 6, 7] },
    challenge: { label: "挑战", tray: 8,  layers: [1, 2, 3, 4, 5, 6, 7, 8] },
};
let LAYER_SIZES = HLGX_DIFFICULTIES.normal.layers;  // 自上而下金字塔层数
let TRAY_MAX = HLGX_DIFFICULTIES.normal.tray;       // 消除槽上限
let ROWS = 7, COLS = 7;                             // 棋盘行列数随最大层调整

/* ==================== 音效 (Web Audio 合成, 无需音频文件) ==================== */
const HLGX_Audio = (() => {
    let ctx = null, muted = false;
    function ac() {
        if (muted) return null;
        if (typeof window === "undefined") return null;
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
        }
        if (ctx.state === "suspended") ctx.resume();
        return ctx;
    }
    function tone(freq, dur, type, vol, delay) {
        const c = ac(); if (!c) return;
        const t0 = c.currentTime + (delay || 0);
        const o = c.createOscillator(), g = c.createGain();
        o.type = type || "sine"; o.frequency.value = freq;
        g.gain.setValueAtTime(vol || 0.12, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        o.connect(g); g.connect(c.destination);
        o.start(t0); o.stop(t0 + dur + 0.02);
    }
    return {
        setMuted(m) { muted = m; if (m && ctx) ctx.suspend(); },
        isMuted() { return muted; },
        click()  { tone(900, 0.05, "triangle", 0.10); },                                  // 点击方块
        skill()  { tone(520, 0.12, "sine", 0.12); tone(860, 0.14, "sine", 0.10, 0.05); }, // 使用技能
        clear()  { tone(660, 0.12, "sine", 0.14); tone(990, 0.18, "sine", 0.12, 0.07); }, // 消除
        win()    { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, "sine", 0.13, i * 0.13)); },
        lose()   { [392, 330, 262].forEach((f, i) => tone(f, 0.22, "triangle", 0.13, i * 0.16)); },
    };
})();

/* ==================== 难度选择 ==================== */
function applyDifficulty(name) {
    const d = HLGX_DIFFICULTIES[name] || HLGX_DIFFICULTIES.normal;
    currentMode = HLGX_DIFFICULTIES[name] ? name : "normal";
    LAYER_SIZES = d.layers;
    TRAY_MAX = d.tray;
    ROWS = Math.max(...LAYER_SIZES);
    COLS = ROWS;
    document.querySelectorAll(".hlgx-diff button").forEach(b =>
        b.classList.toggle("active", b.dataset.diff === name));
    trayLabelEl.textContent = `消除槽 · 点击手牌选中,3 张同类点「消除选中」(上限 ${TRAY_MAX} 块)`;
    if (gameStarted) startNewGame();   // 游戏中切难度 → 重开
}

/* ==================== 计时器(正计时) ==================== */
function fmtTime(s) {
    const m = Math.floor(s / 60), ss = s % 60;
    return (m < 10 ? "0" + m : m) + ":" + (ss < 10 ? "0" + ss : ss);
}
function updateTimer() {
    elapsedSec = Math.floor((Date.now() - startStamp) / 1000);
    timerEl.textContent = fmtTime(elapsedSec);
}
function startTimer() {
    stopTimer();
    startStamp = Date.now();
    elapsedSec = 0;
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
}
function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    updateTimer();
}

/* ==================== 血量 ==================== */
function updateHp() {
    hpEl.textContent = Math.max(0, hp);
    hpEl.classList.toggle("zero", hp <= 0);
}

/* ==================== 昵称与开局 ==================== */
async function fetchJson(url, options) {
    try {
        const res = await fetch(url, options);
        return await res.json();
    } catch (e) { return null; }
}
function startGameWithName() {
    const name = nameInput.value.trim();
    warnedDup = false;
    if (skipRank.checked) {
        playerName = null; inRank = false;
        beginPlay();
        return;
    }
    if (!name) { nameTip.textContent = "请输入昵称,或勾选「不参与排行榜」"; return; }
    checkName(name);
}
async function checkName(name) {
    const r = await fetchJson("/hlgx/api/name/exists?name=" + encodeURIComponent(name));
    if (r && r.exists) {
        if (!warnedDup) {
            warnedDup = true;
            nameTip.textContent = "⚠ 昵称已被使用,再次确认将自动加序列号(如 " + name + "*001)";
            return;
        }
        const sug = await fetchJson("/hlgx/api/name/suggest?name=" + encodeURIComponent(name));
        playerName = (sug && sug.name) ? sug.name : (name + "*001");
        inRank = true;
        beginPlay();
        return;
    }
    playerName = name;
    inRank = true;
    beginPlay();
}
function beginPlay() {
    gameStarted = true;
    nameModal.classList.add("hidden");
    nameTip.textContent = "";
    nameInput.value = "";
    skipRank.checked = false;
    startNewGame();
}
function startNewGame() {
    stopTimer();
    newGame();       // 重置棋盘/状态/血量
    startTimer();
}

/* ==================== 结算 ==================== */
function settleResult(isWin) {
    if (settled) return;
    settled = true;
    const remainCards = tiles.filter(x => !x.removed).length;
    const tools = toolUsed.undo + toolUsed.out + toolUsed.shuffle;
    ovTitleEl.textContent = isWin ? "🎉 通关啦!" : "💔 挑战失败";
    ovTextEl.textContent = isWin ? "棋盘已清空且无三消组合,剩余手牌自动消除!" : "手牌槽已满且无 3 张同类可消,血量耗尽!";
    if (inRank && playerName) {
        fetch("/hlgx/api/rank", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mode: currentMode, name: playerName,
                hp: Math.max(0, hp), time: elapsedSec, tools: tools
            })
        }).then(res => res.json()).then(data => {
            const sur = (data && typeof data.surpassed === "number") ? data.surpassed : null;
            renderSettle(remainCards, tools, sur);
        }).catch(() => renderSettle(remainCards, tools, null));
    } else {
        renderSettle(remainCards, tools, null);
    }
}
function renderSettle(remainCards, tools, surpassed) {
    let html = "剩余卡牌:" + remainCards + " 块 · 用时 " + fmtTime(elapsedSec) + " · 技能 " + tools + " 次";
    if (surpassed !== null) html += "<br>🏅 超越 " + surpassed + " 名玩家";
    settleInfoEl.innerHTML = html;
    overlayEl.classList.remove("hidden");
}

/* ==================== 状态 ==================== */
let tiles = [];           // 所有方块
let tray = [];            // 槽内方块
let selected = [];        // 槽内被选中的方块
let gameOver = false;
let win = false;
let toolUsed = { undo: 0, out: 0, shuffle: 0 };
let hp = 3;                 // 剩余血量(上限3)
let currentMode = "normal"; // 当前难度
let playerName = null;      // 参与排行时的昵称(含*abc)
let inRank = false;         // 是否参与排行榜
let warnedDup = false;      // 昵称重复是否已提示
let gameStarted = false;    // 是否已开局
let startStamp = 0;
let timerInterval = null;
let elapsedSec = 0;
let settled = false;        // 结算是否已处理

/* ==================== DOM ==================== */
const boardEl   = document.getElementById("hlgx-board");
const trayEl    = document.getElementById("hlgx-tray");
const trayLabelEl = document.getElementById("hlgx-tray-label");
const remainEl  = document.getElementById("hlgx-remain");
const overlayEl = document.getElementById("hlgx-overlay");
const ovTitleEl = document.getElementById("hlgx-overlay-title");
const ovTextEl  = document.getElementById("hlgx-overlay-text");
const flashEl   = document.getElementById("hlgx-flash");
const btnClear  = document.getElementById("hlgx-btn-clear");
const btnUndo   = document.getElementById("hlgx-btn-undo");
const btnOut    = document.getElementById("hlgx-btn-out");
const btnShuffle = document.getElementById("hlgx-btn-shuffle");
const hpEl       = document.getElementById("hlgx-hp");
const timerEl    = document.getElementById("hlgx-timer");
const settleInfoEl = document.getElementById("hlgx-settle-info");
const nameModal  = document.getElementById("hlgx-name-modal");
const nameInput  = document.getElementById("hlgx-name-input");
const skipRank   = document.getElementById("hlgx-skip-rank");
const nameTip    = document.getElementById("hlgx-name-tip");
const nameConfirm = document.getElementById("hlgx-name-confirm");

/* ==================== 工具函数 ==================== */
function shuffleArr(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
function flash(msg) {
    flashEl.textContent = msg;
    flashEl.classList.remove("show");
    void flashEl.offsetWidth;
    flashEl.classList.add("show");
}
function catLabel(c) { return HLGX_CATS[c] ? HLGX_CATS[c].label : c; }
function substanceInfo(sub) {
    return sub.n + ": " + (HLGX_DESC[sub.n] || "性质待补充");
}

/* ==================== 坐标 / 遮挡 / 配色 ==================== */
function buildSlots() {
    const slots = [];
    LAYER_SIZES.forEach((S, L) => {
        for (let r = 0; r < S; r++)
            for (let c = 0; c < S; c++)
                slots.push({ r, c, L });   // L: 0 = 顶层
    });
    return slots; // 1+4+9+16+25+36+49 = 140 个
}
function slotXY(s) {
    // 各层在7×7棋盘内同心居中, 构成正金字塔
    const S = LAYER_SIZES[s.L];
    const base = ((ROWS - S) * CELL) / 2;
    return { x: base + s.c * CELL, y: base + s.r * CELL };
}
// 纯算术重叠判断: 传缓存坐标 {x,y}, 避免重复分配对象
function overlapXY(a, b) {
    return a.x < b.x + TILE_W && a.x + TILE_W > b.x &&
           a.y < b.y + TILE_W && a.y + TILE_W > b.y;
}
// 按层分组索引(重建代价低, 常规操作走 isBlocked 增量路径)
let tilesByLayer = [];
function rebuildLayers() {
    tilesByLayer = [];
    LAYER_SIZES.forEach(() => tilesByLayer.push([]));
    tiles.forEach(t => tilesByLayer[t.L].push(t));
}
// 像素遮挡解锁: 只要被任何更上层方块盖住就不可点, 盖住它的方块被取走即解锁
// 加速: 坐标建块时缓存(t.pos), 遮挡只查更上层分组, 跳过已移除块
function isBlocked(t) {
    const pa = t.pos || slotXY(t);
    for (let L = 0; L < t.L; L++) {
        for (const o of tilesByLayer[L]) {
            if (o.removed) continue;
            if (overlapXY(pa, o.pos)) return true;
        }
    }
    return false;
}
function refreshBlocked() {
    for (const t of tiles) {
        if (t.removed) continue;
        const blocked = isBlocked(t);
        if (blocked !== t.blocked) {        // 仅状态变化才碰 DOM, 点击路径零动画开销
            t.blocked = blocked;
            t.el.classList.toggle("blocked", blocked);
        }
    }
}
// 位置决定颜色: 同层相邻块(±1格)必然不同色,叠层也不同色; 对任意棋盘宽都成立
function slotColorIdx(r, c, L) { return (r + c + L) % COLOR_COUNT; }
function applyTileColor(t, idx) {
    t.color = idx;
    for (let i = 0; i < COLOR_COUNT; i++) t.el.classList.remove("hlgx-color-" + i);
    t.el.classList.add("hlgx-color-" + idx);
}

/* ==================== 建块 ==================== */
function tileFontSize(f) {
    const len = f.length;
    if (len <= 2) return 19;
    if (len <= 4) return 15;
    if (len <= 6) return 13;
    if (len <= 9) return 11;
    return 10;
}
function tileHTML(sub) {
    const fs = tileFontSize(sub.f);
    return `<span class="f" style="font-size:${fs}px">${sub.f}</span>` +
           `<span class="n">${sub.n}</span>`;
}
function buildTile(t, slot) {
    const pos = t.pos;
    const el = document.createElement("div");
    el.className = "hlgx-tile hlgx-color-" + t.color;
    el.title = substanceInfo(t.sub);
    el.style.left = pos.x + "px";
    el.style.top = pos.y + "px";
    el.style.width = TILE_W + "px";
    el.style.height = TILE_W + "px";
    el.style.zIndex = 10 + (LAYER_SIZES.length - 1 - slot.L);  // 顶层最大
    el.innerHTML = tileHTML(t.sub);
    el.addEventListener("click", () => pickTile(t));
    t.el = el;
    return el;
}

/* ==================== 新开一局 ==================== */
function newGame() {
    tiles = []; tray = []; selected = [];
    gameOver = false; win = false;
    toolUsed = { undo: 0, out: 0, shuffle: 0 };
    hp = 3;
    settled = false;
    updateHp();
    boardEl.innerHTML = ""; trayEl.innerHTML = "";
    overlayEl.classList.add("hidden");
    flashEl.classList.remove("show");

    const slots = buildSlots();
    const stack = buildStack();   // 140 块: 6类×21 + 1类×14,可被3整除
    shuffleArr(stack);            // 打散到各层

    const frag = document.createDocumentFragment();   // 批量挂载, 开局更顺
    tiles = slots.map((slot, i) => {
        const t = {
            id: i, r: slot.r, c: slot.c, L: slot.L,
            pos: slotXY(slot),                        // 缓存坐标, isBlocked 不再重复计算
            sub: stack[i], color: slotColorIdx(slot.r, slot.c, slot.L),
            removed: false, blocked: false
        };
        frag.appendChild(buildTile(t, slot));
        return t;
    });
    boardEl.appendChild(frag);
    rebuildLayers();              // 遮挡分组索引
    // 棋盘尺寸 = 所有方块最大外延
    let maxX = 0, maxY = 0;
    tiles.forEach(t => {
        const p = t.pos;
        maxX = Math.max(maxX, p.x + TILE_W);
        maxY = Math.max(maxY, p.y + TILE_W);
    });
    boardEl.style.width = maxX + 20 + "px";
    boardEl.style.height = maxY + 20 + "px";
    updateRemain();
    refreshBlocked();
    updateTools();
    updateClearBtn();
}

/* 生成方块物质序列: 按各类物质数量等比分配卡牌(取3的倍数),
   保证任意物质出现概率近似相等, 总数=棋盘槽数, 且各类卡牌数≡0或≡2(mod3)避免剩1张卡死 */
function buildStack() {
    const cats = Object.keys(HLGX_CATS);   // 金属/非金属/氧化物/酸/碱/盐/有机物
    const byCat = {};
    cats.forEach(c => { byCat[c] = HLGX_SUBSTANCES.filter(s => s.c === c); });
    const TOTAL = buildSlots().length;     // 随层数自动匹配总块数
    // 各类卡牌数 ∝ 该类物质数, 取3的倍数
    const counts = {};
    cats.forEach(c => {
        let n = Math.round(TOTAL * byCat[c].length / HLGX_SUBSTANCES.length);
        n = Math.round(n / 3) * 3;
        if (n < 3) n = 3;
        counts[c] = n;
    });
    // 轮流微调差额, 使总和=TOTAL且各类≡0或≡2(mod3), 永不≡1(避免剩1张卡死)
    const order = [...cats].sort((a, b) => byCat[b].length - byCat[a].length);
    const N = order.length;
    let diff = TOTAL - Object.values(counts).reduce((a, b) => a + b, 0);
    let idx = 0;
    while (diff < 0) {                       // 负差: 轮流减3
        let c = order[idx % N], guard = 0;
        while (counts[c] <= 3 && guard < N) { idx++; c = order[idx % N]; guard++; }
        if (counts[c] > 3) { counts[c] -= 3; diff += 3; idx++; }
        else break;
    }
    while (diff > 0) {                       // 正差: 轮流加3/2
        const c = order[idx % N];
        if (diff >= 3) { counts[c] += 3; diff -= 3; idx++; }
        else if (diff === 2) { counts[c] += 2; diff = 0; }
        else {                               // diff===1: 加2+2(净4)再从某类借3(净1)
            counts[order[idx % N]] += 2;
            counts[order[(idx + 1) % N]] += 2;
            const src = order.find(x => counts[x] > 3);
            counts[src || order[2]] -= 3;
            diff = 0;
        }
    }
    if (diff < 0) counts[order[0]] += diff;  // 极边缘兜底(仅保证总数正确)
    // 组卡: 每类随机洗牌后循环取物质(各物质出现近似均匀), 再全局打散
    const stack = [];
    cats.forEach(c => {
        const list = shuffleArr([...byCat[c]]);
        for (let k = 0; k < counts[c]; k++) stack.push(list[k % list.length]);
    });
    shuffleArr(stack);
    return stack;
}

/* ==================== 点击方块入槽 ==================== */
function pickTile(t) {
    if (t.removed || gameOver || win) return;
    if (isBlocked(t)) { shake(t); return; }
    if (tray.length >= TRAY_MAX) { flash("消除槽已满:先选中同类物质点「消除选中」,或用道具腾位置"); return; }

    t.removed = true;
    t.el.classList.add("removed");
    tray.push(t);
    HLGX_Audio.click();
    appendTrayCell(t);        // 增量入槽, 不再整槽重建
    updateRemain();
    refreshBlocked();
    checkWin();
    checkLose();
}

/* ==================== 手牌区:选择与手动消除 ==================== */
// 单格构建(增量渲染共用): 常规点击只动这一格
function makeTrayCell(t) {
    const cell = document.createElement("div");
    cell.className = "hlgx-tray-cell hlgx-color-" + t.color;
    cell.title = substanceInfo(t.sub);
    cell.innerHTML = tileHTML(t.sub);
    cell.addEventListener("click", () => toggleSelect(t));
    t.cell = cell;
    return cell;
}
function appendTrayCell(t) {
    trayEl.appendChild(makeTrayCell(t));
    updateClearBtn();
}
function renderTray() {       // 全量重建(开局/通关等低频场景)
    trayEl.innerHTML = "";
    tray.forEach(t => trayEl.appendChild(makeTrayCell(t)));
    updateClearBtn();
}
function toggleSelect(t) {
    if (gameOver || win) return;
    const i = selected.indexOf(t);
    if (i >= 0) { selected.splice(i, 1); } else { selected.push(t); }
    t.cell.classList.toggle("sel", i < 0);   // 只切换选中态样式
    updateClearBtn();
}
function updateClearBtn() {
    // 恰好选中 3 张即可点; 同类则消除, 不同类则扣血
    const valid = selected.length === 3;
    btnClear.disabled = !valid;
    btnClear.textContent = valid ? "消除选中(3)" : "消除选中";
}
function clearSelected() {
    if (gameOver || win || selected.length !== 3) return;
    const cat = selected[0].sub.c;
    if (!selected.every(x => x.sub.c === cat)) {
        // 3 张不同类 → 扣 1 血, 不消除
        hp--;
        updateHp();
        HLGX_Audio.lose();
        flash("不是同类!扣除 1 点血量(剩 " + Math.max(0, hp) + ")");
        selected.forEach(x => x.cell.classList.remove("sel"));   // 只撤选中态
        selected = [];
        updateClearBtn();
        if (hp <= 0) { lose(); }
        return;
    }
    selected.forEach(x => { x.el.remove(); });   // 移除棋盘对应元素
    tray = tray.filter(x => !selected.includes(x));
    HLGX_Audio.clear();
    selected.forEach(x => x.cell.remove());       // 增量移除手牌格
    selected = [];
    updateClearBtn();
    refreshBlocked();
    checkWin();
    checkLose();
}

/* ==================== 道具(每局限3次) ==================== */
function updateTools() {
    btnUndo.disabled    = toolUsed.undo >= TOOL_LIMIT;
    btnOut.disabled     = toolUsed.out >= TOOL_LIMIT;
    btnShuffle.disabled = toolUsed.shuffle >= TOOL_LIMIT;
    btnUndo.textContent    = `↩ 撤回(${TOOL_LIMIT - toolUsed.undo})`;
    btnOut.textContent     = `📤 移出(${TOOL_LIMIT - toolUsed.out})`;
    btnShuffle.textContent = `🔀 洗牌(${TOOL_LIMIT - toolUsed.shuffle})`;
}
function undo() {                 // 撤回: 槽内最后一块放回棋盘
    if (gameOver || win || tray.length === 0) return;
    if (toolUsed.undo >= TOOL_LIMIT) { flash("撤回次数已用完"); return; }
    toolUsed.undo++;
    HLGX_Audio.skill();
    const t = tray.pop();
    t.cell.remove();              // 增量移除手牌格
    selected = selected.filter(x => x !== t);
    const occupied = tiles.some(x => !x.removed && x !== t && x.r === t.r && x.c === t.c && x.L === t.L);
    if (occupied) {
        const free = tiles.filter(x => x.removed && !tray.includes(x) && !selected.includes(x));
        if (free.length === 0) { tray.push(t); appendTrayCell(t); updateTools(); return; }
        const s = free[Math.floor(Math.random() * free.length)];
        t.r = s.r; t.c = s.c; t.L = s.L;
        t.pos = s.pos;            // 同步缓存坐标
        t.el.style.left = t.pos.x + "px"; t.el.style.top = t.pos.y + "px";
        t.el.style.zIndex = 10 + (LAYER_SIZES.length - 1 - s.L);
        applyTileColor(t, slotColorIdx(s.r, s.c, s.L));
    }
    t.removed = false;
    t.el.classList.remove("removed");
    rebuildLayers();              // 层级可能变化, 重建分组索引
    updateClearBtn(); updateRemain(); refreshBlocked(); updateTools();
}
function moveOut() {              // 移出: 槽内最靠前3块放回棋盘空位
    if (gameOver || win || tray.length === 0) return;
    if (toolUsed.out >= TOOL_LIMIT) { flash("移出次数已用完"); return; }
    toolUsed.out++;
    HLGX_Audio.skill();
    const take = tray.splice(0, Math.min(3, tray.length));
    selected = selected.filter(x => !take.includes(x));
    let freeSlots = tiles.filter(x => x.removed && !tray.includes(x) && !take.includes(x) && !selected.includes(x));
    if (freeSlots.length < take.length) { tray.unshift(...take); take.forEach(x => appendTrayCell(x)); updateTools(); return; }
    shuffleArr(freeSlots);
    take.forEach((t, i) => {
        const s = freeSlots[i];
        t.r = s.r; t.c = s.c; t.L = s.L;
        t.pos = s.pos;            // 同步缓存坐标
        t.removed = false;
        t.el.classList.remove("removed");
        t.el.style.left = t.pos.x + "px"; t.el.style.top = t.pos.y + "px";
        t.el.style.zIndex = 10 + (LAYER_SIZES.length - 1 - s.L);
        applyTileColor(t, slotColorIdx(s.r, s.c, s.L));
        t.cell.remove();          // 增量移除手牌格
    });
    rebuildLayers();
    updateClearBtn(); updateRemain(); refreshBlocked(); updateTools();
}
function shuffleTiles() {         // 洗牌: 打乱剩余方块的物质身份
    if (gameOver || win) return;
    if (toolUsed.shuffle >= TOOL_LIMIT) { flash("洗牌次数已用完"); return; }
    toolUsed.shuffle++;
    HLGX_Audio.skill();
    const alive = tiles.filter(t => !t.removed);
    const subs = shuffleArr(alive.map(t => t.sub));
    alive.forEach((t, i) => {
        t.sub = subs[i];
        t.el.title = substanceInfo(t.sub);
        t.el.innerHTML = tileHTML(subs[i]);
    });
    updateTools();
}

/* ==================== 结算 ==================== */
function canEliminate() {
    const counts = {};
    tray.forEach(x => { counts[x.sub.c] = (counts[x.sub.c] || 0) + 1; });
    return Object.values(counts).some(c => c >= 3);
}
// 过关 = 全部卡牌被拾取 且 手牌槽无 3 张同类可消(最后一次消除也纳入考察,
// 拾取完还需完成手牌里的三消, 消除后仍有三消可能则继续消, 直到无三消组合才通关)
function checkWin() {
    if (gameOver || win) return;
    if (tiles.every(x => x.removed) && !canEliminate()) {
        tray = [];
        selected = [];
        renderTray();
        win = true;
        showWin();
    }
}
function checkLose() {
    if (gameOver || win) return;
    if (tray.length >= TRAY_MAX && !canEliminate()) { lose(); }
}
function lose() {
    HLGX_Audio.lose();
    hp = 0;               // 槽满无三消 → 扣除剩余全部血量并立即失败
    updateHp();
    gameOver = true;
    stopTimer();
    settleResult(false);
}
function showWin() {
    HLGX_Audio.win();
    gameOver = true; win = true;
    stopTimer();
    settleResult(true);
}
function updateRemain() {
    remainEl.textContent = tiles.filter(x => !x.removed).length;
}
function shake(t) {
    t.el.classList.remove("shake");
    void t.el.offsetWidth;
    t.el.classList.add("shake");
}

/* ==================== 图鉴 ==================== */
function renderCatalog() {
    document.getElementById("hlgx-cat-count").textContent = HLGX_SUBSTANCES.length;
    const body = document.getElementById("hlgx-catalog-body");
    const groups = {};
    HLGX_SUBSTANCES.forEach(s => (groups[s.c] = groups[s.c] || []).push(s));
    body.innerHTML = "";
    Object.keys(HLGX_CATS).forEach(k => {
        const list = groups[k];
        if (!list) return;
        const sec = document.createElement("section");
        const h3 = document.createElement("h3");
        h3.style.color = HLGX_CATS[k].color;
        h3.textContent = `${HLGX_CATS[k].label} (${list.length})`;
        const wrap = document.createElement("div");
        wrap.className = "cat-chips";
        list.forEach(s => {
            const chip = document.createElement("span");
            chip.className = "chip cat-" + s.c;
            chip.textContent = s.f + " " + s.n;
            chip.title = HLGX_DESC[s.n] || "";
            wrap.appendChild(chip);
        });
        sec.appendChild(h3); sec.appendChild(wrap);
        body.appendChild(sec);
    });
}

/* ==================== 绑定与启动 ==================== */
btnClear.addEventListener("click", clearSelected);
btnUndo.addEventListener("click", undo);
btnOut.addEventListener("click", moveOut);
btnShuffle.addEventListener("click", shuffleTiles);
nameConfirm.addEventListener("click", startGameWithName);
document.getElementById("hlgx-btn-restart").addEventListener("click", () => {
    overlayEl.classList.add("hidden");
    if (playerName) nameInput.value = playerName.replace(/\*\d{3}$/, "");
    nameModal.classList.remove("hidden");
});
document.querySelectorAll(".hlgx-diff button").forEach(b =>
    b.addEventListener("click", () => applyDifficulty(b.dataset.diff)));
const muteBtn = document.getElementById("hlgx-btn-mute");
if (muteBtn) muteBtn.addEventListener("click", () => {
    HLGX_Audio.setMuted(!HLGX_Audio.isMuted());
    muteBtn.textContent = HLGX_Audio.isMuted() ? "🔇 静音" : "🔊 音效";
});

renderCatalog();
applyDifficulty("normal");   // 只设配置; 开局需先在昵称窗确认
nameModal.classList.remove("hidden");
