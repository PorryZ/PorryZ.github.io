# PorryZ.github.io

ZZH 的个人主页，包含 Steam 游戏数据、泰拉瑞亚与苏丹的游戏攻略、无畏契约视频、智能车记录和留言板。

线上地址：<https://porryz.github.io/>。网站是纯静态 HTML/CSS/JavaScript，GitHub Pages 从仓库根目录发布，无需构建或安装前端依赖。

## 目录结构

```text
.
├── index.html                  # Steam 首页
├── terraria.html               # 泰拉瑞亚攻略
├── sultan.html                 # 苏丹的游戏攻略
├── valorant.html               # 无畏契约视频
├── smart-car.html              # 智能车记录
├── message-board.html          # Giscus 留言板
├── assets/
│   ├── css/                    # 各页面的样式，首页为 home.css
│   ├── js/                     # 浏览器端脚本，首页为 home.js
│   └── videos/
│       ├── smart-car/           # highlight1.mp4、highlight2.mp4
│       └── valorant/            # highlight3.mp4、highlight4.mp4
├── data/
│   ├── steam.json              # Steam 同步结果
│   ├── terraria/               # boss.csv、npc.csv
│   └── sultan/                 # people.csv、events.csv、items.csv
├── scripts/
│   └── sync-steam.mjs           # 本地 Steam 数据同步工具
├── .env.example                # 本地环境变量示例
└── .gitignore
```

页面 HTML 保留在根目录，以保持已有页面地址和 Giscus 按路径关联的讨论。`assets/js/` 用于浏览器代码，`scripts/` 用于本地维护工具。

## 本地预览

在仓库根目录运行：

```sh
python -m http.server 8000
```

访问 <http://localhost:8000/>。攻略和首页通过 `fetch` 读取数据，请使用 HTTP 服务预览。

## 内容维护

- 修改页面结构或文案：编辑对应的根目录 HTML。
- 修改样式或交互：编辑 `assets/css/` 或 `assets/js/` 中的同名文件，首页使用 `home`。
- 维护游戏手记：编辑 `data/games.json`，素材放在 `assets/images/games/`；新增与补充资料见 [游戏卡片维护说明](docs/game-cards.md)。组件为 `assets/js/game-cards.js` 与 `assets/css/game-cards.css`，主页接入为 `assets/js/game-journal.js`。
- 更新攻略：编辑 `data/terraria/` 或 `data/sultan/` 的 UTF-8 CSV，保留表头与字段格式；含逗号或换行的单元格使用双引号包围。
- 添加视频：放入 `assets/videos/` 对应主题目录，并在页面中更新视频路径；首页的精选视频也需要同步修改。
- 新增页面：在根目录添加 HTML，将样式、脚本和素材放入对应目录，并在首页添加入口。

资源路径以页面地址为基准，包括外部 JavaScript 中的 `fetch` 路径。当前所有页面都位于根目录，统一使用 `assets/...` 与 `data/...`。

游戏卡片的独立开发预览位于 <http://localhost:8000/dev/game-cards.html>，其中测试图、文字和数字已明确标记，正式主页不会读取这些内容。数据行为检查：`node scripts/test-game-cards.cjs`。

## 同步 Steam 数据

需要 Node.js 和 `curl`。复制 `.env.example` 为 `.env`，填写 `STEAM_API_KEY` 和 `STEAM_ID64`，然后在仓库根目录运行：

```sh
node scripts/sync-steam.mjs
```

结果写入 `data/steam.json`。检查数据后提交该文件即可更新首页；`.env` 与 `.env.local` 已被 Git 忽略。

## 发布

本地预览并检查页面链接、攻略表格和视频后，将变更提交并推送到 `main`，由仓库的 GitHub Pages 配置发布。留言板的 Giscus 配置位于 `message-board.html`。

此仓库不使用 Git 子模块。如果 Actions 报错缺少 `PorryZ.github.io` 的子模块 URL，应检查并移除残留子模块配置；可用 `git ls-files -s` 确认索引中没有模式为 `160000` 的条目。
