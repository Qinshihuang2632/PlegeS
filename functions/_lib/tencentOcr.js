/*
 * 错了个字 · 腾讯云通用手写体识别 (functions/_lib/tencentOcr.js)
 * ================================================================
 * 用途: 手写字图片 → 腾讯云文字识别 GeneralHandwritingOCR → 识别文本,
 *       供错了个字判定「写对 / 写成别的字 / 涂鸦难辨认」(v1.1.0)。
 * 为什么不用官方 npm SDK: Cloudflare Workers 不兼容其 Node http 依赖,
 *   这里直接实现 TC3-HMAC-SHA256 签名调用 HTTP API(Web Crypto, 零依赖)。
 * 配置: KV `clgz:ocr:config` {enabled, secretId, secretKey, region}
 *   —— 由管理后台「AI 检测」页配置(与英了个语的 DeepSeek 配置相互独立)。
 * 降级: 未配置/调用失败 → 返回 ok:false, 前端回退像素重合度判定。
 * 签名注意(实测): ①X-TC-Version 必须为带连字符日期格式("2018-11-19");
 *   ②X-TC-Timestamp/X-TC-Nonce 公共参数头必须携带;
 *   ③x-tc-action 必须参与 canonicalHeaders 与 SignedHeaders(小写 action)。
 */
import { json } from "./ranklib.js";

export const OCR_CONFIG_KEY = "clgz:ocr:config";
const OCR_HOST = "ocr.tencentcloudapi.com";
const OCR_SERVICE = "ocr";
const OCR_VERSION = "2018-11-19";
const OCR_ACTION = "GeneralHandwritingOCR";

export function loadOcrConfig(env) {
    return env.RANKINGS.get(OCR_CONFIG_KEY).then((raw) => {
        if (raw) {
            try {
                const c = JSON.parse(raw);
                if (c && typeof c === "object") {
                    return {
                        enabled: c.enabled === true,
                        secretId: String(c.secretId ?? ""),
                        secretKey: String(c.secretKey ?? ""),
                        region: String(c.region ?? "ap-guangzhou"),
                    };
                }
            } catch { /* 配置损坏 → 视为未配置 */ }
        }
        return { enabled: false, secretId: "", secretKey: "", region: "ap-guangzhou" };
    });
}

export function saveOcrConfig(env, { enabled, region, secretId, secretKey }) {
    return loadOcrConfig(env).then((cur) => {
        const sid = String(secretId ?? "").trim() || cur.secretId;
        const skey = String(secretKey ?? "").trim() || cur.secretKey;
        if (enabled && (!sid || !skey)) return { ok: false, msg: "请填写 SecretId 与 SecretKey" };
        const cfg = {
            enabled: enabled === true,
            secretId: sid,
            secretKey: skey,
            region: String(region ?? "ap-guangzhou").trim() || "ap-guangzhou",
            updatedAt: new Date().toISOString(),
        };
        return env.RANKINGS.put(OCR_CONFIG_KEY, JSON.stringify(cfg)).then(() => ({ ok: true, cfg }));
    });
}

/* ---- TC3-HMAC-SHA256 签名(Web Crypto) ---- */
const enc = new TextEncoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
async function hmac(keyBytes, msg) {
    const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return crypto.subtle.sign("HMAC", key, enc.encode(msg));
}
async function sha256Hex(msg) {
    return toHex(await crypto.subtle.digest("SHA-256", enc.encode(msg)));
}

/** 通用手写体识别: 图片 base64(纯 base64, 不含 dataURL 前缀) + 目标字
 *  → {ok:true, text, isTarget} | {ok:false, msg, dbg?}(前端降级依据) */
