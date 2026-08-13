/*
 * p了个s · 高考知识游戏合集主界面(v2.3.5)
 * 卡片入口 + 玩法介绍弹窗(✕ 关闭)+ 版本页脚
 * 第一款游戏「化了个学」为高考化学主题; 合集定位为高考知识, 不限于化学
 */
import { useState } from "react";
import { Link } from "react-router";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GameRules } from "./GameRules";
import { APP_VERSION } from "@/version";

export function HubPage() {
    const [rulesOpen, setRulesOpen] = useState(false);
    const [thanksOpen, setThanksOpen] = useState(false);

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

                {/* 敬请期待 */}
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

            {/* 导航: 排行榜 + 玩法介绍 */}
            <nav className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="secondary" size="lg" className="flex-1">
                    <Link to="/hlgx/rank">查看排行榜</Link>
                </Button>
                <Button variant="outline" size="lg" className="flex-1" onClick={() => setRulesOpen(true)}>
                    玩法介绍
                </Button>
            </nav>

            {/* 特别鸣谢(点击查看, 不占页面空间) */}
            <section className="mt-8 text-center">
                <Button variant="link" className="text-xs text-muted-foreground" onClick={() => setThanksOpen(true)}>
                    特别鸣谢
                </Button>
            </section>

            <footer className="mt-2 text-center text-xs text-muted-foreground">
                p了个s · 版本 {APP_VERSION}(仅供个人娱乐)
            </footer>

            {/* 玩法介绍弹窗(✕ 可关闭) */}
            <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
                <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>玩法介绍</DialogTitle>
                        <DialogDescription>三分钟看懂怎么玩,新手不迷路</DialogDescription>
                    </DialogHeader>
                    <GameRules />
                </DialogContent>
            </Dialog>

            {/* 特别鸣谢弹窗(✕ 可关闭; 名单按贡献次数从多到少) */}
            <Dialog open={thanksOpen} onOpenChange={setThanksOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>特别鸣谢</DialogTitle>
                        <DialogDescription>感谢以下成员的建议与操作帮助</DialogDescription>
                    </DialogHeader>
                    <ul className="space-y-2">
                        <li className="rounded-lg bg-muted/40 px-3 py-2">
                            <span className="font-semibold">@在下雨</span>
                            <span className="block text-xs text-muted-foreground">感谢多轮版本的建议与云端迁移支持</span>
                        </li>
                        <li className="rounded-lg bg-muted/40 px-3 py-2">
                            <span className="font-semibold">@Skjusty</span>
                            <span className="block text-xs text-muted-foreground">感谢 v2.1.5 扩容与 v2.1.8 更新支持</span>
                        </li>
                        <li className="rounded-lg bg-muted/40 px-3 py-2">
                            <span className="font-semibold">@安比</span>
                            <span className="block text-xs text-muted-foreground">感谢 v2.1.6、v2.1.7 更新支持</span>
                        </li>
                        <li className="rounded-lg bg-muted/40 px-3 py-2">
                            <span className="font-semibold">@绝艺如君</span>
                            <span className="block text-xs text-muted-foreground">感谢 v2.1.6 更新支持</span>
                        </li>
                        <li className="rounded-lg bg-muted/40 px-3 py-2">
                            <span className="font-semibold">@壹棵小玖菜</span>
                            <span className="block text-xs text-muted-foreground">感谢 v2.1.8 更新支持</span>
                        </li>
                        <li className="rounded-lg bg-muted/40 px-3 py-2">
                            <span className="font-semibold">@鹜秋</span>
                            <span className="block text-xs text-muted-foreground">感谢 v2.1.9 与 v2.2.1 更新支持</span>
                        </li>
                        <li className="rounded-lg bg-muted/40 px-3 py-2">
                            <span className="font-semibold">@鼠鼠鼠了</span>
                            <span className="block text-xs text-muted-foreground">感谢 v2.2.2 更新支持</span>
                        </li>
                    </ul>
                </DialogContent>
            </Dialog>
        </div>
    );
}
