#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
错了个字 · 笔迹样本渲染预览 (scripts/render_clgz_samples.py)
==============================================================
读取 clgz-character-data/samples/*.jsonl, 按与游戏内画框一致的笔迹渲染
(白底 + #1e293b 圆头笔画, 默认 280px), 输出 PNG 到 clgz-character-data/images/<字>/<标签>/。

用法:
    python scripts/render_clgz_samples.py                 # 默认路径/280px
    python scripts/render_clgz_samples.py --size 560      # 放大渲染

依赖: pip install pillow
说明: 训练侧的真实输入不是这些 PNG —— 训练脚本会在信号层(点序列)直接做
      归一化与增广; 本脚本主要用于人工质检标注质量。
"""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw

INK = "#1e293b"


def render_sample(sample: dict, size: int) -> Image.Image:
    base = float(sample.get("canvasSize") or 280)
    scale = size / base
    img = Image.new("RGB", (size, size), "#ffffff")
    d = ImageDraw.Draw(img)
    lw = max(2, round(7 * scale))   # 游戏内画笔宽 7px(280 坐标系)
    r = lw / 2
    for stroke in sample.get("strokes", []):
        pts = [(p["x"] * scale, p["y"] * scale) for p in stroke.get("points", [])]
        if len(pts) == 1:
            x, y = pts[0]
            d.ellipse([x - r, y - r, x + r, y + r], fill=INK)
            continue
        if len(pts) > 1:
            d.line(pts, fill=INK, width=lw, joint="curve")
            for x, y in (pts[0], pts[-1]):   # 圆头端点
                d.ellipse([x - r, y - r, x + r, y + r], fill=INK)
    return img


def main() -> None:
    ap = argparse.ArgumentParser(description="渲染错了个字笔迹样本 JSONL → PNG")
    root = Path(__file__).resolve().parent.parent / "clgz-character-data"
    ap.add_argument("--src", type=Path, default=root / "samples", help="JSONL 目录")
    ap.add_argument("--out", type=Path, default=root / "images", help="PNG 输出目录")
    ap.add_argument("--size", type=int, default=280, help="输出边长(像素)")
    args = ap.parse_args()

    files = sorted(args.src.glob("*.jsonl")) if args.src.exists() else []
    if not files:
        print(f"[!] {args.src} 下没有 *.jsonl —— 请先在后台「数据采集」页导出并放入")
        return

    n_total = 0
    for f in files:
        for line in f.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                s = json.loads(line)
                ch, label = s["char"], s["label"]
                out_dir = args.out / ch / label
                out_dir.mkdir(parents=True, exist_ok=True)
                # 文件名: uid(去重主键, 保证重跑覆盖不重复)
                out = out_dir / f"{s.get('uid', n_total)}.png"
                render_sample(s, args.size).save(out)
                n_total += 1
            except (json.JSONDecodeError, KeyError, TypeError) as e:
                print(f"[跳过坏行] {f.name}: {e}")
    print(f"[ok] 渲染 {n_total} 条 → {args.out}")


if __name__ == "__main__":
    main()
