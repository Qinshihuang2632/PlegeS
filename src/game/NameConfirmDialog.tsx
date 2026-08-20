/*
 * p了个s · 改名二次确认弹窗(三游戏局内共用)
 * ==========================================
 * 局内修改昵称流程: 顶栏输入框编辑(实时校验违禁词/长度) → 点「✓」确认 →
 * 本弹窗二次确认(显示新昵称, 提示本局将重新开始) → 确认后保存昵称并重启本局。
 */
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { hasBadWord } from "./badwords";

const MAX_LEN = 10;

/** 校验昵称: 返回错误提示(空字符串 = 合法) */
export function validateNickname(v: string): string {
    const n = v.trim();
    if (n && [...n].length > MAX_LEN) return `昵称最多 ${MAX_LEN} 个字`;
    if (n && hasBadWord(n)) return "昵称包含违禁词,请更换";
    return "";
}

interface Props {
    open: boolean;
    /** 新昵称(未确认前的编辑值) */
    pending: string;
    /** 当前生效昵称(用于判断是否真的改了) */
    current: string;
    onOpenChange: (open: boolean) => void;
    /** 确认: 保存新昵称并重启本局 */
    onConfirm: () => void;
}

export function NameConfirmDialog({ open, pending, current, onOpenChange, onConfirm }: Props) {
    const n = pending.trim();
    const changed = n !== current.trim();
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>确认修改昵称</DialogTitle>
                    <DialogDescription>
                        {changed
                            ? `昵称将修改为「${n}」,修改后本局将重新开始,确定修改吗?`
                            : `昵称未变化(仍为「${current.trim() || "未设置"}」),无需修改`}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
                    <Button disabled={!changed} onClick={onConfirm}>
                        {n ? "确认修改并重开" : "确认清空并重开"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
