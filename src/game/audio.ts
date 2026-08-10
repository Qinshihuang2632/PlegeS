/*
 * 化了个学 · 音效 (Web Audio 合成, 无需音频文件)
 * 自旧版 hlgx_hua.js 原样迁移
 */
export const HLGX_Audio = (() => {
    let ctx: AudioContext | null = null;
    let muted = false;

    function ac(): AudioContext | null {
        if (muted) return null;
        if (typeof window === "undefined") return null;
        if (!ctx) {
            const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
        }
        if (ctx.state === "suspended") void ctx.resume();
        return ctx;
    }

    function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0) {
        const c = ac();
        if (!c) return;
        const t0 = c.currentTime + delay;
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.setValueAtTime(vol, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        o.connect(g);
        g.connect(c.destination);
        o.start(t0);
        o.stop(t0 + dur + 0.02);
    }

    return {
        setMuted(m: boolean) { muted = m; if (m && ctx) void ctx.suspend(); },
        isMuted() { return muted; },
        click()  { tone(900, 0.05, "triangle", 0.10); },                                  // 点击方块
        hurt()   { tone(320, 0.22, "square", 0.12); tone(210, 0.30, "square", 0.10, 0.07); }, // 扣血(误消)
        clear()  { tone(660, 0.12, "sine", 0.14); tone(990, 0.18, "sine", 0.12, 0.07); }, // 消除
        /* 三个技能音效各不相同(v2.2.0): 撤回=轻快上行, 移出=三连滑落, 洗牌=快速碎音 */
        undo()   { tone(330, 0.10, "sine", 0.10); tone(440, 0.13, "sine", 0.10, 0.07); },
        out()    { tone(640, 0.09, "sine", 0.11); tone(540, 0.09, "sine", 0.10, 0.08); tone(440, 0.13, "sine", 0.10, 0.16); },
        shuffle(){ [700, 520, 780, 600, 880].forEach((f, i) => tone(f, 0.06, "triangle", 0.09, i * 0.05)); },
        /* 通关/失败加长(v2.2.0): 更多音符、更长时值 */
        win()    { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.30, "sine", 0.13, i * 0.16)); },
        lose()   { [392, 349, 311, 262, 196].forEach((f, i) => tone(f, 0.34, "triangle", 0.12, i * 0.22)); },
    };
})();
