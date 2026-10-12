# 游戏卡片维护

「游戏手记」位于首页 Steam 概览之后、攻略与记录之前。首页原有 Steam 最近游玩排序、攻略入口与视频顺序保持原样。

## 数据与组件

- `data/games.json`：正式记录，`games` 数组按新增顺序倒序排列。新增放开头，补充资料原位更新。
- `assets/js/game-cards.js`：规范化、去重、更新、卡片渲染、长文和截图查看器，共用纯静态组件。
- `assets/css/game-cards.css`：卡片专用样式，不改变其他栏目。
- `assets/js/game-journal.js`：读取数据、按明确关联的 Steam App ID 补充真实时长、接入首页。
- `dev/game-cards.html`：独立开发预览，覆盖名字、短评、长文、多图、单图、成就总数缺失、零值、图片故障与空列表。测试内容不进入正式数据。

首次正式记录取自现有 `data/steam.json`：Persona 5 Royal、Terraria、Persona 3 Reload。没有真实截图、成就或测评，因此没有这些字段。Steam 的 `headerImage` 是封面，不能当作截图，也不会被新组件使用。

## 字段约定

唯一必填字段是 `name`。以下示例为字段结构说明，不是实际游戏记录；没有提供的字段直接删除：

```json
{
  "id": "稳定的游戏标识",
  "name": "用户提供的游戏名称",
  "theme": "mint",
  "playtimeMinutes": 120,
  "achievements": { "unlocked": 3, "total": 10 },
  "review": "用户测评原文，可包含\n换行。",
  "screenshots": [
    { "src": "assets/images/games/游戏标识/01.webp", "alt": "截图中可见的场景", "position": "50% 40%" },
    { "src": "assets/images/games/游戏标识/02.webp", "alt": "另一张截图的场景" }
  ],
  "primaryScreenshot": 0
}
```

| 字段 | 规则 |
| --- | --- |
| `name` | 保留可确定的游戏名，不能空白。 |
| `id` | 推荐设置稳定标识；修改中英文名称时通过相同 `id` 更新。 |
| `steamAppId` | 可选。只在已有真实 Steam 数据中关联对应游戏。没有明确 `playtimeMinutes` 时读取其 `playtimeForever`，单位为分钟。 |
| `playtimeMinutes` | 非负数，允许 0；用户提供小时后转换成分钟，显示最多一位小数。不提供时不生成数据。设为 `null` 可显式隐藏并阻止 Steam 回填。 |
| `achievements.unlocked` | 非负整数；没有总数时只展示数量。 |
| `achievements.total` | 非负整数。只有同时知道已解锁数量和正数总数才有进度条；总数为 0 时不计算比例。已解锁数大于总数属于矛盾，需澄清。 |
| `review` | 测评原文。180 字以上或超过 3 行时截取原文前 180 字或前 3 行作为摘要，可以展开完整文本；不改写观点或自动评分。 |
| `screenshots` | 截图对象或路径字符串数组；只使用用户素材，支持本站路径及明确给出的 HTTP(S) 图片。图片缺失时不生成占位图，不下载封面。 |
| `primaryScreenshot` | 从 0 开始的主视觉索引。根据清晰度、主体和裁切效果选择；默认第一张。 |
| `screenshots[].position` | 裁切焦点，例如 `50% 40%`，默认居中；查看器始终完整显示原图。 |
| `theme` | `coral`、`mint`、`blue`、`lime`、`violet`。选色参考截图与现有主页；省略时按稳定身份选择，新增其他游戏不会改色。 |

## 新增与补充

把单个游戏的资料保存为 UTF-8 JSON 文件，然后执行：

```sh
node scripts/update-game.cjs 游戏资料.json
```

工具按相同 `id`、`steamAppId` 或规范化名称匹配记录。新游戏置顶，已有游戏原位更新，其他记录不移动。补充成就会保留已有总数，其他提供的字段覆盖原值；省略的字段保留原值。`null` 清除可选字段，`screenshots` 以完整数组替换，新增截图时应连同已有截图一并提交。工具会在写入前验证数据。

也可以直接修改 `data/games.json`。直接编辑时不要重复新增同一个游戏；渲染层有去重保护，数组靠前的记录优先，但不代替资料维护。中英文别名无法可靠自动推断，使用已有稳定标识更新。

用户在后续对话提供资料时，直接解析 → 找到已有记录 → 选色和主图 → 更新数据及素材 → 检查桌面和移动端。仅名称无法确定或信息互相矛盾时需要澄清。实际资料不要进入 `dev/`。

## 设计与交互规则

无截图无测评：紧凑字体卡；有测评无截图：文字卡；有截图：桌面横向宽卡，手机改成上图下文。采用主页已有颜色家族、大字体、倾斜标签、切角色块与偏置构图；装饰不遮盖文本，也不使用游戏原版素材。

动效只在入场、悬停、展开或打开画廊时短促发生，没有循环。入场以 `transform`、`opacity` 为主，减少动效偏好禁用动画。触屏直接点击入口；长评使用原生 `details`，支持 Enter/Space；画廊使用原生模态 `dialog`，支持焦点约束、Esc、左右键、上一张/下一张与水平滑动，关闭后恢复入口焦点及页面滚动位置。

正式列表为空时隐藏栏目；Steam 数据读取失败时独立资料仍可展示；正式记录文件读取失败时显示加载错误。图片地址失效时保留可重试入口，查看器显示明确错误。

## 验证

```sh
node --check assets/js/game-cards.js
node --check assets/js/game-journal.js
node scripts/test-game-cards.cjs
python -m http.server 8000 --bind 127.0.0.1
```

在主页和独立开发预览检查 1280px 桌面、768px 平板、390px 与 320px 窄屏；检查无横向溢出、字段省略、长评展开和收起、多图翻页、单图无翻页按钮、Esc 关闭和焦点恢复。开启系统减少动效偏好，确认卡片仍可见且动画关闭。
