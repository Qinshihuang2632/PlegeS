/*
 * 化了个学 · 游戏 React Hook
 * 包装 HuaGame(纯逻辑)为响应式状态: 订阅状态变更触发重渲染, 管理正计时器
 */
import { useEffect, useReducer, useRef, useState } from "react";
import { HuaGame, type Mode } from "./core";

export function useGame(initialMode: Mode = "normal") {
    const gameRef = useRef<HuaGame | null>(null);
    if (!gameRef.current) gameRef.current = new HuaGame(initialMode);
    const game = gameRef.current;

    const [, forceRender] = useReducer((x: number) => x + 1, 0);
    const [elapsed, setElapsed] = useState(0);
    const [running, setRunning] = useState(false);

    /* 状态订阅: 任何游戏状态变更 → 重渲染 */
    useEffect(() => {
        game.onChange(forceRender);
        return () => game.onChange(() => {});
    }, [game]);

    /* 正计时器(游戏开始 running=true, 结算/重开时停止并清零) */
    useEffect(() => {
        if (!running) return;
        const t0 = Date.now();
        setElapsed(0);
        const id = setInterval(
            () => setElapsed(Math.floor((Date.now() - t0) / 1000)),
            250, // 250ms 刷新, 结算时误差 ≤0.25s
        );
        return () => clearInterval(id);
    }, [running]);

    const startTimer = () => setRunning(true);
    const stopTimer = () => setRunning(false);

    return { game, elapsed, running, startTimer, stopTimer };
}
