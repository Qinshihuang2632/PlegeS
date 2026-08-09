// 临时验证脚本: 动态 import 全部 Pages Functions 模块, 检查语法与相对路径解析
const base = "file:///D:/program/game one/";
const files = [
  "functions/_lib/ranklib.js",
  "functions/hlgx/api/rank.js",
  "functions/hlgx/api/name/exists.js",
  "functions/hlgx/api/name/suggest.js",
];
for (const f of files) {
  const m = await import(base + f);
  console.log("OK  " + f + "  ->  " + Object.keys(m).join(", "));
}
