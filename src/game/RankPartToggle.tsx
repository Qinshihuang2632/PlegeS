/*
 * p了个s · 排行榜参与开关(四游戏局内共用, v2.6.0 体系)
 * ====================================================
 * 勾选栏式图标按钮(☑ 参与排行 / ☐ 不参与), 放在每个游戏局内「✓ 确认改名」旁;
 * 点击弹二次确认(是否切换参与状态 + 提示本局将重新开始) → 确认后回调父组件保存并重开本局。
 * 参与状态 = 有昵称 且 未勾选跳过(hlgx_skip_rank, 与化了个学开局勾选框共用存储);
 * 切换只改参与标记, 昵称保留 —— 重新参与时无需重输昵称。
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const RANK_SKIP_KEY = "hlgx_skip_rank";   // "1" = 不参与排行榜(与化了个学 v2.2.7 开局勾选共用)

export function readSkipRank(): boolean {
    try { return localStorage.getItem(RANK_SKIP_KEY) === "1"; } catch { return false; }
}
export function storeSkipRank(v: boolean): void {
    try { localStorage.setItem(RANK_SKIP_KEY, v ? "1" : "0"); } catch { /* 隐私模式忽略 */ }
}

interface Props {
    /** 当前是否参与排行(有昵称且未跳过) */
    active: boolean;
    /** 二次确认后的切换回调(participate = 切换后的目标状态); 父组件负责保存 + 重开本局 */
    onConfirmedChange: (participate: boolean) => void;
}

export function RankPartToggle({ active, onConfirmedChange }: Props) {
    const [confirmOpen, setConfirmOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                role="checkbox"
                aria-checked={active}
                onClick={() => setConfirmOpen(true)}
                title={active ? "当前参与排行榜,点击可切换为不参与(需二次确认并重开本局)" : "当前不参与排行榜,点击可重新参与(需二次确认并重开本局)"}
                className={cn(
                    "flex h-8 items-center gap-1 rounded-lg border px-2 text-xs font-semibold transition",
                    active
                        ? "border-success/40 bg-success/10 text-success"
                        : "border-border bg-muted/50 text-muted-foreground",
                )}
            >
                <span aria-hidden>{active ? "☑" : "☐"}</span>
                <span>{active ? "参与排行" : "不参与排行"}</span>
            </button>

            {/* 二次确认: 是否切换 + 本局将重新开始 */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{active ? "确定不参与排行榜?" : "确定重新参与排行榜?"}</DialogTitle>
                        <DialogDescription>
                            {active
                                ? "确认后本局将重新开始,成绩不再上传排行榜(昵称保留,随时可再开启)。"
                                : "确认后本局将重新开始,成绩将计入排行榜。"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-1 flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>取消</Button>
                        <Button
                            variant={active ? "destructive" : "default"}
                            size="sm"
                            onClick={() => {
                                setConfirmOpen(false);
                                onConfirmedChange(!active);
                            }}
                        >
                            {active ? "确认不上榜,重开本局" : "确认上榜,重开本局"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
