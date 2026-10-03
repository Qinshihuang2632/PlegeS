# clgz-character-data · 错了个字手写笔迹训练数据

> 训练数据目录。**samples/ 与 images/ 已被 .gitignore 排除,一律不入 git 仓库**(clgz_ml_plan.md 隐私红线:笔迹属生物特征敏感数据)。

## 目录结构

```
clgz-character-data/
├── README.md            ← 本文件(入库)
├── samples/             ← 后台「数据采集」页导出的 JSONL 原始笔迹(入库排除)
│   └── clgz-samples-<日期>-<时刻>.jsonl
└── images/              ← 由 samples 渲染出的 PNG 预览/训练图(入库排除,可随时重新生成)
    └── <字>/<标签>/<序号>.png
```

## 工作流

1. 管理后台(`/admin/clgzdata` → 数据采集)选字 → 画框手写 → 选标签(正确/潦草正确/残缺/错别字/乱画)→ 保存。样本存在**浏览器 IndexedDB**(本机),设备类型按登录设备自动判定(手机=手指 / 电脑=鼠标,可手动改触控笔),并记录书写人代号。
2. 攒一批后点「导出 JSONL」,把下载的文件放进本目录 `samples/`。**同 uid 覆盖、幂等**,重复导入不会产生重复样本。
3. (可选)本地渲染预览:`python scripts/render_clgz_samples.py`,会在 `images/` 下按 `字/标签` 归档 PNG。
4. 训练:把整个 `clgz-character-data/` 上传到算力平台(北邮普惠 JupyterLab),训练脚本读取 `samples/*.jsonl`。**可以反复训练**:新一批数据放进来后,既可以从上一版模型继续微调(fine-tune),也可以全量重训;每次训练都会在冻结测试集上出对比报告,择优上线(版本号 ml-v1 / ml-v2 …)。

## 样本格式(JSONL,每行一条)

```json
{"uid":"锥-correct-ps-finger-abc123","char":"锥","word":"锥形瓶","label":"correct","device":"finger","writer":"ps","canvasSize":280,"strokes":[{"points":[{"x":80,"y":60},{"x":95,"y":58}]},{"points":[]}],"savedAt":"2026-09-22T10:00:00.000Z"}
```

- `strokes`:原始笔画点序列(画框 280 坐标系)。存点不存图:文件小、可任意分辨率重渲染、增广(旋转/缩放/加抖动/丢笔)在信号层做最有效。
- `label` 五分类:`correct`(正确) / `sloppy_correct`(潦草正确) / `partial`(残缺) / `wrong_char`(错别字) / `scribble`(乱画)。
- `device`:`finger` / `stylus` / `mouse`。单模型混训 + 设备风格增广吸收差异;评测按「书写人 × 设备」双重切分。
- `writer`:按书写人划分 train/val/test(同一人的字迹绝不跨训练/测试两侧)。

## 铁律(不可违反)

- 本目录数据不入 git、不进 commit;
- 玩家自愿贡献的笔迹(二期)必须明示同意 + 匿名化后才能进这里;
- 测试集一旦冻结不再改动,每次训练/换参都在同一测试集上出报告。
