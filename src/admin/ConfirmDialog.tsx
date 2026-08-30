/*
 * p了个s · 管理后台确认弹窗
 * 统一封装 AlertDialog: 标题/说明/确认(危险操作红色)/取消, 右上角 ✕ 可关闭(Esc 亦可)
 */
import { X } from "lucide-react";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ConfirmDialog({ open, onOpenChange, title, description, confirmText = "确认", destructive = false, onConfirm }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    title: string;
    description?: string;
    confirmText?: string;
    destructive?: boolean;
    onConfirm: () => void;
}) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                {/* ✕ 关闭(所有模态框都必须有关闭机制) */}
                <AlertDialogCancel
                    className="absolute right-2.5 top-2.5 h-8 w-8 rounded-full p-0"
                    aria-label="关闭"
                >
                    <X className="h-4 w-4" />
                </AlertDialogCancel>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction variant={destructive ? "destructive" : "default"} onClick={onConfirm}>
                        {confirmText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
