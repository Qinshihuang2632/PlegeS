import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
    return (
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
            <h1 className="text-5xl font-extrabold">🧪 404</h1>
            <p className="text-muted-foreground">页面不存在或已被移除</p>
            <Button asChild variant="secondary">
                <Link to="/">← 返回游戏大厅</Link>
            </Button>
        </div>
    );
}
