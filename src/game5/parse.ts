/*
 * 配了个平 · 化学式解析 (src/game5/parse.ts)
 * ==========================================
 * 把物质式解析为元素计数, 供题库守恒校验使用。
 * 支持: 普通元素(H/O/Cl/Fe…)、圆括号与方括号嵌套(Ca(ClO)₂ / Na[Al(OH)₄])、
 *       unicode 下标、有机串式(CH₃COOC₂H₅)、双键写法(CH₂=CH₂ 的 = 剔除);
 *       中文限量标注括号(如 "(足量)")在解析前剔除 —— 只含非 ASCII 字符的括号段视为标注。
 */

const SUBS = "₀₁₂₃₄₅₆₇₈₉";

export function parseFormula(raw: string): Record<string, number> {
    let s = raw.replace(/[₀-₉]/g, (ch) => String(SUBS.indexOf(ch)));
    // 剔除限量标注括号: 括号内含非 ASCII(中文)即标注, 如 (足量)/(稀,足量)/(少量)
    s = s.replace(/\([^)]*[^\x00-\x7F][^)]*\)/g, "");
    s = s.replace(/[^A-Za-z0-9()\[\]]/g, "");   // 去掉 ↑ ↓ ⇌ = 空格等非化学字符

    const stack: Array<Record<string, number>> = [{}];
    let i = 0;
    while (i < s.length) {
        const ch = s[i];
        if (ch === "(" || ch === "[") { stack.push({}); i++; continue; }
        if (ch === ")" || ch === "]") {
            const top = stack.pop()!;
            const m = /^\d*/.exec(s.slice(i + 1))![0];
            const mult = m ? parseInt(m, 10) : 1;
            const parent = stack[stack.length - 1];
            for (const [el, n] of Object.entries(top)) {
                parent[el] = (parent[el] ?? 0) + n * mult;
            }
            i += 1 + m.length;
            continue;
        }
        const me = /^[A-Z][a-z]?/.exec(s.slice(i));
        if (!me) { i++; continue; }   // 未知字符容错跳过
        const el = me[0];
        i += el.length;
        const md = /^\d*/.exec(s.slice(i))![0];
        const n = md ? parseInt(md, 10) : 1;
        i += md.length;
        const top = stack[stack.length - 1];
        top[el] = (top[el] ?? 0) + n;
    }
    return stack[0];
}
