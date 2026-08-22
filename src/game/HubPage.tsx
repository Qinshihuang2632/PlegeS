/*
 * p了个s · 高考知识游戏合集主界面(v2.3.5)
 * 卡片入口 + 玩法介绍弹窗(✕ 关闭)+ 版本页脚
 * 第一款游戏「化了个学」为高考化学主题; 合集定位为高考知识, 不限于化学
 */
import { useState } from "react";
import { Link } from "react-router";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { GameRules } from "./GameRules";
import { YlgyRules } from "@/game2/YlgyRules";
import { ClgzRules } from "@/game3/ClgzRules";
import { validateNickname } from "./NameConfirmDialog";
import { PLATFORM_VERSION } from "@/version";

export function HubPage() {
    const [rulesOpen, setRulesOpen] = useState(false);
    const [thanksOpen, setThanksOpen] = useState(false);
    const [rulesTab, setRulesTab] = useState<"hlgx" | "ylgy" | "clgz">("hlgx");   // 玩法介绍: 化了个学 / 英了个语 / 错了个字 三子页
    const [feedbackOpen, setFeedbackOpen] = useState(false);
    const [fbName, setFbName] = useState(() => localStorage.getItem("hlgx_name")?.trim() || "");
    const [fbContent, setFbContent] = useState("");
    const [fbCredit, setFbCredit] = useState(true);   // v2.5.5: 鸣谢意愿(建议被采纳后是否愿以当前昵称进入特别鸣谢)
    const [fbTip, setFbTip] = useState("");
    const [fbSending, setFbSending] = useState(false);
    const [fbOk, setFbOk] = useState(false);

    /* 提交建议反馈(v2.5.4): 昵称 + 内容, 违禁词校验, 60s/IP 限频由后端强制
       (v2.5.5: 附带鸣谢意愿 credit, 与内容一并提交供后台查看) */
    const submitFeedback = async () => {
        const tip = validateNickname(fbName);
        if (tip) { setFbTip(tip); return; }
        if (!fbContent.trim()) { setFbTip("请填写反馈内容"); return; }
        if ([...fbContent.trim()].length > 500) { setFbTip("反馈内容不能超过 500 个字"); return; }
        setFbSending(true);
        setFbTip("");
        try {
            const res = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: fbName.trim(), content: fbContent.trim(), credit: fbCredit }),
            });
            const d = await res.json().catch(() => null);
            if (res.ok && d?.ok) {
                localStorage.setItem("hlgx_name", fbName.trim());
                setFbOk(true);
            } else {
                setFbTip(d?.msg ?? `提交失败(HTTP ${res.status})`);
            }
        } catch {
            setFbTip("网络异常,请检查网络后重试");
        } finally {
            setFbSending(false);
        }
    };
    const closeFeedback = () => {
        setFeedbackOpen(false);
        setFbOk(false);
        setFbTip("");
        setFbContent("");
        setFbCredit(true);
    };

    return (
        <div className="mx-auto min-h-dvh w-full max-w-3xl px-4 pb-8 pt-6 sm:pt-10">
            <header className="mb-8 text-center">
                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">p了个s</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    高考知识主题小游戏合集 · 寓教于乐
                </p>
            </header>

            <main className="grid gap-4 sm:grid-cols-3">
                {/* 可玩小游戏 */}
                <Link
                    to="/hlgx/hua"
                    className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                    <div className="mb-3 text-4xl" aria-hidden>化</div>
                    <h2 className="text-lg font-bold">化了个学</h2>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                        消除同类物质,玩法类似「羊了个羊」。覆盖高考化学 200+ 种常见物质,支持血量 / 计时 / 排行榜。
                    </p>
                    <span className="mt-4 inline-block rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                        ● 可玩
                    </span>
                </Link>

                {/* 敬请期待 → 单词数独(v2.4.0 可玩) */}
                <Link
                    to="/ylgy"
                    className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                    <div className="mb-3 text-4xl" aria-hidden>词</div>
                    <h2 className="text-lg font-bold">英了个语</h2>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                        每行拼成一个完整单词,与前一行依重复字母重叠成不规则拼图。高考课标词库,简单 / 标准 / 困难三档。
                    </p>
                    <span className="mt-4 inline-block rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                        ● 可玩
                    </span>
                </Link>

                {/* 错了个字(平台 v2.5.6: 暂时关闭维护 —— 卡片不可进入, 徽标「维护中」;游戏本体代码未改动) */}
                <div className="relative overflow-hidden rounded-2xl border bg-card p-5 opacity-80 shadow-sm">
                    <div className="mb-3 text-4xl" aria-hidden>字</div>
                    <h2 className="text-lg font-bold">错了个字</h2>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                        手写考察高中各科易写错的字(锥形瓶的锥、睾丸的睾……)。像你画我猜一样在画框里手写,不经过键盘。暂停开放,升级维护中。
                    </p>
                    <span className="mt-4 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                        维护中
                    </span>
                </div>

                {/* 开发中占位(下一批游戏) */}
                <div className="rounded-2xl border border-dashed bg-muted/30 p-5 opacity-80">
                    <div className="mb-3 text-4xl" aria-hidden>待</div>
                    <h2 className="text-lg font-bold">敬请期待</h2>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                        更多高考知识小游戏正在开发中……
                    </p>
                    <span className="mt-4 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                        开发中
                    </span>
                </div>
                <div className="rounded-2xl border border-dashed bg-muted/30 p-5 opacity-80">
                    <div className="mb-3 text-4xl" aria-hidden>待</div>
                    <h2 className="text-lg font-bold">敬请期待</h2>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                        更多高考知识小游戏正在开发中……
                    </p>
                    <span className="mt-4 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                        开发中
                    </span>
                </div>
                <div className="rounded-2xl border border-dashed bg-muted/30 p-5 opacity-80">
                    <div className="mb-3 text-4xl" aria-hidden>待</div>
                    <h2 className="text-lg font-bold">敬请期待</h2>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                        更多高考知识小游戏正在开发中……
                    </p>
                    <span className="mt-4 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                        开发中
                    </span>
                </div>
            </main>

            {/* 导航: 排行榜 + 玩法介绍 + 建议反馈 */}
            <nav className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="secondary" size="lg" className="flex-1">
                    <Link to="/hlgx/rank">查看排行榜</Link>
                </Button>
                <Button variant="outline" size="lg" className="flex-1" onClick={() => setRulesOpen(true)}>
                    玩法介绍
                </Button>
                <Button variant="outline" size="lg" className="flex-1" onClick={() => { setFeedbackOpen(true); setFbOk(false); }}>
                    建议反馈
                </Button>
            </nav>

            {/* 特别鸣谢(点击查看, 不占页面空间) */}
            <section className="mt-8 text-center">
                <Button variant="link" className="text-xs text-muted-foreground" onClick={() => setThanksOpen(true)}>
                    特别鸣谢
                </Button>
            </section>

            <footer className="mt-2 text-center text-xs text-muted-foreground">
                p了个s · 平台 {PLATFORM_VERSION}(仅供个人娱乐)
            </footer>

            {/* 玩法介绍弹窗(✕ 可关闭; 化了个学 / 英了个语 按键切换子页面) */}
            <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
                <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>玩法介绍</DialogTitle>
                        <DialogDescription>三分钟看懂怎么玩,新手不迷路</DialogDescription>
                    </DialogHeader>
                    <div className="mb-3 flex gap-1 rounded-full bg-muted p-1">
                        {([
                            { key: "hlgx", label: "化了个学" },
                            { key: "ylgy", label: "英了个语" },
                            { key: "clgz", label: "错了个字" },
                        ] as const).map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setRulesTab(key)}
                                className={cn(
                                    "flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition",
                                    rulesTab === key ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    {rulesTab === "hlgx" ? <GameRules /> : rulesTab === "ylgy" ? <YlgyRules /> : <ClgzRules />}
                </DialogContent>
            </Dialog>

            {/* 特别鸣谢弹窗(✕ 可关闭; 按贡献版本数从多到少, 标注游戏与版本) */}
            <Dialog open={thanksOpen} onOpenChange={setThanksOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>特别鸣谢</DialogTitle>
                        <DialogDescription>感谢以下成员在各游戏版本中的建议与操作帮助(标注对应游戏与版本)</DialogDescription>
                    </DialogHeader>
                    <ul className="space-y-2">
                        <li className="rounded-lg bg-muted/40 px-3 py-2">
                            <span className="font-semibold">@在下雨</span>
                            <span className="block text-xs leading-relaxed text-muted-foreground">
                                化了个学 v2.0.0-cloudflare~v2.1.2(云端迁移 / 工程化重构 / 安全处置);英了个语 v1.1.0~v1.4.0(算法重构优化);错了个字 v1.0.1、v1.0.2(识别算法与判定修复)
                            </span>
                        </li>
                        <li className="rounded-lg bg-muted/40 px-3 py-2">
                            <span className="font-semibold">@鹜秋</span>
                            <span className="block text-xs leading-relaxed text-muted-foreground">
                                化了个学 v2.1.9、v2.2.1(屏蔽词名录扩充)
                            </span>
                        </li>
                        <li className="rounded-lg bg-muted/40 px-3 py-2">
                            <span className="font-semibold">@鼠鼠鼠了</span>
                            <span className="block text-xs leading-relaxed text-muted-foreground">
                                化了个学 v2.1.9(混合物类别)、v2.2.2(挑战难度布局);英了个语 v1.0.0(单词数独上线)
                            </span>
                        </li>
                        <li className="rounded-lg bg-muted/40 px-3 py-2">
                            <span className="font-semibold">@Skjusty</span>
                            <span className="block text-xs leading-relaxed text-muted-foreground">
                                化了个学 v2.1.5(多类别消除)、v2.1.8(移动端棋盘放大)
                            </span>
                        </li>
                        <li className="rounded-lg bg-muted/40 px-3 py-2">
                            <span className="font-semibold">@安比</span>
                            <span className="block text-xs leading-relaxed text-muted-foreground">
                                化了个学 v2.1.6(玩法介绍完善)、v2.1.7(数据安全修复)
                            </span>
                        </li>
                        <li className="rounded-lg bg-muted/40 px-3 py-2">
                            <span className="font-semibold">@壹棵小玖菜</span>
                            <span className="block text-xs leading-relaxed text-muted-foreground">
                                化了个学 v2.1.8(题库修正)
                            </span>
                        </li>
                        <li className="rounded-lg bg-muted/40 px-3 py-2">
                            <span className="font-semibold">@绝艺如君</span>
                            <span className="block text-xs leading-relaxed text-muted-foreground">
                                化了个学 v2.1.6(玩法介绍完善)
                            </span>
                        </li>
                    </ul>
                </DialogContent>
            </Dialog>

            {/* 建议反馈弹窗(✕ 可关闭; 昵称 + 反馈内容) */}
            <Dialog open={feedbackOpen} onOpenChange={(v) => { if (!v) closeFeedback(); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>建议反馈</DialogTitle>
                        <DialogDescription>你的每一条建议都会被认真查看,感谢支持!</DialogDescription>
                    </DialogHeader>
                    {fbOk ? (
                        <div className="py-6 text-center">
                            <p className="text-2xl" aria-hidden>🎉</p>
                            <p className="mt-2 font-semibold text-success">反馈已提交,感谢你的建议!</p>
                            <Button className="mt-4" onClick={closeFeedback}>关闭</Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-muted-foreground">昵称(≤10 字)</label>
                                <Input
                                    value={fbName}
                                    maxLength={10}
                                    placeholder="你的昵称"
                                    onChange={(e) => setFbName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-muted-foreground">反馈内容(≤500 字)</label>
                                <textarea
                                    value={fbContent}
                                    maxLength={500}
                                    rows={5}
                                    placeholder="想说什么都可以:玩法建议、bug 反馈、期望的新游戏……"
                                    onChange={(e) => setFbContent(e.target.value)}
                                    className="w-full resize-none rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                    若建议被采纳,在对应版本更新后你是否愿意以现在的昵称进入特别鸣谢榜?
                                </label>
                                <div className="flex gap-1 rounded-full bg-muted p-1">
                                    {([{ v: true, label: "愿意" }, { v: false, label: "不愿意" }] as const).map(({ v, label }) => (
                                        <button
                                            key={label}
                                            type="button"
                                            onClick={() => setFbCredit(v)}
                                            className={cn(
                                                "flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition",
                                                fbCredit === v ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground",
                                            )}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {fbTip && <p className="text-xs font-semibold text-destructive">{fbTip}</p>}
                            <Button className="w-full" size="lg" onClick={() => void submitFeedback()} disabled={fbSending}>
                                {fbSending ? "提交中…" : "提交反馈"}
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
