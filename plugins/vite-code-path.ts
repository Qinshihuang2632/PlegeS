/*
 * vite-code-path —— 开发模式专用 Vite 插件
 * ==========================================
 * 给每个 JSX 元素注入 data-code-path="相对路径\文件.tsx:行:列" 属性,
 * 方便在浏览器 DevTools 中直接看到元素对应的源码位置, 便于调试与报 bug
 * (例如: src\game\HuaPage.tsx:131:11)。
 *
 * 实现: 在 load 阶段(esbuild/oxc 转译之前)对原始 TSX 源码做 token 级扫描,
 * 只在"JSX 开标签"处注入。状态机跳过: 行/块注释、单双引号、模板串、
 * 正则字面量(按前导 token 区分除法);排除泛型与比较表达式
 * (< 前一个非空白字符是标识符/括号/引号等即视为非 JSX)。
 * 行号/列号与源码一一对应(1-based)。生产构建不加载本插件, 零注入。
 */
import { readFileSync } from "node:fs";
import { relative } from "node:path";
import type { Plugin } from "vite";

/** 相对项目根、反斜杠分隔的展示路径(与示例格式一致) */
function displayPath(file: string): string {
    return relative(process.cwd(), file).replace(/[\\/]/g, "\\");
}

/** 前一个非空白字符(用于区分 除法/正则 与 泛型/JSX) */
function prevNonSpace(src: string, i: number): string | undefined {
    let j = i - 1;
    while (j >= 0 && /\s/.test(src[j])) j--;
    return j >= 0 ? src[j] : undefined;
}

/** 前导单词是否为 JS 关键字(return <X> 等合法 JSX 前导, 不算排除) */
function prevWordIsKeyword(src: string, i: number): boolean {
    let j = i - 1;
    while (j >= 0 && /\s/.test(src[j])) j--;
    let k = j;
    while (k >= 0 && /[A-Za-z0-9_$]/.test(src[k])) k--;
    const word = src.slice(k + 1, j + 1);
    return /^(return|throw|typeof|instanceof|in|of|new|delete|void|yield|await|case|else|do|extends|default)$/.test(word);
}

