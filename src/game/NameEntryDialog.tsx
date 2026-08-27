/*
 * p了个s · 首次进入昵称弹窗(四游戏共用, 参照化了个学 v2.2.7/v2.4.2 昵称窗)
 * ======================================================================
 * 新玩家(本机从未填过昵称、也未勾选过不参与)进入局内时弹出, 避免忽略昵称导致成绩无法上榜。
 * 记忆规则不变: 默认本机最后一次昵称参与排行(localStorage hlgx_name 跨游戏共享), 直至玩家主动修改;
 * 「不参与排行榜」勾选同样记忆(hlgx_skip_rank), 勾过之后再次进入不再弹窗(与化了个学一致)。
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { hasBadWord } from "./badwords";
import { readSkipRank } from "./RankPartToggle";

const NAME_KEY = "hlgx_name";   // 平台昵称(与化了个学共享)

export function storedIdentity(): boolean {
    try {
        return !!(localStorage.getItem(NAME_KEY)?.trim()) || readSkipRank();
    } catch {
        return false;
    }
}

interface Props {
    open: boolean;
    /** 游戏名(标题文案): 英了个语 / 错了个字 / 分了个类 / 配了个平 */
    gameName: string;
    /** ✕ 关闭(未开局时=放弃进入): 父页面通常跳回大厅 */
    onDismiss: () => void;
    /** 确认: name=生效昵称(可为空串=不参与), skip=是否选择不参与排行榜 */
    onConfirm: (name: string, skip: boolean) => void;
}

export function NameEntryDialog({ open, gameName, onDismiss, onConfirm }: Props) {
    const [name, setName] = useState(() => {
        try { return localStorage.getItem(NAME_KEY)?.trim() || ""; } catch { return ""; }
    });
    const [skip, setSkip] = useState(false);

    const nameCount = [...name].length;
    const nameTooLong = nameCount > 10;
    const nameBad = !!name.trim() && hasBadWord(name.trim());
    const canConfirm = !skip && (!!name.trim() && !nameTooLong && !nameBad);

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onDismiss(); }}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>开始游戏</DialogTitle>
                    <DialogDescription>{gameName}:设置昵称后成绩将计入排行榜</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="entry-name">昵称</Label>
                        <Input
                            id="entry-name"
                            value={name}
                            placeholder="输入昵称(最多 10 个字)"
                            autoFocus
                            disabled={skip}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && canConfirm) onConfirm(name.trim(), false); }}
                        />
                        <div className="flex items-center justify-between text-xs">
                            <span className={nameBad || nameTooLong ? "font-semibold text-destructive" : "text-muted-foreground"}>
                                {nameBad ? "⚠ 昵称包含违禁词,请更换" : nameTooLong ? "⚠ 昵称最多 10 个字" : "昵称长度"}
                            </span>
                            <span className={cn("tabular-nums", nameTooLong ? "font-semibold text-destructive" : "text-muted-foreground")}>
                                {nameCount}/10
                            </span>
                        </div>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                        <Checkbox checked={skip} onCheckedChange={(v) => setSkip(v === true)} />
                        不参与排行榜
                    </label>
                </div>
                <div className="flex justify-between gap-2">
                    <Button variant="ghost" onClick={onDismiss}>← 返回大厅</Button>
                    <Button
                        onClick={() => onConfirm(skip ? "" : name.trim(), skip)}
                        disabled={!skip && !canConfirm}
                    >
                        确认开始
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
