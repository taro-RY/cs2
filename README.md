# CT-OS // Counter-Strike Tactical Terminal

一个伪装成操作系统的 **CS2 概念战术终端**——纯静态站点（HTML + CSS + 原生 JS + Three.js，零构建），用电影开机终端、指挥台命令行、真实 3D 武器检视和可推演的战术沙盘，重新包装 Counter-Strike 2 的浏览体验。

> 粉丝向概念作品（fan-made conceptual showcase），非官方、与 Valve 无关；站内不包含任何 Valve 专有素材。

在线体验：<https://cs2-woad.vercel.app/>

---

## 体验流程

1. **开机（BOOT）** — CT-OS 启动日志与四项行动入口；回访玩家会看到 `WELCOME BACK`、系统记住的主武器与后门握手记录。
2. **简报 / 系统 / 装备 / 档案 / 地图 / 留痕 / 部署** — 滚轮或方向键在七个"空间"间运镜切换。
3. **指挥台 `Ctrl/⌘ + K`** — 命令行操作：`inspect ak47`、`open inferno`、`stats`、`compare`、`deploy`、`hack`……
4. **3D 武器检视** — 真实 GLB 模型（Three.js / WebGL）：惯性拖拽旋转、滚轮缩放、点击部件局部聚焦。
5. **沙二战术沙盘** — Dust II 平面 callout 图：区域聚焦、T/CT 视角切换、进攻/回防路线动画、烟闪火投掷轨迹。
6. **行为档案** — 扫描、检视、热点、地图、命令、部署等真实行为被持久化，推导出 ENTRY / TACTICAL / PATIENCE 行为画像。
7. **ARG 隐藏剧情** — 触发 `DO NOT OPEN` 后，检视器、地图、`whoami` 会泄漏异常信号，`recover` 命令打开隐藏档案。

## 目录结构

```
cs2/
├── index.html              # 单页全部场景
├── css/style.css           # CT-OS 视觉系统
├── js/
│   ├── store.js            # 行为信号持久化 + 画像推导
│   ├── boot.js             # 开机终端（自适应身份）
│   ├── terminal.js         # Ctrl+K 指挥台
│   ├── inspect.js          # 武器检视 UI / 数据 / 热点
│   ├── viewer3d.js         # Three.js 3D 检视器（ES module）
│   ├── mapos.js            # Dust II 战术沙盘（Canvas 2D）
│   ├── anomaly.js          # 扫描观察 + DO NOT OPEN + recover ARG
│   ├── pager.js            # 空间运镜状态机
│   ├── spray.js            # 喷涂墙
│   ├── fx.js / cursor.js / main.js
├── assets/
│   ├── models/             # CC BY 4.0 武器 GLB（见 CREDITS.txt）
│   ├── maps/dust2-radar.svg# 原创手绘沙二平面 callout 图
│   ├── vendor/             # 自托管 Three.js r160（MIT）
│   └── CREDITS.txt         # 全部第三方素材署名与许可证
├── images/                 # 站点配图
├── scripts/release.ps1     # 一键发布脚本
└── VERSION                 # 语义化版本号
```

## 本地运行

任意静态服务器即可（需要 http 服务，ES module 不支持 file://）：

```powershell
# 例如在项目根目录
npx serve .
# 或
python -m http.server 8199
```

浏览器打开对应地址，无需构建。

## 发布（自动提交 + 版本 + 部署）

```powershell
# 只提交并推送
powershell -ExecutionPolicy Bypass -File scripts\release.ps1

# 提交 + 补丁版本号（0.3.0 -> 0.3.1）+ git tag + 推送
powershell -ExecutionPolicy Bypass -File scripts\release.ps1 -Tag patch

# 次版本号并同步部署到 Vercel 生产环境
powershell -ExecutionPolicy Bypass -File scripts\release.ps1 -Tag minor -Deploy
```

脚本会自动：递增 `VERSION` → 暂存全部改动 → 规范提交 → push → 打 `vX.Y.Z` tag →（可选）`vercel --prod`。

## 素材与许可

- **3D 武器模型**：AK-47 / M4 Carbine by AdamKokrito，Molotov by CreativeTrio，均来自 [Poly Pizza](https://poly.pizza)，**CC BY 4.0**；M4A1-S 的消音器为程序化生成。详见 `assets/CREDITS.txt`。
- **沙二地图**：`dust2-radar.svg` 为本项目原创手绘的平面示意图，依据公开地图布局绘制，**不是** Valve 截图、雷达提取或游戏文件。
- **Three.js**：r160，MIT，自托管于 `assets/vendor/`。
- Counter-Strike / Dust II 等名称版权归 Valve 所有，本项目仅为非营利的学习与展示用途。