export async function ocrHandwriting(env, imageBase64, target) {
    const cfg = await loadOcrConfig(env);
    if (!cfg.enabled || !cfg.secretId || !cfg.secretKey) {
        return { ok: false, msg: "OCR 识别未配置" };
    }
    // 临时诊断(v1.1.1): 返回配置掩码, 用于核对管理页填写的密钥是否正确
    const sidMask = cfg.secretId.slice(0, 10) + "...(" + cfg.secretId.length + "字符)";
    const keyMask = cfg.secretKey.slice(0, 4) + "...(" + cfg.secretKey.length + "字符)";
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
    const body = JSON.stringify({ ImageBase64: imageBase64 });
    const canonicalHeaders =
        "content-type:application/json\n" +
        "host:" + OCR_HOST + "\n" +
        "x-tc-action:" + OCR_ACTION.toLowerCase() + "\n";
    const canonicalRequest = [
        "POST",
        "/",
        "",
        canonicalHeaders,
        "content-type;host;x-tc-action",
        await sha256Hex(body),
    ].join("\n");
    const stringToSign = "TC3-HMAC-SHA256\n" + timestamp + "\n" + date + "/" + OCR_SERVICE + "/tc3_request\n" + (await sha256Hex(canonicalRequest));
    let kDate = await hmac(enc.encode("TC3" + cfg.secretKey), date);   // 官方规范: kDate = HMAC("TC3"+SecretKey, Date)
    kDate = await hmac(kDate, OCR_SERVICE);
    kDate = await hmac(kDate, "tc3_request");
    const signature = toHex(await hmac(kDate, stringToSign));
    try {
        const resp = await fetch("https://" + OCR_HOST, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-TC-Action": OCR_ACTION,
                "X-TC-Version": OCR_VERSION,
                "X-TC-Region": cfg.region,
                "X-TC-Timestamp": String(timestamp),   // 公共参数: 当前秒级时间戳
                "X-TC-Nonce": String(Math.floor(Math.random() * 1e9)),
                Authorization: "TC3-HMAC-SHA256 Credential=" + cfg.secretId + "/" + date + "/" + OCR_SERVICE + "/tc3_request, SignedHeaders=content-type;host;x-tc-action, Signature=" + signature,
            },
            body,
            signal: AbortSignal.timeout(15000),
        });
        if (!resp.ok) return { ok: false, msg: "OCR 服务暂不可用", dbg: "sid=" + sidMask + " key=" + keyMask };
        const data = await resp.json();
        // 腾讯业务错误也走 HTTP 200: Error 字段必须透出(否则会被误判为「识别失败/难以辨认」)
        const tErr = data?.Response?.Error;
        if (tErr) return { ok: false, msg: "腾讯 OCR 错误: " + (tErr.Code ?? "") + " " + (tErr.Message ?? ""), dbg: "sid=" + sidMask + " key=" + keyMask };
        const items = data?.Response?.TextItems ?? [];
        const text = items.map((it) => (it?.DetectedText ?? "")).join("").replace(/\s+/g, "");
        if (text.length > 0) return { ok: true, text, isTarget: text.includes(target), empty: false };
        // GeneralHandwritingOCR 检测不到 → 回退 GeneralBasicOCR(印刷体识别对手写也有一定能力)
        const basicAction = "GeneralBasicOCR";
        const basicBody = JSON.stringify({ ImageBase64: imageBase64 });
        const basicCanonical = "content-type:application/json\nhost:" + OCR_HOST + "\nx-tc-action:" + basicAction.toLowerCase() + "\n";
        const basicCR = ["POST", "/", "", basicCanonical, "content-type;host;x-tc-action", await sha256Hex(basicBody)].join("\n");
        const basicSTS = "TC3-HMAC-SHA256\n" + timestamp + "\n" + date + "/" + OCR_SERVICE + "/tc3_request\n" + (await sha256Hex(basicCR));
        const basicSig = toHex(await hmac(kDate, basicSTS));
        const basicResp = await fetch("https://" + OCR_HOST, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-TC-Action": basicAction,
                "X-TC-Version": OCR_VERSION,
                "X-TC-Region": cfg.region,
                "X-TC-Timestamp": String(timestamp),
                Authorization: "TC3-HMAC-SHA256 Credential=" + cfg.secretId + "/" + date + "/" + OCR_SERVICE + "/tc3_request, SignedHeaders=content-type;host;x-tc-action, Signature=" + basicSig,
            },
            body: basicBody,
            signal: AbortSignal.timeout(15000),
        });
        if (!basicResp.ok) return { ok: true, text: "", isTarget: false, empty: true };
        const basicData = await basicResp.json();
        const basicItems = basicData?.Response?.TextDetections ?? [];
        const basicText = basicItems.map((it) => (it?.DetectedText ?? "")).join("");
        return { ok: true, text: basicText, isTarget: basicText.includes(target), empty: basicText.length === 0 };
    } catch {
        return { ok: false, msg: "OCR 服务暂不可用", dbg: "sid=" + sidMask + " key=" + keyMask };
    }
}
