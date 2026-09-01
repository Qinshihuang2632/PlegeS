/*
 * p了个s · 管理后台 AI 检测设置
 * 英了个语单词检测的 AI 配置: 启用开关 / 提供商 / 模型 / API Key + 连接测试。
 * 配置存 KV, 对局中即时生效, 无需重新部署; 接入约定见 functions/_lib/aicheck.js。
 */
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGetAiConfig, apiSaveAiConfig, apiTestAi } from "../api";
import type { AiConfig, AiProvider } from "../types";

export function AiSettingsPage() {
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
        setBusy(true);
        try {
            const r = await apiSaveAiConfig({ enabled, provider, model: model.trim(), apiKey: apiKey.trim() });
            if (r.ok) {
                toast.success(r.msg ?? "已保存");
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
        <div className="mx-auto max-w-2xl space-y-4">
            <header className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h1 className="text-xl font-extrabold">AI 检测设置</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        英了个语单词检测用的 AI 配置;保存在 KV,对局中即时生效,无需重新部署
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="h-4 w-4" /> 刷新</Button>
            </header>

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
