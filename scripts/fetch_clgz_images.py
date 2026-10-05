# -*- coding: utf-8 -*-
"""从 Wikimedia Commons 检索并下载错了个字图形题素材(自由版权), 生成总览图供目检"""
import io
import json
import os
import sys
import urllib.parse
import urllib.request

UA = {"User-Agent": "PLEGES-game/1.0 (educational mini-game; contact: local)"}
OUT = "public/img/clgz"
PROXY = "http://127.0.0.1:7890"

ITEMS = [
    # (ascii 文件名, Commons 检索词)
    ("conical-flask", "Erlenmeyer flask"),
    ("crucible", "crucible"),
    ("evaporating-dish", "evaporating dish"),
    ("tweezers", "forceps"),
    ("filtration", "filtration laboratory apparatus"),
    ("distillation", "distillation apparatus"),
    ("benzene-ring", "benzene"),
    ("cocoon", "silkworm cocoon"),
    ("pupa", "pupa"),
    ("paramecium", "paramecium"),
    ("rhombus", "rhombus"),
    ("rectangle", "rectangle"),
    ("trapezoid", "trapezoid geometry"),
    ("prism", "cuboid geometry"),
    ("cone", "cone geometry"),
    ("ellipse", "ellipse geometry"),
    ("parabola", "parabola function graph"),
    ("arc-length", "circular arc angle"),
    ("chord", "chord of a circle"),
    ("circle-center", "circle center radius line"),
    ("diameter", "diameter circle"),
    ("weight", "paperweight"),
    ("lever", "lever"),
    ("pulley", "pulley physics"),
    ("spring", "helical spring drawing"),
    ("magnet", "magnetic field bar magnet"),
    ("lens-focus", "converging lens rays focus"),
]


def fetch(url, timeout=30):
    req = urllib.request.Request(url, headers=UA)
    last = None
    for attempt in range(4):
        try:
            if attempt % 2 == 0:
                return urllib.request.urlopen(req, timeout=timeout).read()
            opener = urllib.request.build_opener(urllib.request.ProxyHandler({"http": PROXY, "https": PROXY}))
            return opener.open(urllib.request.Request(url, headers=UA), timeout=timeout).read()
        except Exception as e:
            last = e
    raise last


def api_search(query):
    q = urllib.parse.quote(query)
    url = ("https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search"
           f"&srsearch={q}&srnamespace=6&srlimit=10")
    data = json.loads(fetch(url))
    return [r["title"] for r in data.get("query", {}).get("search", [])]


def pick_title(titles):
    """优先 SVG(缩放干净), 其次 PNG; 排除明显无关/巨大照片名"""
    svgs = [t for t in titles if t.lower().endswith(".svg")]
    pngs = [t for t in titles if t.lower().endswith(".png")]
    return (svgs + pngs)[:1]


os.makedirs(OUT, exist_ok=True)
credits = []
only = sys.argv[1:] if len(sys.argv) > 1 else None
for ascii_name, query in ITEMS:
    if only and ascii_name not in only:
        continue
    out_path = os.path.join(OUT, ascii_name + ".png")
    if os.path.exists(out_path):
        print("[skip]", ascii_name)
        continue
    try:
        titles = api_search(query)
        title = None
        for t in titles:
            pt = pick_title([t])
            if pt:
                title = pt[0]
                break
        if not title:
            print("[none]", ascii_name, "<-", query)
            continue
        name = title.replace("File:", "")
        dl = ("https://commons.wikimedia.org/wiki/Special:FilePath/"
              + urllib.parse.quote(name) + "?width=560")
        data = fetch(dl)
        with open(out_path, "wb") as f:
            f.write(data)
        credits.append(f"{ascii_name}.png <- {title} (https://commons.wikimedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))})")
        print("[ok]", ascii_name, "<-", title)
    except Exception as e:
        print("[fail]", ascii_name, repr(e)[:80])

with open(os.path.join(OUT, "CREDITS.txt"), "w", encoding="utf-8") as f:
    f.write("错了个字图形题素材来源: Wikimedia Commons(各文件遵循其原始自由许可)\n\n")
    f.write("\n".join(credits) + "\n")
print("credits written:", len(credits))

# 总览拼图供目检
try:
    from PIL import Image, ImageDraw
    files = sorted(f for f in os.listdir(OUT) if f.endswith(".png"))
    cols = 6
    rows = (len(files) + cols - 1) // cols
    cell = 200
    sheet = Image.new("RGB", (cols * cell, rows * (cell + 18)), "#ffffff")
    d = ImageDraw.Draw(sheet)
    for i, fn in enumerate(files):
        try:
            im = Image.open(os.path.join(OUT, fn)).convert("RGBA")
            im.thumbnail((cell - 12, cell - 12))
            x0, y0 = (i % cols) * cell, (i // cols) * (cell + 18)
            sheet.paste(im, (x0 + 6, y0 + 6), im)
            d.text((x0 + 4, y0 + cell - 2), fn.replace(".png", ""), fill="#dc2626")
        except Exception as e:
            print("thumb fail", fn, e)
    sheet.save("public/img/clgz/_sheet.png")
    print("sheet: public/img/clgz/_sheet.png", len(files), "images")
except ImportError:
    print("PIL not available, skip sheet")
