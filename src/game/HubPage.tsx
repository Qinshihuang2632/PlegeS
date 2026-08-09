/*
 * 化了个学 · 游戏大厅
 * 卡片入口 + 玩法介绍弹窗(✕ 关闭)+ 版本页脚
 */
import { useState } from "react";
import { Link } from "react-router";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GameRules } from "./GameRules";

export const APP_VERSION = "v2.1.0";

export function HubPage() {
    const [rulesOpen, setRulesOpen] = useState(false);

    return (
        <div className="mx-auto min-h-dvh w-full max-w-3xl px-4 pb-8 pt-6 sm:pt-10">
            <header className="mb-8 text-center">
                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">🧪 化了个学</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    化学主题小游戏合集 · 高考化学知识挑战
                </p>
            </header>

            <main className="grid gap-4 sm:grid-cols-3">
                {/* 可玩小游戏 */}
                <Link
                    to="/hlgx/hua"
                    className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                    <div className="mb-3 text-4xl" aria-hidden>⚗️</div>
                    <h2 className="text-lg font-bold">化了个学</h2>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                        消除同类物质,玩法类似「羊了个羊」。覆盖高考化学 190+ 种常见物质,支持血量 / 计时 / 排行榜。
                    </p>
                    <span className="mt-4 inline-block rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                        ● 可玩
                    </span>
                </Link>

                {/* 敬请期待 */}
                <div className="rounded-2xl border border-dashed bg-muted/30 p-5 opacity-80">
                    <div className="mb-3 text-4xl" aria-hidden>🕐</div>
                    <h2 className="text-lg font-bold">敬请期待</h2>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                        更多化学小游戏正在开发中……
                    </p>
                    <span className="mt-4 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                        开发中
                    </span>
                </div>
                <div className="rounded-2xl border border-dashed bg-muted/30 p-5 opacity-80">
                    <div className="mb-3 text-4xl" aria-hidden>🕐</div>
                    <h2 className="text-lg font-bold">敬请期待</h2>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                        更多化学小游戏正在开发中……
                    </p>
                    <span className="mt-4 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                        开发中
                    </span>
                </div>
            </main>

            {/* 导航: 排行榜 + 玩法介绍 */}
            <nav className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="secondary" size="lg" className="flex-1">
                    <Link to="/hlgx/rank">🏆 查看排行榜</Link>
                </Button>
                <Button variant="outline" size="lg" className="flex-1" onClick={() => setRulesOpen(true)}>
                    📖 玩法介绍
                </Button>
            </nav>

            <footer className="mt-10 text-center text-xs text-muted-foreground">
                化了个学 · 版本 {APP_VERSION}(仅供个人娱乐)
            </footer>

            {/* 玩法介绍弹窗(✕ 可关闭) */}
            <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
                <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>📖 玩法介绍</DialogTitle>
                        <DialogDescription>三分钟看懂怎么玩,新手不迷路</DialogDescription>
                    </DialogHeader>
                    <GameRules />
                </DialogContent>
            </Dialog>
        </div>
    );
}
