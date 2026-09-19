/*
 * p了个s · 管理后台 AI 检测设置(双作用域)
 *   ①英了个语 · 单词 AI(DeepSeek 文本模型)
 *   ②错了个字 · 手写识别(腾讯云 OCR): SecretId/SecretKey/Region + 连接测试
 * 配置均存 KV, 即时生效, 无需重新部署。
 */
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGetAiConfig, apiGetOcrConfig, apiSaveAiConfig, apiSaveOcrConfig, apiTestAi, apiTestOcr } from "../api";
import { cn } from "@/lib/utils";
import type { AiConfig, AiProvider, OcrConfig } from "../types";

export function AiSettingsPage() {
    const [scope, setScope] = useState<"ylgy" | "clgz">("ylgy");
    return (
        <div className="mx-auto max-w-2xl space-y-4">
            <header>
                <h1 className="text-xl font-extrabold">AI 检测设置</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    各游戏 AI 判定的服务商与密钥配置;保存在 KV,即时生效,无需重新部署
                </p>
            </header>
            <div className="flex gap-1 rounded-full bg-muted p-1">
                <button onClick={() => setScope("ylgy")}
                    className={cn("flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition",
                        scope === "ylgy" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground")}>
                    英了个语 · 单词 AI
                </button>
                <button onClick={() => setScope("clgz")}
                    className={cn("flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition",
                        scope === "clgz" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground")}>
                    错了个字 · 手写识别
                </button>
            </div>
            {scope === "ylgy" ? <YlgyAiSection /> : <ClgzOcrSection />}
        </div>
    );
}

function YlgyAiSection() {
    const [cfg, setCfg] = useState<AiConfig | null>(null);
    const [providers, setProviders] = useState<AiProvider[]>([]);
    const [provider, setProvider] = useState("deepseek");
    const [model, setModel] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [enabled, setEnabled] = useState(false);
    const [busy, setBusy] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<string>("");

    const load = useCallback(async () => {
        setCfg(null);
        const r = await apiGetAiConfig();
        if (r?.ok && r.config) {
            setCfg(r.config);
            setProviders(r.providers ?? []);
            setEnabled(r.config.enabled);
            setProvider(r.config.provider);
            setModel(r.config.model);
            setApiKey("");
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const doSave = async () => {
        if (!enabled && !apiKey.trim() && !cfg?.hasKey) {
            toast.warning("未填写 API Key 且未勾选「启用」,保存后 AI 不会生效");
        }
        setBusy(true);
        try {
            const r = await apiSaveAiConfig({ enabled, provider, model: model.trim(), apiKey: apiKey.trim() });
            if (r.ok) {
                if (!enabled) {
                    toast.warning("已保存,但未勾选「启用」——AI 检测仍处于停用状态");
                } else {
                    toast.success(r.msg ?? "已保存");
                }
                setApiKey("");
                void load();
            } else {
                toast.error(r.msg ?? "保存失败");
            }
        } catch {
            toast.error("网络异常,请稍后再试");
        } finally {
            setBusy(false);
        }
    };

    const doTest = async () => {
        if (!enabled) {
            setTestResult("AI 检测当前处于停用状态,请先勾选「启用」并保存后再测试");
            return;
        }
        setTesting(true);
        setTestResult("");
        try {
            const r = await apiTestAi();
            if (r.ok) {
                setTestResult(`检测成功(${r.ms ?? "?"}ms): ${r.isWord ? "是真实单词" : "非真实单词"}${r.isWord ? `, ${r.pos ?? ""} ${r.zh ?? ""}` : ""} —— AI 已可用`);
                toast.success("AI 连接正常");
            } else {
                setTestResult(`检测失败: ${r.msg ?? "未知原因"}(当前将回退词库判定)`);
                toast.error(r.msg ?? "AI 不可用");
            }
        } catch {
            setTestResult("网络异常,请稍后再试");
        } finally {
            setTesting(false);
        }
    };

    const providerInfo = providers.find(p => p.id === provider);

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="h-4 w-4" /> 刷新</Button>
            </div>

            {!cfg ? (
                <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-2/3" />
                </div>
            ) : (
                <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold">AI 检测</p>
                            <p className="text-xs text-muted-foreground">
                                当前状态:{cfg.enabled ? "已启用" : "已停用"} · 来源:{cfg.source === "kv" ? "本页配置" : cfg.source === "env" ? "环境变量" : "未配置"}
                                {cfg.hasKey && ` · Key ${cfg.apiKeyMasked}`}
                            </p>
                        </div>
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={enabled}
                                onChange={(e) => setEnabled(e.target.checked)}
                                className="h-4 w-4 accent-primary"
                                aria-label="启用 AI 检测"
                            />
                            启用
                        </label>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="ai-provider">提供商</Label>
                        <select
                            id="ai-provider"
                            value={provider}
                            onChange={(e) => {
                                const id = e.target.value;
                                setProvider(id);
                                const p = providers.find(x => x.id === id);
                                if (p) setModel(p.defaultModel);
                            }}
                            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                        >
                            {providers.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>
                        <p className="text-[11px] text-muted-foreground">
                            接入约定:提供商须兼容 OpenAI /chat/completions 协议,在 functions/_lib/aicheck.js 的 AI_PROVIDERS 登记后即可在此选择
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="ai-model">模型名</Label>
                        <Input id="ai-model" value={model} onChange={(e) => setModel(e.target.value)} placeholder={providerInfo?.defaultModel ?? "deepseek-chat"} />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="ai-key">API Key</Label>
                        <Input
                            id="ai-key"
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={cfg.hasKey ? `已设置(${cfg.apiKeyMasked}),留空表示保留原 Key` : "sk-..."}
                            autoComplete="new-password"
                        />
                        <p className="text-[11px] text-muted-foreground">Key 只存服务器 KV,不下发前端;保存后可用下方「测试连接」验证</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button onClick={() => void doSave()} disabled={busy}>{busy ? "保存中…" : "保存配置"}</Button>
                        <Button variant="outline" onClick={() => void doTest()} disabled={testing}>{testing ? "测试中…" : "测试连接"}</Button>
                    </div>
                    {testResult && (
                        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs leading-relaxed">{testResult}</p>
                    )}

                    <div className="border-t pt-3 text-xs leading-relaxed text-muted-foreground">
                        <p>用途:英了个语中,玩家填满的单词若与本局参考答案不同,由该 AI 判断是否为真实英语单词并给出释义(真实但非答案 → 提示可换答案,不锁定;非真实单词 → 扣血红 2 秒)。</p>
                        <p className="mt-1">停用或 AI 不可用时,游戏自动回退为词库比对(旧行为)。每次保存/测试都会记入审计日志。</p>
                    </div>
                </div>
            )}
        </div>
    );
}


/* ---------- 错了个字 · 腾讯云手写 OCR ---------- */
function ClgzOcrSection() {
    const [cfg, setCfg] = useState<OcrConfig | null>(null);
    const [enabled, setEnabled] = useState(false);
    const [region, setRegion] = useState("ap-guangzhou");
    const [secretId, setSecretId] = useState("");
    const [secretKey, setSecretKey] = useState("");
    const [busy, setBusy] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<string>("");

    const load = useCallback(async () => {
        setCfg(null);
        const r = await apiGetOcrConfig();
        if (r?.ok && r.config) {
            setCfg(r.config);
            setEnabled(r.config.enabled);
            setRegion(r.config.region);
            setSecretId("");
            setSecretKey("");
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const doSave = async () => {
        setBusy(true);
        try {
            const r = await apiSaveOcrConfig({ enabled, region, secretId: secretId.trim(), secretKey: secretKey.trim() });
            if (r.ok) {
                if (!enabled) toast.warning("已保存,但未勾选「启用」——手写识别仍处于停用状态");
                else toast.success(r.msg ?? "已保存");
                setSecretId("");
                setSecretKey("");
                void load();
            } else {
                toast.error(r.msg ?? "保存失败");
            }
        } catch {
            toast.error("网络异常,请稍后再试");
        } finally {
            setBusy(false);
        }
    };

    const doTest = async () => {
        setTesting(true);
        setTestResult("");
        try {
            const r = await apiTestOcr();
            if (r.reachable) {
                setTestResult(`连接正常(${r.ms ?? "?"}ms)——腾讯 OCR 鉴权与连通均正常`);
                toast.success("OCR 连接正常");
            } else {
                setTestResult(`连接失败: ${r.msg ?? "未知原因"}`);
                toast.error(r.msg ?? "OCR 不可用");
            }
        } catch {
            setTestResult("网络异常,请稍后再试");
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="space-y-4">
            {!cfg ? (
                <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ) : (
                <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold">手写识别(腾讯云 OCR)</p>
                            <p className="text-xs text-muted-foreground">
                                当前状态:{cfg.enabled ? "已启用" : "已停用"} · Region {cfg.region}
                                {cfg.hasKey ? ` · Key ${cfg.secretIdMasked}` : " · 未配置密钥"}
                            </p>
                        </div>
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)}
                                className="h-4 w-4 accent-primary" aria-label="启用手写识别" />
                            启用
                        </label>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="ocr-region">地域(Region)</Label>
                        <select id="ocr-region" value={region} onChange={(e) => setRegion(e.target.value)}
                            className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                            <option value="ap-guangzhou">华南地区(广州)</option>
                            <option value="ap-shanghai">华东地区(上海)</option>
                            <option value="ap-beijing">华北地区(北京)</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="ocr-secret-id">SecretId</Label>
                        <Input id="ocr-secret-id" value={secretId} onChange={(e) => setSecretId(e.target.value)}
                            placeholder={cfg.hasKey ? "已设置,留空表示保留原值" : "AKID..."}
                            autoComplete="off" />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="ocr-secret-key">SecretKey</Label>
                        <Input id="ocr-secret-key" type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value)}
                            placeholder={cfg.hasKey ? "已设置,留空表示保留原值" : "腾讯云 API 密钥"}
                            autoComplete="new-password" />
                        <p className="text-[11px] text-muted-foreground">密钥只存服务器 KV,不下发前端;保存后可用「测试连接」验证</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button onClick={() => void doSave()} disabled={busy}>{busy ? "保存中…" : "保存配置"}</Button>
                        <Button variant="outline" onClick={() => void doTest()} disabled={testing}>{testing ? "测试中…" : "测试连接"}</Button>
                    </div>
                    {testResult && (
                        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs leading-relaxed">{testResult}</p>
                    )}

                    <div className="border-t pt-3 text-xs leading-relaxed text-muted-foreground">
                        <p>用途:错了个字手写判定 —— 玩家提交的手写字图片经腾讯云「通用手写体识别」判断是否为目标字(写对且可辨认即得分)。</p>
                        <p className="mt-1">停用或识别失败时,自动回退为像素重合度判定(旧行为)。每次保存/测试都会记入审计日志。</p>
                    </div>
                </div>
            )}
        </div>
    );
}