/** token 级扫描: 返回注入 data-code-path 后的源码 */
export function injectCodePath(src: string, file: string): string {
    const path = displayPath(file);
    const n = src.length;
    let out = "";
    let i = 0, line = 1, col = 1;

    let inSingle = false, inDouble = false, inBacktick = false;
    let inLineComment = false, inBlockComment = false;
    let inRegex = false, inRegexClass = false;

    const advance = () => {
        if (src[i] === "\n") { line++; col = 1; } else { col++; }
        i++;
    };

    // 从 from 起查找标签结束的 '>' (支持多行开标签; 跳过引号内与表达式花括号内的 '>')
    const findTagEnd = (from: number): number => {
        let m = from, quote: string | null = null, brace = 0;
        while (m < n) {
            const c = src[m];
            if (quote) { if (c === quote) quote = null; }
            else if (c === '"' || c === "'") quote = c;
            else if (c === "{") brace++;
            else if (c === "}") brace = Math.max(0, brace - 1);
            else if (c === ">" && brace === 0) return m;
            m++;
        }
        return -1;
    };

    while (i < n) {
        const ch = src[i];
        const next = src[i + 1];

        /* ---- 注释 / 字符串 / 正则 状态机(内部原样透传, 不注入) ---- */
        if (inLineComment) {
            out += ch;
            if (ch === "\n") inLineComment = false;
            advance();
            continue;
        }
        if (inBlockComment) {
            out += ch;
            if (ch === "*" && next === "/") {
                out += next;
                advance();   // 跳过 '*'
                advance();   // 跳过 '/' (必须跳两次, 否则 '/' 会被误判为正则入口)
                inBlockComment = false;
            } else {
                advance();
            }
            continue;
        }
        if (inSingle) {
            out += ch;
            if (ch === "\\" && next !== undefined) { out += next; advance(); }
            else if (ch === "'") inSingle = false;
            advance();
            continue;
        }
        if (inDouble) {
            out += ch;
            if (ch === "\\" && next !== undefined) { out += next; advance(); }
            else if (ch === '"') inDouble = false;
            advance();
            continue;
        }
        if (inBacktick) {
            out += ch;
            if (ch === "\\" && next !== undefined) { out += next; advance(); }
            else if (ch === "`") inBacktick = false;
            advance();
            continue;
        }
        if (inRegex) {
            out += ch;
            if (ch === "\\" && next !== undefined) { out += next; advance(); }
            else if (ch === "[") inRegexClass = true;
            else if (ch === "]") inRegexClass = false;
            else if (ch === "/" && !inRegexClass) inRegex = false;
            advance();
            continue;
        }

        /* ---- 新 token: 注释 / 字符串 / 正则 入口 ---- */
        if (ch === "/" && next === "/") { inLineComment = true; out += ch; advance(); continue; }
        if (ch === "/" && next === "*") { inBlockComment = true; out += ch; advance(); continue; }
        if (ch === "'") { inSingle = true; out += ch; advance(); continue; }
        if (ch === '"') { inDouble = true; out += ch; advance(); continue; }
        if (ch === "`") { inBacktick = true; out += ch; advance(); continue; }
        if (ch === "/") {
            // `</` 是 JSX 闭合标签的斜杠, 不是正则/除法
            if (prevNonSpace(src, i) === "<") { out += ch; advance(); continue; }
            // 前导是标识符/数字/括号/引号/花括号 → 除法; 否则可能是正则字面量
            const prev = prevNonSpace(src, i);
            const divLike = prev !== undefined && /[A-Za-z0-9_$)\]}"']/.test(prev);
            if (!divLike) { inRegex = true; out += ch; advance(); continue; }
        }

        /* ---- JSX 开标签检测与注入 ---- */
        if (ch === "<" && next !== undefined && /[A-Za-z]/.test(next)) {
            const prev = prevNonSpace(src, i);
            // 泛型/比较/字符串后(前导为标识符、引号等)跳过;
            // 注意: 父标签的 `>`、箭头函数参数 `)`、数组 `]` 以及 return/typeof 等
            // 关键字后跟的 JSX 都是合法前导, 不排除
            const excluded = prev !== undefined && /[A-Za-z0-9_$"'`]/.test(prev);
            if (!excluded || prevWordIsKeyword(src, i)) {
                let k = i + 1;
                while (k < n && /[A-Za-z0-9_.$-]/.test(src[k])) k++;
                const tag = src.slice(i + 1, k);
                // 跳过 <T,> 泛型箭头函数(标签名后紧跟逗号)
                if (tag && !tag.startsWith("!--") && src[k] !== ",") {
                    const end = findTagEnd(k);
                    if (end > 0) {
                        const seg = src.slice(i, end);       // <tag ...(不含 >)
                        const attr = ` data-code-path="${path}:${line}:${col}"`;
                        if (seg.trimEnd().endsWith("/")) {
                            // 自闭合 <div ... /> → 在 / 前注入
                            out += seg.slice(0, -1) + attr + "/>";
                        } else {
                            out += seg + attr + ">";
                        }
                        const nl = (seg.match(/\n/g) || []).length;
                        if (nl) { line += nl; col = seg.length - seg.lastIndexOf("\n"); }
                        else col += seg.length;
                        i = end + 1;
                        continue;
                    }
                }
            }
        }

        out += ch;
        advance();
    }
    return out;
}

export function codePathPlugin(): Plugin {
    return {
        name: "hlgx-code-path",
        enforce: "pre",
        load(id) {
            if (!/\.(tsx|jsx)$/.test(id)) return;
            if (id.includes("node_modules")) return;
            let src: string;
            try { src = readFileSync(id, "utf8"); } catch { return; }
            return injectCodePath(src, id);
        },
    };
}
